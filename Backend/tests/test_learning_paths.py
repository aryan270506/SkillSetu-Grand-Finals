import pytest
import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from app.database import SessionLocal
from app import models
from app.services import learning_path_service, esco_service, course_recommendation_service

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
    student = db_session.query(models.StudentUser).filter(models.StudentUser.email == "test_lp_student@test.com").first()
    if not student:
        student = models.StudentUser(
            name="Test LP Student",
            email="test_lp_student@test.com",
            password_hash="hashed_pw",
            target_careers=json.dumps(["Full Stack Developer", "Backend Developer"])
        )
        db_session.add(student)
        db_session.commit()
    return student


@pytest.fixture
def mock_courses(db_session: Session):
    provider = db_session.query(models.Provider).filter(models.Provider.slug == "freecodecamp").first()
    if not provider:
        provider = models.Provider(name="freeCodeCamp", slug="freecodecamp")
        db_session.add(provider)
        db_session.commit()

    c1 = db_session.query(models.Course).filter(models.Course.external_id == "test:lp:course-1").first()
    if not c1:
        c1 = models.Course(
            provider_id=provider.id,
            external_id="test:lp:course-1",
            title="Relational Database Certification",
            description="Learn SQL, PostgreSQL, and database design.",
            duration=300,
            level="Beginner",
            url="https://www.freecodecamp.org/learn/relational-database/",
            is_active=True
        )
        db_session.add(c1)

    c2 = db_session.query(models.Course).filter(models.Course.external_id == "test:lp:course-2").first()
    if not c2:
        c2 = models.Course(
            provider_id=provider.id,
            external_id="test:lp:course-2",
            title="Back End Development and APIs Certification",
            description="Learn REST APIs, Node.js, and microservices.",
            duration=300,
            level="Intermediate",
            url="https://www.freecodecamp.org/learn/back-end-development-and-apis/",
            is_active=True
        )
        db_session.add(c2)

    db_session.commit()
    return [c1, c2]


# ---------------------------------------------------------------------------
# 1. Path Generation & Structure Tests
# ---------------------------------------------------------------------------
@patch("app.services.esco_service.load_student_evidence_from_db")
@patch("app.services.esco_service.calculate_multi_career_skill_gaps")
@patch("app.services.course_recommendation_service.get_personalized_course_recommendations")
def test_generate_learning_path_success(mock_recs, mock_gaps, mock_evidence, db_session: Session, mock_student, mock_courses):
    mock_evidence.return_value = ({}, {}, [])
    mock_gaps.return_value = {
        "target_careers": ["Full Stack Developer"],
        "skill_gaps": [
            {"skill_name": "SQL", "priority": "High Priority", "required_by_careers": ["Full Stack Developer"]},
            {"skill_name": "REST API", "priority": "Medium Priority", "required_by_careers": ["Full Stack Developer"]}
        ]
    }
    mock_recs.return_value = {
        "status": "success",
        "data": [
            {
                "course_id": mock_courses[0].id,
                "title": mock_courses[0].title,
                "all_skills": ["SQL", "PostgreSQL"],
                "covered_skill_gaps": [{"skill_name": "SQL"}],
                "learning_path": {"stage": "Foundation", "sequence_order": 1},
                "reason": "Covers SQL"
            },
            {
                "course_id": mock_courses[1].id,
                "title": mock_courses[1].title,
                "all_skills": ["REST API", "Node.js"],
                "covered_skill_gaps": [{"skill_name": "REST API"}],
                "learning_path": {"stage": "Intermediate", "sequence_order": 2},
                "reason": "Covers REST API"
            }
        ]
    }

    path_data = learning_path_service.generate_learning_path(
        db=db_session,
        student_email=mock_student.email,
        target_careers=["Full Stack Developer"]
    )

    assert path_data["status"] == "active"
    assert path_data["student_email"] == mock_student.email
    assert path_data["progress_percent"] == 0.0
    assert len(path_data["items"]) == 2
    assert "Foundation" in path_data["stages"]
    assert "Intermediate" in path_data["stages"]

    # Verify stage grouping
    assert len(path_data["stages"]["Foundation"]) >= 1
    assert path_data["stages"]["Foundation"][0]["skill_name"] == "SQL"


def test_generate_learning_path_student_not_found(db_session: Session):
    with pytest.raises(ValueError, match="not found"):
        learning_path_service.generate_learning_path(
            db=db_session,
            student_email="non_existent_student@test.com"
        )


