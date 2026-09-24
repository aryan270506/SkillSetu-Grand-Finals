import pytest
import json
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from app.database import SessionLocal
from app import models
from app.services import skill_evidence_service, learning_path_service, esco_service

client = TestClient(app)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def db_session():
    """Provides a database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def mock_student(db_session: Session):
    email = "evidence_student@test.com"
    student = db_session.query(models.StudentUser).filter(models.StudentUser.email == email).first()
    if not student:
        student = models.StudentUser(
            name="Evidence Student",
            email=email,
            password_hash="hashed_pw",
            target_careers=json.dumps(["Full Stack Developer", "Backend Developer"]),
            skill_ids=json.dumps(["Python", "JavaScript"])
        )
        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)
    return student


@pytest.fixture
def mock_student_b(db_session: Session):
    email = "evidence_student_b@test.com"
    student = db_session.query(models.StudentUser).filter(models.StudentUser.email == email).first()
    if not student:
        student = models.StudentUser(
            name="Evidence Student B",
            email=email,
            password_hash="hashed_pw",
            target_careers=json.dumps(["Frontend Developer"]),
            skill_ids=json.dumps(["React"])
        )
        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)
    return student


@pytest.fixture
def mock_esco_skills(db_session: Session):
    skills = {}
    for name in ["Python", "SQL", "Docker", "REST API", "JavaScript"]:
        s = db_session.query(models.EscoSkill).filter(models.EscoSkill.preferred_label == name).first()
        if not s:
            s = models.EscoSkill(
                concept_uri=f"http://data.europa.eu/esco/skill/mock-{name.lower().replace(' ', '-')}",
                preferred_label=name,
                skill_type="skill/competence",
                reuse_level="cross-sector"
            )
            db_session.add(s)
            db_session.commit()
            db_session.refresh(s)
        skills[name] = s
    return skills


@pytest.fixture
def mock_course(db_session: Session, mock_esco_skills):
    provider = db_session.query(models.Provider).filter(models.Provider.slug == "freecodecamp").first()
    if not provider:
        provider = models.Provider(name="freeCodeCamp", slug="freecodecamp")
        db_session.add(provider)
        db_session.commit()

    course = db_session.query(models.Course).filter(models.Course.external_id == "test:ev:course-1").first()
    if not course:
        course = models.Course(
            provider_id=provider.id,
            external_id="test:ev:course-1",
            title="Python and SQL Mastery",
            description="Deep dive into Python programming and SQL databases.",
            duration=120,
            level="Intermediate",
            url="https://www.freecodecamp.org/learn/python-sql",
            is_active=True
        )
        db_session.add(course)
        db_session.commit()
        db_session.refresh(course)

        # Map Python & SQL course skills
        cs1 = models.CourseSkill(course_id=course.id, esco_skill_id=mock_esco_skills["Python"].id, skill_name="Python", confidence=0.95)
        cs2 = models.CourseSkill(course_id=course.id, esco_skill_id=mock_esco_skills["SQL"].id, skill_name="SQL", confidence=0.90)
        db_session.add_all([cs1, cs2])
        db_session.commit()
    return course


# ---------------------------------------------------------------------------
# 1. Course Evidence Scoring & Progression Tests
# ---------------------------------------------------------------------------
def test_learning_evidence_score_progression():
    """Verify deterministic learning evidence score mapping across progress tiers."""
    assert skill_evidence_service.calculate_learning_evidence_score(0.0) == 0.0
    assert skill_evidence_service.calculate_learning_evidence_score(15.0) == 0.08  # 1-24%
    assert skill_evidence_service.calculate_learning_evidence_score(25.0) == 0.15  # 25-49%
    assert skill_evidence_service.calculate_learning_evidence_score(50.0) == 0.25  # 50-74%
    assert skill_evidence_service.calculate_learning_evidence_score(75.0) == 0.32  # 75-99%
    assert skill_evidence_service.calculate_learning_evidence_score(100.0) == 0.40  # 100% completed


def test_course_completion_does_not_equal_mastery(db_session, mock_student, mock_course, mock_esco_skills):
    """Course completion MUST NOT automatically grant 100% mastery."""
    py_skill = mock_esco_skills["Python"]

    # Record 100% completion
    evidence_list = skill_evidence_service.record_learning_progress_evidence(
        db=db_session,
        student_id=mock_student.id,
        course_id=mock_course.id,
        progress_percent=100.0
    )
    assert len(evidence_list) >= 1
    py_ev = next(e for e in evidence_list if e.esco_skill_id == py_skill.id)
    assert py_ev.source_type == "course_completion"
    assert py_ev.evidence_score == 0.40  # Bounded at 0.40 max, not 1.0!

    # Aggregate: only learning evidence present -> score ~0.34, status "developing"
    agg_score, status_str, sources = skill_evidence_service.aggregate_skill_scores([py_ev])
    assert agg_score < 0.50
    assert status_str == "developing"
    assert status_str != "verified"


def test_partial_learning_evidence_progression(db_session, mock_student, mock_course, mock_esco_skills):
    """Partial progress creates learning_progress source with appropriate weaker score."""
    sql_skill = mock_esco_skills["SQL"]

    # 25% progress
    evidence_list = skill_evidence_service.record_learning_progress_evidence(
        db=db_session,
        student_id=mock_student.id,
        course_id=mock_course.id,
        progress_percent=25.0
    )
    sql_ev = next(e for e in evidence_list if e.esco_skill_id == sql_skill.id)
    assert sql_ev.source_type == "learning_progress"
    assert sql_ev.evidence_score == 0.15

    # Update to 75% progress (idempotent update, no duplicate record)
    evidence_list2 = skill_evidence_service.record_learning_progress_evidence(
        db=db_session,
        student_id=mock_student.id,
        course_id=mock_course.id,
        progress_percent=75.0
    )
    sql_ev2 = next(e for e in evidence_list2 if e.esco_skill_id == sql_skill.id)
    assert sql_ev2.evidence_score == 0.32


# ---------------------------------------------------------------------------
# 2. Multi-Source Evidence Aggregation & Normalization Tests
# ---------------------------------------------------------------------------
def test_multi_source_aggregation_and_saturation():
    """Verify diminishing returns formula combines multiple sources and saturates <= 1.0."""
    ev_gh = models.StudentSkillEvidence(
        student_id=1, esco_skill_id=10, source_type="github",
        evidence_score=0.70, confidence_score=0.90
    )
    ev_resume = models.StudentSkillEvidence(
        student_id=1, esco_skill_id=10, source_type="resume",
        evidence_score=0.45, confidence_score=0.80
    )
    ev_course = models.StudentSkillEvidence(
        student_id=1, esco_skill_id=10, source_type="course_completion",
        evidence_score=0.40, confidence_score=0.85
    )
    ev_profile = models.StudentSkillEvidence(
        student_id=1, esco_skill_id=10, source_type="profile",
        evidence_score=0.20, confidence_score=0.50
    )

    score, status_str, sources = skill_evidence_service.aggregate_skill_scores(
        [ev_gh, ev_resume, ev_course, ev_profile]
    )

    # All 4 sources combined: GitHub (0.63) + Resume (0.36) + Course (0.34) + Profile (0.10)
    # 1 - (1 - 0.63)*(1 - 0.36)*(1 - 0.34)*(1 - 0.10) = 1 - 0.37 * 0.64 * 0.66 * 0.90 = 1 - 0.14 = 0.86
    assert 0.80 <= score <= 0.95
    assert status_str == "verified"  # Strong GitHub + course + resume = verified!
    assert len(sources) == 4


def test_status_thresholds():
    """Verify status thresholds: missing (<0.20), developing (0.20-0.49), evidenced (0.50-0.79), verified (>=0.80)."""
    # 1. Missing
    ev_low = models.StudentSkillEvidence(
        student_id=1, esco_skill_id=1, source_type="profile",
        evidence_score=0.10, confidence_score=0.50
    )
    s1, st1, _ = skill_evidence_service.aggregate_skill_scores([ev_low])
    assert st1 == "missing"

    # 2. Developing
    ev_dev = models.StudentSkillEvidence(
        student_id=1, esco_skill_id=1, source_type="learning_progress",
        evidence_score=0.32, confidence_score=0.80
    )
    s2, st2, _ = skill_evidence_service.aggregate_skill_scores([ev_dev])
    assert st2 == "developing"

    # 3. Evidenced
    ev_evidenced = models.StudentSkillEvidence(
        student_id=1, esco_skill_id=1, source_type="resume",
        evidence_score=0.45, confidence_score=0.85
    )
    ev_course = models.StudentSkillEvidence(
        student_id=1, esco_skill_id=1, source_type="course_completion",
        evidence_score=0.40, confidence_score=0.85
    )
    s3, st3, _ = skill_evidence_service.aggregate_skill_scores([ev_evidenced, ev_course])
    assert st3 == "evidenced"

    # 4. Verified (requires technical source + high score)
    ev_gh = models.StudentSkillEvidence(
        student_id=1, esco_skill_id=1, source_type="github",
        evidence_score=0.85, confidence_score=0.95
    )
    s4, st4, _ = skill_evidence_service.aggregate_skill_scores([ev_gh, ev_evidenced, ev_course])
    assert st4 == "verified"


# ---------------------------------------------------------------------------
# 3. GitHub, Resume & Profile Sync Tests
# ---------------------------------------------------------------------------
def test_sync_all_student_evidence(db_session, mock_student, mock_esco_skills):
    """Verify sync_all_student_evidence merges GitHub, Resume, Profile, and Courses."""
    # Setup student GitHub connection
    gh_conn = db_session.query(models.StudentGithubConnection).filter(
        models.StudentGithubConnection.student_email == mock_student.email
    ).first()
    if not gh_conn:
        gh_conn = models.StudentGithubConnection(
            student_email=mock_student.email,
            github_username="testdev",
            skills_json=json.dumps([{"name": "Python", "score": 75.0}])
        )
        db_session.add(gh_conn)

    # Setup student resume data
    mock_student.resume_data = json.dumps({
        "coreTechnologies": ["Python", "SQL"],
        "extracted_data": {"coreTechnologies": ["Python", "SQL"]}
    })
    db_session.commit()

    sync_result = skill_evidence_service.sync_all_student_evidence(db=db_session, student_email=mock_student.email)
    assert sync_result["status"] == "success"
    assert sync_result["records_created_or_updated"] >= 2

    # Check evidence summary
    summary = skill_evidence_service.get_unified_skill_evidence(db=db_session, student_email=mock_student.email)
    assert summary["total_skills"] >= 2
    py_item = next(s for s in summary["skills"] if s["skill_name"] == "Python")
    assert py_item["score"] >= 0.50
    assert any(src["type"] == "github" for src in py_item["sources"])


# ---------------------------------------------------------------------------
# 4. Learning Path Item Progress -> Evidence Update Pipeline
# ---------------------------------------------------------------------------
def test_learning_path_progress_triggers_evidence(db_session, mock_student, mock_course, mock_esco_skills):
    """Updating progress on a learning path item automatically creates/updates skill evidence."""
    # Create learning path
    lp = models.LearningPath(
        student_id=mock_student.id,
        name="Backend Path",
        target_careers=json.dumps(["Backend Developer"]),
        status="active",
        progress_percent=0.0
    )
    db_session.add(lp)
    db_session.commit()
    db_session.refresh(lp)

    item = models.LearningPathItem(
        learning_path_id=lp.id,
        course_id=mock_course.id,
        skill_id=mock_esco_skills["Python"].id,
        skill_name="Python",
        stage="Foundation",
        sequence_order=1,
        status="not_started",
        progress_percent=0.0
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)

    # Update item progress to 100% via service
    updated_item = learning_path_service.update_learning_path_item_progress(
        db=db_session,
        path_id=lp.id,
        item_id=item.id,
        progress_percent=100.0
    )
    assert updated_item["status"] == "completed"

    # Verify skill evidence was recorded
    ev_records = db_session.query(models.StudentSkillEvidence).filter(
        models.StudentSkillEvidence.student_id == mock_student.id,
        models.StudentSkillEvidence.esco_skill_id == mock_esco_skills["Python"].id,
        models.StudentSkillEvidence.source_type == "course_completion"
    ).all()
    assert len(ev_records) == 1
    assert ev_records[0].evidence_score == 0.40


# ---------------------------------------------------------------------------
# 5. Multi-Career & Skill Detail API Tests
# ---------------------------------------------------------------------------
def test_skill_evidence_detail_and_timeline(db_session, mock_student, mock_esco_skills):
    """Verify granular skill evidence detail and chronological timeline generation."""
    py_skill = mock_esco_skills["Python"]

    detail = skill_evidence_service.get_skill_evidence_detail(
        db=db_session,
        student_email=mock_student.email,
        esco_skill_id=py_skill.id
    )

    assert detail is not None
    assert detail["skill_id"] == py_skill.id
    assert detail["skill_name"] == "Python"
    assert "Full Stack Developer" in detail["required_by_careers"] or "Backend Developer" in detail["required_by_careers"]
    assert isinstance(detail["timeline"], list)
    assert len(detail["timeline"]) >= 1


# ---------------------------------------------------------------------------
# 6. API Endpoints & Security Authorization Tests
# ---------------------------------------------------------------------------
def test_api_get_skill_evidence(mock_student):
    """Test GET /api/v1/student/skill-evidence endpoint."""
    response = client.get(f"/api/v1/student/skill-evidence?email={mock_student.email}")
    assert response.status_code == 200
    data = response.json()
    assert "skills" in data
    assert isinstance(data["skills"], list)
    assert data["student_email"] == mock_student.email


def test_api_get_skill_evidence_detail(mock_student, mock_esco_skills):
    """Test GET /api/v1/student/skill-evidence/{skill_id} endpoint."""
    py_skill = mock_esco_skills["Python"]
    response = client.get(f"/api/v1/student/skill-evidence/{py_skill.id}?email={mock_student.email}")
    assert response.status_code == 200
    data = response.json()
    assert data["skill_name"] == "Python"
    assert "timeline" in data


def test_api_sync_skill_evidence(mock_student):
    """Test POST /api/v1/student/skill-evidence/sync endpoint."""
    response = client.post("/api/v1/student/skill-evidence/sync", json={"email": mock_student.email})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"


def test_security_isolation_between_students(db_session, mock_student, mock_student_b, mock_esco_skills):
    """Ensure Student B cannot see Student A's distinct skill evidence."""
    py_skill = mock_esco_skills["Python"]

    # Student A has Python evidence
    res_a = skill_evidence_service.get_skill_evidence_detail(
        db=db_session,
        student_email=mock_student.email,
        esco_skill_id=py_skill.id
    )
    assert res_a is not None

    # Student B has no Python evidence
    res_b = skill_evidence_service.get_skill_evidence_detail(
        db=db_session,
        student_email=mock_student_b.email,
        esco_skill_id=py_skill.id
    )
    # Student B has score 0.0, missing status
    assert res_b["score"] == 0.0
    assert res_b["status_label"] == "missing"
    assert len(res_b["sources"]) == 0
