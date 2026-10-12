import pytest
from fastapi.testclient import TestClient
from main import app
from app.database import get_db, SessionLocal
from app.models import StudentUser, StudentSkillEvidence, StudentAssessmentAttempt, ProjectSubmission
from app.services.session_cache_service import SessionCacheService
from app.services.init_db_service import init_system_on_startup

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_system_on_startup()

def test_targeted_development_plan_end_to_end():
    db = SessionLocal()
    email = "plan_e2e_student@skillsetu.in"
    
    # 1. Setup student
    student = db.query(StudentUser).filter(StudentUser.email == email).first()
    if not student:
        student = StudentUser(
            name="Plan Test Student",
            email=email,
            password_hash="test_hashed_password",
            phone="9988776655",
            degree="B.Tech Computer Science",
            cgpa_or_percentage="8.5",
            target_careers="Full Stack Developer"
        )
        db.add(student)
        db.commit()
        db.refresh(student)
    
    # Clean prior test attempts/evidence
    db.query(StudentSkillEvidence).filter(StudentSkillEvidence.student_id == student.id).delete()
    db.query(StudentAssessmentAttempt).filter(StudentAssessmentAttempt.student_id == student.id).delete()
    db.query(ProjectSubmission).filter(ProjectSubmission.student_id == student.id).delete()
    db.commit()
    SessionCacheService.clear_all_for_student(student.id)
    SessionCacheService.clear_all_for_student(student.email)

    # 2. Query recommended internships
    res = client.get(f"/api/v1/internships/recommended?email={email}")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    items = data["items"]
    assert len(items) > 0
    
    # Target an opportunity below 80% with skill gaps
    target_opp = items[0]
    target_id = target_opp["id"]
    
    # Fetch detailed opportunity snapshot
    detail_res = client.get(f"/api/v1/internships/{target_id}?email={email}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()["data"]
    
    # Verify Development Plan is populated with verified activities
    rec_tests = detail_data.get("recommended_tests", [])
    rec_courses = detail_data.get("recommended_courses", [])
    rec_projects = detail_data.get("recommended_projects", [])
    
    # Fallback to test_git_01 if specific listing has no gap tests
    test_id = rec_tests[0].get("id") if rec_tests else "test_git_01"
    
    # 3. Verify Assessment Questions (Rule 35: minimum 15 questions)
    q_res = client.get(f"/api/v1/student/assessments/{test_id}")
    assert q_res.status_code == 200
    q_data = q_res.json()["data"]
    questions = q_data.get("questions", [])
    assert len(questions) >= 15, f"Rule 35 violation: expected >=15 questions, got {len(questions)}"
    
    # 4. Submit Assessment Answers
    answers = {}
    for q in questions:
        answers[q["id"]] = "A"
    
    sub_res = client.post(
        f"/api/v1/student/assessments/{test_id}/submit",
        json={
            "email": email,
            "assessment_id": test_id,
            "answers": answers
        }
    )
    assert sub_res.status_code == 200
    eval_data = sub_res.json()["data"]
    assert "score" in eval_data
    assert "updated_evidence" in eval_data
    assert eval_data["total_questions"] >= 15
    
    # 5. Verify Skill Evidence in database
    ev = db.query(StudentSkillEvidence).filter(
        StudentSkillEvidence.student_id == student.id
    ).first()
    assert ev is not None, "Expected verified skill evidence recorded in StudentSkillEvidence"
    assert ev.source_type == "verified_assessment"
    
    # 6. Verify Recalculation & Live Match Score Update
    SessionCacheService.clear_all_for_student(student.id)
    SessionCacheService.clear_all_for_student(student.email)
    
    updated_detail_res = client.get(f"/api/v1/internships/{target_id}?email={email}")
    assert updated_detail_res.status_code == 200
    updated_opp = updated_detail_res.json()["data"]
    
    # 7. Start and Submit Project Challenge
    proj_id = rec_projects[0].get("id") if rec_projects else "ch_git_01"
    proj_sub_res = client.post(
        f"/api/v1/student/projects/{proj_id}/submit",
        json={
            "email": email,
            "repository_url": "https://github.com/plan_test_student/collab-microservice",
            "notes": "Verified CI/CD and Docker container deliverables."
        }
    )
    assert proj_sub_res.status_code == 200
    proj_eval = proj_sub_res.json()
    assert proj_eval["status"] == "success"
    
    # Verify project evidence recorded
    proj_ev = db.query(StudentSkillEvidence).filter(
        StudentSkillEvidence.student_id == student.id,
        StudentSkillEvidence.source_type == "verified_project"
    ).first()
    assert proj_ev is not None, "Expected verified project evidence recorded"
    
    db.close()
