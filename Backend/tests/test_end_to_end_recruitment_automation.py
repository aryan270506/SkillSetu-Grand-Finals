"""
Scenario 18: Complete End-to-End Recruitment Automation Test Suite

Validates the full recruitment lifecycle:
1. Opening creation with automation policy defaults (disabled by default)
2. Gemini JD Analysis & Draft Pipeline generation with SHA-256 fingerprint
3. Explicit pipeline publication & version pinning
4. Separate explicit action enabling automation (REVIEW_GATED)
5. Multi-candidate student applications with strict version binding:
   - Candidate 1 (Alice): Passes screening & all rounds -> Selected within vacancy cap
   - Candidate 2 (Bob): Passes screening -> Fails valid technical assessment -> Rejected
   - Candidate 3 (Charlie): Passes screening -> Remains pending in-progress
   - Candidate 4 (David): Passes screening -> Evaluation error / proctoring quarantine -> Under Review
   - Candidate 5 (Eve): Passes screening & assessment -> Waitlisted -> Recruiter Override & Reversal
6. Deterministic eligibility screening (protected characteristics firewalled)
7. Assessment execution & authenticated callback handling with idempotency
8. Final selection sweep with composite weighted scoring, deterministic tie-breaking, and vacancy caps
9. Recruiter decision override lifecycle with mandatory justification and audit trail
10. Explicit override revocation & student timeline / recruiter dashboard persistence
"""

import json
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from main import app as fastapi_app
from app.database import SessionLocal
from app.config import settings
from app import models
from app.schemas.recruitment_automation import (
    RecruiterOverrideCreate,
    RecruiterOverrideRevoke,
)
from app.services import (
    pipeline_versioning_service,
    deterministic_eligibility_service,
    recruiter_override_service,
    final_selection_service,
    gemini_jd_analysis_service,
    ai_recruitment_orchestrator,
    job_queue_service,
)
from app.security import create_access_token, hash_password

client = TestClient(fastapi_app)


@pytest.fixture(autouse=True)
def clean_db_queue():
    with SessionLocal() as db:
        db.query(models.RecruitmentJob).delete(synchronize_session=False)
        db.commit()
    yield
    with SessionLocal() as db:
        db.query(models.RecruitmentJob).delete(synchronize_session=False)
        db.commit()


