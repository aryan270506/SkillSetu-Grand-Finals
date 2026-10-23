"""
Complete End-to-End Recruitment Automation Audit Script
Tests the full lifecycle against the live running SkillSetu API (port 8000) and PostgreSQL:
1. Recruiter auth & company profile verification (Catalyst Coders, abhoge5@gmail.com)
2. Internship creation & 2-round pipeline configuration
3. Pipeline version publishing & automation mode activation (FULL_AUTOMATION)
4. Seed real demo passing student (Priya Sharma) and failing student (Aman Gupta)
5. Live student application submissions via API
6. Deterministic screening & queue execution
7. Assessment session launch via student API
8. Round 1 aptitude submissions & real callback evaluation (Pass vs Fail)
9. Round 2 technical assessment for passing candidate
10. Vacancy-aware final selection sweep & offer generation
11. Live recruiter dashboard, applications, assessment scorecard, and audit trail verification
"""

import sys
import os
import json
import uuid
import time
import requests
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app import models, security
from app.config import settings
from app.services.job_queue_service import process_queue_iteration

def process_pending_jobs(max_jobs=10):
    count = 0
    while count < max_jobs and process_queue_iteration("e2e-worker"):
        count += 1
    return count

API_BASE = "http://localhost:8000/api/v1"
SHARED_SECRET = settings.ASSESSMENT_SERVICE_SECRET or "S8G7idwzNTn9gRlkfFwTVSDFPmmVubgWVxWcm88LZKB"

def log_step(title):
    print("\n" + "=" * 80)
    print(f"STEP: {title}")
    print("=" * 80)

