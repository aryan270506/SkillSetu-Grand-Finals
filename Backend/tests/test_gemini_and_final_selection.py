"""
Integration and Correctness Tests for Gemini Orchestration & Final Selection
Covers:
- Gemini JD Analysis & fallback pipeline synthesis
- AI invocation telemetry & cost logging
- Composite weighted score calculation
- Deterministic tie-breaking rules
- Vacancy limit enforcement (never over-selects beyond opening count)
- Exclusion of unresolved error sessions from final selection
- Complete end-to-end orchestrator flow via durable job queue
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models
from app.services import (
    gemini_jd_analysis_service,
    ai_usage_telemetry_service,
    final_selection_service,
    ai_recruitment_orchestrator,
    job_queue_service,
    pipeline_versioning_service,
)


@pytest.fixture(autouse=True)
def clean_job_queue():
    with SessionLocal() as db:
        db.query(models.RecruitmentJob).delete(synchronize_session=False)
        db.commit()
    yield
    with SessionLocal() as db:
        db.query(models.RecruitmentJob).delete(synchronize_session=False)
        db.commit()


@pytest.fixture
def selection_test_data():
    with SessionLocal() as db:
        uid = uuid.uuid4().hex[:8]
        company = models.Company(name=f"Selection Co {uid}")
        db.add(company)
        db.flush()

        recruiter = models.RecruiterUser(
            email=f"recruiter_sel_{uid}@test.com",
            name="Selection Recruiter",
            company_name=company.name,
            company_id=company.id,
            password_hash="fakehash"
        )
        db.add(recruiter)
        db.flush()

        # Opening with exactly 2 openings
        posting = models.InternshipPosting(
            company_id=company.id,
            recruiter_id=recruiter.id,
            title="AI Systems Intern",
            openings=2,
            status="Active"
        )
        db.add(posting)
        db.flush()

        # Baseline version with weighted scoring
        v1 = pipeline_versioning_service._create_default_baseline_version(db, posting)

        # Create 4 candidates with different scores for ranking & tie-break tests
        candidates = []
        for i, (name, overall, tech, match) in enumerate([
            ("Candidate 1 (Top)", 92.0, 95.0, 90.0),
            ("Candidate 2 (Tie Score A)", 85.0, 90.0, 85.0), # Higher tech score
            ("Candidate 2 (Tie Score B)", 85.0, 80.0, 92.0), # Lower tech score
            ("Candidate 4 (Lower)", 75.0, 70.0, 75.0),
        ]):
            st = models.StudentUser(
                name=name,
                email=f"cand_{uid}_{i}@test.com",
                password_hash="fakehash",
                degree="B.Tech"
            )
            db.add(st)
            db.flush()

            app = models.InternshipApplication(
                student_id=st.id,
                internship_id=posting.id,
                company_id=company.id,
                pipeline_version_id=v1.id,
                status="SHORTLISTED",
                match_score_at_apply=match
            )
            db.add(app)
            db.flush()

            sess = models.CandidateAssessmentSession(
                id=f"sess_{uid}_{i}",
                student_id=st.id,
                application_id=app.id,
                internship_id=posting.id,
                company_id=company.id,
                status="COMPLETED",
                execution_status="PASS",
                overall_score=overall,
                round_results=f'{{"technical": {{"score": {tech}}}}}'
            )
            db.add(sess)
            candidates.append({
                "student_id": st.id,
                "app_id": app.id,
                "session_id": sess.id
            })

        db.commit()
        data = {
            "company_id": company.id,
            "recruiter_id": recruiter.id,
            "posting_id": posting.id,
            "candidates": candidates
        }
    yield data


def test_gemini_jd_analysis_synthesis_and_telemetry():
    """Test JD analysis parses requirements into valid pipeline schemas and records telemetry."""
    result = gemini_jd_analysis_service.analyze_job_description_and_suggest_pipeline(
        title="Full Stack Python & React Developer Intern",
        description="We are seeking an intern skilled in Python, FastAPI, React, and PostgreSQL to build scalable web applications.",
        openings=2
    )

    assert "pipeline_config" in result
    assert "evaluation_rubrics" in result
    assert "eligibility_rules" in result
    assert "scoring_weights" in result
    assert "automation_policy" in result

    # Verify rounds were generated
    rounds = result["pipeline_config"]["rounds"]
    assert len(rounds) >= 2
    round_keys = [r["round_key"] for r in rounds]
    assert "aptitude" in round_keys

    # Verify telemetry was recorded in PostgreSQL
    with SessionLocal() as db:
        telemetry = db.query(models.AIInvocationTelemetry).filter(
            models.AIInvocationTelemetry.feature == "JD_ANALYSIS"
        ).order_by(models.AIInvocationTelemetry.id.desc()).first()
        assert telemetry is not None
        assert telemetry.latency_ms > 0
        assert telemetry.status in ["SUCCESS", "API_ERROR"]


def test_vacancy_aware_final_selection_and_tie_breaking(selection_test_data):
    """
    Test final ranking and selection:
    - Exactly 2 candidates selected (since openings = 2).
    - Top candidate selected (Rank 1).
    - Tie-breaking: Candidate 2A and 2B both scored 85.0%, but Candidate 2A had higher technical score (90 vs 80),
      so Candidate 2A must be selected at Rank 2.
    - Candidate 2B and Candidate 4 must be waitlisted (never over-selected!).
    """
    with SessionLocal() as db:
        ranking_result = final_selection_service.rank_and_select_candidates(
            db=db,
            internship_id=selection_test_data["posting_id"],
            auto_select=True
        )

        assert ranking_result["vacancies"] == 2
        assert ranking_result["total_finalists"] == 4
        assert len(ranking_result["selected"]) == 2
        assert len(ranking_result["waitlisted"]) == 2

        selected_app_ids = [s["application_id"] for s in ranking_result["selected"]]

        # Candidate 1 (Top) must be selected
        top_cand_app_id = selection_test_data["candidates"][0]["app_id"]
        assert top_cand_app_id in selected_app_ids

        # Candidate 2A (higher tech score) must win the tie-break against Candidate 2B
        cand_2a_app_id = selection_test_data["candidates"][1]["app_id"]
        cand_2b_app_id = selection_test_data["candidates"][2]["app_id"]
        assert cand_2a_app_id in selected_app_ids
        assert cand_2b_app_id not in selected_app_ids, "Candidate 2B with lower tech score must be waitlisted"

        # Verify application status in DB
        app_2a = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == cand_2a_app_id).first()
        app_2b = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == cand_2b_app_id).first()
        assert app_2a.status == "SELECTED"
        assert app_2b.status == "UNDER_REVIEW"


def test_unresolved_error_exclusion_from_selection(selection_test_data):
    """Test that a candidate with an EVALUATION_ERROR or proctoring quarantine is excluded from selection."""
    with SessionLocal() as db:
        # Mark Candidate 1 session with EVALUATION_ERROR (e.g. Gemini timeout during assessment)
        cand1_sess = db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.id == selection_test_data["candidates"][0]["session_id"]
        ).first()
        cand1_sess.execution_status = "EVALUATION_ERROR"
        db.commit()

        ranking_result = final_selection_service.rank_and_select_candidates(
            db=db,
            internship_id=selection_test_data["posting_id"],
            auto_select=False
        )

        # Candidate 1 must NOT be in the ranking cohort until error is resolved
        ranked_app_ids = [s["application_id"] for s in ranking_result["selected"]] + [w["application_id"] for w in ranking_result["waitlisted"]]
        assert selection_test_data["candidates"][0]["app_id"] not in ranked_app_ids


def test_orchestrator_end_to_end_job_processing(selection_test_data):
    """Test that the durable job queue executes recruitment orchestrator jobs end-to-end."""
    with SessionLocal() as db:
        app_id = selection_test_data["candidates"][3]["app_id"]
        student_id = selection_test_data["candidates"][3]["student_id"]

        # Enqueue SCREEN_APPLICANT job
        job = job_queue_service.enqueue_job(
            db=db,
            job_type="SCREEN_APPLICANT",
            payload={"application_id": app_id}
        )
        db.commit()
        job_id = job.id

    worker_id = "test_orchestrator_worker"
    executed = job_queue_service.process_queue_iteration(worker_id)
    assert executed is True

    with SessionLocal() as db:
        finished_job = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
        assert finished_job.status == "COMPLETED"
        assert finished_job.result["application_id"] == app_id
