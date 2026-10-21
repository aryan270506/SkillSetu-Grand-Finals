"""
Integration and Correctness Tests for Pipeline Versioning & Deterministic Screening
Covers:
- Pipeline draft creation, Pydantic validation, and SHA-256 fingerprinting
- Publishing pipeline versions and active version promotion
- Immutable candidate version pinning (ongoing assessments never mutate)
- Explicit candidate version migration rules and audit trail
- Deterministic eligibility screening and explainable scoring
- Protected characteristics architectural firewall verification
- Borderline score quarantine to AWAITING_MANUAL_REVIEW
"""

import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models
from app.services import pipeline_versioning_service, deterministic_eligibility_service


@pytest.fixture
def test_setup():
    with SessionLocal() as db:
        # Create test company & recruiter
        unique_suffix = uuid.uuid4().hex[:8]
        company = models.Company(name=f"Versioning Test Co {unique_suffix}")
        db.add(company)
        db.flush()

        recruiter = models.RecruiterUser(
            email=f"recruiter_{unique_suffix}@test.com",
            name="Test Recruiter",
            company_name=company.name,
            company_id=company.id,
            password_hash="fakehash"
        )
        db.add(recruiter)
        db.flush()

        posting = models.InternshipPosting(
            company_id=company.id,
            recruiter_id=recruiter.id,
            title="Senior Backend Python Intern",
            description="Developing scalable APIs with FastAPI and PostgreSQL",
            status="Active"
        )
        db.add(posting)
        db.flush()

        student = models.StudentUser(
            name="Candidate Alpha",
            email=f"candidate_{unique_suffix}@student.com",
            password_hash="fakehash",
            degree="B.Tech",
            branch="Computer Engineering",
            graduation_year="2026",
            cgpa_or_percentage="8.5",
            skill_ids='["Python", "FastAPI", "PostgreSQL", "Docker"]',
            # Set protected characteristics for firewall verification
            gender="female",
            social_category="SC",
            domicile_state="Maharashtra",
            annual_family_income=250000.0,
            is_pwd=False
        )
        db.add(student)
        db.flush()

        db.commit()
        data = {
            "company_id": company.id,
            "recruiter_id": recruiter.id,
            "posting_id": posting.id,
            "student_id": student.id
        }
    yield data


def test_draft_creation_and_sha256_fingerprint(test_setup):
    """Test creating a draft pipeline version, schema validation, and deterministic content hash."""
    with SessionLocal() as db:
        posting_id = test_setup["posting_id"]
        recruiter_id = test_setup["recruiter_id"]

        pipe_config = {
            "rounds": [
                {
                    "round_key": "technical",
                    "round_name": "Coding Test",
                    "enabled": True,
                    "order": 1,
                    "duration_minutes": 45,
                    "passing_cutoff": 70.0,
                    "review_gated": False,
                    "parameters": {"languages": ["python"]}
                }
            ],
            "proctoring": {"camera_required": True, "mic_required": True, "max_warnings": 2}
        }
        rubrics = {"rubrics_by_round": {"technical": {"correctness": 70, "style": 30}}}
        eligibility = {
            "min_cgpa": 7.0,
            "allowed_degrees": ["B.Tech", "B.E."],
            "allowed_branches": ["Computer Engineering", "IT"],
            "allowed_graduation_years": [2026],
            "mandatory_skills": ["Python", "FastAPI"]
        }
        weights = {"weights_by_round": {"technical": 100.0}, "overall_passing_threshold": 70.0}
        policy = {"mode": "FULL_AUTOMATION", "auto_screen": True, "auto_progress_rounds": True}

        draft = pipeline_versioning_service.create_or_update_pipeline_draft(
            db=db,
            internship_id=posting_id,
            recruiter_id=recruiter_id,
            pipeline_config=pipe_config,
            evaluation_rubrics=rubrics,
            eligibility_rules=eligibility,
            scoring_weights=weights,
            automation_policy=policy
        )

        assert draft.id is not None
        assert draft.status == "DRAFT"
        assert draft.version_number == 1
        assert len(draft.content_hash) == 64  # Valid SHA-256 length

        # Posting must have draft pointer set
        posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == posting_id).first()
        assert posting.draft_pipeline_version_id == draft.id
        assert posting.active_pipeline_version_id is None


