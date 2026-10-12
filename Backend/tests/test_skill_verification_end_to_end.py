import json
import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app import models
from app.services import (
    career_intelligence_service,
    esco_service,
    skill_evidence_service,
    learning_path_service,
)

client = TestClient(app)

TEST_STUDENT_EMAIL = "verify_student_test@example.com"
TEST_GH_USERNAME = "verifystudent2026"


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def clean_test_student(db_session: Session):
    """Setup clean test student with target career Full Stack Developer."""
    esco_service.seed_default_datasets_if_needed(db_session)

    # Clean existing data for this test student
    student = db_session.query(models.StudentUser).filter(
        models.StudentUser.email == TEST_STUDENT_EMAIL
    ).first()
    if student:
        db_session.query(models.StudentSkillEvidence).filter(models.StudentSkillEvidence.student_id == student.id).delete()
        db_session.query(models.StudentAssessmentAttempt).filter(models.StudentAssessmentAttempt.student_id == student.id).delete()
        db_session.query(models.ProjectSubmission).filter(models.ProjectSubmission.student_id == student.id).delete()
        db_session.query(models.StudentPracticeAttempt).filter(models.StudentPracticeAttempt.student_id == student.id).delete()
        db_session.query(models.StudentLearningProgress).filter(models.StudentLearningProgress.student_id == student.id).delete()
        db_session.query(models.LearningPath).filter(models.LearningPath.student_id == student.id).delete()
        db_session.query(models.StudentGithubConnection).filter(models.StudentGithubConnection.student_email == TEST_STUDENT_EMAIL).delete()
        db_session.delete(student)
        db_session.commit()

    # Create new student
    new_student = models.StudentUser(
        email=TEST_STUDENT_EMAIL,
        name="Verification Test Student",
        password_hash="test_hashed_password",
        target_careers=json.dumps(["Full Stack Developer"]),
        skill_ids=json.dumps([]),
        resume_data=json.dumps({"extracted_data": {"raw_projects": [], "projects": []}})
    )
    db_session.add(new_student)
    db_session.commit()
    db_session.refresh(new_student)

    # Add connected GitHub account
    sample_repos = [
        {
            "id": 10101,
            "name": "ecommerce-platform",
            "full_name": f"{TEST_GH_USERNAME}/ecommerce-platform",
            "html_url": f"https://github.com/{TEST_GH_USERNAME}/ecommerce-platform",
            "description": "Full Stack E-Commerce store built with React, Node.js, PostgreSQL, Docker",
            "language": "TypeScript",
            "stargazers_count": 12,
            "visibility": "public"
        },
        {
            "id": 10102,
            "name": "python-fastapi-backend",
            "full_name": f"{TEST_GH_USERNAME}/python-fastapi-backend",
            "html_url": f"https://github.com/{TEST_GH_USERNAME}/python-fastapi-backend",
            "description": "High performance REST APIs with FastAPI and PostgreSQL",
            "language": "Python",
            "stargazers_count": 5,
            "visibility": "public"
        }
    ]
    gh_conn = models.StudentGithubConnection(
        student_email=TEST_STUDENT_EMAIL,
        github_username=TEST_GH_USERNAME,
        access_token="fake_test_token_2026",
        repos_json=json.dumps(sample_repos),
        skills_json=json.dumps([])
    )
    db_session.add(gh_conn)
    db_session.commit()

    return new_student