# ---------------------------------------------------------------------------
# 2. Progress Updating & Status Transitions
# ---------------------------------------------------------------------------
def test_update_learning_path_item_progress_auto_transitions(db_session: Session, mock_student, mock_courses):
    # Create test path & item
    path = models.LearningPath(
        student_id=mock_student.id,
        name="Test Progress Path",
        target_careers=json.dumps(["Full Stack Developer"]),
        status="active",
        progress_percent=0.0
    )
    db_session.add(path)
    db_session.flush()

    item1 = models.LearningPathItem(
        learning_path_id=path.id,
        course_id=mock_courses[0].id,
        skill_name="SQL",
        stage="Foundation",
        sequence_order=1,
        status="not_started",
        progress_percent=0.0
    )
    item2 = models.LearningPathItem(
        learning_path_id=path.id,
        course_id=mock_courses[1].id,
        skill_name="REST API",
        stage="Intermediate",
        sequence_order=2,
        status="not_started",
        progress_percent=0.0
    )
    db_session.add_all([item1, item2])
    db_session.commit()

    # Step 1: Update item 1 to 50% -> in_progress
    res1 = learning_path_service.update_learning_path_item_progress(
        db=db_session,
        path_id=path.id,
        item_id=item1.id,
        progress_percent=50.0,
        student_email=mock_student.email
    )
    assert res1["status"] == "in_progress"
    assert res1["progress_percent"] == 50.0
    assert res1["started_at"] is not None

    # Check parent path progress: (50 + 0) / 2 = 25.0%
    path_detail = learning_path_service.get_learning_path_detail(db=db_session, path_id=path.id)
    assert path_detail["progress_percent"] == 25.0
    assert path_detail["status"] == "active"

    # Step 2: Update item 1 to 100% -> completed
    res1_comp = learning_path_service.update_learning_path_item_progress(
        db=db_session,
        path_id=path.id,
        item_id=item1.id,
        progress_percent=100.0,
        student_email=mock_student.email
    )
    assert res1_comp["status"] == "completed"
    assert res1_comp["completed_at"] is not None

    # Step 3: Skip item 2 -> skipped
    res2_skip = learning_path_service.update_learning_path_item_progress(
        db=db_session,
        path_id=path.id,
        item_id=item2.id,
        status_override="skipped",
        student_email=mock_student.email
    )
    assert res2_skip["status"] == "skipped"

    # Since all items are completed or skipped, parent path should be completed (100.0%)
    path_detail_final = learning_path_service.get_learning_path_detail(db=db_session, path_id=path.id)
    assert path_detail_final["status"] == "completed"
    assert path_detail_final["progress_percent"] == 100.0
    assert path_detail_final["completed_at"] is not None


def test_update_learning_path_item_invalid_progress(db_session: Session, mock_student, mock_courses):
    path = models.LearningPath(student_id=mock_student.id, name="Test Path", status="active")
    db_session.add(path)
    db_session.flush()
    item = models.LearningPathItem(learning_path_id=path.id, course_id=mock_courses[0].id, skill_name="SQL")
    db_session.add(item)
    db_session.commit()

    with pytest.raises(ValueError, match="between 0.0 and 100.0"):
        learning_path_service.update_learning_path_item_progress(
            db=db_session,
            path_id=path.id,
            item_id=item.id,
            progress_percent=150.0
        )

    with pytest.raises(ValueError, match="between 0.0 and 100.0"):
        learning_path_service.update_learning_path_item_progress(
            db=db_session,
            path_id=path.id,
            item_id=item.id,
            progress_percent=-10.0
        )


def test_learning_path_ownership_security(db_session: Session, mock_student, mock_courses):
    path = models.LearningPath(student_id=mock_student.id, name="Test Path", status="active")
    db_session.add(path)
    db_session.flush()
    item = models.LearningPathItem(learning_path_id=path.id, course_id=mock_courses[0].id, skill_name="SQL")
    db_session.add(item)
    db_session.commit()

    with pytest.raises(PermissionError, match="Access denied"):
        learning_path_service.update_learning_path_item_progress(
            db=db_session,
            path_id=path.id,
            item_id=item.id,
            progress_percent=50.0,
            student_email="unauthorized_other_user@test.com"
        )


