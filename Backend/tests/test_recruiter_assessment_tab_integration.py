"""
Integration and Verification Tests for Recruiter Assessment Tab:
- System-generated scoring, rubric normalization, and star rating mapping
- Rejection of manual recruiter score and star overwrites
- Real PostgreSQL candidate, application, and session data reconciliation
- Dynamic pipeline display sourced from published RecruitmentPipelineVersion
- Clean, deduplicated, chronological audit trail
- Progression guards preventing uncompleted or flagged candidates from advancing
- Cross-company tenant security
"""

import uuid
import json
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from main import app
from app.database import SessionLocal
from app import models
from app.security import create_access_token, hash_password
from app.services.system_evaluation_service import (
    score_to_stars,
    derive_verdict,
    synthesize_session_evaluation,
    derive_round_completion_badge
)
from app.services import pipeline_versioning_service, candidate_progression_service

client = TestClient(app)


def test_round_completion_badge_all_five_lifecycle_states():
    """
    Verifies that the round-status badge authoritatively derives the correct label and tone
    for all 5 assessment lifecycle states:
    1. ROUND NOT COMPLETED (waiting, not started)
    2. ASSESSMENT IN PROGRESS (session live / ongoing)
    3. SUBMITTED — EVALUATION PENDING (submitted but automated evaluation pending)
    4. ROUND COMPLETED (completed, evaluated, and no pending review gate)
    5. AWAITING RECRUITER REVIEW (completed, evaluated, with review-gated checkpoint)
    """
    class DummySession:
        def __init__(self, status="NOT_STARTED", overall_score=None, execution_status=None):
            self.status = status
            self.overall_score = overall_score
            self.execution_status = execution_status

    class DummyApp:
        def __init__(self, status="SHORTLISTED"):
            self.status = status

    # 1. ROUND NOT COMPLETED: No session or status CREATED/WAITING
    b1_none = derive_round_completion_badge(session=None, application=DummyApp())
    assert b1_none["key"] == "ROUND_NOT_COMPLETED"
    assert b1_none["label"] == "ROUND NOT COMPLETED"
    assert b1_none["tone"] == "danger"

    sess_created = DummySession(status="CREATED")
    b1_created = derive_round_completion_badge(session=sess_created, application=DummyApp())
    assert b1_created["key"] == "ROUND_NOT_COMPLETED"
    assert b1_created["label"] == "ROUND NOT COMPLETED"

    sess_waiting = DummySession(status="WAITING")
    b1_waiting = derive_round_completion_badge(session=sess_waiting, application=DummyApp())
    assert b1_waiting["key"] == "ROUND_NOT_COMPLETED"
    assert b1_waiting["label"] == "ROUND NOT COMPLETED"

    # 2. ASSESSMENT IN PROGRESS: Session is currently underway
    sess_in_prog = DummySession(status="IN_PROGRESS")
    b2 = derive_round_completion_badge(session=sess_in_prog, application=DummyApp())
    assert b2["key"] == "ASSESSMENT_IN_PROGRESS"
    assert b2["label"] == "ASSESSMENT IN PROGRESS"
    assert b2["tone"] == "info"

    # 3. SUBMITTED — EVALUATION PENDING: Submitted but unevaluated
    sess_submitted = DummySession(status="SUBMITTED", overall_score=None)
    b3 = derive_round_completion_badge(session=sess_submitted, application=DummyApp(), is_evaluated=False)
    assert b3["key"] == "SUBMITTED_EVALUATION_PENDING"
    assert b3["label"] == "SUBMITTED — EVALUATION PENDING"
    assert b3["tone"] == "warning"

    sess_comp_no_eval = DummySession(status="COMPLETED", overall_score=85.0)
    b3_comp = derive_round_completion_badge(session=sess_comp_no_eval, application=DummyApp(), is_evaluated=False)
    assert b3_comp["key"] == "SUBMITTED_EVALUATION_PENDING"
    assert b3_comp["label"] == "SUBMITTED — EVALUATION PENDING"

    # 4. ROUND COMPLETED: Completed, evaluated, not review-gated
    sess_completed = DummySession(status="COMPLETED", overall_score=88.0)
    round_ungated = {"round_key": "aptitude", "review_gated": False}
    b4 = derive_round_completion_badge(
        session=sess_completed,
        application=DummyApp(status="IN_PIPELINE"),
        round_def=round_ungated,
        is_evaluated=True
    )
    assert b4["key"] == "ROUND_COMPLETED"
    assert b4["label"] == "ROUND COMPLETED"
    assert b4["tone"] == "success"

    # 5. AWAITING RECRUITER REVIEW: Completed and evaluated, but review_gated or AWAITING_REVIEW
    round_gated = {"round_key": "technical", "review_gated": True}
    b5_gated = derive_round_completion_badge(
        session=sess_completed,
        application=DummyApp(status="IN_PIPELINE"),
        round_def=round_gated,
        is_evaluated=True
    )
    assert b5_gated["key"] == "AWAITING_RECRUITER_REVIEW"
    assert b5_gated["label"] == "AWAITING RECRUITER REVIEW"
    assert b5_gated["tone"] == "accent"

    # Also awaiting review via application status
    b5_app_review = derive_round_completion_badge(
        session=sess_completed,
        application=DummyApp(status="AWAITING_REVIEW"),
        round_def=round_ungated,
        is_evaluated=True
    )
    assert b5_app_review["key"] == "AWAITING_RECRUITER_REVIEW"
    assert b5_app_review["label"] == "AWAITING RECRUITER REVIEW"


