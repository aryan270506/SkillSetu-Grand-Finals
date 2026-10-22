import pytest
import uuid
import json
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from app.database import SessionLocal
from app import models, security
from app.services.candidate_progression_service import CandidateProgressionService


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


@pytest.fixture
def recruiter_test_env(db_session: Session):
    """Sets up a clean company, recruiter, active internship posting, and students."""
    comp_unique = f"testcomp_{uuid.uuid4().hex[:8]}"
    company = models.Company(
        name=f"Acme Systems {comp_unique}",
        email=f"{comp_unique}@acme.example.com",
        website="https://acme.example.com",
        industry="Software Engineering",
        description="Leading software enterprise building next-gen developer platforms.",
        mission="Empower engineers worldwide with intuitive cloud software solutions.",
        vision="To be the global benchmark in enterprise developer platforms.",
        headquarters="Bengaluru, Karnataka",
        company_type="Private Limited",
        company_size="51-200",
        founded_year="2020",
        culture_tags=json.dumps(["Innovation", "Ownership"]),
        perks=json.dumps(["Flexible Work", "Health Insurance"]),
        preferred_domains=json.dumps(["Backend Engineering", "Cloud"]),
        preferred_skills=json.dumps(["Python", "FastAPI", "PostgreSQL", "Docker"]),
        preferred_work_mode="Hybrid",
        preferred_duration="6 Months",
        is_email_verified=True,
        is_website_verified=True,
        is_business_verified=True,
        is_recruiter_verified=True,
        profile_completed=True,
        completion_percentage=100
    )
    db_session.add(company)
    db_session.flush()

    loc = models.CompanyLocation(company_id=company.id, title="Bengaluru, Karnataka", is_primary=True)
    db_session.add(loc)
    stage = models.CompanyHiringStage(company_id=company.id, order=1, title="Technical Assessment")
    db_session.add(stage)
    db_session.flush()

    recruiter = models.RecruiterUser(
        email=f"recruiter_{comp_unique}@acme.example.com",
        name="Lead Recruiter",
        company_name=company.name,
        company_id=company.id,
        password_hash=security.hash_password("SecretPassword123!"),
        is_verified=True,
        status="APPROVED"
    )
    db_session.add(recruiter)
    db_session.flush()

    # Create internship with custom stipend and duration
    posting = models.InternshipPosting(
        company_id=company.id,
        recruiter_id=recruiter.id,
        title="Backend Engineering Intern",
        department="Platform Infrastructure",
        location="Remote",
        work_mode="Remote",
        stipend="₹15,000/mo",
        duration="3 Months",
        openings=2,
        application_threshold=70,
        status="Active",
        automation_mode="REVIEW_GATED",
        automation_enabled=True,
        required_skills='["Python", "FastAPI", "SQL"]'
    )
    db_session.add(posting)
    db_session.flush()

    # Configure 2-round assessment pipeline
    cfg = models.InternshipAssessmentConfig(
        internship_id=posting.id,
        company_id=company.id,
        recruiter_id=recruiter.id,
        is_active=True,
        pipeline_config=json.dumps({
            "aptitude": {"passing_score": 60, "sequence": 1},
            "technical": {"passing_score": 65, "sequence": 2}
        })
    )
    db_session.add(cfg)

    # Student 1 with real profile data
    student1 = models.StudentUser(
        email=f"student1_{comp_unique}@univ.edu",
        password_hash="fakehash",
        name="Dev Candidate",
        degree="B.Tech Computer Engineering",
        university="State Technical University",
        branch="Information Technology",
        graduation_year="2026",
        cgpa_or_percentage="8.2/10",
        resume_score=82,
        is_verified=True
    )
    db_session.add(student1)
    db_session.flush()

    # Application 1
    app1 = models.InternshipApplication(
        internship_id=posting.id,
        student_id=student1.id,
        company_id=company.id,
        status="APPLIED",
        match_score_at_apply=84.0,
        application_threshold_at_apply=70,
        applied_at=datetime.now(timezone.utc) - timedelta(days=2)
    )
    db_session.add(app1)
    db_session.flush()

    # Student 2 (unassessed / new applicant, no match score yet)
    student2 = models.StudentUser(
        email=f"student2_{comp_unique}@univ.edu",
        password_hash="fakehash",
        name="Junior Candidate",
        degree="B.Sc Computer Science",
        university="National College",
        branch="Computer Science",
        graduation_year="2027",
        cgpa_or_percentage=None,
        resume_score=None,
        is_verified=True
    )
    db_session.add(student2)
    db_session.flush()

    app2 = models.InternshipApplication(
        internship_id=posting.id,
        student_id=student2.id,
        company_id=company.id,
        status="APPLIED",
        match_score_at_apply=None,
        application_threshold_at_apply=70,
        applied_at=datetime.now(timezone.utc) - timedelta(days=1)
    )
    db_session.add(app2)
    db_session.commit()

    token = security.create_access_token(
        data={"sub": recruiter.email, "role": "recruiter", "company_id": company.id}
    )

    return {
        "company": company,
        "recruiter": recruiter,
        "posting": posting,
        "student1": student1,
        "student2": student2,
        "app1": app1,
        "app2": app2,
        "token": token
    }