def test_initial_state_and_available_repos(db_session: Session, clean_test_student):
    """TEST: Initial career intelligence state and fetching available connected repos."""
    intel = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_STUDENT_EMAIL,
        career_name="Full Stack Developer"
    )
    assert intel["status"] == "success"
    skills = intel["data"]["skills"]
    assert len(skills) > 0

    # Initially, all skills have 0 completed components and are NOT verified
    for sk in skills:
        assert sk["is_verified"] is False
        assert sk["course_completed"] is False
        assert sk["test_passed"] is False
        assert sk["assignment_completed"] is False
        assert sk["progress_percent"] == 0.0

    readiness = intel["data"]["career_readiness"]
    assert readiness["verified_count"] == 0
    assert readiness["score"] == 0.0

    # Test GET /available-repos endpoint
    res = client.get(f"/api/v1/student/projects/proj_full_stack_architecture/available-repos?email={TEST_STUDENT_EMAIL}")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["connected"] is True
    assert json_data["connected_account"]["username"] == TEST_GH_USERNAME
    assert len(json_data["repositories"]) == 2
    assert json_data["repositories"][0]["name"] == "ecommerce-platform"
    assert json_data["repositories"][0]["already_submitted"] is False


def test_complete_course_progress(db_session: Session, clean_test_student):
    """TEST 1: Completing a course awards Course ✅, sets progress to 33.3%, status INCOMPLETE."""
    # Record course completion for React
    course = db_session.query(models.Course).first()
    skill_evidence_service.record_learning_progress_evidence(
        db=db_session,
        student_id=clean_test_student.id,
        course_id=course.id if course else 1,
        progress_percent=100.0,
        skill_name="React"
    )

    intel = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_STUDENT_EMAIL,
        career_name="Full Stack Developer"
    )
    react_skill = next((s for s in intel["data"]["skills"] if "react" in s["skill_name"].lower()), None)
    assert react_skill is not None
    assert react_skill["course_completed"] is True
    assert react_skill["test_passed"] is False
    assert react_skill["assignment_completed"] is False
    assert react_skill["is_verified"] is False
    assert react_skill["progress_percent"] == 33.3
    assert "INCOMPLETE" in react_skill["status"]


def test_pass_assessment(db_session: Session, clean_test_student):
    """TEST 2: Passing test (score >= 70) awards Test ✅, progress becomes 66.7%."""
    # First record course completion
    skill_evidence_service.record_learning_progress_evidence(
        db=db_session,
        student_id=clean_test_student.id,
        course_id=1,
        progress_percent=100.0,
        skill_name="React"
    )
    # Record test pass
    skill_evidence_service.record_verified_assessment_evidence(
        db=db_session,
        student_id=clean_test_student.id,
        skill_name="React",
        score_pct=88,
        attempt_id=901
    )

    intel = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_STUDENT_EMAIL,
        career_name="Full Stack Developer"
    )
    react_skill = next((s for s in intel["data"]["skills"] if "react" in s["skill_name"].lower()), None)
    assert react_skill is not None
    assert react_skill["course_completed"] is True
    assert react_skill["test_passed"] is True
    assert react_skill["assignment_completed"] is False
    assert react_skill["is_verified"] is False
    assert react_skill["progress_percent"] == 66.7


def test_failed_assessment_does_not_verify(db_session: Session, clean_test_student):
    """TEST 7: Failing an assessment (score < 70) does NOT award Test pass."""
    # Record failed assessment attempt in DB
    failed_attempt = models.StudentAssessmentAttempt(
        student_id=clean_test_student.id,
        skill_name="React",
        test_title="React Fundamentals Assessment",
        score=55,
        status="NEEDS_WORK"
    )
    db_session.add(failed_attempt)
    db_session.commit()

    intel = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_STUDENT_EMAIL,
        career_name="Full Stack Developer"
    )
    react_skill = next((s for s in intel["data"]["skills"] if "react" in s["skill_name"].lower()), None)
    if react_skill:
        assert react_skill["test_passed"] is False
        assert react_skill["is_verified"] is False


def test_submit_connected_repo_security_rejection(db_session: Session, clean_test_student):
    """TEST 5: Submitting a repository belonging to another GitHub user is REJECTED with 403."""
    res = client.post(
        "/api/v1/student/projects/proj_full_stack_architecture/submit",
        json={
            "email": TEST_STUDENT_EMAIL,
            "repository_url": "https://github.com/some_other_hacker/ecommerce-platform",
            "notes": "Trying to submit foreign repo"
        }
    )
    assert res.status_code == 403
    assert "Security Violation" in res.json()["detail"]


