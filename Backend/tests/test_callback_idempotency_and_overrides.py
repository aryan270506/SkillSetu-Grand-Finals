"""
Integration and Correctness Tests for Assessment Callback Idempotency & Recruiter Overrides
Covers:
- Shared secret authentication (valid vs invalid secrets)
- Idempotency key deduplication (exact replay returns cached response without duplicate mutations)
- Idempotency key reuse detection (same key with different payload returns 409 Conflict)
- Safe 8-state evaluation mapping (PASS, FAIL, INVALID_SUBMISSION, AWAITING_MANUAL_REVIEW)
- Recruiter override lifecycle, reason codes, mandatory justification
- Recruiter override preemption over incoming assessment results
- Recruiter override revocation and audit tracking
"""

import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy.orm import Session

from main import app
from app.database import SessionLocal
from app.config import settings
from app import models
from app.schemas.recruitment_automation import AssessmentCallbackPayload, RecruiterOverrideCreate, RecruiterOverrideRevoke
from app.services import assessment_callback_service, recruiter_override_service, pipeline_versioning_service

client = TestClient(app)


@pytest.fixture
def callback_test_data():
    with SessionLocal() as db:
        unique_id = uuid.uuid4().hex[:8]
        company = models.Company(name=f"Callback Co {unique_id}")
        db.add(company)
        db.flush()

        recruiter = models.RecruiterUser(
            email=f"recruiter_cb_{unique_id}@test.com",
            name="Callback Recruiter",
            company_name=company.name,
            company_id=company.id,
            password_hash="fakehash"
        )
        db.add(recruiter)
        db.flush()

        posting = models.InternshipPosting(
            company_id=company.id,
            recruiter_id=recruiter.id,
            title="Systems Software Intern",
            description="C++ and Python low latency engineering",
            status="Active"
        )
        db.add(posting)
        db.flush()

        # Create baseline pipeline version (technical passing cutoff = 65.0)
        v1 = pipeline_versioning_service._create_default_baseline_version(db, posting)

        student = models.StudentUser(
            name="Callback Candidate",
            email=f"candidate_cb_{unique_id}@test.com",
            password_hash="fakehash",
            degree="B.Tech"
        )
        db.add(student)
        db.flush()

        app_record = models.InternshipApplication(
            student_id=student.id,
            internship_id=posting.id,
            company_id=company.id,
            pipeline_version_id=v1.id,
            status="APPLIED"
        )
        db.add(app_record)
        db.flush()

        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        session = models.CandidateAssessmentSession(
            id=session_id,
            student_id=student.id,
            application_id=app_record.id,
            internship_id=posting.id,
            company_id=company.id,
            status="IN_PROGRESS",
            current_round="technical"
        )
        db.add(session)
        db.commit()

        data = {
            "company_id": company.id,
            "recruiter_id": recruiter.id,
            "posting_id": posting.id,
            "student_id": student.id,
            "application_id": app_record.id,
            "session_id": session_id,
            "version_id": v1.id
        }
    yield data


def test_unauthorized_callback_rejected(callback_test_data):
    """Test callback without or with incorrect shared secret is rejected with 401."""
    payload = {
        "idempotencyKey": f"evt_{uuid.uuid4().hex}",
        "assessmentId": callback_test_data["session_id"],
        "status": "completed",
        "overallScore": 85.0
    }
    # No header
    res1 = client.post("/api/v1/assessment/results", json=payload)
    assert res1.status_code == 401

    # Invalid header
    res2 = client.post("/api/v1/assessment/results", json=payload, headers={"x-assessment-secret": "wrong_secret"})
    assert res2.status_code == 401


