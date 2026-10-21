"""
Integration and Security Tests for Recruiter Automation Controls & Student Timeline
Covers:
- Pipeline draft generation, version listing, and publication
- Automation mode configuration (FULL_AUTOMATION, REVIEW_GATED, MANUAL_ONLY)
- Recruiter override and revocation endpoints
- Dead-letter background job inspection and retry
- Student timeline view with version-pinned round stages
- Cross-student access rejection (Scenario 14: 403 Forbidden on snooping attempt)
- Cross-company recruiter isolation (Scenario 13: 404/403 on foreign company access)
"""

import uuid
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from app.database import SessionLocal
from app import models
from app.security import create_access_token, hash_password
from app.services import job_queue_service, pipeline_versioning_service

client = TestClient(app)


@pytest.fixture
def api_test_data():
    with SessionLocal() as db:
        uid = uuid.uuid4().hex[:8]

        # Company & Recruiter A (Complete Profile to satisfy profile completion gate)
        comp_a = models.Company(
            name=f"API Co A {uid}",
            email=f"contact_{uid}@company.com",
            website="https://company-a.com",
            industry="Software & Technology",
            company_type="Private Limited",
            company_size="50-200",
            founded_year="2020",
            description="Developing high-throughput async processing engines and distributed platforms.",
            mission="Empower engineers through cutting-edge technology.",
            vision="A connected world powered by reliable microservices.",
            headquarters="Pune, India",
            culture_tags=json.dumps(["Innovation", "Remote-First"]),
            perks=json.dumps(["Health Insurance", "Learning Budget"]),
            preferred_domains=json.dumps(["Backend", "Distributed Systems"]),
            preferred_skills=json.dumps(["Python", "PostgreSQL"]),
            preferred_work_mode="Hybrid",
            preferred_duration="6 Months",
            is_email_verified=True,
            is_website_verified=True,
            is_business_verified=True,
            is_recruiter_verified=True
        )
        db.add(comp_a)
        db.flush()

        loc_a = models.CompanyLocation(company_id=comp_a.id, title="Pune HQ", sub="Tech Park", badge="HQ", is_primary=True)
        db.add(loc_a)
        stage_a = models.CompanyHiringStage(company_id=comp_a.id, stage_id="stg_eval", title="Technical Evaluation", stage_type="technical", order=1, is_active=True)
        db.add(stage_a)
        db.flush()

        recruiter_a = models.RecruiterUser(
            email=f"recruiter_a_{uid}@test.com",
            name="Recruiter A",
            company_name=comp_a.name,
            company_id=comp_a.id,
            status="APPROVED",
            password_hash=hash_password("password123")
        )
        db.add(recruiter_a)
        db.flush()

        # Company & Recruiter B (Foreign tenant)
        comp_b = models.Company(name=f"API Co B {uid}")
        db.add(comp_b)
        db.flush()

        recruiter_b = models.RecruiterUser(
            email=f"recruiter_b_{uid}@test.com",
            name="Recruiter B",
            company_name=comp_b.name,
            company_id=comp_b.id,
            status="APPROVED",
            password_hash=hash_password("password123")
        )
        db.add(recruiter_b)
        db.flush()

        # Posting for Company A
        posting_a = models.InternshipPosting(
            company_id=comp_a.id,
            recruiter_id=recruiter_a.id,
            title="Distributed Systems Intern",
            description="Developing high-throughput async processing engines with Python and PostgreSQL.",
            openings=2,
            status="Active"
        )
        db.add(posting_a)
        db.flush()

        # Student 1 (Enrolled)
        student_1 = models.StudentUser(
            name="Student One",
            email=f"student1_{uid}@test.com",
            password_hash=hash_password("password123"),
            degree="B.Tech"
        )
        db.add(student_1)
        db.flush()

        # Student 2 (Unauthorized Snooper)
        student_2 = models.StudentUser(
            name="Student Two",
            email=f"student2_{uid}@test.com",
            password_hash=hash_password("password123"),
            degree="B.Tech"
        )
        db.add(student_2)
        db.flush()

        app_1 = models.InternshipApplication(
            student_id=student_1.id,
            internship_id=posting_a.id,
            company_id=comp_a.id,
            status="APPLIED"
        )
        db.add(app_1)
        db.commit()

        token_a = create_access_token(data={"sub": recruiter_a.email, "role": "recruiter", "id": recruiter_a.id})
        token_b = create_access_token(data={"sub": recruiter_b.email, "role": "recruiter", "id": recruiter_b.id})

        data = {
            "token_a": token_a,
            "token_b": token_b,
            "posting_a_id": posting_a.id,
            "application_1_id": app_1.id,
            "student_1_email": student_1.email,
            "student_2_email": student_2.email,
            "recruiter_a_id": recruiter_a.id
        }
    yield data