# ---------------------------------------------------------------------------
# 3. Path Refreshing Tests
# ---------------------------------------------------------------------------
@patch("app.services.esco_service.load_student_evidence_from_db")
@patch("app.services.esco_service.calculate_multi_career_skill_gaps")
@patch("app.services.course_recommendation_service.get_personalized_course_recommendations")
def test_refresh_learning_path_preserves_history(mock_recs, mock_gaps, mock_evidence, db_session: Session, mock_student, mock_courses):
    mock_evidence.return_value = ({}, {}, [])
    # New gaps: SQL is closed, Docker is a new gap
    mock_gaps.return_value = {
        "target_careers": ["Full Stack Developer"],
        "skill_gaps": [
            {"skill_name": "REST API", "priority": "High Priority"},
            {"skill_name": "Docker", "priority": "High Priority"}
        ]
    }
    mock_recs.return_value = {
        "status": "success",
        "data": [
            {
                "course_id": mock_courses[0].id,
                "title": "Docker Fundamentals",
                "all_skills": ["Docker"],
                "learning_path": {"stage": "Advanced", "sequence_order": 3}
            }
        ]
    }

    # Setup path with 1 completed course (SQL), 1 in_progress (REST API), and 1 obsolete not_started (HTML)
    path = models.LearningPath(
        student_id=mock_student.id,
        name="Refresh Test Path",
        target_careers=json.dumps(["Full Stack Developer"]),
        status="active"
    )
    db_session.add(path)
    db_session.flush()

    it_comp = models.LearningPathItem(
        learning_path_id=path.id, course_id=mock_courses[0].id, skill_name="SQL",
        status="completed", progress_percent=100.0
    )
    it_prog = models.LearningPathItem(
        learning_path_id=path.id, course_id=mock_courses[1].id, skill_name="REST API",
        status="in_progress", progress_percent=40.0
    )
    it_obs = models.LearningPathItem(
        learning_path_id=path.id, course_id=mock_courses[0].id, skill_name="HTML",
        status="not_started", progress_percent=0.0
    )
    db_session.add_all([it_comp, it_prog, it_obs])
    db_session.commit()

    # Refresh path
    refreshed = learning_path_service.refresh_learning_path(
        db=db_session,
        path_id=path.id,
        student_email=mock_student.email
    )

    item_skill_names = [it["skill_name"] for it in refreshed["items"]]
    # Completed SQL and in-progress REST API must be preserved!
    assert "SQL" in item_skill_names
    assert "REST API" in item_skill_names
    # Obsolete unstarted HTML must be removed!
    assert "HTML" not in item_skill_names
    # Newly emerged gap Docker must be added!
    assert "Docker" in item_skill_names


# ---------------------------------------------------------------------------
# 4. Learning Path Analytics Tests
# ---------------------------------------------------------------------------
def test_learning_path_analytics(db_session: Session, mock_student, mock_courses):
    path = models.LearningPath(
        student_id=mock_student.id,
        name="Analytics Path",
        target_careers=json.dumps(["Full Stack Developer"]),
        status="active",
        progress_percent=50.0
    )
    db_session.add(path)
    db_session.flush()

    it1 = models.LearningPathItem(learning_path_id=path.id, course_id=mock_courses[0].id, skill_name="SQL", status="completed", progress_percent=100.0)
    it2 = models.LearningPathItem(learning_path_id=path.id, course_id=mock_courses[1].id, skill_name="REST API", status="in_progress", progress_percent=50.0)
    db_session.add_all([it1, it2])
    db_session.commit()

    analytics = learning_path_service.get_learning_path_analytics(db=db_session, path_id=path.id)
    assert analytics["courses_total"] == 2
    assert analytics["courses_completed"] == 1
    assert analytics["courses_in_progress"] == 1
    assert analytics["skills_addressed"] == 1
    assert analytics["skills_remaining"] == 1
    assert "Full Stack Developer" in analytics["career_coverage"]


# ---------------------------------------------------------------------------
# 5. API Endpoints Integration Tests
# ---------------------------------------------------------------------------
@patch("app.services.esco_service.load_student_evidence_from_db")
@patch("app.services.esco_service.calculate_multi_career_skill_gaps")
@patch("app.services.course_recommendation_service.get_personalized_course_recommendations")
def test_api_learning_path_crud_endpoints(mock_recs, mock_gaps, mock_evidence, mock_student, mock_courses):
    mock_evidence.return_value = ({}, {}, [])
    mock_gaps.return_value = {
        "target_careers": ["Backend Developer"],
        "skill_gaps": [{"skill_name": "SQL", "priority": "High"}]
    }
    mock_recs.return_value = {
        "status": "success",
        "data": [
            {
                "course_id": mock_courses[0].id,
                "title": mock_courses[0].title,
                "all_skills": ["SQL"],
                "learning_path": {"stage": "Foundation", "sequence_order": 1}
            }
        ]
    }

    # 1. POST /api/v1/learning-paths
    create_res = client.post(
        "/api/v1/learning-paths",
        json={"email": mock_student.email, "target_careers": ["Backend Developer"]}
    )
    assert create_res.status_code == 200
    created_path = create_res.json()
    path_id = created_path["id"]
    item_id = created_path["items"][0]["id"]

    # 2. GET /api/v1/learning-paths?email=...
    list_res = client.get(f"/api/v1/learning-paths?email={mock_student.email}")
    assert list_res.status_code == 200
    assert list_res.json()["count"] >= 1

    # 3. GET /api/v1/learning-paths/{id}
    detail_res = client.get(f"/api/v1/learning-paths/{path_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == path_id

    # 4. PATCH /api/v1/learning-paths/{path_id}/items/{item_id}
    patch_res = client.patch(
        f"/api/v1/learning-paths/{path_id}/items/{item_id}",
        json={"progress_percent": 80.0, "email": mock_student.email}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["progress_percent"] == 80.0
    assert patch_res.json()["status"] == "in_progress"

    # 5. GET /api/v1/learning-paths/{path_id}/analytics
    analytics_res = client.get(f"/api/v1/learning-paths/{path_id}/analytics")
    assert analytics_res.status_code == 200
    assert analytics_res.json()["courses_in_progress"] == 1