def test_callback_idempotency_and_deduplication(callback_test_data):
    """
    Test that sending the exact same callback twice:
    - First request processes and advances candidate
    - Second request returns cached idempotent status without duplicate mutations
    """
    secret_headers = {"x-assessment-secret": settings.ASSESSMENT_SERVICE_SECRET}
    idempotency_key = f"evt_idempotent_{uuid.uuid4().hex[:12]}"
    
    payload = {
        "idempotencyKey": idempotency_key,
        "assessmentId": callback_test_data["session_id"],
        "studentId": callback_test_data["student_id"],
        "applicationId": callback_test_data["application_id"],
        "internshipId": callback_test_data["posting_id"],
        "roundKey": "technical",
        "status": "completed",
        "overallScore": 88.0,
        "roundResults": {"technical": {"score": 88.0}},
        "integrityStatus": "VERIFIED",
        "warningCount": 0
    }

    # 1. First execution
    res1 = client.post("/api/v1/assessment/results", json=payload, headers=secret_headers)
    assert res1.status_code == 200
    body1 = res1.json()
    assert body1["eval_state"] == "PASS"
    assert body1["idempotent"] is False

    with SessionLocal() as db:
        app_rec = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.id == callback_test_data["application_id"]
        ).first()
        assert app_rec.status == "SHORTLISTED"

        # Count audit entries for this event
        audit_count1 = db.query(models.ApplicationStatusAudit).filter(
            models.ApplicationStatusAudit.application_id == callback_test_data["application_id"]
        ).count()
        assert audit_count1 == 1

    # 2. Replay with identical payload and key
    res2 = client.post("/api/v1/assessment/results", json=payload, headers=secret_headers)
    assert res2.status_code == 200
    body2 = res2.json()
    assert body2["idempotent"] is True

    # Confirm audit count did NOT increase
    with SessionLocal() as db:
        audit_count2 = db.query(models.ApplicationStatusAudit).filter(
            models.ApplicationStatusAudit.application_id == callback_test_data["application_id"]
        ).count()
        assert audit_count2 == 1, "Duplicate callback must NOT generate secondary audit entries"


def test_idempotency_key_reuse_conflict(callback_test_data):
    """Test that reusing an idempotency key with a DIFFERENT payload raises 409 Conflict."""
    secret_headers = {"x-assessment-secret": settings.ASSESSMENT_SERVICE_SECRET}
    idempotency_key = f"evt_conflict_{uuid.uuid4().hex[:12]}"

    payload1 = {
        "idempotencyKey": idempotency_key,
        "assessmentId": callback_test_data["session_id"],
        "status": "completed",
        "overallScore": 80.0
    }
    res1 = client.post("/api/v1/assessment/results", json=payload1, headers=secret_headers)
    assert res1.status_code == 200

    # Replay same key with different score (different payload)
    payload2 = {
        "idempotencyKey": idempotency_key,
        "assessmentId": callback_test_data["session_id"],
        "status": "completed",
        "overallScore": 95.0
    }
    res2 = client.post("/api/v1/assessment/results", json=payload2, headers=secret_headers)
    assert res2.status_code == 409
    assert "Idempotency key has already been used for a different payload" in res2.json()["detail"]