def test_publish_pipeline_and_candidate_pinning(test_setup):
    """Test publishing version 1 and ensuring candidate is pinned to version 1."""
    with SessionLocal() as db:
        posting_id = test_setup["posting_id"]
        recruiter_id = test_setup["recruiter_id"]
        student_id = test_setup["student_id"]

        # Create draft v1
        pipe_config = {
            "rounds": [{"round_key": "aptitude", "round_name": "Aptitude", "enabled": True, "order": 1, "duration_minutes": 30, "passing_cutoff": 60.0}],
            "proctoring": {}
        }
        draft_v1 = pipeline_versioning_service.create_or_update_pipeline_draft(
            db=db,
            internship_id=posting_id,
            recruiter_id=recruiter_id,
            pipeline_config=pipe_config,
            evaluation_rubrics={"rubrics_by_round": {}},
            eligibility_rules={"min_cgpa": 6.5},
            scoring_weights={"weights_by_round": {"aptitude": 100.0}, "overall_passing_threshold": 60.0},
            automation_policy={"mode": "REVIEW_GATED"}
        )

        # Publish v1
        pub_v1, _ = pipeline_versioning_service.publish_pipeline_version(
            db=db,
            internship_id=posting_id,
            recruiter_id=recruiter_id
        )
        assert pub_v1.status == "PUBLISHED"
        assert pub_v1.version_number == 1

        # Student applies and gets pinned to Version 1
        application = models.InternshipApplication(
            student_id=student_id,
            internship_id=posting_id,
            status="APPLIED"
        )
        db.add(application)
        db.commit()
        db.refresh(application)

        pinned_v = pipeline_versioning_service.pin_candidate_to_active_version(db, application.id)
        assert pinned_v.id == pub_v1.id
        assert application.pipeline_version_id == pub_v1.id

        # Now Recruiter publishes Version 2 with higher cutoff (75% vs 60%)
        draft_v2 = pipeline_versioning_service.create_or_update_pipeline_draft(
            db=db,
            internship_id=posting_id,
            recruiter_id=recruiter_id,
            pipeline_config=pipe_config,
            evaluation_rubrics={"rubrics_by_round": {}},
            eligibility_rules={"min_cgpa": 7.5},
            scoring_weights={"weights_by_round": {"aptitude": 100.0}, "overall_passing_threshold": 75.0},
            automation_policy={"mode": "FULL_AUTOMATION"}
        )
        pub_v2, _ = pipeline_versioning_service.publish_pipeline_version(
            db=db,
            internship_id=posting_id,
            recruiter_id=recruiter_id,
            migrate_unstarted_applicants=False  # Do not migrate!
        )
        assert pub_v2.version_number == 2

        # Check candidate application is STILL pinned to Version 1
        db.refresh(application)
        assert application.pipeline_version_id == pub_v1.id
        assert application.pipeline_version.scoring_weights["overall_passing_threshold"] == 60.0


def test_explicit_unstarted_migration_with_audit(test_setup):
    """Test that publish with migrate_unstarted=True updates unstarted applicants and creates audit records."""
    with SessionLocal() as db:
        posting_id = test_setup["posting_id"]
        recruiter_id = test_setup["recruiter_id"]
        student_id = test_setup["student_id"]

        # Baseline version 1 exists
        posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == posting_id).first()
        v1 = pipeline_versioning_service._create_default_baseline_version(db, posting)

        # Candidate enrolled on v1
        application = models.InternshipApplication(
            student_id=student_id,
            internship_id=posting_id,
            pipeline_version_id=v1.id,
            status="APPLIED"
        )
        db.add(application)
        db.commit()

        # Create draft v2
        pipe_config = {
            "rounds": [{"round_key": "technical", "round_name": "Technical", "enabled": True, "order": 1, "duration_minutes": 45, "passing_cutoff": 70.0}],
            "proctoring": {}
        }
        draft_v2 = pipeline_versioning_service.create_or_update_pipeline_draft(
            db=db,
            internship_id=posting_id,
            recruiter_id=recruiter_id,
            pipeline_config=pipe_config,
            evaluation_rubrics={"rubrics_by_round": {}},
            eligibility_rules={"min_cgpa": 7.0},
            scoring_weights={"weights_by_round": {"technical": 100.0}, "overall_passing_threshold": 70.0},
            automation_policy={"mode": "REVIEW_GATED"}
        )

        # Publish v2 with migration
        pub_v2, migrated_count = pipeline_versioning_service.publish_pipeline_version(
            db=db,
            internship_id=posting_id,
            recruiter_id=recruiter_id,
            migrate_unstarted_applicants=True
        )

        assert migrated_count == 1
        db.refresh(application)
        assert application.pipeline_version_id == pub_v2.id

        # Verify audit record created
        audit = db.query(models.ApplicationStatusAudit).filter(
            models.ApplicationStatusAudit.application_id == application.id,
            models.ApplicationStatusAudit.actor_type == "RECRUITER"
        ).first()
        assert audit is not None
        assert audit.metadata_json["event"] == "PIPELINE_VERSION_MIGRATION"
        assert audit.metadata_json["new_version_number"] == 2