def run_e2e_recruitment_automation_test():
    db = SessionLocal()
    evidence = {}

    try:
        # =========================================================================
        # 1. RECRUITER AUTHENTICATION & COMPANY PROFILE
        # =========================================================================
        log_step("1. Recruiter Authentication & Company Profile Check")
        recruiter = db.query(models.RecruiterUser).filter(
            models.RecruiterUser.email == "abhoge5@gmail.com",
            models.RecruiterUser.is_verified == True
        ).first()
        assert recruiter is not None, "Recruiter abhoge5@gmail.com not found in database!"
        company = db.query(models.Company).filter(models.Company.id == recruiter.company_id).first()
        assert company is not None, f"Company {recruiter.company_id} not found!"

        token = security.create_access_token({
            "sub": recruiter.email,
            "role": "recruiter",
            "company_id": company.id,
            "user_id": recruiter.id
        })
        rec_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Hit profile endpoint
        res_profile = requests.get(f"{API_BASE}/recruiter/profile", headers=rec_headers)
        assert res_profile.status_code == 200, f"Profile endpoint failed: {res_profile.text}"
        prof_data = res_profile.json()["data"]
        print(f"✓ Recruiter Authenticated: {recruiter.name} ({recruiter.email})")
        print(f"✓ Company: {company.name} (ID: {company.id}), Profile Completion: {prof_data['profile']['completion_percentage']}%")

        # Hit dashboard endpoint
        res_dash = requests.get(f"{API_BASE}/recruiter/dashboard", headers=rec_headers)
        assert res_dash.status_code == 200, f"Dashboard endpoint failed: {res_dash.text}"
        dash_initial = res_dash.json()["data"]["stats"]
        print(f"✓ Initial Dashboard Stats: {dash_initial}")

        evidence["recruiter"] = {"id": recruiter.id, "email": recruiter.email, "company": company.name}

        # =========================================================================
        # 2. INTERNSHIP CREATION & PIPELINE SETUP
        # =========================================================================
        log_step("2. Internship Creation & Multi-Round Pipeline Setup")
        test_uid = uuid.uuid4().hex[:6]
        posting_title = f"AI Cloud Platform Engineer #{test_uid}"

        posting = models.InternshipPosting(
            company_id=company.id,
            recruiter_id=recruiter.id,
            title=posting_title,
            department="Cloud Infrastructure & AI",
            description="Build scalable distributed cloud architectures, FastAPI microservices, and AI workflow pipelines.",
            required_skills=json.dumps(["Python", "FastAPI", "PostgreSQL", "Docker"]),
            location="Pune, Maharashtra (Hybrid)",
            work_mode="Hybrid",
            stipend="₹25,000/mo",
            duration="6 Months",
            openings=1,  # Strictly 1 vacancy to test vacancy limits
            application_threshold=70,
            status="Active",
            automation_mode="FULL_AUTOMATION",
            automation_enabled=True,
            deadline=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(posting)
        db.commit()
        db.refresh(posting)
        print(f"✓ Created Internship Posting: '{posting.title}' (ID: {posting.id}) with 1 vacancy, threshold: 70%")

        # Create published pipeline version with 2 rounds
        pipeline_cfg = {
            "rounds": [
                {
                    "round_key": "aptitude",
                    "round_name": "Aptitude Assessment",
                    "passing_score": 60,
                    "sequence": 1,
                    "duration_minutes": 30
                },
                {
                    "round_key": "technical",
                    "round_name": "Technical Coding & Sandbox",
                    "passing_score": 70,
                    "sequence": 2,
                    "duration_minutes": 45
                }
            ]
        }
        rubrics = {
            "aptitude": {"passing_cutoff": 60, "rules": ["Quantitative >= 60", "Logical >= 60"]},
            "technical": {"passing_cutoff": 70, "rules": ["Code Correctness >= 70", "Architecture >= 70"]}
        }
        elig_rules = {
            "required_skills": ["Python", "FastAPI"],
            "minimum_match_score": 70,
            "min_cgpa": 6.5
        }
        weights = {
            "weights_by_round": {"aptitude": 30.0, "technical": 70.0}
        }
        auto_policy = {
            "auto_screen": True,
            "shortlist_mode": "IMMEDIATE",
            "auto_advance_rounds": True,
            "proctoring_quarantine_enabled": True
        }

        # Create pipeline version in database
        version = models.RecruitmentPipelineVersion(
            internship_id=posting.id,
            version_number=1,
            status="PUBLISHED",
            content_hash=f"hash_{uuid.uuid4().hex[:12]}",
            pipeline_config=pipeline_cfg,
            evaluation_rubrics=rubrics,
            eligibility_rules=elig_rules,
            scoring_weights=weights,
            automation_policy=auto_policy,
            published_by=recruiter.id,
            published_at=datetime.now(timezone.utc)
        )
        db.add(version)
        db.flush()

        posting.active_pipeline_version_id = version.id
        posting.automation_enabled = True
        posting.automation_paused = False
        db.commit()
        print(f"✓ Published Pipeline Version: ID={version.id}, Rounds: [aptitude (pass: 60), technical (pass: 70)]")
        evidence["posting"] = {"id": posting.id, "title": posting.title, "version_id": version.id}

        # =========================================================================
        # 3. SEED REAL PASSING & FAILING DEMO STUDENTS IN POSTGRESQL
        # =========================================================================
        log_step("3. Seed Real Passing Candidate (Priya) and Failing Candidate (Aman)")
        stu_suffix = uuid.uuid4().hex[:6]
        
        # Candidate 1: Passing candidate (Priya Sharma)
        priya_email = f"priya.sharma_{stu_suffix}@demo.skillsetu.in"
        cand_priya = models.StudentUser(
            name="Priya Sharma",
            email=priya_email,
            password_hash=security.hash_password("Pass1234!"),
            degree="B.Tech Computer Science",
            university="Pune Institute of Computer Technology",
            branch="Computer Engineering",
            graduation_year="2026",
            cgpa_or_percentage="8.6/10",
            resume_score=88,
            target_careers=json.dumps(["Backend Engineer", "Cloud Architect"]),
            target_industries=json.dumps(["Software Engineering", "Cloud"]),
            is_verified=True
        )
        db.add(cand_priya)

        # Candidate 2: Failing candidate (Aman Gupta)
        aman_email = f"aman.gupta_{stu_suffix}@demo.skillsetu.in"
        cand_aman = models.StudentUser(
            name="Aman Gupta",
            email=aman_email,
            password_hash=security.hash_password("Pass1234!"),
            degree="B.Sc Information Technology",
            university="Mumbai Technical College",
            branch="Information Technology",
            graduation_year="2026",
            cgpa_or_percentage="7.2/10",
            resume_score=72,
            target_careers=json.dumps(["Junior Developer"]),
            target_industries=json.dumps(["IT Services"]),
            is_verified=True
        )
        db.add(cand_aman)
        db.commit()
        db.refresh(cand_priya)
        db.refresh(cand_aman)
        print(f"✓ Seeded Candidate A (Passing): Priya Sharma (ID: {cand_priya.id}, Email: {priya_email}, CGPA: 8.6)")
        print(f"✓ Seeded Candidate B (Failing): Aman Gupta (ID: {cand_aman.id}, Email: {aman_email}, CGPA: 7.2)")
        evidence["students"] = {
            "priya": {"id": cand_priya.id, "email": priya_email},
            "aman": {"id": cand_aman.id, "email": aman_email}
        }

        # =========================================================================
        # 4. LIVE APPLICATION SUBMISSION VIA API
        # =========================================================================
        log_step("4. Live Student Application Submissions via API")
        
        # Priya applies
        res_app_priya = requests.post(
            f"{API_BASE}/internships/{posting.id}/apply?email={priya_email}",
            json={"notes": "E2E Test: Dedicated candidate application"}
        )
        assert res_app_priya.status_code == 200, f"Priya apply failed: {res_app_priya.text}"
        data_priya = res_app_priya.json()
        assert data_priya.get("status") == "success" or data_priya.get("allowed") == True, f"Priya apply not allowed: {data_priya}"
        print(f"✓ Priya Sharma applied successfully via API: Match={data_priya.get('current_match')}%, ApplicationID={data_priya.get('application_id')}")

        # Aman applies
        res_app_aman = requests.post(
            f"{API_BASE}/internships/{posting.id}/apply?email={aman_email}",
            json={"notes": "E2E Test: Secondary candidate application"}
        )
        assert res_app_aman.status_code == 200, f"Aman apply failed: {res_app_aman.text}"
        data_aman = res_app_aman.json()
        assert data_aman.get("status") == "success" or data_aman.get("allowed") == True, f"Aman apply not allowed: {data_aman}"
        print(f"✓ Aman Gupta applied successfully via API: Match={data_aman.get('current_match')}%, ApplicationID={data_aman.get('application_id')}")

        # Verify PostgreSQL application records
        app_priya = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.student_id == cand_priya.id,
            models.InternshipApplication.internship_id == posting.id
        ).first()
        assert app_priya is not None, "Application record for Priya not found in PostgreSQL!"

        app_aman = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.student_id == cand_aman.id,
            models.InternshipApplication.internship_id == posting.id
        ).first()
        assert app_aman is not None, "Application record for Aman not found in PostgreSQL!"

        evidence["applications"] = {
            "priya_app_id": app_priya.id,
            "aman_app_id": app_aman.id
        }

        # =========================================================================
        # 5. DETERMINISTIC SCREENING & QUEUE EXECUTION
        # =========================================================================
        log_step("5. Screening Job Processing & Round 1 Session Initialization")
        # Process queued SCREEN_APPLICANT jobs
        processed_count = process_pending_jobs(max_jobs=10)
        print(f"✓ Processed {processed_count} pending background orchestration jobs from queue")

        db.refresh(app_priya)
        db.refresh(app_aman)
        print(f"✓ Priya Application Status: {app_priya.status}, Notes: {app_priya.notes}")
        print(f"✓ Aman Application Status: {app_aman.status}, Notes: {app_aman.notes}")

        # Verify both candidates were shortlisted into Round 1
        sess_priya = db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.application_id == app_priya.id
        ).first()
        assert sess_priya is not None, "Assessment session for Priya not found!"
        assert sess_priya.current_round == "aptitude", f"Expected round 'aptitude', got {sess_priya.current_round}"

        sess_aman = db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.application_id == app_aman.id
        ).first()
        assert sess_aman is not None, "Assessment session for Aman not found!"
        assert sess_aman.current_round == "aptitude", f"Expected round 'aptitude', got {sess_aman.current_round}"
        print(f"✓ Priya Session: ID={sess_priya.id}, Round={sess_priya.current_round}, Status={sess_priya.status}")
        print(f"✓ Aman Session: ID={sess_aman.id}, Round={sess_aman.current_round}, Status={sess_aman.status}")

        # =========================================================================
        # 6. CANDIDATE ASSESSMENT SESSIONS LAUNCH VIA LIVE API
        # =========================================================================
        log_step("6. Student Launches Assessment Sessions via Live API")
        
        # Priya launches assessment
        res_launch_priya = requests.post(
            f"{API_BASE}/student/applications/{app_priya.id}/assessment/start?email={priya_email}"
        )
        assert res_launch_priya.status_code == 200, f"Priya launch assessment failed: {res_launch_priya.text}"
        print(f"✓ Priya started assessment session: {res_launch_priya.json().get('status')}")

        # Aman launches assessment
        res_launch_aman = requests.post(
            f"{API_BASE}/student/applications/{app_aman.id}/assessment/start?email={aman_email}"
        )
        assert res_launch_aman.status_code == 200, f"Aman launch assessment failed: {res_launch_aman.text}"
        print(f"✓ Aman started assessment session: {res_launch_aman.json().get('status')}")

        db.refresh(sess_priya)
        db.refresh(sess_aman)
        assert sess_priya.status == "IN_PROGRESS", f"Expected IN_PROGRESS, got {sess_priya.status}"
        assert sess_aman.status == "IN_PROGRESS", f"Expected IN_PROGRESS, got {sess_aman.status}"

        # =========================================================================
        # 7. ROUND 1 SUBMISSIONS & REAL EVALUATION (PASS VS FAIL)
        # =========================================================================
        log_step("7. Round 1 Aptitude Evaluation via Callback Webhook (Pass vs Fail)")
        
        callback_headers = {
            "X-Assessment-Secret": SHARED_SECRET,
            "Content-Type": "application/json"
        }

        # Priya: Submits with score 85.0% (PASS, passing cutoff 60)
        priya_cb_payload = {
            "idempotencyKey": f"cb_priya_r1_{uuid.uuid4().hex[:8]}",
            "assessmentId": sess_priya.id,
            "studentId": cand_priya.id,
            "applicationId": app_priya.id,
            "internshipId": posting.id,
            "roundKey": "aptitude",
            "status": "COMPLETED",
            "overallScore": 85.0,
            "integrityStatus": "VERIFIED",
            "warningCount": 0,
            "roundResults": {
                "aptitude": {
                    "score": 85.0,
                    "status": "COMPLETED",
                    "evaluation": {"quantitative": 88, "logical": 82}
                }
            },
            "evaluation": {
                "summary": "Candidate exhibited strong analytical and numerical aptitude.",
                "strengths": ["Quantitative logic", "Algorithmic thinking"]
            }
        }
        res_cb_priya = requests.post(
            f"{API_BASE}/assessments/callback",
            headers={**callback_headers, "Idempotency-Key": priya_cb_payload["idempotencyKey"]},
            json=priya_cb_payload
        )
        assert res_cb_priya.status_code == 200, f"Priya callback failed: {res_cb_priya.text}"
        print(f"✓ Priya Round 1 Evaluated: Score=85.0%, Execution Status=PASS. Advanced to Round 2 (Technical)!")

        # Aman: Submits with score 45.0% (FAIL, passing cutoff 60)
        aman_cb_payload = {
            "idempotencyKey": f"cb_aman_r1_{uuid.uuid4().hex[:8]}",
            "assessmentId": sess_aman.id,
            "studentId": cand_aman.id,
            "applicationId": app_aman.id,
            "internshipId": posting.id,
            "roundKey": "aptitude",
            "status": "COMPLETED",
            "overallScore": 45.0,
            "integrityStatus": "VERIFIED",
            "warningCount": 0,
            "roundResults": {
                "aptitude": {
                    "score": 45.0,
                    "status": "COMPLETED",
                    "evaluation": {"quantitative": 42, "logical": 48}
                }
            },
            "evaluation": {
                "summary": "Candidate scored below minimum threshold for cognitive skills.",
                "weaknesses": ["Logical reasoning", "Time management"]
            }
        }
        res_cb_aman = requests.post(
            f"{API_BASE}/assessments/callback",
            headers={**callback_headers, "Idempotency-Key": aman_cb_payload["idempotencyKey"]},
            json=aman_cb_payload
        )
        assert res_cb_aman.status_code == 200, f"Aman callback failed: {res_cb_aman.text}"
        print(f"✓ Aman Round 1 Evaluated: Score=45.0%, Execution Status=FAIL. Progression halted!")

        # Verify PostgreSQL state after Round 1
        db.refresh(app_priya)
        db.refresh(app_aman)
        db.refresh(sess_priya)
        db.refresh(sess_aman)

        assert sess_priya.current_round == "technical", f"Expected Priya in 'technical', got {sess_priya.current_round}"
        assert sess_priya.overall_score is None, "Round 2 score should be None until evaluated!"
        print(f"✓ Verified Priya State: Round={sess_priya.current_round}, Status={sess_priya.status}, Unassessed Score=None (Safe reset)")

        assert sess_aman.execution_status == "FAIL", f"Expected Aman FAIL, got {sess_aman.execution_status}"
        assert app_aman.status in ["NOT_SELECTED", "REJECTED"], f"Expected Aman NOT_SELECTED, got {app_aman.status}"
        print(f"✓ Verified Aman State: AppStatus={app_aman.status}, SessionExecution={sess_aman.execution_status} (Progression blocked)")

        # =========================================================================
        # 8. ROUND 2 (TECHNICAL) EVALUATION FOR PASSING CANDIDATE
        # =========================================================================
        log_step("8. Round 2 Technical Assessment Evaluation for Priya")
        
        # Priya starts Round 2
        res_launch_r2 = requests.post(
            f"{API_BASE}/student/applications/{app_priya.id}/assessment/start?email={priya_email}"
        )
        assert res_launch_r2.status_code == 200, f"Priya Round 2 start failed: {res_launch_r2.text}"

        # Priya submits Round 2 with 92.0% score (Passing cutoff 70)
        priya_r2_cb = {
            "idempotencyKey": f"cb_priya_r2_{uuid.uuid4().hex[:8]}",
            "assessmentId": sess_priya.id,
            "studentId": cand_priya.id,
            "applicationId": app_priya.id,
            "internshipId": posting.id,
            "roundKey": "technical",
            "status": "COMPLETED",
            "overallScore": 92.0,
            "integrityStatus": "VERIFIED",
            "warningCount": 0,
            "roundResults": {
                "aptitude": {"score": 85.0, "status": "COMPLETED"},
                "technical": {
                    "score": 92.0,
                    "status": "COMPLETED",
                    "evaluation": {"coding": {"language": "Python", "correctness": 95, "style": 90}}
                }
            },
            "evaluation": {
                "summary": "Superb technical code implementation. Clean FastAPI architecture.",
                "recommendation": "STRONG_HIRE"
            }
        }
        res_cb_r2 = requests.post(
            f"{API_BASE}/assessments/callback",
            headers={**callback_headers, "Idempotency-Key": priya_r2_cb["idempotencyKey"]},
            json=priya_r2_cb
        )
        assert res_cb_r2.status_code == 200, f"Priya Round 2 callback failed: {res_cb_r2.text}"
        print(f"✓ Priya Round 2 Evaluated: Technical Score=92.0%, Execution Status=PASS. Candidate completed all rounds!")

        db.refresh(sess_priya)
        assert sess_priya.execution_status == "PASS"
        assert sess_priya.status == "COMPLETED"

        # =========================================================================
        # 9. VACANCY-AWARE FINAL SELECTION SWEEP & OFFER
        # =========================================================================
        log_step("9. Vacancy-Aware Final Selection Sweep via Recruiter API")
        res_select = requests.post(
            f"{API_BASE}/recruiter/internships/{posting.id}/final-selection",
            headers=rec_headers,
            json={"auto_select": True}
        )
        assert res_select.status_code == 200, f"Final selection failed: {res_select.text}"
        sel_data = res_select.json()["selection_result"]
        print(f"✓ Final Selection Result: {sel_data}")
        assert len(sel_data["selected"]) == 1, f"Expected exactly 1 selected candidate, got {len(sel_data['selected'])}"
        assert sel_data["selected"][0]["application_id"] == app_priya.id, "Priya should be the selected candidate!"

        db.refresh(app_priya)
        assert app_priya.status == "SELECTED", f"Expected SELECTED, got {app_priya.status}"
        print(f"✓ Priya Application Status Confirmed: {app_priya.status} (Rank #1, Vacancies: 1)")

        # Verify audit event in PostgreSQL
        audit_events = db.query(models.ApplicationStatusAudit).filter(
            models.ApplicationStatusAudit.application_id == app_priya.id
        ).order_by(models.ApplicationStatusAudit.created_at.asc()).all()
        print(f"✓ Audit Journey for Priya ({len(audit_events)} events):")
        for ev in audit_events:
            print(f"   [{ev.created_at.strftime('%H:%M:%S')}] {ev.previous_status} -> {ev.new_status} (Actor: {ev.actor_type}) - {ev.notes}")

        # Verify email notification logged
        email_logs = db.query(models.ApplicationEmailLog).filter(
            models.ApplicationEmailLog.application_id == app_priya.id
        ).all()
        print(f"✓ Transactional Email Logs for Priya ({len(email_logs)}):")
        for el in email_logs:
            print(f"   Type: {el.email_type}, Recipient: {el.recipient_email}, Subject: '{el.subject}', Status: {el.status}")

        # =========================================================================
        # 10. RECRUITER & STUDENT LIVE UI RECONCILIATION
        # =========================================================================
        log_step("10. Live Recruiter & Student UI Reconciliation")
        
        # Recruiter Dashboard
        res_dash_final = requests.get(f"{API_BASE}/recruiter/dashboard", headers=rec_headers)
        assert res_dash_final.status_code == 200
        stats_final = res_dash_final.json()["data"]["stats"]
        print(f"✓ Recruiter Dashboard Live Stats: {stats_final}")
        assert stats_final["selected_students"] >= 1, "Dashboard should reflect at least 1 selected student"

        # Recruiter Applications List
        res_apps = requests.get(f"{API_BASE}/recruiter/applications?internship_id={posting.id}", headers=rec_headers)
        assert res_apps.status_code == 200
        app_list = res_apps.json()["applications"]
        priya_row = next(a for a in app_list if a["id"] == app_priya.id)
        aman_row = next(a for a in app_list if a["id"] == app_aman.id)
        print(f"✓ Applications List UI Row for Priya: Status='{priya_row['status']}', Match={priya_row['matchPct']}, CGPA='{priya_row['cgpa']}'")
        print(f"✓ Applications List UI Row for Aman: Status='{aman_row['status']}', Match={aman_row['matchPct']}, CGPA='{aman_row['cgpa']}'")
        assert "Selected" in priya_row["status"]
        assert "Not Selected" in aman_row["status"]

        # Recruiter Assessment Dashboard
        res_assess = requests.get(f"{API_BASE}/recruiter/assessments/dashboard?internship_id={posting.id}", headers=rec_headers)
        assert res_assess.status_code == 200
        assess_data = res_assess.json()["data"]
        cand_assessments = assess_data["assessments"]
        priya_card = next(c for c in cand_assessments if c["application_id"] == app_priya.id)
        aman_card = next(c for c in cand_assessments if c["application_id"] == app_aman.id)
        print(f"✓ Assessment Scorecard UI for Priya: Verdict='{priya_card['verdict']}', Stars={priya_card['stars']}, Score={priya_card['overall_score']}%")
        print(f"✓ Assessment Scorecard UI for Aman: Verdict='{aman_card['verdict']}', Stars={aman_card['stars']}, Score={aman_card['overall_score']}%")
        assert priya_card["stars"] == 5, f"Expected 5 stars for score >= 90%, got {priya_card['stars']}"
        assert priya_card["verdict"] == "ROUND_PASSED"
        assert aman_card["stars"] == 1, f"Expected 1 star for score < 60%, got {aman_card['stars']}"
        assert aman_card["verdict"] == "ROUND_FAILED"

        # Candidate Evaluation Dossier
        res_dossier = requests.get(f"{API_BASE}/recruiter/applications/{app_priya.id}/evaluation", headers=rec_headers)
        assert res_dossier.status_code == 200
        dossier = res_dossier.json()["data"]
        print(f"✓ Evaluation Dossier for Priya: Candidate='{dossier['candidate']['name']}', Verdict='{dossier['verdict']}', JourneySteps={len(dossier['audit_journey'])}")

        print("\n" + "=" * 80)
        print("🎉 COMPLETE END-TO-END RECRUITMENT AUTOMATION TEST PASSED 100%!")
        print("=" * 80)

    finally:
        db.close()

if __name__ == "__main__":
    run_e2e_recruitment_automation_test()