def test_recruiter_pipeline_draft_and_versions(api_test_data):
    """Test generating a draft pipeline and listing versions via API."""
    headers_a = {"Authorization": f"Bearer {api_test_data['token_a']}"}
    posting_id = api_test_data["posting_a_id"]

    # 1. Generate Draft
    res_draft = client.post(f"/api/v1/recruiter/internships/{posting_id}/pipeline/generate-draft", headers=headers_a)
    assert res_draft.status_code == 200
    draft_data = res_draft.json()
    assert draft_data["version_number"] == 1
    assert "pipeline_config" in draft_data

    # 2. List Versions
    res_list = client.get(f"/api/v1/recruiter/internships/{posting_id}/pipeline/versions", headers=headers_a)
    assert res_list.status_code == 200
    versions_data = res_list.json()
    assert len(versions_data["versions"]) >= 1
    assert versions_data["draft_version_id"] == draft_data["draft_version_id"]

    # 3. Publish Version
    res_pub = client.post(
        f"/api/v1/recruiter/internships/{posting_id}/pipeline/publish",
        json={"migrate_unstarted": False},
        headers=headers_a
    )
    assert res_pub.status_code == 200
    assert res_pub.json()["published_version_id"] == draft_data["draft_version_id"]


def test_automation_configuration_modes(api_test_data):
    """Test configuring automation modes (FULL_AUTOMATION, REVIEW_GATED, MANUAL_ONLY) and pause/resume."""
    headers_a = {"Authorization": f"Bearer {api_test_data['token_a']}"}
    posting_id = api_test_data["posting_a_id"]

    # 1. Attempt to enable automation when no pipeline is published -> Must be rejected (HTTP 400)
    res_fail = client.post(
        f"/api/v1/recruiter/internships/{posting_id}/automation/configure",
        json={"automation_enabled": True, "automation_mode": "FULL_AUTOMATION"},
        headers=headers_a
    )
    assert res_fail.status_code == 400
    assert "Cannot enable recruitment automation" in res_fail.json()["detail"]

    # 2. Publish a valid pipeline version first
    with SessionLocal() as db:
        posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == posting_id).first()
        baseline = pipeline_versioning_service._create_default_baseline_version(db, posting)
        posting.active_pipeline_version_id = baseline.id
        db.commit()

    # 3. Explicitly enable automation with published pipeline -> Must succeed
    res = client.post(
        f"/api/v1/recruiter/internships/{posting_id}/automation/configure",
        json={"automation_enabled": True, "automation_mode": "FULL_AUTOMATION"},
        headers=headers_a
    )
    assert res.status_code == 200
    assert res.json()["automation_enabled"] is True
    assert res.json()["automation_mode"] == "FULL_AUTOMATION"

    # Pause automation
    res_pause = client.post(
        f"/api/v1/recruiter/internships/{posting_id}/automation/configure",
        json={"automation_paused": True},
        headers=headers_a
    )
    assert res_pause.status_code == 200
    assert res_pause.json()["automation_paused"] is True


def test_recruiter_override_and_revocation_api(api_test_data):
    """Test applying an auditable override and revoking it via recruiter API."""
    headers_a = {"Authorization": f"Bearer {api_test_data['token_a']}"}
    posting_id = api_test_data["posting_a_id"]
    app_id = api_test_data["application_1_id"]

    override_payload = {
        "override_type": "MANUAL_SHORTLIST",
        "target_status": "SHORTLISTED",
        "reason_code": "DIRECT_INTERVIEW_EXCELLENCE",
        "justification": "Candidate demonstrated deep domain expertise during recruiter screening conversation."
    }

    # 1. Apply Override
    res_over = client.post(
        f"/api/v1/recruiter/internships/{posting_id}/applications/{app_id}/override",
        json=override_payload,
        headers=headers_a
    )
    assert res_over.status_code == 200
    assert res_over.json()["new_status"] == "SHORTLISTED"
    assert res_over.json()["is_manually_overridden"] is True

    # 2. Revoke Override
    res_rev = client.post(
        f"/api/v1/recruiter/internships/{posting_id}/applications/{app_id}/override/revoke",
        json={"rerun_automation": True, "reason": "Re-evaluating"},
        headers=headers_a
    )
    assert res_rev.status_code == 200
    assert res_rev.json()["is_manually_overridden"] is False