def test_deterministic_screening_and_protected_characteristics_firewall(test_setup):
    """
    Test that deterministic qualification screening succeeds for qualified candidates,
    and verify that altering protected characteristics (gender, caste, income, state)
    produces IDENTICAL scores and verdicts, proving demographic neutrality.
    """
    with SessionLocal() as db:
        student = db.query(models.StudentUser).filter(models.StudentUser.id == test_setup["student_id"]).first()

        rules = {
            "min_cgpa": 7.5,
            "allowed_degrees": ["B.Tech", "B.E."],
            "allowed_branches": ["Computer Engineering", "IT"],
            "allowed_graduation_years": [2026],
            "mandatory_skills": ["Python", "FastAPI"]
        }

        # 1. Base Candidate Evaluation
        dto1 = deterministic_eligibility_service.build_candidate_screening_dto(student)
        result1 = deterministic_eligibility_service.evaluate_candidate_eligibility(dto1, rules)

        assert result1["is_eligible"] is True
        assert result1["eligibility_status"] == "ELIGIBLE"
        assert result1["overall_match_score"] >= 80.0
        assert len(result1["failure_reasons"]) == 0

        # 2. Modify Student Protected Characteristics radically in DB
        student.gender = "male"
        student.social_category = "General"
        student.domicile_state = "Karnataka"
        student.annual_family_income = 5000000.0
        student.is_pwd = True
        db.commit()

        dto2 = deterministic_eligibility_service.build_candidate_screening_dto(student)
        result2 = deterministic_eligibility_service.evaluate_candidate_eligibility(dto2, rules)

        # Verification: Result 1 and Result 2 must be 100% identical
        assert result1["is_eligible"] == result2["is_eligible"]
        assert result1["eligibility_status"] == result2["eligibility_status"]
        assert result1["overall_match_score"] == result2["overall_match_score"]
        assert result1["criteria_breakdown"] == result2["criteria_breakdown"]


def test_borderline_quarantine_to_manual_review():
    """Test that borderline candidates (e.g. CGPA within 3% or partial mandatory skills) are quarantined to AWAITING_MANUAL_REVIEW."""
    candidate = deterministic_eligibility_service.CandidateScreeningDTO(
        student_id=999,
        name="Borderline Bob",
        cgpa_raw="7.3",  # Required is 7.5 (delta = 0.2, within 0.3 borderline margin)
        degree="B.Tech",
        branch="Information Technology",
        graduation_year_raw="2026",
        skills=["Python"]  # Has 1 of 2 mandatory skills
    )

    rules = {
        "min_cgpa": 7.5,
        "allowed_degrees": ["B.Tech"],
        "allowed_branches": ["Information Technology"],
        "allowed_graduation_years": [2026],
        "mandatory_skills": ["Python", "FastAPI"]
    }

    result = deterministic_eligibility_service.evaluate_candidate_eligibility(candidate, rules)
    assert result["is_eligible"] is False
    assert result["eligibility_status"] == "AWAITING_MANUAL_REVIEW"
    assert result["requires_manual_review"] is True
    assert any("CGPA 7.3 below minimum 7.5" in r for r in result["failure_reasons"])