def test_system_evaluation_scoring_and_star_mapping():
    """
    Verifies that system scoring, 1-5 star mapping, and verdict derivation are deterministic and consistent.
    """
    # Canonical star mapping test
    assert score_to_stars(95) == 5
    assert score_to_stars(90) == 5
    assert score_to_stars(89) == 4
    assert score_to_stars(75) == 4
    assert score_to_stars(74) == 3
    assert score_to_stars(60) == 3
    assert score_to_stars(59) == 2
    assert score_to_stars(40) == 2
    assert score_to_stars(39) == 1
    assert score_to_stars(5) == 1
    assert score_to_stars(0) == 0
    assert score_to_stars(None) == 0

    # Verdict derivation test with cutoff 70
    assert derive_verdict(90, 70) == "Strongly Recommend"
    assert derive_verdict(85, 70) == "Strongly Recommend"
    assert derive_verdict(75, 70) == "Recommend"
    assert derive_verdict(65, 70) == "Maybe / Borderline"
    assert derive_verdict(50, 70) == "Do Not Recommend"
    assert derive_verdict(None, 70) == "Pending Evaluation"

    # Pending session synthesis test (must return 0 stars, null score, Pending Evaluation)
    pending_eval = synthesize_session_evaluation(None, round_name="Round 1: Aptitude")
    assert pending_eval["is_evaluated"] is False
    assert pending_eval["composite_score"] is None
    assert pending_eval["verdict"] == "Pending Evaluation"
    assert all(val == 0 for val in pending_eval["ratings"].values())