def test_recruiter_override_preemption_over_automated_results(callback_test_data):
    """
    Test that an active Recruiter Override PREEMPTS automated evaluation:
    - Recruiter manually marks candidate as ON_HOLD with justification.
    - Assessment callback arrives with 100% score (which would normally set status to SHORTLISTED).
    - Candidate status remains strictly ON_HOLD.
    - Session records score and execution_status = MANUALLY_OVERRIDDEN.
    """
    with SessionLocal() as db:
        # Recruiter applies override
        override_data = RecruiterOverrideCreate(
            override_type="PUT_ON_HOLD",
            target_status="ON_HOLD",
            reason_code="EXTERNAL_BACKGROUND_CHECK",
            justification="Candidate requires verification of prior employment credentials before moving forward."
        )
        override, app_rec = recruiter_override_service.apply_recruiter_override(
            db=db,
            recruiter_id=callback_test_data["recruiter_id"],
            application_id=callback_test_data["application_id"],
            override_data=override_data
        )
        assert app_rec.status == "ON_HOLD"
        assert app_rec.is_manually_overridden is True
        assert app_rec.active_override_id == override.id

    # Now an automated callback arrives with 100% score
    secret_headers = {"x-assessment-secret": settings.ASSESSMENT_SERVICE_SECRET}
    callback_payload = {
        "idempotencyKey": f"evt_override_test_{uuid.uuid4().hex[:12]}",
        "assessmentId": callback_test_data["session_id"],
        "applicationId": callback_test_data["application_id"],
        "internshipId": callback_test_data["posting_id"],
        "roundKey": "technical",
        "status": "completed",
        "overallScore": 100.0,
        "integrityStatus": "VERIFIED"
    }

    res = client.post("/api/v1/assessment/results", json=callback_payload, headers=secret_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["eval_state"] == "MANUALLY_OVERRIDDEN"

    with SessionLocal() as db:
        app_after = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.id == callback_test_data["application_id"]
        ).first()
        sess_after = db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.id == callback_test_data["session_id"]
        ).first()

        # Application status must STILL be ON_HOLD (not SHORTLISTED!)
        assert app_after.status == "ON_HOLD"
        assert app_after.is_manually_overridden is True

        # Session score must be recorded as 100%
        assert sess_after.overall_score == 100.0
        assert sess_after.execution_status == "MANUALLY_OVERRIDDEN"


def test_recruiter_override_revocation(callback_test_data):
    """Test revoking an override clears is_manually_overridden flag and records audit log."""
    with SessionLocal() as db:
        # Apply override
        override_data = RecruiterOverrideCreate(
            override_type="MANUAL_SHORTLIST",
            target_status="SHORTLISTED",
            reason_code="EXCEPTIONAL_PORTFOLIO",
            justification="Verified outstanding open source portfolio on GitHub."
        )
        recruiter_override_service.apply_recruiter_override(
            db=db,
            recruiter_id=callback_test_data["recruiter_id"],
            application_id=callback_test_data["application_id"],
            override_data=override_data
        )

        # Revoke override
        revoke_params = RecruiterOverrideRevoke(rerun_automation=True, reason="Recruiter re-evaluated")
        app_revoked = recruiter_override_service.revoke_recruiter_override(
            db=db,
            recruiter_id=callback_test_data["recruiter_id"],
            application_id=callback_test_data["application_id"],
            revoke_params=revoke_params
        )

        assert app_revoked.is_manually_overridden is False
        assert app_revoked.active_override_id is None

        # Verify audit log recorded revocation
        rev_audit = db.query(models.ApplicationStatusAudit).filter(
            models.ApplicationStatusAudit.application_id == callback_test_data["application_id"]
        ).order_by(models.ApplicationStatusAudit.id.desc()).first()
        assert rev_audit is not None
        assert rev_audit.metadata_json["event"] == "OVERRIDE_REVOCATION"


def test_safe_evaluation_proctoring_quarantine(callback_test_data):
    """Test that a high-risk proctoring breach results in INVALID_SUBMISSION and quarantine, not immediate rejection."""
    secret_headers = {"x-assessment-secret": settings.ASSESSMENT_SERVICE_SECRET}
    callback_payload = {
        "idempotencyKey": f"evt_quarantine_{uuid.uuid4().hex[:12]}",
        "assessmentId": callback_test_data["session_id"],
        "applicationId": callback_test_data["application_id"],
        "internshipId": callback_test_data["posting_id"],
        "status": "flagged",
        "overallScore": 82.0,
        "integrityStatus": "HIGH_RISK",
        "warningCount": 4
    }

    res = client.post("/api/v1/assessment/results", json=callback_payload, headers=secret_headers)
    assert res.status_code == 200
    assert res.json()["eval_state"] == "INVALID_SUBMISSION"

    with SessionLocal() as db:
        app_rec = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.id == callback_test_data["application_id"]
        ).first()
        # Must be quarantined to UNDER_REVIEW for human audit, NOT blindly rejected!
        assert app_rec.status == "UNDER_REVIEW"
        assert "Integrity quarantine: HIGH_RISK" in app_rec.notes