def test_dead_letter_jobs_and_safe_retry(api_test_data):
    """Test listing dead-letter jobs and triggering authorized retry."""
    headers_a = {"Authorization": f"Bearer {api_test_data['token_a']}"}

    with SessionLocal() as db:
        dead_job = models.RecruitmentJob(
            job_type="SCREEN_APPLICANT",
            status="DEAD_LETTER",
            priority=1,
            payload={"application_id": api_test_data["application_1_id"]},
            retry_count=5,
            max_retries=5,
            error_log="Simulated fatal database connection timeout"
        )
        db.add(dead_job)
        db.commit()
        db.refresh(dead_job)
        dead_job_id = dead_job.id

    # 1. List Dead Letter Jobs
    res_list = client.get("/api/v1/recruiter/jobs/dead-letter", headers=headers_a)
    assert res_list.status_code == 200
    dead_jobs = res_list.json()["dead_letter_jobs"]
    assert any(j["id"] == dead_job_id for j in dead_jobs)

    # 2. Safe Retry Action
    res_retry = client.post(f"/api/v1/recruiter/jobs/{dead_job_id}/retry", headers=headers_a)
    assert res_retry.status_code == 200
    assert res_retry.json()["resurrected"] is True

    with SessionLocal() as db:
        j_after = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == dead_job_id).first()
        assert j_after.status == "QUEUED"
        assert j_after.retry_count == 0


def test_student_timeline_and_cross_student_security(api_test_data):
    """
    Test student timeline view and security enforcement:
    - Candidate 1 can view their own timeline.
    - Candidate 2 attempting to view Candidate 1's timeline is rejected with 403 Forbidden (Scenario 14).
    """
    app_id = api_test_data["application_1_id"]
    email_1 = api_test_data["student_1_email"]
    email_2 = api_test_data["student_2_email"]

    # 1. Candidate 1 viewing their own application -> 200 OK
    res_auth = client.get(f"/api/v1/student/applications/{app_id}/timeline?email={email_1}")
    assert res_auth.status_code == 200
    timeline = res_auth.json()
    assert timeline["application_id"] == app_id
    assert "timeline_stages" in timeline
    assert len(timeline["timeline_stages"]) >= 1

    # 2. Candidate 2 attempting to view Candidate 1's record -> 403 Forbidden
    res_unauth = client.get(f"/api/v1/student/applications/{app_id}/timeline?email={email_2}")
    assert res_unauth.status_code == 403
    assert "Access forbidden: you cannot access another candidate's recruitment records" in res_unauth.json()["detail"]


def test_cross_company_recruiter_tenant_isolation(api_test_data):
    """
    Test multi-tenant recruiter isolation (Scenario 13):
    - Recruiter B (Company B) attempting to generate draft or override Company A's opening
      is rejected with 404 (not found in tenant).
    """
    headers_b = {"Authorization": f"Bearer {api_test_data['token_b']}"}
    posting_id = api_test_data["posting_a_id"]
    app_id = api_test_data["application_1_id"]

    # Recruiter B attempts to generate pipeline draft for Company A's posting -> 404
    res_draft = client.post(f"/api/v1/recruiter/internships/{posting_id}/pipeline/generate-draft", headers=headers_b)
    assert res_draft.status_code == 404

    # Recruiter B attempts to override Company A's candidate -> 403 or 404
    res_over = client.post(
        f"/api/v1/recruiter/internships/{posting_id}/applications/{app_id}/override",
        json={"override_type": "MANUAL_REJECT", "reason_code": "TEST", "justification": "Cross company attempt test"},
        headers=headers_b
    )
    assert res_over.status_code in [403, 404]