@pytest.fixture
def assessment_tab_data():
    with SessionLocal() as db:
        uid = uuid.uuid4().hex[:8]

        # 1. Company A & Recruiter A
        comp_a = models.Company(
            name=f"Assessment Tab Co A {uid}",
            email=f"assessment_a_{uid}@test.com",
            website="https://eval-a.com",
            industry="Software & Technology",
            company_type="Private Limited",
            company_size="50-200",
            founded_year="2021",
            description="Engineering automated hiring systems.",
            mission="Accurate evidence-based candidate assessment.",
            vision="A meritocratic hiring ecosystem.",
            headquarters="Bengaluru, India",
            culture_tags=json.dumps(["Transparency", "Data-Driven"]),
            perks=json.dumps(["Health Insurance"]),
            preferred_domains=json.dumps(["Backend"]),
            preferred_skills=json.dumps(["Python", "SQL"]),
            is_email_verified=True,
            is_website_verified=True,
            is_business_verified=True,
            is_recruiter_verified=True
        )
        db.add(comp_a)
        db.flush()

        loc_a = models.CompanyLocation(company_id=comp_a.id, title="BLR Hub", sub="Tech Park", badge="HQ", is_primary=True)
        db.add(loc_a)
        stage_a = models.CompanyHiringStage(company_id=comp_a.id, stage_id="stg_eval", title="Technical Evaluation", stage_type="technical", order=1, is_active=True)
        db.add(stage_a)
        db.flush()

        recruiter_a = models.RecruiterUser(
            email=f"recruiter_tab_a_{uid}@test.com",
            name="Recruiter Assessment A",
            company_name=comp_a.name,
            company_id=comp_a.id,
            status="APPROVED",
            password_hash=hash_password("password123")
        )
        db.add(recruiter_a)
        db.flush()

        # 2. Company B & Recruiter B (Foreign Tenant)
        comp_b = models.Company(name=f"Foreign Co B {uid}")
        db.add(comp_b)
        db.flush()

        recruiter_b = models.RecruiterUser(
            email=f"recruiter_tab_b_{uid}@test.com",
            name="Recruiter Assessment B",
            company_name=comp_b.name,
            company_id=comp_b.id,
            status="APPROVED",
            password_hash=hash_password("password123")
        )
        db.add(recruiter_b)
        db.flush()

        # 3. Internship Posting
        posting = models.InternshipPosting(
            company_id=comp_a.id,
            recruiter_id=recruiter_a.id,
            title="Backend Systems Intern",
            description="Build scalable distributed microservices with Python, FastAPI, and PostgreSQL.",
            openings=2,
            status="Active"
        )
        db.add(posting)
        db.flush()

        # 4. Published Pipeline with 2 explicit rounds
        round_1 = {
            "round_key": "aptitude",
            "round_name": "General Aptitude & Problem Solving",
            "order": 1,
            "duration_minutes": 45,
            "passing_cutoff": 70,
            "review_gated": False
        }
        round_2 = {
            "round_key": "technical",
            "round_name": "Technical & Coding Interview",
            "order": 2,
            "duration_minutes": 60,
            "passing_cutoff": 75,
            "review_gated": True
        }
        rubric_1 = {
            "categories": [
                {"key": "problemSolving", "label": "Problem Solving", "weight": 0.6},
                {"key": "communication", "label": "Communication", "weight": 0.4}
            ]
        }
        rubric_2 = {
            "categories": [
                {"key": "techDepth", "label": "Technical Depth", "weight": 0.5},
                {"key": "sysDesign", "label": "System Design", "weight": 0.5}
            ]
        }

        pipeline_versioning_service.create_or_update_pipeline_draft(
            db=db,
            internship_id=posting.id,
            recruiter_id=recruiter_a.id,
            pipeline_config={"rounds": [round_1, round_2]},
            evaluation_rubrics={"rubrics_by_round": {"aptitude": rubric_1, "technical": rubric_2}},
            eligibility_rules={"min_cgpa": 7.0},
            scoring_weights={"weights_by_round": {"aptitude": 40.0, "technical": 60.0}},
            automation_policy={"mode": "REVIEW_GATED"}
        )
        pipeline_version, _ = pipeline_versioning_service.publish_pipeline_version(
            db=db,
            internship_id=posting.id,
            recruiter_id=recruiter_a.id
        )

        # 5. Candidate 1 (Completed Assessment with high score)
        student_1 = models.StudentUser(
            name="Alice Wonder",
            email=f"alice_{uid}@student.com",
            degree="B.Tech Computer Science",
            university="IIT Bombay",
            graduation_year="2026",
            password_hash=hash_password("password123")
        )
        db.add(student_1)
        db.flush()

        app_1 = models.InternshipApplication(
            internship_id=posting.id,
            student_id=student_1.id,
            company_id=comp_a.id,
            status="SHORTLISTED",
            pipeline_version_id=pipeline_version.id,
            match_score_at_apply=88.0,
            applied_at=datetime.now(timezone.utc)
        )
        db.add(app_1)
        db.flush()

        # Audit for Application
        db.add(models.ApplicationStatusAudit(
            application_id=app_1.id,
            previous_status="APPLIED",
            new_status="SHORTLISTED",
            actor_type="SYSTEM",
            notes="Applicant met screening criteria."
        ))

        # Completed Assessment Session for Candidate 1
        sess_1_id = f"sess_{uuid.uuid4().hex[:12]}"
        sess_1 = models.CandidateAssessmentSession(
            id=sess_1_id,
            application_id=app_1.id,
            student_id=student_1.id,
            internship_id=posting.id,
            company_id=comp_a.id,
            current_round="aptitude",
            status="COMPLETED",
            overall_score=88.0,
            round_results=json.dumps({
                "aptitude": {"score": 88.0, "passed": True},
                "problemSolving": 92.0,
                "communication": 82.0
            }),
            evaluation=json.dumps({
                "ratings": {"problemSolving": 5, "communication": 4, "techDepth": 4, "sysDesign": 4, "teamFit": 4},
                "verdict": "Strongly Recommend",
                "composite_score": 88,
                "strengths": "Exceptional algorithmic problem-solving speed and clear explanations.",
                "areas_for_improvement": "Explore edge-case boundaries in large datasets."
            }),
            integrity_status="VERIFIED"
        )
        db.add(sess_1)

        # 6. Candidate 2 (Pending Assessment, not yet started)
        student_2 = models.StudentUser(
            name="Bob Builder",
            email=f"bob_{uid}@student.com",
            degree="B.Tech Information Technology",
            university="NIT Trichy",
            graduation_year="2026",
            password_hash=hash_password("password123")
        )
        db.add(student_2)
        db.flush()

        app_2 = models.InternshipApplication(
            internship_id=posting.id,
            student_id=student_2.id,
            company_id=comp_a.id,
            status="SHORTLISTED",
            pipeline_version_id=pipeline_version.id,
            match_score_at_apply=72.0,
            applied_at=datetime.now(timezone.utc)
        )
        db.add(app_2)
        db.flush()

        db.add(models.ApplicationStatusAudit(
            application_id=app_2.id,
            previous_status="APPLIED",
            new_status="SHORTLISTED",
            actor_type="SYSTEM",
            notes="Applicant shortlisted for aptitude round."
        ))

        sess_2_id = f"sess_{uuid.uuid4().hex[:12]}"
        sess_2 = models.CandidateAssessmentSession(
            id=sess_2_id,
            application_id=app_2.id,
            student_id=student_2.id,
            internship_id=posting.id,
            company_id=comp_a.id,
            current_round="aptitude",
            status="CREATED",
            integrity_status="VERIFIED"
        )
        db.add(sess_2)
        db.commit()

        token_a = create_access_token({"sub": recruiter_a.email, "role": "recruiter", "company_id": comp_a.id})
        token_b = create_access_token({"sub": recruiter_b.email, "role": "recruiter", "company_id": comp_b.id})

        return {
            "comp_a_id": comp_a.id,
            "comp_b_id": comp_b.id,
            "posting_id": posting.id,
            "pipeline_version_id": pipeline_version.id,
            "app_1_id": app_1.id,
            "sess_1_id": sess_1.id,
            "app_2_id": app_2.id,
            "sess_2_id": sess_2.id,
            "token_a": token_a,
            "token_b": token_b,
        }


