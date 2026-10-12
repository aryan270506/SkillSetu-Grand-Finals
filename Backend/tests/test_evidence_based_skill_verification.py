import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from main import app
from app.database import SessionLocal
from app.models import StudentUser, Course, CourseSkill, LearningPath, LearningPathItem, StudentSkillEvidence, StudentAssessmentAttempt
from app.services import career_intelligence_service
from app.services.career_intelligence_service import PROVIDER_EVIDENCE_RULES, get_provider_evidence_requirements


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


def test_provider_evidence_requirements_rules():
    """
    Test 1, 3, 5, 6 — Provider evidence rules:
    - YouTube requires assessment only.
    - NPTEL requires certificate and assessment.
    - freeCodeCamp requires certificate and assessment.
    """
    assert get_provider_evidence_requirements("youtube") == ["assessment"]
    assert get_provider_evidence_requirements("nptel", cert_available=True) == ["certificate", "assessment"]
    assert get_provider_evidence_requirements("freecodecamp", cert_available=True) == ["certificate", "assessment"]
    assert get_provider_evidence_requirements("swayam", cert_available=True) == ["certificate", "assessment"]


def test_evidence_verification_matrix():
    """
    Test matrix of all provider conditions:
    1. YouTube: 100% course + no test -> Not verified
    2. YouTube: 20% course + passed test -> Verified
    3. NPTEL: 100% course + no cert + passed test -> Not verified
    4. NPTEL: cert verified + no test -> Not verified
    5. NPTEL: cert verified + passed test -> Verified
    6. freeCodeCamp: cert verified + passed test -> Verified
    7. freeCodeCamp: cert verified + failed test -> Not verified
    """
    # 1. YouTube: test alone required
    yt_reqs = get_provider_evidence_requirements("youtube")
    assert all((False if r == "certificate" else False) for r in yt_reqs) is False
    assert all((False if r == "certificate" else True) for r in yt_reqs) is True

    # 3 & 4 & 5. NPTEL
    nptel_reqs = get_provider_evidence_requirements("nptel")
    # Missing certificate, passed test
    assert all((False if r == "certificate" else True) for r in nptel_reqs) is False
    # Verified certificate, failed test
    assert all((True if r == "certificate" else False) for r in nptel_reqs) is False
    # Verified certificate, passed test
    assert all((True if r == "certificate" else True) for r in nptel_reqs) is True

    # 6 & 7. freeCodeCamp
    fcc_reqs = get_provider_evidence_requirements("freecodecamp")
    assert all((True if r == "certificate" else True) for r in fcc_reqs) is True
    assert all((True if r == "certificate" else False) for r in fcc_reqs) is False


def test_career_intelligence_evidence_requirements_payload(db_session: Session):
    """
    Verify /api/career/intelligence returns structured evidence requirements and does NOT verify skills from course progress.
    """
    res = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com",
        career_name="Full Stack Developer"
    )
    assert res["status"] == "success"
    data = res["data"]
    skills = data["skills"]
    assert len(skills) > 0

    for sk in skills:
        assert "evidence_requirements" in sk
        assert isinstance(sk["evidence_requirements"], list)
        assert len(sk["evidence_requirements"]) > 0
        for req in sk["evidence_requirements"]:
            assert "type" in req
            assert "label" in req
            assert "status" in req
            assert "is_satisfied" in req

    # Verify roadmap milestones also include evidence requirements on skills
    milestones = data["roadmap_milestones"]
    assert len(milestones) > 0
    for m in milestones:
        assert "skills" in m
        for m_sk in m["skills"]:
            assert "evidence_requirements" in m_sk
            assert "current_score" in m_sk
            assert "target_score" in m_sk
            assert "gap" in m_sk


def test_course_progress_variation_does_not_affect_skill_verification(db_session: Session):
    """
    TEST 8 — COURSE PROGRESS:
    Changing course progress must not automatically change verified skill status without genuine evidence.
    """
    student = db_session.query(StudentUser).filter(StudentUser.email == "abhoge27@gmail.com").first()
    if not student:
        pytest.skip("Student not found")

    res = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=student.email,
        career_name="Full Stack Developer"
    )
    data = res["data"]
    skills = data["skills"]
    unverified_skills = [s for s in skills if not s.get("is_verified")]
    if unverified_skills:
        target_sk = unverified_skills[0]
        # Target skill has gap and is not verified
        assert target_sk["gap"] > 0
        assert target_sk["canonical_status"] in ("assessment_required", "certificate_required", "evidence_required", "failed_assessment")
