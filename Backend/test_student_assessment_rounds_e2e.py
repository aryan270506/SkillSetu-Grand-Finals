import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app import models
from main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_student_rounds.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()
    import os
    if os.path.exists("./test_student_rounds.db"):
        os.remove("./test_student_rounds.db")

def test_student_rounds_complete_lifecycle():
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    db = TestingSessionLocal()

    # 1. Create Recruiter, Company, Student, and Internship
    recruiter = models.RecruiterUser(
        id=101, email="recruiter_test@skillsetu.com", name="Lead Recruiter", password_hash="hash", company_name="Catalyst Coders"
    )
    db.add(recruiter)
    db.commit()

    company = models.Company(
        id=201, name="Catalyst Coders", description="Top Dev Firm"
    )
    db.add(company)
    db.commit()

    student = models.StudentUser(
        id=301, email="student_test@skillsetu.com", name="Aryan Bhoge", degree="B.Tech", password_hash="hash"
    )
    db.add(student)
    db.commit()

    posting = models.InternshipPosting(
        id=401, company_id=company.id, recruiter_id=recruiter.id, title="Full Stack Developer Intern",
        description="Build state of the art web apps", status="ACTIVE"
    )
    db.add(posting)
    db.commit()

    # 2. Configure 4-Round Assessment Pipeline
    pipeline_cfg = {
        "round_sequence": ["aptitude", "technical", "interview", "gd"],
        "aptitude": {"enabled": True, "duration_min": 25, "schedule": {"start_date": "2026-10-01", "start_time": "00:00", "end_date": "2026-10-30", "end_time": "23:59"}},
        "technical": {"enabled": True, "duration_min": 40, "schedule": {"start_date": "2026-10-01", "start_time": "00:00", "end_date": "2026-10-30", "end_time": "23:59"}},
        "interview": {"enabled": True, "duration_min": 20, "schedule": {"start_date": "2026-10-01", "start_time": "00:00", "end_date": "2026-10-30", "end_time": "23:59"}},
        "gd": {"enabled": True, "discussion_time_min": 15, "prep_time_min": 3, "schedule": {"start_date": "2026-10-01", "start_time": "00:00", "end_date": "2026-10-30", "end_time": "23:59"}},
    }
    scoring_weights = {"aptitude": 25, "technical": 35, "interview": 20, "gd": 20, "passing_threshold": 60}

    cfg = models.InternshipAssessmentConfig(
        id=501, internship_id=posting.id, company_id=company.id, recruiter_id=recruiter.id, is_active=True,
        pipeline_config=json.dumps(pipeline_cfg),
        scoring_weights=json.dumps(scoring_weights)
    )
    db.add(cfg)
    db.commit()

    # 3. Student Applies
    application = models.InternshipApplication(
        id=601, student_id=student.id, internship_id=posting.id, source_id=str(posting.id),
        status="APPLIED"
    )
    db.add(application)
    db.commit()

    # Verify Applications Endpoint initially
    res = client.get(f"/api/v1/student/applications?email={student.email}")
    assert res.status_code == 200
    data = res.json()["data"]["internships"]
    assert len(data) >= 1
    assert data[0]["application_status"] == "APPLIED"
    assert data[0]["nextAction"] == "Under Recruiter Review"

    # Verify Rounds Endpoint for un-shortlisted candidate (all locked or awaiting recruiter)
    res_rounds = client.get(f"/api/v1/student/assessment-rounds?email={student.email}")
    assert res_rounds.status_code == 200
    rounds_data = res_rounds.json()["data"][0]
    assert rounds_data["has_pipeline"] is True
    assert len(rounds_data["rounds"]) == 4
    assert rounds_data["rounds"][0]["round_name"] == "Aptitude"
    assert rounds_data["rounds"][1]["round_name"] == "Technical Assessment"
    assert rounds_data["rounds"][2]["round_name"] == "AI Voice Interview"
    assert rounds_data["rounds"][3]["round_name"] == "Group Discussion"

    # 4. Recruiter Shortlists Candidate
    application.status = "SHORTLISTED"
    db.commit()

    res_shortlisted = client.get(f"/api/v1/student/assessment-rounds?email={student.email}")
    s_rounds = res_shortlisted.json()["data"][0]["rounds"]
    # Round 1 is AVAILABLE
    assert s_rounds[0]["status"] == "AVAILABLE"
    # Round 2 is LOCKED with "Complete Aptitude first"
    assert s_rounds[1]["status"] == "LOCKED"
    assert "Complete Aptitude first" in s_rounds[1]["lock_reason"]

    # 5. Student Starts Round 1 (Aptitude)
    start_res = client.post(f"/api/v1/student/applications/{application.id}/assessment/start?email={student.email}")
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert start_data["round_key"] == "aptitude"
    assert "interview.html" in start_data["assessment_url"]

    # 6. Student Completes Round 1 (Webhook callback from Archive 2)
    session_rec = db.query(models.CandidateAssessmentSession).filter(
        models.CandidateAssessmentSession.application_id == application.id
    ).first()
    assert session_rec is not None
    session_rec.round_results = json.dumps({
        "aptitude": {"status": "COMPLETED", "score": 88}
    })
    db.commit()

    # Check Rounds Endpoint: Aptitude is COMPLETED, Technical is LOCKED ("Awaiting recruiter progression")
    res_after_r1 = client.get(f"/api/v1/student/assessment-rounds?email={student.email}")
    r1_rounds = res_after_r1.json()["data"][0]["rounds"]
    assert r1_rounds[0]["status"] == "COMPLETED"
    assert r1_rounds[0]["score"] == 88
    assert r1_rounds[1]["status"] == "LOCKED"
    assert "Awaiting recruiter progression" in r1_rounds[1]["lock_reason"]

    # 7. Recruiter Progresses Candidate to Round 2 (Technical)
    session_rec.current_round = "technical"
    db.commit()

    # Now Round 2 is AVAILABLE!
    res_prog_r2 = client.get(f"/api/v1/student/assessment-rounds?email={student.email}")
    r2_rounds = res_prog_r2.json()["data"][0]["rounds"]
    assert r2_rounds[1]["status"] == "AVAILABLE"
    assert r2_rounds[2]["status"] == "LOCKED"
    assert "Complete Technical Assessment first" in r2_rounds[2]["lock_reason"]

    # 8. Recruiter Rejects Application
    application.status = "REJECTED"
    application.notes = "Technical score did not meet criteria."
    db.commit()

    res_rej = client.get(f"/api/v1/student/assessment-rounds?email={student.email}")
    rej_data = res_rej.json()["data"][0]
    assert rej_data["application_status"] == "REJECTED"
    assert rej_data["rejection_reason"] == "Technical score did not meet criteria."
    # All non-completed rounds are locked
    for r in rej_data["rounds"]:
        if r["round_key"] != "aptitude":
            assert r["status"] == "LOCKED"

    # Trying to start an assessment while rejected returns 403 Forbidden
    rej_start = client.post(f"/api/v1/student/applications/{application.id}/assessment/start?email={student.email}")
    assert rej_start.status_code == 403

    # 9. Recruiter Selects Candidate
    application.status = "SELECTED"
    db.commit()
    res_sel = client.get(f"/api/v1/student/assessment-rounds?email={student.email}")
    sel_data = res_sel.json()["data"][0]
    assert sel_data["application_status"] == "SELECTED"
    assert sel_data["overall_status"] == "COMPLETED"
    for r in sel_data["rounds"]:
        assert r["status"] == "COMPLETED"

    # 10. No Pipeline Test
    posting_no_pipe = models.InternshipPosting(
        id=402, company_id=company.id, recruiter_id=recruiter.id, title="UI/UX Design Intern",
        description="Design interfaces", status="ACTIVE"
    )
    db.add(posting_no_pipe)
    app_no_pipe = models.InternshipApplication(
        id=602, student_id=student.id, internship_id=posting_no_pipe.id, source_id=str(posting_no_pipe.id),
        status="SHORTLISTED"
    )
    db.add(app_no_pipe)
    db.commit()

    res_all_apps = client.get(f"/api/v1/student/assessment-rounds?email={student.email}")
    all_data = res_all_apps.json()["data"]
    app2_data = next(a for a in all_data if a["application_id"] == 602)
    assert app2_data["has_pipeline"] is False
    assert len(app2_data["rounds"]) == 0
    assert app2_data["overall_status"] in ["NOT_CONFIGURED", "NO_PIPELINE"]

    db.close()