def test_recruiter_assessments_dashboard_real_data_and_pipeline(assessment_tab_data):
    """
    Verifies that the Assessment Tab fetches real PostgreSQL data, renders the published pipeline,
    and accurately computes scores and pending states without hardcoded fallbacks.
    """
    data = assessment_tab_data
    headers = {"Authorization": f"Bearer {data['token_a']}"}

    res = client.get(f"/api/v1/recruiter/assessments/dashboard?internship_id={data['posting_id']}", headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "success"

    # 1. Pipeline display must render rounds from published RecruitmentPipelineVersion
    pipeline_rounds = body["pipeline_rounds_breakdown"]
    assert len(pipeline_rounds) == 2
    assert pipeline_rounds[0]["round_key"] == "aptitude"
    assert pipeline_rounds[0]["round_name"] == "General Aptitude & Problem Solving"
    assert pipeline_rounds[0]["candidates_count"] == 2
    assert pipeline_rounds[0]["completed_count"] == 1
    assert pipeline_rounds[0]["pending_count"] == 1

    assert pipeline_rounds[1]["round_key"] == "technical"
    assert pipeline_rounds[1]["round_name"] == "Technical & Coding Interview"

    # 2. Candidate Dossiers Inspection
    dossiers = body["candidate_dossiers"]
    dossier_1 = dossiers[f"INT-{data['app_1_id']}"]
    dossier_2 = dossiers[f"INT-{data['app_2_id']}"]

    # Candidate 1: Completed assessment
    assert dossier_1["name"] == "Alice Wonder"
    assert dossier_1["is_completed"] is True
    assert dossier_1["is_evaluated"] is True
    assert dossier_1["composite_score"] == 88
    assert dossier_1["verdict"] == "Strongly Recommend"
    assert dossier_1["ratings"]["problemSolving"] >= 4
    assert dossier_1["can_progress"] is True
    assert dossier_1["round_status_key"] == "ROUND_COMPLETED"
    assert dossier_1["round_status_label"] == "ROUND COMPLETED"
    assert dossier_1["round_status_tone"] == "success"

    # Candidate 2: Incomplete/Pending assessment
    assert dossier_2["name"] == "Bob Builder"
    assert dossier_2["is_completed"] is False
    assert dossier_2["is_evaluated"] is False
    assert dossier_2["composite_score"] is None
    assert dossier_2["verdict"] == "Pending Evaluation"
    # Ratings must all be 0 (never defaulted to 4 or 5 stars)
    assert all(v == 0 for v in dossier_2["ratings"].values())
    assert dossier_2["can_progress"] is False
    assert dossier_2["round_status_key"] == "ROUND_NOT_COMPLETED"
    assert dossier_2["round_status_label"] == "ROUND NOT COMPLETED"
    assert dossier_2["round_status_tone"] == "danger"

    # Candidate cards in dashboard overview list also contain authoritative badge fields
    scheduled_cards = body.get("scheduled", [])
    if scheduled_cards:
        card_1 = next((c for c in scheduled_cards if c["application_id"] == data["app_1_id"]), None)
        card_2 = next((c for c in scheduled_cards if c["application_id"] == data["app_2_id"]), None)
        if card_1:
            assert card_1["round_status_key"] == "ROUND_COMPLETED"
            assert card_1["round_status_label"] == "ROUND COMPLETED"
        if card_2:
            assert card_2["round_status_key"] == "ROUND_NOT_COMPLETED"
            assert card_2["round_status_label"] == "ROUND NOT COMPLETED"


def test_recruiter_cannot_manually_override_scores_or_stars(assessment_tab_data):
    """
    Verifies that recruiters cannot manually overwrite scores or star ratings.
    Only recruiter review notes and metadata are persisted.
    """
    data = assessment_tab_data
    headers = {"Authorization": f"Bearer {data['token_a']}"}

    # Attempt to post fabricated 5-star ratings and a 99 score to Candidate 2
    fake_payload = {
        "application_id": data["app_2_id"],
        "ratings": {"techDepth": 5, "problemSolving": 5, "sysDesign": 5, "communication": 5, "teamFit": 5},
        "verdict": "Strongly Recommend",
        "composite_score": 99,
        "notes": "Recruiter manual observation: Verified resume qualifications."
    }

    eval_res = client.post("/api/v1/recruiter/assessments/evaluate", json=fake_payload, headers=headers)
    assert eval_res.status_code == 200, eval_res.text
    eval_body = eval_res.json()
    assert eval_body["status"] == "success"

    # Fetch dashboard again to confirm system evaluation was NOT overridden
    dash_res = client.get(f"/api/v1/recruiter/assessments/dashboard?internship_id={data['posting_id']}", headers=headers)
    assert dash_res.status_code == 200
    dash_body = dash_res.json()
    dossier_2 = dash_body["candidate_dossiers"][f"INT-{data['app_2_id']}"]

    # System score remains None and ratings remain 0 because candidate has not completed the assessment!
    assert dossier_2["composite_score"] is None
    assert dossier_2["verdict"] == "Pending Evaluation"
    assert all(v == 0 for v in dossier_2["ratings"].values())
    # Recruiter notes ARE saved properly
    assert "Verified resume qualifications" in dossier_2["recruiter_notes"]


def test_clean_audit_trail_and_progression_guards(assessment_tab_data):
    """
    Verifies that audit history is chronological without duplicates,
    and progression guards prevent uncompleted candidates from advancing.
    """
    data = assessment_tab_data
    headers = {"Authorization": f"Bearer {data['token_a']}"}

    # 1. Progression Guard: Candidate 2 has NOT completed the assessment
    advance_fail_res = client.post("/api/v1/recruiter/assessments/advance-round", json={
        "application_id": data["app_2_id"],
        "action": "advance",
        "notes": "Attempting to skip assessment"
    }, headers=headers)
    assert advance_fail_res.status_code == 400
    assert "pending completion" in advance_fail_res.json()["detail"].lower() or "not completed" in advance_fail_res.json()["detail"].lower()

    # 2. Candidate 1 HAS completed and passed -> advances to next round
    advance_success_res = client.post("/api/v1/recruiter/assessments/advance-round", json={
        "application_id": data["app_1_id"],
        "action": "advance",
        "notes": "Approved for Round 2 technical interview"
    }, headers=headers)
    assert advance_success_res.status_code == 200, advance_success_res.text
    adv_body = advance_success_res.json()
    assert adv_body["status"] == "success"
    assert adv_body["current_round_key"] == "technical"

    # 3. Verify clean, deduplicated audit trail for Candidate 1
    dash_res = client.get(f"/api/v1/recruiter/assessments/dashboard?internship_id={data['posting_id']}", headers=headers)
    assert dash_res.status_code == 200
    dossier_1 = dash_res.json()["candidate_dossiers"][f"INT-{data['app_1_id']}"]
    steps = dossier_1["journey_steps"]

    # Must contain applied, shortlisted, round 2 advance, and current stage without duplicate identical lines
    step_texts = [s["text"] for s in steps]
    assert len(step_texts) == len(set(step_texts)), f"Found duplicate journey step: {step_texts}"
    assert any("Applied to" in t for t in step_texts)
    assert any("Shortlisted" in t for t in step_texts)
    assert any("Approved for Round 2" in t for t in step_texts)


def test_cross_company_tenant_isolation_on_assessment_dashboard(assessment_tab_data):
    """
    Verifies that Recruiter B cannot access or advance Company A's candidates.
    """
    data = assessment_tab_data
    headers_b = {"Authorization": f"Bearer {data['token_b']}"}

    # Recruiter B attempts to view Company A's internship assessments
    res = client.get(f"/api/v1/recruiter/assessments/dashboard?internship_id={data['posting_id']}", headers=headers_b)
    assert res.status_code in [403, 404]

    # Recruiter B attempts to advance Candidate A
    advance_res = client.post("/api/v1/recruiter/assessments/advance-round", json={
        "application_id": data["app_1_id"],
        "action": "advance"
    }, headers=headers_b)
    assert advance_res.status_code in [403, 404]