def test_recruiter_dashboard_zero_mock_data_and_truthful_aggregations(client: TestClient, recruiter_test_env):
    """Verifies recruiter dashboard returns real data without hardcoded fallbacks."""
    token = recruiter_test_env["token"]
    res = client.get("/api/v1/recruiter/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()["data"]

    # 1. Stats verification
    stats = data["stats"]
    assert stats["active_jobs"] == 1
    assert stats["total_applicants"] == 2
    # Real avg match score calculated from [84.0] -> "84%" (NOT hardcoded "88%")
    assert stats["avg_match_score"] == "84%"

    # 2. Selection funnel verification
    funnel = data["selection_funnel"]
    assert funnel["total_applications"] == 2
    # Turnaround days is not hardcoded "2.4"
    assert funnel["avg_turnaround_days"] == "—"

    # 3. Active internships verification
    internships = data["active_internships"]
    assert len(internships) == 1
    p = internships[0]
    assert p["stipend"] == "₹15,000/mo"  # Not hardcoded "₹35,000/mo"
    assert p["duration"] == "3 Months"  # Not hardcoded "6 Months"
    assert p["application_threshold"] == 70  # Real saved threshold

    # 4. Recent applications verification
    recent_apps = data["recent_applications"]
    assert len(recent_apps) == 2
    app_with_score = [a for a in recent_apps if a["id"] == recruiter_test_env['app1'].id][0]
    assert app_with_score["match_score"] == 84
    app_without_score = [a for a in recent_apps if a["id"] == recruiter_test_env['app2'].id][0]
    assert app_without_score["match_score"] is None  # Truthful None, not fabricated 85

    # 5. Recommended students verification
    recommended = data["recommended_students"]
    for s in recommended:
        # Must not contain canned placeholder array
        assert s.get("skills") != ["React ✓", "Python ✓", "SQL ✓", "Git/GitHub ✓"]
        if s["id"] == f"REC-{recruiter_test_env['student1'].id}":
            assert "CGPA 8.2/10" in s["degree"]  # Real CGPA, not fabricated 8.8


def test_recruiter_internships_persisted_fields_and_threshold(client: TestClient, recruiter_test_env):
    """Verifies internship listing and detail return real saved values."""
    token = recruiter_test_env["token"]
    posting = recruiter_test_env["posting"]

    # Listing
    res = client.get("/api/v1/recruiter/internships", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    internships = res.json()["internships"]
    assert len(internships) == 1
    assert internships[0]["stipend"] == "₹15,000/mo"
    assert internships[0]["duration"] == "3 Months"
    assert internships[0]["application_threshold"] == 70

    # Detail
    res_detail = client.get(f"/api/v1/recruiter/internships/{posting.id}", headers={"Authorization": f"Bearer {token}"})
    assert res_detail.status_code == 200
    detail = res_detail.json()["internship"]
    assert detail["stipend"] == "₹15,000/mo"
    assert detail["duration"] == "3 Months"
    assert detail["application_threshold"] == 70


def test_recruiter_applications_zero_mock_and_safe_null_match_scores(client: TestClient, recruiter_test_env):
    """Verifies applications list, detail, and CSV export handle null match scores truthfully."""
    token = recruiter_test_env["token"]
    app2 = recruiter_test_env["app2"]

    # Applications list
    res = client.get("/api/v1/recruiter/applications", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    apps_list = res.json()["applications"]
    row2 = [a for a in apps_list if a["id"] == app2.id][0]
    assert row2["match_score"] is None
    assert row2["matchPct"] == "—"
    assert row2["eligibility"] == "Pending"

    # CSV Export
    res_csv = client.get("/api/v1/recruiter/applications/export-csv", headers={"Authorization": f"Bearer {token}"})
    assert res_csv.status_code == 200
    csv_text = res_csv.text
    assert "84%" in csv_text
    assert "—" in csv_text  # row 2 has truthful dash, not fake 85%


def test_recruiter_multi_round_progression_score_integrity(db_session: Session, recruiter_test_env):
    """
    Verifies that unassessed rounds have None score, and advancing across rounds
    archives Round 1 results while resetting Round 2 overall_score to None.
    """
    company = recruiter_test_env["company"]
    recruiter = recruiter_test_env["recruiter"]
    posting = recruiter_test_env["posting"]
    app1 = recruiter_test_env["app1"]

    # 1. Start pipeline for candidate -> moves into Round 1 (aptitude)
    prog_res1 = CandidateProgressionService.progress_single_candidate(
        db=db_session,
        company_id=company.id,
        recruiter_id=recruiter.id,
        internship_id=posting.id,
        application_id=app1.id,
        action="SEND_TO_NEXT_ROUND"
    )
    assert prog_res1["status"] == "success"

    # Check session: Round 1 score MUST BE None before taking assessment
    session = db_session.query(models.CandidateAssessmentSession).filter_by(application_id=app1.id).first()
    assert session is not None
    assert session.current_round == "aptitude"
    assert session.overall_score is None  # MUST NOT be 80.0!

    round_score_initial = CandidateProgressionService.get_candidate_round_score(session, "aptitude", app1)
    assert round_score_initial is None

    # 2. Simulate completion of Round 1 with score 88.0
    session.overall_score = 88.0
    session.status = "COMPLETED"
    session.completed_at = datetime.now(timezone.utc)
    db_session.add(session)
    db_session.commit()

    details_r1 = CandidateProgressionService.get_candidate_progression_details(
        db=db_session,
        company_id=company.id,
        internship_id=posting.id,
        application_id=app1.id
    )
    assert details_r1["assessment_score"] == 88
    assert details_r1["is_score_qualified"] is True
    assert details_r1["can_progress"] is True
    assert details_r1["next_round_key"] == "technical"

    # 3. Advance candidate to Round 2 (technical)
    prog_res2 = CandidateProgressionService.progress_single_candidate(
        db=db_session,
        company_id=company.id,
        recruiter_id=recruiter.id,
        internship_id=posting.id,
        application_id=app1.id,
        action="SEND_TO_NEXT_ROUND"
    )
    assert prog_res2["status"] == "success"
    assert prog_res2["current_round_key"] == "technical"

    db_session.refresh(session)
    # Crucial test: in Round 2, candidate has NOT taken assessment yet!
    assert session.current_round == "technical"
    assert session.status == "IN_PROGRESS"
    assert session.overall_score is None  # Must NOT inherit Round 1 score!

    # Round 1 score must be preserved in round_results archive
    r1_archived_score = CandidateProgressionService.get_candidate_round_score(session, "aptitude", app1)
    assert r1_archived_score == 88.0

    # Round 2 score must be None
    r2_unassessed_score = CandidateProgressionService.get_candidate_round_score(session, "technical", app1)
    assert r2_unassessed_score is None

    details_r2 = CandidateProgressionService.get_candidate_progression_details(
        db=db_session,
        company_id=company.id,
        internship_id=posting.id,
        application_id=app1.id
    )
    assert details_r2["current_round_key"] == "technical"
    assert details_r2["assessment_score"] is None
    assert details_r2["can_select_candidate"] is False  # Cannot select unassessed candidate!