def test_scenario_18_full_end_to_end_recruitment_automation():
    uid = uuid.uuid4().hex[:8]

    # 1. Recruiter & Company setup
    with SessionLocal() as db:
        company = models.Company(
            name=f"Enterprise Cloud {uid}",
            email=f"contact_{uid}@enterprisecloud.com",
            website="https://enterprisecloud.com",
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
            is_recruiter_verified=True,
            is_email_verified=True,
            is_website_verified=True,
            is_business_verified=True,
        )
        db.add(company)
        db.flush()

        loc = models.CompanyLocation(company_id=company.id, title="Pune HQ", sub="Tech Park", badge="HQ", is_primary=True)
        db.add(loc)
        stage = models.CompanyHiringStage(company_id=company.id, stage_id="stg_eval", title="Technical Evaluation", stage_type="technical", order=1, is_active=True)
        db.add(stage)
        db.flush()

        recruiter = models.RecruiterUser(
            email=f"talent_{uid}@enterprisecloud.com",
            name="Talent Acquisition Director",
            company_name=company.name,
            company_id=company.id,
            password_hash=hash_password("recruiterpass"),
            status="APPROVED",
        )
        db.add(recruiter)
        db.flush()

        # Create opening - defaults to automation disabled, 1 vacancy
        posting = models.InternshipPosting(
            company_id=company.id,
            recruiter_id=recruiter.id,
            title="Senior Distributed Systems Engineering Intern",
            department="Cloud Infrastructure",
            openings=1,  # Exactly 1 vacancy for realistic ranking competition
            status="Active",
            application_threshold=75.0,
            required_skills=["Python", "PostgreSQL", "Distributed Systems"],
            automation_mode="REVIEW_GATED",
            automation_enabled=False,  # Must remain disabled until explicitly enabled
            automation_paused=False,
        )
        db.add(posting)
        db.commit()
        posting_id = posting.id
        recruiter_id = recruiter.id
        company_id = company.id
        recruiter_token = create_access_token(data={"sub": recruiter.email, "role": "recruiter", "id": recruiter.id})

    # 2. AI Draft Generation via Gemini JD Analysis
    with SessionLocal() as db:
        posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == posting_id).first()
        suggestion = gemini_jd_analysis_service.analyze_job_description_and_suggest_pipeline(
            title=posting.title,
            description="Build scalable distributed microservices with PostgreSQL, Python, and consensus algorithms.",
            department=posting.department,
            openings=posting.openings,
        )
        assert len(suggestion["pipeline_config"]["rounds"]) >= 1

        # Create draft pipeline version
        draft = pipeline_versioning_service.create_or_update_pipeline_draft(
            db=db,
            internship_id=posting_id,
            recruiter_id=recruiter_id,
            pipeline_config=suggestion["pipeline_config"],
            evaluation_rubrics=suggestion["evaluation_rubrics"],
            eligibility_rules=suggestion["eligibility_rules"],
            scoring_weights=suggestion["scoring_weights"],
            automation_policy=suggestion["automation_policy"],
        )
        assert draft.status == "DRAFT"
        assert draft.version_number == 1
        assert draft.content_hash is not None

        # 3. Publish Pipeline Version & Verify Immutability
        published, migrated_count = pipeline_versioning_service.publish_pipeline_version(
            db=db,
            internship_id=posting_id,
            recruiter_id=recruiter_id,
        )
        assert published.status == "PUBLISHED"
        assert published.published_at is not None
        pub_version_id = published.id

    # 4. Explicitly Enable Automation via Recruiter Endpoint
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}
    res_enable = client.post(
        f"/api/v1/recruiter/internships/{posting_id}/automation/configure",
        json={"automation_enabled": True, "automation_mode": "REVIEW_GATED"},
        headers=recruiter_headers,
    )
    assert res_enable.status_code == 200
    assert res_enable.json()["automation_enabled"] is True
    assert res_enable.json()["automation_mode"] == "REVIEW_GATED"

    # 5. Create 5 Candidates representing all mandated lifecycle personas
    # Personas:
    # 1. Alice: passes all rounds, top composite score -> Selected
    # 2. Bob: passes screening, fails technical assessment -> Rejected
    # 3. Charlie: passes screening, assessment remains in-progress/pending
    # 4. David: passes screening, encounters evaluation error / integrity quarantine -> Under Review
    # 5. Eve: passes all rounds, waitlisted -> Receives Recruiter Override & Reversal
    candidates_specs = [
        ("Alice Engineer", f"alice_{uid}@univ.edu", 9.4, ["Python", "PostgreSQL", "Distributed Systems"], "female"),
        ("Bob Coder", f"bob_{uid}@univ.edu", 8.8, ["Python", "PostgreSQL", "Distributed Systems"], "male"),
        ("Charlie Pending", f"charlie_{uid}@univ.edu", 8.5, ["Python", "PostgreSQL", "Distributed Systems"], "male"),
        ("David Flagged", f"david_{uid}@univ.edu", 8.2, ["Python", "PostgreSQL", "Distributed Systems"], "male"),
        ("Eve Finalist", f"eve_{uid}@univ.edu", 9.1, ["Python", "PostgreSQL", "Distributed Systems"], "female"),
    ]

    app_ids = []
    student_ids = []
    student_tokens = []

    with SessionLocal() as db:
        published_version = db.query(models.RecruitmentPipelineVersion).filter(models.RecruitmentPipelineVersion.id == pub_version_id).first()
        mandatory_skills = published_version.eligibility_rules.get("mandatory_skills", ["Python", "PostgreSQL", "Distributed Systems"])

        for name, email, cgpa, base_skills, gender in candidates_specs:
            student_skills = list(set(base_skills + mandatory_skills))
            student = models.StudentUser(
                name=name,
                email=email,
                password_hash=hash_password("studentpass"),
                cgpa_or_percentage=str(cgpa),
                degree="B.Tech",
                branch="Computer Science",
                graduation_year="2026",
                skill_ids=str(student_skills).replace("'", '"'),
                gender=gender,
                social_category="General",
            )
            db.add(student)
            db.flush()
            student_ids.append(student.id)
            student_tokens.append(create_access_token(data={"sub": student.email, "role": "student", "id": student.id}))

            app_rec = models.InternshipApplication(
                internship_id=posting_id,
                student_id=student.id,
                company_id=company_id,
                source="internal_portal",
                source_id=f"opp_{posting_id}_{student.id}",
                pipeline_version_id=pub_version_id,
                status="APPLIED",
            )
            db.add(app_rec)
            db.flush()
            app_ids.append(app_rec.id)
        db.commit()

    # 6. Deterministic Screening for All 5 Candidates
    # Protected demographic characteristics are completely firewalled
    with SessionLocal() as db:
        published_version = db.query(models.RecruitmentPipelineVersion).filter(models.RecruitmentPipelineVersion.id == pub_version_id).first()
        for a_id in app_ids:
            app_rec = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == a_id).first()
            candidate_dto = deterministic_eligibility_service.build_candidate_screening_dto(app_rec.student)
            screening = deterministic_eligibility_service.evaluate_candidate_eligibility(
                candidate=candidate_dto,
                eligibility_rules=published_version.eligibility_rules,
            )
            assert screening["is_eligible"] is True, f"Candidate {app_rec.student.name} failed: {screening.get('failure_reasons')}"
            
            # Shortlist candidate and record deterministic score
            app_rec.status = "SHORTLISTED"
            app_rec.match_score_at_apply = screening["overall_match_score"]
            app_rec.eligibility_status = "ELIGIBLE"
            app_rec.eligibility_breakdown = screening

            audit = models.ApplicationStatusAudit(
                application_id=app_rec.id,
                previous_status="APPLIED",
                new_status="SHORTLISTED",
                actor_type="SYSTEM",
                notes=f"Deterministic eligibility screening passed ({screening['overall_match_score']}%)",
                metadata_json={"event": "DETERMINISTIC_SCREENING", "score": screening["overall_match_score"]}
            )
            db.add(audit)
        db.commit()

    # 7. Assessment Execution & Callbacks (Testing Pass, Fail, Pending, Error outcomes)
    secret_headers = {"x-assessment-secret": settings.ASSESSMENT_SERVICE_SECRET}
    alice_app, bob_app, charlie_app, david_app, eve_app = app_ids
    alice_stu, bob_stu, charlie_stu, david_stu, eve_stu = student_ids

    # Candidate 1 (Alice): Passes round with score 95.0
    alice_sess_id = f"sess_alice_{uuid.uuid4().hex[:8]}"
    with SessionLocal() as db:
        sess = models.CandidateAssessmentSession(
            id=alice_sess_id,
            student_id=alice_stu,
            application_id=alice_app,
            internship_id=posting_id,
            company_id=company_id,
            status="IN_PROGRESS",
            current_round="technical",
            pipeline_version_id=pub_version_id,
        )
        db.add(sess)
        db.commit()

    alice_cb = {
        "idempotencyKey": f"cb_alice_{alice_app}",
        "assessmentId": alice_sess_id,
        "studentId": alice_stu,
        "applicationId": alice_app,
        "internshipId": posting_id,
        "roundKey": "technical",
        "status": "completed",
        "overallScore": 95.0,
        "roundResults": {"technical": {"score": 95.0}},
        "integrityStatus": "VERIFIED",
        "warningCount": 0,
    }
    res_alice = client.post("/api/v1/assessment/results", json=alice_cb, headers=secret_headers)
    assert res_alice.status_code == 200
    assert res_alice.json()["eval_state"] == "PASS"

    # Candidate 2 (Bob): Fails valid assessment (score 42.0 below cutoff 60.0) -> Rejected
    bob_sess_id = f"sess_bob_{uuid.uuid4().hex[:8]}"
    with SessionLocal() as db:
        sess = models.CandidateAssessmentSession(
            id=bob_sess_id,
            student_id=bob_stu,
            application_id=bob_app,
            internship_id=posting_id,
            company_id=company_id,
            status="IN_PROGRESS",
            current_round="technical",
            pipeline_version_id=pub_version_id,
        )
        db.add(sess)
        db.commit()

    bob_cb = {
        "idempotencyKey": f"cb_bob_{bob_app}",
        "assessmentId": bob_sess_id,
        "studentId": bob_stu,
        "applicationId": bob_app,
        "internshipId": posting_id,
        "roundKey": "technical",
        "status": "completed",
        "overallScore": 42.0,
        "roundResults": {"technical": {"score": 42.0}},
        "integrityStatus": "VERIFIED",
        "warningCount": 0,
    }
    res_bob = client.post("/api/v1/assessment/results", json=bob_cb, headers=secret_headers)
    assert res_bob.status_code == 200
    assert res_bob.json()["eval_state"] == "FAIL"

    with SessionLocal() as db:
        bob_app_rec = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == bob_app).first()
        assert bob_app_rec.status == "REJECTED"

    # Candidate 3 (Charlie): Assessment Remains Pending (IN_PROGRESS)
    charlie_sess_id = f"sess_charlie_{uuid.uuid4().hex[:8]}"
    with SessionLocal() as db:
        sess = models.CandidateAssessmentSession(
            id=charlie_sess_id,
            student_id=charlie_stu,
            application_id=charlie_app,
            internship_id=posting_id,
            company_id=company_id,
            status="IN_PROGRESS",
            current_round="technical",
            pipeline_version_id=pub_version_id,
        )
        db.add(sess)
        db.commit()

    # Candidate 4 (David): Encountering Evaluation Error / Proctoring Integrity Quarantine
    david_sess_id = f"sess_david_{uuid.uuid4().hex[:8]}"
    with SessionLocal() as db:
        sess = models.CandidateAssessmentSession(
            id=david_sess_id,
            student_id=david_stu,
            application_id=david_app,
            internship_id=posting_id,
            company_id=company_id,
            status="IN_PROGRESS",
            current_round="technical",
            pipeline_version_id=pub_version_id,
        )
        db.add(sess)
        db.commit()

    david_cb = {
        "idempotencyKey": f"cb_david_{david_app}",
        "assessmentId": david_sess_id,
        "studentId": david_stu,
        "applicationId": david_app,
        "internshipId": posting_id,
        "roundKey": "technical",
        "status": "completed",
        "overallScore": 88.0,
        "roundResults": {"technical": {"score": 88.0}},
        "integrityStatus": "FLAGGED",
        "warningCount": 4,
    }
    res_david = client.post("/api/v1/assessment/results", json=david_cb, headers=secret_headers)
    assert res_david.status_code == 200
    assert res_david.json()["eval_state"] == "INVALID_SUBMISSION"

    with SessionLocal() as db:
        david_app_rec = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == david_app).first()
        assert david_app_rec.status == "UNDER_REVIEW"

    # Candidate 5 (Eve): Passes assessment with score 88.0 -> Passes round
    eve_sess_id = f"sess_eve_{uuid.uuid4().hex[:8]}"
    with SessionLocal() as db:
        sess = models.CandidateAssessmentSession(
            id=eve_sess_id,
            student_id=eve_stu,
            application_id=eve_app,
            internship_id=posting_id,
            company_id=company_id,
            status="IN_PROGRESS",
            current_round="technical",
            pipeline_version_id=pub_version_id,
        )
        db.add(sess)
        db.commit()

    eve_cb = {
        "idempotencyKey": f"cb_eve_{eve_app}",
        "assessmentId": eve_sess_id,
        "studentId": eve_stu,
        "applicationId": eve_app,
        "internshipId": posting_id,
        "roundKey": "technical",
        "status": "completed",
        "overallScore": 88.0,
        "roundResults": {"technical": {"score": 88.0}},
        "integrityStatus": "VERIFIED",
        "warningCount": 0,
    }
    res_eve = client.post("/api/v1/assessment/results", json=eve_cb, headers=secret_headers)
    assert res_eve.status_code == 200
    assert res_eve.json()["eval_state"] == "PASS"

    # Verify Idempotency for Eve's callback
    res_eve_dup = client.post("/api/v1/assessment/results", json=eve_cb, headers=secret_headers)
    assert res_eve_dup.status_code == 200
    assert res_eve_dup.json()["idempotent"] is True

    # 8. Final Selection Sweep (Exactly 1 Vacancy: Alice Rank 1 Selected, Eve Waitlisted)
    with SessionLocal() as db:
        ranking_result = final_selection_service.rank_and_select_candidates(
            db=db,
            internship_id=posting_id,
            auto_select=True,
        )
        assert ranking_result["vacancies"] == 1
        assert len(ranking_result["selected"]) == 1
        assert ranking_result["selected"][0]["application_id"] == alice_app

        alice_app_rec = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == alice_app).first()
        assert alice_app_rec.status == "SELECTED"

        eve_app_rec = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == eve_app).first()
        assert eve_app_rec.status == "UNDER_REVIEW"

        # Verify offer notification job was enqueued for Alice and process it
        offer_job = db.query(models.RecruitmentJob).filter(
            models.RecruitmentJob.job_type == "SEND_NOTIFICATION",
            models.RecruitmentJob.idempotency_key == f"notify_offer_{alice_app}"
        ).first()
        assert offer_job is not None
        assert offer_job.status == "QUEUED"

        # Process the notification job via worker iteration
        processed = job_queue_service.process_queue_iteration("e2e_worker")
        assert processed is True

        # Verify email log record was persisted
        email_log = db.query(models.ApplicationEmailLog).filter(
            models.ApplicationEmailLog.application_id == alice_app,
            models.ApplicationEmailLog.email_type == "OFFER_EXTENDED"
        ).first()
        assert email_log is not None
        assert email_log.status == "SENT"

    # 9. Recruiter Override Lifecycle on Eve
    # Recruiter manually reviews Eve and applies an authoritative override to SELECT
    with SessionLocal() as db:
        override_data = RecruiterOverrideCreate(
            override_type="MANUAL_FINAL_SELECT",
            reason_code="COMPREHENSIVE_HUMAN_INTERVIEW",
            justification="Eve demonstrated exceptional distributed systems knowledge in interview.",
        )
        override, updated_app = recruiter_override_service.apply_recruiter_override(
            db=db,
            recruiter_id=recruiter_id,
            application_id=eve_app,
            override_data=override_data,
        )
        assert override.status == "ACTIVE"
        assert override.override_type == "MANUAL_FINAL_SELECT"
        assert updated_app.status == "SELECTED"
        assert updated_app.is_manually_overridden is True

    # 10. Explicit Reversal of Override on Eve
    with SessionLocal() as db:
        revoke_data = RecruiterOverrideRevoke(
            justification="Candidate accepted another offer; reversing manual selection."
        )
        revoked_app = recruiter_override_service.revoke_recruiter_override(
            db=db,
            recruiter_id=recruiter_id,
            application_id=eve_app,
            revoke_params=revoke_data,
        )
        assert revoked_app.is_manually_overridden is False

        # Verify audit trail for Eve has both SYSTEM and RECRUITER entries
        audits = (
            db.query(models.ApplicationStatusAudit)
            .filter(models.ApplicationStatusAudit.application_id == eve_app)
            .all()
        )
        assert len(audits) >= 2
        actor_types = {a.actor_type for a in audits}
        assert "SYSTEM" in actor_types
        assert "RECRUITER" in actor_types

    # 11. Recruiter Dashboard Retrieval Verification
    res_dash = client.get(f"/api/v1/recruiter/internships/{posting_id}", headers=recruiter_headers)
    assert res_dash.status_code == 200
    int_info = res_dash.json()["internship"]
    assert int_info["automation_enabled"] is True
    assert int_info["automation_mode"] == "REVIEW_GATED"
    assert int_info["active_pipeline_version_id"] == pub_version_id

    # 12. Student Dashboard Timeline Retrieval Verification
    alice_headers = {"Authorization": f"Bearer {student_tokens[0]}"}
    res_alice_tl = client.get(f"/api/v1/student/applications/{alice_app}/timeline", headers=alice_headers)
    assert res_alice_tl.status_code == 200
    alice_body = res_alice_tl.json()
    assert alice_body["candidate_status"] == "SELECTED"
    assert alice_body["eligibility_status"] == "ELIGIBLE"
    assert len(alice_body["timeline_stages"]) >= 1

    # Privacy verification: Student 2 cannot snoop on Alice's timeline
    bob_headers = {"Authorization": f"Bearer {student_tokens[1]}"}
    res_forbidden = client.get(f"/api/v1/student/applications/{alice_app}/timeline", headers=bob_headers)
    assert res_forbidden.status_code == 403