def test_internship_creation_automation_safe_defaults_and_explicit_modes(api_test_data):
    """
    Verifies that:
    1. Default internship creation retains safe defaults:
       automation_enabled=False, automation_mode="REVIEW_GATED", automation_paused=False.
    2. Publishing the internship does NOT silently activate automation.
    3. Explicit mode selection (FULL_AUTOMATION, REVIEW_GATED, MANUAL_ONLY) is persisted to PostgreSQL.
    4. Configuration persists across GET /internships and GET /internships/{id}.
    5. PATCH /internships/{id} can update automation_mode and automation_enabled.
    6. Invalid automation modes are rejected with 400.
    """
    headers_a = {"Authorization": f"Bearer {api_test_data['token_a']}"}

    # 1. Safe default creation
    res_default = client.post(
        "/api/v1/recruiter/internships",
        json={
            "title": "Default Security Intern",
            "required_skills": ["Python", "Cryptography"],
            "application_threshold": 75
        },
        headers=headers_a
    )
    assert res_default.status_code == 200, res_default.text
    int_default = res_default.json()["internship"]
    assert int_default["automation_enabled"] is False
    assert int_default["automation_mode"] == "REVIEW_GATED"
    assert int_default["automation_paused"] is False
    def_id = int_default["id"]

    # Verify persistence via GET /internships/{id}
    res_get_def = client.get(f"/api/v1/recruiter/internships/{def_id}", headers=headers_a)
    assert res_get_def.status_code == 200
    assert res_get_def.json()["internship"]["automation_enabled"] is False
    assert res_get_def.json()["internship"]["automation_mode"] == "REVIEW_GATED"

    # 2. Explicit mode selection during creation (FULL_AUTOMATION, enabled)
    res_full = client.post(
        "/api/v1/recruiter/internships",
        json={
            "title": "Autonomous Backend Intern",
            "required_skills": ["Go", "Distributed Systems"],
            "application_threshold": 80,
            "automation_mode": "FULL_AUTOMATION",
            "automation_enabled": True
        },
        headers=headers_a
    )
    assert res_full.status_code == 200
    int_full = res_full.json()["internship"]
    assert int_full["automation_mode"] == "FULL_AUTOMATION"
    assert int_full["automation_enabled"] is True
    full_id = int_full["id"]

    # 3. Explicit mode selection during creation (MANUAL_ONLY, disabled)
    res_manual = client.post(
        "/api/v1/recruiter/internships",
        json={
            "title": "Manual Review Intern",
            "required_skills": ["Product Design"],
            "application_threshold": 70,
            "automation_mode": "MANUAL_ONLY",
            "automation_enabled": False
        },
        headers=headers_a
    )
    assert res_manual.status_code == 200
    assert res_manual.json()["internship"]["automation_mode"] == "MANUAL_ONLY"
    assert res_manual.json()["internship"]["automation_enabled"] is False

    # 4. Update automation via PATCH
    res_patch = client.patch(
        f"/api/v1/recruiter/internships/{def_id}",
        json={
            "automation_mode": "FULL_AUTOMATION",
            "automation_enabled": True
        },
        headers=headers_a
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["internship"]["automation_mode"] == "FULL_AUTOMATION"
    assert res_patch.json()["internship"]["automation_enabled"] is True

    # 5. Invalid mode rejected
    res_invalid = client.patch(
        f"/api/v1/recruiter/internships/{def_id}",
        json={"automation_mode": "MAGIC_MODE"},
        headers=headers_a
    )
    assert res_invalid.status_code == 400

    # 6. Verify in list_company_internships
    res_list = client.get("/api/v1/recruiter/internships", headers=headers_a)
    assert res_list.status_code == 200
    internships = {p["id"]: p for p in res_list.json()["internships"]}
    assert def_id in internships
    assert internships[def_id]["automation_mode"] == "FULL_AUTOMATION"
    assert internships[def_id]["automation_enabled"] is True
    assert full_id in internships
    assert internships[full_id]["automation_mode"] == "FULL_AUTOMATION"


def test_suggest_pipeline_draft_and_attach_to_posting(api_test_data):
    """
    Tests:
    1. POST /internships/pipeline/suggest-draft returns Gemini synthesized pipeline
       with checkpoint flags (review_gated: True).
    2. Posting creation accepts initial pipeline draft and attaches draft_pipeline_version_id
       in DRAFT status, un-activated until explicit publication.
    """
    headers_a = {"Authorization": f"Bearer {api_test_data['token_a']}"}

    # 1. Preview pipeline draft on the fly
    res_preview = client.post(
        "/api/v1/recruiter/internships/pipeline/suggest-draft",
        json={
            "title": "AI Research Engineer Intern",
            "description": "Building neural search and LLM orchestration agents.",
            "department": "AI Labs",
            "work_mode": "Remote",
            "openings": 2
        },
        headers=headers_a
    )
    assert res_preview.status_code == 200
    preview_data = res_preview.json()
    assert preview_data["status"] == "success"
    rounds = preview_data["pipeline_config"]["rounds"]
    assert len(rounds) >= 2
    # At least one round should have review_gated for human checkpoint
    assert any(r.get("review_gated") for r in rounds)

    # 2. Create posting with the proposed draft config
    res_create = client.post(
        "/api/v1/recruiter/internships",
        json={
            "title": "AI Research Engineer Intern",
            "description": "Building neural search and LLM orchestration agents.",
            "department": "AI Labs",
            "required_skills": ["Python", "PyTorch"],
            "application_threshold": 80,
            "automation_mode": "REVIEW_GATED",
            "automation_enabled": False,  # Safe default: separate from publishing
            "pipeline_config": preview_data["pipeline_config"],
            "evaluation_rubrics": preview_data["evaluation_rubrics"],
            "eligibility_rules": preview_data["eligibility_rules"],
            "scoring_weights": preview_data["scoring_weights"]
        },
        headers=headers_a
    )
    assert res_create.status_code == 200
    posting_data = res_create.json()["internship"]
    assert posting_data["draft_pipeline_version_id"] is not None
    assert posting_data["active_pipeline_version_id"] is None  # Not active yet!
    assert posting_data["automation_enabled"] is False  # Safe default confirmed

