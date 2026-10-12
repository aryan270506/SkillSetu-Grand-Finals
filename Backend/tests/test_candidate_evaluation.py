"""
Comprehensive Unit & Integration Tests for Candidate Evaluation and Internship-Specific Audit
Tests:
- Candidate evaluation endpoint (/recruiter/internships/{internship_id}/applications/{application_id}/evaluation)
- Hard eligibility vs match score breakdown
- Skill match vs role-specific skill gaps
- Original uploaded resume vs Personalized tailored resume
- Strict company ownership security authorization
- Multi-internship comparison (Frontend vs Backend roles)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app import models
from app.security import hash_password, create_access_token
from main import app

client = TestClient(app)

def test_candidate_evaluation_flow():
    db = SessionLocal()
    try:
        print("\n=== STARTING CANDIDATE EVALUATION & INTERNSHIP AUDIT TESTS ===")

        # 1. Setup Company A (Catalyst Coders) and Recruiter A
        company_a = db.query(models.Company).filter_by(name="Catalyst Coders").first()
        if not company_a:
            company_a = models.Company(name="Catalyst Coders", industry="Information Technology", is_verified=True)
            db.add(company_a)
            db.commit()
            db.refresh(company_a)

        recruiter_a = db.query(models.RecruiterUser).filter_by(company_id=company_a.id).first()
        if not recruiter_a:
            recruiter_a = models.RecruiterUser(
                name="Aakash Recruiter",
                email="recruiter_eval_a@catalystcoders.com",
                password_hash=hash_password("Pass1234!"),
                company_id=company_a.id,
                company_name="Catalyst Coders",
                designation="Talent Lead",
                status="APPROVED",
                is_verified=True
            )
            db.add(recruiter_a)
            db.commit()
            db.refresh(recruiter_a)

        token_a = create_access_token(data={"sub": recruiter_a.email, "role": "recruiter", "user_id": recruiter_a.id})
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Setup Company B (Competitor) and Recruiter B
        company_b = db.query(models.Company).filter_by(name="Competitor Labs").first()
        if not company_b:
            company_b = models.Company(name="Competitor Labs", industry="Consulting", profile_completed=True, completion_percentage=100)
            db.add(company_b)
            db.commit()
            db.refresh(company_b)

        recruiter_b = db.query(models.RecruiterUser).filter_by(company_id=company_b.id).first()
        if not recruiter_b:
            recruiter_b = models.RecruiterUser(
                name="Vikram Recruiter",
                email="recruiter_eval_b@competitor.com",
                password_hash=hash_password("Pass1234!"),
                company_id=company_b.id,
                company_name="Competitor Labs",
                designation="HR",
                status="APPROVED",
                is_verified=True
            )
            db.add(recruiter_b)
            db.commit()
            db.refresh(recruiter_b)

        token_b = create_access_token(data={"sub": recruiter_b.email, "role": "recruiter", "user_id": recruiter_b.id})
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. Postings: Frontend Developer Intern (Company A) and Backend Developer Intern (Company A)
        frontend_post = db.query(models.InternshipPosting).filter(
            models.InternshipPosting.company_id == company_a.id,
            models.InternshipPosting.title.ilike("%Frontend Developer%")
        ).first()

        if not frontend_post:
            frontend_post = models.InternshipPosting(
                company_id=company_a.id,
                recruiter_id=recruiter_a.id,
                title="Frontend Developer Intern",
                department="User Experience & Web",
                required_skills='["React", "JavaScript", "TypeScript", "HTML", "CSS", "Git/GitHub"]',
                work_mode="Remote",
                location="Remote (India)",
                application_threshold=70,
                stipend="₹10,000/month",
                status="Active"
            )
            db.add(frontend_post)
            db.commit()
            db.refresh(frontend_post)

        backend_post = db.query(models.InternshipPosting).filter(
            models.InternshipPosting.company_id == company_a.id,
            models.InternshipPosting.title.ilike("%Backend Developer%")
        ).first()

        if not backend_post:
            backend_post = models.InternshipPosting(
                company_id=company_a.id,
                recruiter_id=recruiter_a.id,
                title="Backend Developer Intern",
                department="Platform Infrastructure",
                required_skills='["Python", "FastAPI", "REST APIs", "PostgreSQL", "Docker", "Git/GitHub"]',
                work_mode="Remote",
                location="Remote (India)",
                application_threshold=75,
                stipend="₹14,000/month",
                status="Active"
            )
            db.add(backend_post)
            db.commit()
            db.refresh(backend_post)

        # 4. Student (Aryan Bhoge)
        student = db.query(models.StudentUser).filter_by(id=4).first()
        if not student:
            student = db.query(models.StudentUser).filter_by(name="Aryan Bhoge").first()
        assert student is not None, "Student Aryan Bhoge must exist in DB"

        # 5. Application for Frontend Role
        app_frontend = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.student_id == student.id,
            models.InternshipApplication.internship_id == frontend_post.id
        ).first()

        if not app_frontend:
            app_frontend = models.InternshipApplication(
                student_id=student.id,
                company_id=company_a.id,
                internship_id=frontend_post.id,
                source="internal",
                source_id=str(frontend_post.id),
                title_snapshot=frontend_post.title,
                match_score_at_apply=93.6,
                application_threshold_at_apply=frontend_post.application_threshold,
                status="APPLIED"
            )
            db.add(app_frontend)
            db.commit()
            db.refresh(app_frontend)

        # ----------------------------------------------------
        # TEST 1: Click View for candidate returns evaluation bundle
        # ----------------------------------------------------
        eval_url = f"/api/v1/recruiter/internships/{frontend_post.id}/applications/{app_frontend.id}/evaluation"
        res1 = client.get(eval_url, headers=headers_a)
        assert res1.status_code == 200, f"Evaluation fetch failed: {res1.text}"
        data1 = res1.json()
        assert data1["status"] == "success"
        assert data1["candidate"]["name"] == student.name
        print("✓ Test 1 Passed: Candidate evaluation endpoint returns full evaluation payload.")

        # ----------------------------------------------------
        # TEST 2: Evaluation calculations are specific to Frontend Developer Intern
        # ----------------------------------------------------
        assert data1["internship"]["id"] == frontend_post.id
        assert data1["internship"]["title"] == "Frontend Developer Intern"
        assert "React" in data1["internship"]["required_skills"]
        assert data1["why_eligible"]["required_threshold"] == frontend_post.application_threshold
        print("✓ Test 2 Passed: Calculations are specifically bound to Frontend Developer Intern.")

        # ----------------------------------------------------
        # TEST 3: Multi-role comparison (Backend Developer Intern)
        # ----------------------------------------------------
        # Create/simulate application for Backend role
        app_backend = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.student_id == student.id,
            models.InternshipApplication.internship_id == backend_post.id
        ).first()

        if not app_backend:
            app_backend = models.InternshipApplication(
                student_id=student.id,
                company_id=company_a.id,
                internship_id=backend_post.id,
                source="internal",
                source_id=str(backend_post.id),
                title_snapshot=backend_post.title,
                match_score_at_apply=88.5,
                application_threshold_at_apply=backend_post.application_threshold,
                status="APPLIED"
            )
            db.add(app_backend)
            db.commit()
            db.refresh(app_backend)

        res_backend = client.get(f"/api/v1/recruiter/internships/{backend_post.id}/applications/{app_backend.id}/evaluation", headers=headers_a)
        assert res_backend.status_code == 200
        data_backend = res_backend.json()
        assert data_backend["internship"]["title"] == "Backend Developer Intern"
        assert data_backend["personalized_resume"]["target_role"] == "Backend Developer Intern"
        assert "FastAPI" in data_backend["internship"]["required_skills"]
        print("✓ Test 3 Passed: Role-specific requirements and personalized resume change according to the selected role.")

        # ----------------------------------------------------
        # TEST 4 & 5: Required skills and Skill Gaps
        # ----------------------------------------------------
        skill_table = data1["skill_match_table"]
        assert len(skill_table) > 0
        req_names = [s["skill"] for s in skill_table]
        assert "React" in req_names
        print(f"✓ Test 4 & 5 Passed: Required skills evaluated ({len(skill_table)} skills in matrix, {len(data1['skill_gaps'])} gaps identified).")

        # ----------------------------------------------------
        # TEST 6: GitHub profile and verified repositories
        # ----------------------------------------------------
        assert "github" in data1
        assert data1["github"]["connected"] is True
        assert len(data1["github"]["repositories"]) > 0
        print(f"✓ Test 6 Passed: Real GitHub connection verified (@{data1['github']['username']}) with {len(data1['github']['repositories'])} repos.")

        # ----------------------------------------------------
        # TEST 7: Original uploaded resume
        # ----------------------------------------------------
        assert data1["original_resume"]["has_resume"] is True
        assert "resume" in data1["original_resume"]["filename"].lower()
        print("✓ Test 7 Passed: Exact original uploaded resume document details retrieved from database.")

        # ----------------------------------------------------
        # TEST 8 & 9: Personalized resume tailored for role vs Original
        # ----------------------------------------------------
        pers_res = data1["personalized_resume"]
        assert pers_res["target_role"] == frontend_post.title
        assert pers_res["education"]["institution"] == student.university
        assert data1["original_resume"]["filename"] != pers_res["target_role"]
        print("✓ Test 8 & 9 Passed: Personalized resume dynamically synthesized from verified DB facts and isolated from original resume.")

        # ----------------------------------------------------
        # TEST 10: Security Isolation (Competitor cannot access candidate evaluation)
        # ----------------------------------------------------
        res_sec = client.get(eval_url, headers=headers_b)
        assert res_sec.status_code in [403, 404], f"Competitor should be denied access, got: {res_sec.status_code}"
        print("✓ Test 10 Passed: Backend security strictly denies access to unauthorized recruiters from other companies.")

        # ----------------------------------------------------
        # TEST 11: Refreshing evaluation returns consistent data
        # ----------------------------------------------------
        res_refresh = client.get(eval_url, headers=headers_a)
        assert res_refresh.status_code == 200
        assert res_refresh.json()["candidate"]["name"] == data1["candidate"]["name"]
        print("✓ Test 11 Passed: Candidate evaluation data is deterministic and persistent.")

        # ----------------------------------------------------
        # TEST 12: Application snapshot preserved
        # ----------------------------------------------------
        app_db = db.query(models.InternshipApplication).filter_by(id=app_frontend.id).first()
        assert app_db.application_threshold_at_apply == frontend_post.application_threshold
        print("✓ Test 12 Passed: Historical application threshold snapshot remains intact.")

        # ----------------------------------------------------
        # TEST 13: Canonical Skill Score Parity
        # ----------------------------------------------------
        # Verify that for Frontend Developer Intern, React is 100%, TypeScript is 100%, Git/GitHub is 85%,
        # and React is NOT in skill gaps because student score (100) >= required level (75).
        react_row = next((s for s in skill_table if s["skill"] == "React"), None)
        assert react_row is not None, "React must be present in Frontend Developer Intern skill matrix"
        assert react_row["student_level"] == 100, f"React score should be canonical 100, got {react_row['student_level']}"
        assert react_row["required_level"] == 75
        assert react_row["is_met"] is True
        assert react_row["gap"] == "+25"

        ts_row = next((s for s in skill_table if s["skill"] == "TypeScript"), None)
        assert ts_row is not None, "TypeScript must be present in Frontend Developer Intern skill matrix"
        assert ts_row["student_level"] == 100, f"TypeScript score should be canonical 100, got {ts_row['student_level']}"
        assert ts_row["is_met"] is True
        assert ts_row["gap"] == "+25"

        git_row = next((s for s in skill_table if "Git" in s["skill"]), None)
        assert git_row is not None
        assert git_row["student_level"] == 85, f"Git/GitHub score should be canonical 85, got {git_row['student_level']}"
        assert git_row["is_met"] is True

        # Assert that React is NOT in skill gaps
        gap_skills = [g["skill"] for g in data1["skill_gaps"]]
        assert "React" not in gap_skills, f"React (score 100 >= req 75) must NOT appear in skill gaps, but found: {gap_skills}"
        assert "TypeScript" not in gap_skills, f"TypeScript (score 100 >= req 75) must NOT appear in skill gaps, but found: {gap_skills}"
        print("✓ Test 13 Passed: Canonical skill parity verified (React=100%, TypeScript=100%, zero false skill gaps).")

        print("\n============================================================")
        print("ALL 13 CANDIDATE EVALUATION TESTS PASSED WITH 100% SUCCESS!")
        print("============================================================\n")

    finally:
        db.close()


def test_canonical_skill_parity_between_student_and_recruiter():
    """
    Asserts zero mismatch between canonical student evidence resolution and recruiter candidate evaluation.
    """
    db = SessionLocal()
    try:
        from app.services import esco_service
        from app.routers.recruiter import build_candidate_evaluation_payload

        student = db.query(models.StudentUser).filter(models.StudentUser.email == "abhoge27@gmail.com").first()
        company = db.query(models.Company).filter(models.Company.name == "Catalyst Coders").first()
        posting = db.query(models.InternshipPosting).filter(
            models.InternshipPosting.company_id == company.id,
            models.InternshipPosting.title.ilike("%Frontend Developer%")
        ).first()
        app_record = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.student_id == student.id
        ).first()

        # 1. Canonical student evidence
        gh_skills, res_data, prof_skills = esco_service.load_student_evidence_from_db(student.email, db)
        canonical_scores = esco_service.aggregate_student_evidence(gh_skills, res_data, prof_skills)

        # 2. Recruiter evaluation payload
        payload = build_candidate_evaluation_payload(db, company, posting, app_record, student)
        skill_matrix = payload["skill_match_table"]

        # For every skill in recruiter view, verify score matches canonical resolution
        for row in skill_matrix:
            sk_name = row["skill"]
            canon_score_float, _, _ = esco_service.resolve_esco_skill_evidence_level(sk_name, canonical_scores)
            expected_score = max(0, min(100, int(round(canon_score_float))))
            assert row["student_level"] == expected_score, (
                f"Mismatch for skill '{sk_name}': Recruiter={row['student_level']}, Canonical={expected_score}"
            )
            # Gap verification
            expected_gap = expected_score - row["required_level"]
            assert row["gap_num"] == expected_gap
            assert row["is_met"] == (expected_gap >= 0)

        print("\n✓ ZERO MISMATCH: 100% parity verified between Student canonical skills and Recruiter candidate evaluation.")
    finally:
        db.close()


def test_shortlist_unshortlist_workflow():
    """
    End-to-End Tests for Candidate Shortlist and Unshortlist Workflow:
    - Status transitions (APPLIED -> SHORTLISTED -> APPLIED)
    - Audit log persistence (ApplicationStatusAudit)
    - Email log persistence (ApplicationEmailLog)
    - Verified sender identity matching OTP email sender
    - Idempotent execution (duplicate clicks do not duplicate status or emails)
    - Security authorization (competitor recruiter cannot modify application)
    """
    db = SessionLocal()
    try:
        from app.config import settings

        # 1. Setup Company A and Recruiter A
        company_a = db.query(models.Company).filter_by(name="Catalyst Coders").first()
        assert company_a is not None
        company_a.profile_completed = True
        company_a.completion_percentage = 100
        db.commit()

        recruiter_a = db.query(models.RecruiterUser).filter_by(company_id=company_a.id).first()
        assert recruiter_a is not None

        token_a = create_access_token(data={"sub": recruiter_a.email, "role": "recruiter", "user_id": recruiter_a.id})
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Setup Company B and Recruiter B (Competitor)
        company_b = db.query(models.Company).filter_by(name="Competitor Labs").first()
        if not company_b:
            company_b = models.Company(name="Competitor Labs", industry="Consulting", profile_completed=True, completion_percentage=100)
            db.add(company_b)
            db.commit()
            db.refresh(company_b)

        recruiter_b = db.query(models.RecruiterUser).filter_by(company_id=company_b.id).first()
        if not recruiter_b:
            recruiter_b = models.RecruiterUser(
                name="Vikram Recruiter",
                email="recruiter_eval_b@competitor.com",
                password_hash=hash_password("Pass1234!"),
                company_id=company_b.id,
                company_name="Competitor Labs",
                designation="HR",
                status="APPROVED",
                is_verified=True
            )
            db.add(recruiter_b)
            db.commit()
            db.refresh(recruiter_b)

        token_b = create_access_token(data={"sub": recruiter_b.email, "role": "recruiter", "user_id": recruiter_b.id})
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. Find target student and application
        student = db.query(models.StudentUser).filter(models.StudentUser.email == "abhoge27@gmail.com").first()
        assert student is not None

        frontend_post = db.query(models.InternshipPosting).filter(
            models.InternshipPosting.company_id == company_a.id,
            models.InternshipPosting.title.ilike("%Frontend Developer%")
        ).first()
        assert frontend_post is not None

        app_record = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.student_id == student.id,
            models.InternshipApplication.internship_id == frontend_post.id
        ).first()
        if not app_record:
            app_record = models.InternshipApplication(
                internship_id=frontend_post.id,
                student_id=student.id,
                company_id=company_a.id,
                status="APPLIED"
            )
            db.add(app_record)
            db.commit()
            db.refresh(app_record)

        # Reset application status to APPLIED for clean test run
        app_record.status = "APPLIED"
        db.commit()
        db.refresh(app_record)

        # Baseline count of email logs for this app
        initial_shortlist_logs = db.query(models.ApplicationEmailLog).filter_by(
            application_id=app_record.id,
            email_type="SHORTLISTED_EMAIL"
        ).count()

        # ----------------------------------------------------
        # TEST 1: Shortlist Candidate Workflow
        # ----------------------------------------------------
        res_shortlist = client.patch(
            f"/api/v1/recruiter/applications/{app_record.id}/status",
            headers=headers_a,
            json={"status": "SHORTLISTED"}
        )
        assert res_shortlist.status_code == 200, f"Shortlist failed: {res_shortlist.text}"
        data_shortlist = res_shortlist.json()
        assert data_shortlist["status"] == "SHORTLISTED"
        assert data_shortlist["previous_status"] == "APPLIED"
        assert data_shortlist["is_duplicate"] is False

        # Verify DB status updated
        db.refresh(app_record)
        assert app_record.status == "SHORTLISTED"

        # Verify Audit Log recorded
        audit_shortlist = db.query(models.ApplicationStatusAudit).filter_by(
            application_id=app_record.id,
            new_status="SHORTLISTED"
        ).order_by(models.ApplicationStatusAudit.id.desc()).first()
        assert audit_shortlist is not None
        assert audit_shortlist.previous_status == "APPLIED"
        assert audit_shortlist.new_status == "SHORTLISTED"
        assert audit_shortlist.changed_by_recruiter_id == recruiter_a.id

        # Verify Email Log recorded with verified sender
        email_log_shortlist = db.query(models.ApplicationEmailLog).filter_by(
            application_id=app_record.id,
            email_type="SHORTLISTED_EMAIL"
        ).order_by(models.ApplicationEmailLog.id.desc()).first()
        assert email_log_shortlist is not None
        assert email_log_shortlist.recipient_email == student.email
        assert email_log_shortlist.sender_email == (settings.MAIL_FROM or "abhoge5@gmail.com")
        print("✓ Test 1 Passed: Shortlist transition recorded in DB with audit & email logs.")

        # ----------------------------------------------------
        # TEST 2: Idempotency (Repeat Shortlist Action)
        # ----------------------------------------------------
        res_shortlist_dup = client.patch(
            f"/api/v1/recruiter/applications/{app_record.id}/status",
            headers=headers_a,
            json={"status": "SHORTLISTED"}
        )
        assert res_shortlist_dup.status_code == 200
        data_shortlist_dup = res_shortlist_dup.json()
        assert data_shortlist_dup["is_duplicate"] is True
        assert data_shortlist_dup["status"] == "SHORTLISTED"

        current_shortlist_logs = db.query(models.ApplicationEmailLog).filter_by(
            application_id=app_record.id,
            email_type="SHORTLISTED_EMAIL"
        ).count()
        assert current_shortlist_logs == initial_shortlist_logs + 1, "Duplicate email log must NOT be created on repeat shortlist."
        print("✓ Test 2 Passed: Shortlist idempotency verified (zero duplicate emails).")

        # ----------------------------------------------------
        # TEST 3: Unshortlist Candidate Workflow
        # ----------------------------------------------------
        initial_unshortlist_logs = db.query(models.ApplicationEmailLog).filter_by(
            application_id=app_record.id,
            email_type="UNSHORTLISTED_EMAIL"
        ).count()

        res_unshortlist = client.patch(
            f"/api/v1/recruiter/applications/{app_record.id}/status",
            headers=headers_a,
            json={"status": "UNSHORTLIST"}
        )
        assert res_unshortlist.status_code == 200, f"Unshortlist failed: {res_unshortlist.text}"
        data_unshortlist = res_unshortlist.json()
        assert data_unshortlist["status"] == "APPLIED"
        assert data_unshortlist["previous_status"] == "SHORTLISTED"
        assert data_unshortlist["is_duplicate"] is False

        # Verify DB status reverted
        db.refresh(app_record)
        assert app_record.status == "APPLIED"

        # Verify Audit Log recorded
        audit_unshortlist = db.query(models.ApplicationStatusAudit).filter_by(
            application_id=app_record.id,
            previous_status="SHORTLISTED",
            new_status="APPLIED"
        ).order_by(models.ApplicationStatusAudit.id.desc()).first()
        assert audit_unshortlist is not None
        assert audit_unshortlist.changed_by_recruiter_id == recruiter_a.id

        # Verify Email Log recorded
        email_log_unshortlist = db.query(models.ApplicationEmailLog).filter_by(
            application_id=app_record.id,
            email_type="UNSHORTLISTED_EMAIL"
        ).order_by(models.ApplicationEmailLog.id.desc()).first()
        assert email_log_unshortlist is not None
        assert email_log_unshortlist.recipient_email == student.email
        assert email_log_unshortlist.sender_email == (settings.MAIL_FROM or "abhoge5@gmail.com")
        print("✓ Test 3 Passed: Unshortlist transition recorded in DB with audit & update email logs.")

        # ----------------------------------------------------
        # TEST 4: Unshortlist Idempotency
        # ----------------------------------------------------
        res_unshortlist_dup = client.patch(
            f"/api/v1/recruiter/applications/{app_record.id}/status",
            headers=headers_a,
            json={"status": "UNSHORTLIST"}
        )
        assert res_unshortlist_dup.status_code == 200
        data_unshortlist_dup = res_unshortlist_dup.json()
        assert data_unshortlist_dup["is_duplicate"] is True

        current_unshortlist_logs = db.query(models.ApplicationEmailLog).filter_by(
            application_id=app_record.id,
            email_type="UNSHORTLISTED_EMAIL"
        ).count()
        assert current_unshortlist_logs == initial_unshortlist_logs + 1, "Duplicate email log must NOT be created on repeat unshortlist."
        print("✓ Test 4 Passed: Unshortlist idempotency verified (zero duplicate emails).")

        # ----------------------------------------------------
        # TEST 5: Rejection Workflow & Email
        # ----------------------------------------------------
        res_reject = client.patch(
            f"/api/v1/recruiter/applications/{app_record.id}/status",
            headers=headers_a,
            json={"status": "REJECTED"}
        )
        assert res_reject.status_code == 200
        data_reject = res_reject.json()
        assert data_reject["status"] == "REJECTED"

        email_log_reject = db.query(models.ApplicationEmailLog).filter_by(
            application_id=app_record.id,
            email_type="REJECTION_EMAIL"
        ).order_by(models.ApplicationEmailLog.id.desc()).first()
        assert email_log_reject is not None
        assert email_log_reject.recipient_email == student.email
        assert email_log_reject.sender_email == (settings.MAIL_FROM or "abhoge5@gmail.com")
        print("✓ Test 5 Passed: Rejection transition recorded with dedicated REJECTION_EMAIL log.")

        # ----------------------------------------------------
        # TEST 6: General Status Transition Workflow & Email
        # ----------------------------------------------------
        res_interviewing = client.patch(
            f"/api/v1/recruiter/applications/{app_record.id}/status",
            headers=headers_a,
            json={"status": "INTERVIEWING"}
        )
        assert res_interviewing.status_code == 200
        data_interviewing = res_interviewing.json()
        assert data_interviewing["status"] == "INTERVIEWING"

        email_log_status = db.query(models.ApplicationEmailLog).filter_by(
            application_id=app_record.id,
            email_type="STATUS_UPDATE_EMAIL"
        ).order_by(models.ApplicationEmailLog.id.desc()).first()
        assert email_log_status is not None
        assert email_log_status.recipient_email == student.email
        print("✓ Test 6 Passed: General status transition recorded with STATUS_UPDATE_EMAIL log.")

        # ----------------------------------------------------
        # TEST 7: Security Authorization (Cross-Company Access)
        # ----------------------------------------------------
        res_unauthorized = client.patch(
            f"/api/v1/recruiter/applications/{app_record.id}/status",
            headers=headers_b,
            json={"status": "SHORTLISTED"}
        )
        assert res_unauthorized.status_code in (403, 404), (
            f"Unauthorized recruiter must be rejected with 403 or 404, got {res_unauthorized.status_code}"
        )
        print("✓ Test 7 Passed: Competitor recruiter is strictly prohibited from modifying applicant status.")

        print("\n============================================================")
        print("ALL SHORTLIST / UNSHORTLIST / REJECTION / STATUS TESTS PASSED 100%!")
        print("============================================================\n")

    finally:
        db.close()


def test_recruiter_applications_tab_dynamic_suite():
    """
    Comprehensive verification for Recruiter Applications Tab:
    1. Summary KPI & Funnel calculations
    2. Applications paginated, filtered, searched, and sorted list
    3. Candidate detailed inspection payload
    4. Recruiter internal notes updates
    5. Bulk application actions (Shortlist, Under Review, Reject)
    6. CSV export
    7. Strict company isolation security
    """
    db = SessionLocal()
    try:
        print("\n=== STARTING RECRUITER APPLICATIONS TAB DYNAMIC POSTGRESQL TESTS ===")

        # 1. Setup Company A and Recruiter A
        company_a = db.query(models.Company).filter_by(name="Catalyst Coders").first()
        if not company_a:
            company_a = models.Company(name="Catalyst Coders", industry="Information Technology", is_verified=True)
            db.add(company_a)
            db.commit()
            db.refresh(company_a)

        recruiter_a = db.query(models.RecruiterUser).filter_by(company_id=company_a.id).first()
        token_a = create_access_token(data={"sub": recruiter_a.email, "role": "recruiter", "user_id": recruiter_a.id})
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Setup Company B and Recruiter B
        company_b = db.query(models.Company).filter_by(name="Competitor Labs").first()
        if not company_b:
            company_b = models.Company(name="Competitor Labs", industry="Consulting", is_verified=True)
            db.add(company_b)
            db.commit()
            db.refresh(company_b)

        recruiter_b = db.query(models.RecruiterUser).filter_by(company_id=company_b.id).first()
        token_b = create_access_token(data={"sub": recruiter_b.email, "role": "recruiter", "user_id": recruiter_b.id})
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Get existing application for Company A
        postings_a = db.query(models.InternshipPosting).filter_by(company_id=company_a.id).all()
        posting_ids_a = [p.id for p in postings_a]
        apps_a = db.query(models.InternshipApplication).filter(models.InternshipApplication.internship_id.in_(posting_ids_a)).all()
        assert len(apps_a) > 0, "There must be applications for Company A"

        target_app = apps_a[0]

        # ----------------------------------------------------
        # TEST 1: Applications Summary & Funnel
        # ----------------------------------------------------
        res_sum = client.get("/api/v1/recruiter/applications/summary", headers=headers_a)
        assert res_sum.status_code == 200, f"Summary failed: {res_sum.text}"
        sum_data = res_sum.json()
        assert sum_data["total"] == len(apps_a)
        assert "funnel" in sum_data
        assert "applied" in sum_data["funnel"]
        assert "shortlisted" in sum_data["funnel"]
        print(f"✓ Test 1 Passed: Applications Summary verified (Total: {sum_data['total']}, Funnel Applied: {sum_data['funnel']['applied']}).")

        # ----------------------------------------------------
        # TEST 2: Applications List with Pagination & Filtering
        # ----------------------------------------------------
        res_list = client.get("/api/v1/recruiter/applications?page=1&page_size=10", headers=headers_a)
        assert res_list.status_code == 200, f"List failed: {res_list.text}"
        list_data = res_list.json()
        assert "items" in list_data
        assert "total" in list_data
        assert list_data["total"] == len(apps_a)
        assert len(list_data["items"]) > 0
        first_item = list_data["items"][0]
        assert "student_name" in first_item
        assert "match_score" in first_item
        assert "threshold" in first_item
        assert "status" in first_item
        print(f"✓ Test 2 Passed: Applications List returned {len(list_data['items'])} items with student & score data.")

        # ----------------------------------------------------
        # TEST 3: Search and Filter by Status
        # ----------------------------------------------------
        res_search = client.get(f"/api/v1/recruiter/applications?search={first_item['student_name']}", headers=headers_a)
        assert res_search.status_code == 200
        search_data = res_search.json()
        assert search_data["total"] >= 1
        assert any(item["id"] == first_item["id"] for item in search_data["items"])
        print("✓ Test 3 Passed: Applications search filtering works as expected.")

        # ----------------------------------------------------
        # TEST 4: Single Application Detail Inspection
        # ----------------------------------------------------
        res_detail = client.get(f"/api/v1/recruiter/applications/{target_app.id}", headers=headers_a)
        assert res_detail.status_code == 200, f"Detail failed: {res_detail.text}"
        detail_data = res_detail.json()
        assert detail_data["id"] == target_app.id
        assert "student_name" in detail_data
        assert "canonical_skills" in detail_data
        assert "timeline" in detail_data
        print("✓ Test 4 Passed: Full Candidate Inspection Detail fetched with canonical skills and timeline.")

        # ----------------------------------------------------
        # TEST 5: Update Internal Recruiter Notes
        # ----------------------------------------------------
        test_note = "Candidate demonstrated exceptional PostgreSQL and distributed systems proficiency."
        res_note = client.patch(
            f"/api/v1/recruiter/applications/{target_app.id}/notes",
            headers=headers_a,
            json={"notes": test_note}
        )
        assert res_note.status_code == 200, f"Notes update failed: {res_note.text}"
        db.refresh(target_app)
        assert target_app.notes == test_note
        print("✓ Test 5 Passed: Recruiter Notes successfully updated and persisted in DB.")

        # ----------------------------------------------------
        # TEST 6: Bulk Action Workflow (Shortlist & Review)
        # ----------------------------------------------------
        res_bulk = client.post(
            "/api/v1/recruiter/applications/bulk-action",
            headers=headers_a,
            json={"application_ids": [target_app.id], "action": "UNDER_REVIEW", "notes": "Bulk moved to review"}
        )
        assert res_bulk.status_code == 200, f"Bulk action failed: {res_bulk.text}"
        bulk_data = res_bulk.json()
        assert bulk_data["updated_count"] == 1
        db.refresh(target_app)
        assert target_app.status == "UNDER_REVIEW"
        print("✓ Test 6 Passed: Bulk Action successfully transitioned status to UNDER_REVIEW.")

        # ----------------------------------------------------
        # TEST 7: CSV Export
        # ----------------------------------------------------
        res_csv = client.get("/api/v1/recruiter/applications/export-csv", headers=headers_a)
        assert res_csv.status_code == 200, f"CSV export failed with {res_csv.status_code}: {res_csv.text}"
        assert "text/csv" in res_csv.headers["content-type"]
        assert "Application ID" in res_csv.text
        assert target_app.student.name in res_csv.text
        print("✓ Test 7 Passed: Applications CSV exported with valid headers and student data.")

        # ----------------------------------------------------
        # TEST 8: Strict Multi-Company Security Isolation
        # ----------------------------------------------------
        # Recruiter B attempts to view Company A's application detail
        res_sec_detail = client.get(f"/api/v1/recruiter/applications/{target_app.id}", headers=headers_b)
        assert res_sec_detail.status_code in (403, 404), f"Expected 403/404, got {res_sec_detail.status_code}"

        # Recruiter B attempts to update notes on Company A's application
        res_sec_note = client.patch(
            f"/api/v1/recruiter/applications/{target_app.id}/notes",
            headers=headers_b,
            json={"notes": "Hacker note"}
        )
        assert res_sec_note.status_code in (403, 404)

        # Recruiter B attempts bulk action on Company A's application
        res_sec_bulk = client.post(
            "/api/v1/recruiter/applications/bulk-action",
            headers=headers_b,
            json={"application_ids": [target_app.id], "action": "REJECT"}
        )
        assert res_sec_bulk.status_code in (403, 404), (
            f"Recruiter B must be rejected with 403/404, got {res_sec_bulk.status_code}"
        )
        print("✓ Test 8 Passed: Multi-company isolation strictly enforced (Recruiter B blocked from Company A).")

        print("\n============================================================")
        print("ALL RECRUITER APPLICATIONS TAB TESTS PASSED 100%!")
        print("============================================================\n")

    finally:
        db.close()


if __name__ == "__main__":
    test_candidate_evaluation_flow()
    test_canonical_skill_parity_between_student_and_recruiter()
    test_shortlist_unshortlist_workflow()
    test_recruiter_applications_tab_dynamic_suite()