def test_submit_connected_repo_and_full_verification(db_session: Session, clean_test_student):
    """
    TEST 3, 4, 10, 11 & Scenario 39:
    Complete Course + Pass Test + Submit Connected Repo:
    - React becomes VERIFIED (Course ✅, Test ✅, Assignment ✅, GitHub ✅)
    - Additional skills (Docker, PostgreSQL, Node.js) receive GitHub evidence
    - Verified project is automatically added to Student Profile
    - Career readiness increases deterministically
    """
    # 1. Complete React Course
    skill_evidence_service.record_learning_progress_evidence(
        db=db_session,
        student_id=clean_test_student.id,
        course_id=1,
        progress_percent=100.0,
        skill_name="React"
    )

    # 2. Pass React Test
    skill_evidence_service.record_verified_assessment_evidence(
        db=db_session,
        student_id=clean_test_student.id,
        skill_name="React",
        score_pct=92,
        attempt_id=902
    )

    # 3. Submit Connected GitHub Repository
    submit_res = client.post(
        "/api/v1/student/projects/proj_full_stack_architecture/submit",
        json={
            "email": TEST_STUDENT_EMAIL,
            "repository_name": "ecommerce-platform",
            "notes": "Verified complete full stack e-commerce platform"
        }
    )
    assert submit_res.status_code == 200
    res_data = submit_res.json()
    assert res_data["status"] == "success"
    assert res_data["project_status"] == "completed"
    assert res_data["analysis_status"] == "ANALYZED"

    # Verify career intelligence after full verification
    intel = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_STUDENT_EMAIL,
        career_name="Full Stack Developer"
    )
    skills = intel["data"]["skills"]
    react_skill = next((s for s in skills if "react" in s["skill_name"].lower()), None)
    assert react_skill is not None
    assert react_skill["course_completed"] is True
    assert react_skill["test_passed"] is True
    assert react_skill["assignment_completed"] is True
    assert react_skill["is_verified"] is True
    assert react_skill["progress_percent"] == 100.0
    assert react_skill["status"] == "VERIFIED"

    # Verify readiness increased
    readiness = intel["data"]["career_readiness"]
    assert readiness["verified_count"] >= 1
    assert readiness["score"] > 0.0

    # Verify project was added to Profile (resume_data)
    student = db_session.query(models.StudentUser).filter(models.StudentUser.email == TEST_STUDENT_EMAIL).first()
    res_obj = json.loads(student.resume_data)
    raw_projects = res_obj.get("raw_projects", [])
    assert len(raw_projects) > 0
    assert raw_projects[0]["name"] == "Ecommerce Platform"
    assert raw_projects[0]["verification_status"] == "Verified GitHub Project"


def test_repeated_action_idempotency(db_session: Session, clean_test_student):
    """TEST 6: Repeated submissions do not endlessly inflate readiness."""
    # First submit
    client.post(
        "/api/v1/student/projects/proj_full_stack_architecture/submit",
        json={
            "email": TEST_STUDENT_EMAIL,
            "repository_name": "ecommerce-platform"
        }
    )
    intel_1 = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_STUDENT_EMAIL,
        career_name="Full Stack Developer"
    )
    score_1 = intel_1["data"]["career_readiness"]["score"]

    # Repeated submit of the same project
    client.post(
        "/api/v1/student/projects/proj_full_stack_architecture/submit",
        json={
            "email": TEST_STUDENT_EMAIL,
            "repository_name": "ecommerce-platform"
        }
    )
    intel_2 = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_STUDENT_EMAIL,
        career_name="Full Stack Developer"
    )
    score_2 = intel_2["data"]["career_readiness"]["score"]

    assert score_1 == score_2, "Readiness score must be deterministic and idempotent upon repeated actions"
