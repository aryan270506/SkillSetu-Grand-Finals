import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from app.database import SessionLocal
from app.models import StudentUser, Course, CourseSkill, Provider, LearningPath, LearningPathItem
from app.services import (
    career_intelligence_service,
    learning_path_service,
    skill_evidence_service
)


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



def test_career_intelligence_same_career_and_readiness(db_session: Session):
    """Verify that career intelligence returns identical career ID, name, and readiness."""
    res = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com",
        career_name="Full Stack Developer"
    )
    assert res["status"] == "success"
    data = res["data"]
    assert data["active_career"]["name"] == "Full Stack Developer"
    assert data["active_career"]["id"] == "car_full_stack_developer"
    assert "score" in data["career_readiness"]
    assert "verified_count" in data["career_readiness"]
    assert "total_skills" in data["career_readiness"]


def test_career_intelligence_same_esco_skills(db_session: Session):
    """Verify that required skills expose canonical ESCO skill IDs."""
    res = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com"
    )
    skills = res["data"]["skills"]
    assert len(skills) > 0
    for sk in skills:
        assert "skill_id" in sk
        assert "esco_id" in sk
        assert "skill_name" in sk
        assert "current_score" in sk
        assert "target_score" in sk
        assert "gap" in sk
        assert sk["canonical_status"] in {
            "verified", "learning_active", "developing", "needs_improvement",
            "assessment_required", "certificate_required", "evidence_required", "failed_assessment"
        }


def test_career_intelligence_same_course_ids_across_views(db_session: Session):
    """Verify recommended course IDs in skills match course IDs in the active learning path."""
    res = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com"
    )
    data = res["data"]
    learning_path = data["learning_path"]
    assert learning_path is not None
    path_course_ids = {item["course_id"] for item in learning_path["items"]}

    # Courses referenced under skills that are in the active path must have matching course_ids
    for sk in data["skills"]:
        for rc in sk["recommended_courses"]:
            assert "course_id" in rc
            assert "title" in rc
            assert "provider" in rc
            assert rc["provider"] in {"nptel", "youtube", "freecodecamp"}
            if rc.get("learning_path_item_id"):
                assert rc["course_id"] in path_course_ids


def test_career_intelligence_progress_synchronization(db_session: Session):
    """Verify updating learning path item progress immediately synchronizes with skill course views."""
    res = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com"
    )
    lp = res["data"]["learning_path"]
    assert lp and lp["items"]
    item = lp["items"][0]
    item_id = item["id"]
    path_id = lp["id"]

    # Update item progress to 75%
    learning_path_service.update_learning_path_item_progress(
        db=db_session,
        path_id=path_id,
        item_id=item_id,
        progress_percent=75.0,
        student_email="abhoge27@gmail.com"
    )

    # Re-fetch Career Intelligence
    res_after = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com"
    )

    # 1. Path item must show 75% and in_progress
    updated_path_item = next(it for it in res_after["data"]["learning_path"]["items"] if it["id"] == item_id)
    assert updated_path_item["progress_percent"] == 75.0
    assert updated_path_item["status"] == "in_progress"

    # 2. Skill view of this course must also reflect 75% and in_progress
    matched_in_skills = False
    for sk in res_after["data"]["skills"]:
        for rc in sk["recommended_courses"]:
            if rc.get("learning_path_item_id") == item_id:
                assert rc["progress_percent"] == 75.0
                assert rc["status"] == "in_progress"
                matched_in_skills = True

    assert matched_in_skills is True


def test_career_intelligence_phase9_evidence_update(db_session: Session):
    """Verify completing course (100%) triggers Phase 9 learning evidence recording."""
    res = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com"
    )
    lp = res["data"]["learning_path"]
    item = lp["items"][0]

    # Update to 100%
    learning_path_service.update_learning_path_item_progress(
        db=db_session,
        path_id=lp["id"],
        item_id=item["id"],
        progress_percent=100.0,
        student_email="abhoge27@gmail.com"
    )

    # Verify skill evidence service contains evidence for student
    ev_summary = skill_evidence_service.get_unified_skill_evidence(db=db_session, student_email="abhoge27@gmail.com")
    assert "skills" in ev_summary
    assert len(ev_summary["skills"]) > 0


def test_career_intelligence_career_switch(db_session: Session):
    """Verify career switch dynamically updates required skills and active career."""
    res_fs = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com",
        career_name="Full Stack Developer"
    )
    res_mob = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com",
        career_name="Mobile App Developer"
    )

    assert res_fs["data"]["active_career"]["name"] == "Full Stack Developer"
    assert res_mob["data"]["active_career"]["name"] == "Mobile App Developer"
    assert res_fs["data"]["active_career"]["id"] != res_mob["data"]["active_career"]["id"]


def test_career_intelligence_multi_skill_course_deduplication(db_session: Session):
    """Verify one course addressing multiple skills appears once in learning path with secondary gaps."""
    res = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email="abhoge27@gmail.com"
    )
    items = res["data"]["learning_path"]["items"]
    course_ids = [it["course_id"] for it in items]
    # No duplicate course IDs in learning path
    assert len(course_ids) == len(set(course_ids))


def test_api_career_intelligence_endpoint(client: TestClient):
    """Test GET /api/v1/student/career-intelligence HTTP endpoint."""
    response = client.get("/api/v1/student/career-intelligence?email=abhoge27@gmail.com")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "success"
    assert "data" in json_data
    assert "skills" in json_data["data"]
    assert "learning_path" in json_data["data"]
    assert "career_readiness" in json_data["data"]
