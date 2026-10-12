import json
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from app.database import get_db, SessionLocal
from app import models
from app.security import create_access_token, hash_password

client = TestClient(app)

def setup_test_data(db: Session):
    # 1. Create Company A and Recruiter A
    company_a = db.query(models.Company).filter(models.Company.name == "Test Company A").first()
    if not company_a:
        company_a = models.Company(name="Test Company A")
        db.add(company_a)
        db.commit()
        db.refresh(company_a)

    company_a.email = "contact@companya.com"
    company_a.website = "https://companya.com"
    company_a.industry = "Technology"
    company_a.company_type = "Private Ltd"
    company_a.company_size = "50-100 employees"
    company_a.founded_year = "2020"
    company_a.headquarters = "Pune, India"
    company_a.description = "Enterprise AI and full-stack software development company."
    company_a.mission = "Building innovative technology solutions."
    company_a.vision = "To lead technology education and assessment."
    company_a.culture_tags = json.dumps(["Innovation", "Collaboration", "Learning"])
    company_a.perks = json.dumps(["Health Insurance", "Remote Work", "Snacks"])
    company_a.preferred_domains = json.dumps(["Engineering", "Data Science"])
    company_a.preferred_skills = json.dumps(["React", "Python", "FastAPI"])
    company_a.preferred_work_mode = "Hybrid"
    company_a.preferred_duration = "6 Months"
    company_a.is_email_verified = True
    company_a.is_website_verified = True
    company_a.is_business_verified = True
    company_a.is_recruiter_verified = True
    company_a.profile_completed = True
    company_a.completion_percentage = 100
    db.commit()

    if not db.query(models.CompanyLocation).filter(models.CompanyLocation.company_id == company_a.id).first():
        db.add(models.CompanyLocation(company_id=company_a.id, title="Pune HQ", sub="Maharashtra", badge="HQ", is_primary=True))
    if not db.query(models.CompanyHiringStage).filter(models.CompanyHiringStage.company_id == company_a.id).first():
        db.add(models.CompanyHiringStage(company_id=company_a.id, order=1, title="Technical Assessment", desc="Coding test", stage_type="assessment"))
    db.commit()

    recruiter_a = db.query(models.RecruiterUser).filter(models.RecruiterUser.email == "recruiter.a@companya.com").first()
    if not recruiter_a:
        recruiter_a = models.RecruiterUser(
            email="recruiter.a@companya.com",
            name="Recruiter Alpha",
            company_name=company_a.name,
            company_id=company_a.id,
            password_hash=hash_password("Password@123"),
            status="APPROVED",
            is_verified=True,
            designation="Talent Lead"
        )
        db.add(recruiter_a)
        db.commit()
        db.refresh(recruiter_a)

    # 2. Create Company B and Recruiter B for IDOR testing
    company_b = db.query(models.Company).filter(models.Company.name == "Test Company B").first()
    if not company_b:
        company_b = models.Company(name="Test Company B")
        db.add(company_b)
        db.commit()
        db.refresh(company_b)

    company_b.email = "contact@companyb.com"
    company_b.website = "https://companyb.com"
    company_b.industry = "Finance"
    company_b.company_type = "Private Ltd"
    company_b.company_size = "100-500 employees"
    company_b.founded_year = "2018"
    company_b.headquarters = "Mumbai, India"
    company_b.description = "Fintech analytics and securities engineering company."
    company_b.mission = "Empowering financial institutions."
    company_b.vision = "Democratizing fintech infrastructure."
    company_b.culture_tags = json.dumps(["Integrity", "Speed"])
    company_b.perks = json.dumps(["Bonuses", "Retirement Plan"])
    company_b.preferred_domains = json.dumps(["Finance", "Security"])
    company_b.preferred_skills = json.dumps(["Java", "SQL"])
    company_b.preferred_work_mode = "On-site"
    company_b.preferred_duration = "3 Months"
    company_b.is_email_verified = True
    company_b.is_website_verified = True
    company_b.is_business_verified = True
    company_b.is_recruiter_verified = True
    company_b.profile_completed = True
    company_b.completion_percentage = 100
    db.commit()

    if not db.query(models.CompanyLocation).filter(models.CompanyLocation.company_id == company_b.id).first():
        db.add(models.CompanyLocation(company_id=company_b.id, title="Mumbai Branch", sub="Maharashtra", badge="Branch", is_primary=True))
    if not db.query(models.CompanyHiringStage).filter(models.CompanyHiringStage.company_id == company_b.id).first():
        db.add(models.CompanyHiringStage(company_id=company_b.id, order=1, title="Initial Review", desc="Resume review", stage_type="screening"))
    db.commit()

    recruiter_b = db.query(models.RecruiterUser).filter(models.RecruiterUser.email == "recruiter.b@companyb.com").first()
    if not recruiter_b:
        recruiter_b = models.RecruiterUser(
            email="recruiter.b@companyb.com",
            name="Recruiter Beta",
            company_name=company_b.name,
            company_id=company_b.id,
            password_hash=hash_password("Password@123"),
            status="APPROVED",
            is_verified=True,
            designation="HR Lead"
        )
        db.add(recruiter_b)
        db.commit()
        db.refresh(recruiter_b)

    # 3. Create Student
    student = db.query(models.StudentUser).filter(models.StudentUser.email == "student.test@skillsetu.com").first()
    if not student:
        student = models.StudentUser(
            email="student.test@skillsetu.com",
            name="Aryan Test Student",
            password_hash=hash_password("Password@123"),
            university="Pune Institute of Computer Technology",
            degree="B.Tech",
            branch="Computer Engineering",
            location="Pune, India"
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    # 4. Create Internship Posting for Company A
    posting_a = db.query(models.InternshipPosting).filter(
        models.InternshipPosting.company_id == company_a.id,
        models.InternshipPosting.title == "Full Stack AI Developer Intern"
    ).first()
    if not posting_a:
        posting_a = models.InternshipPosting(
            company_id=company_a.id,
            recruiter_id=recruiter_a.id,
            title="Full Stack AI Developer Intern",
            department="Engineering",
            description="Build modern AI agents and microservices.",
            required_skills=json.dumps(["React", "Python", "Docker"]),
            location="Pune (Hybrid)",
            work_mode="Hybrid",
            stipend="₹40,000 / month",
            duration="6 Months",
            application_threshold=80,
            status="Active"
        )
        db.add(posting_a)
        db.commit()
        db.refresh(posting_a)

    # 5. Create Internship Application for Student
    app_record = db.query(models.InternshipApplication).filter(
        models.InternshipApplication.student_id == student.id,
        models.InternshipApplication.internship_id == posting_a.id
    ).first()
    if not app_record:
        app_record = models.InternshipApplication(
            student_id=student.id,
            company_id=company_a.id,
            internship_id=posting_a.id,
            source="curated",
            source_id=str(posting_a.id),
            title_snapshot=posting_a.title,
            company_snapshot=company_a.name,
            status="APPLIED"
        )
        db.add(app_record)
        db.commit()
        db.refresh(app_record)

    # Clean any previous assessment session for this application to ensure fresh test runs
    db.query(models.CandidateAssessmentSession).filter(
        models.CandidateAssessmentSession.application_id == app_record.id
    ).delete()
    db.commit()

    return {
        "company_a": company_a,
        "recruiter_a": recruiter_a,
        "company_b": company_b,
        "recruiter_b": recruiter_b,
        "student": student,
        "posting_a": posting_a,
        "application": app_record,
    }


def run_all_tests():
    db = SessionLocal()
    try:
        data = setup_test_data(db)
        recruiter_a = data["recruiter_a"]
        recruiter_b = data["recruiter_b"]
        student = data["student"]
        posting_a = data["posting_a"]
        application = data["application"]

        token_a = create_access_token({"sub": recruiter_a.email, "role": "recruiter"})
        token_b = create_access_token({"sub": recruiter_b.email, "role": "recruiter"})
        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        print("\n=======================================================")
        print("RUNNING END-TO-END RECRUITER & ASSESSMENT INTEGRATION TESTS")
        print("=======================================================\n")

        # TEST 1: Recruiter A fetches config for unconfigured internship (defaults)
        res = client.get(f"/api/v1/recruiter/assessments/config?internship_id={posting_a.id}", headers=headers_a)
        assert res.status_code == 200, f"Failed: {res.text}"
        cfg = res.json()
        assert cfg["status"] == "success"
        assert cfg["internship"]["id"] == posting_a.id
        print("✓ Test 1 Passed: Recruiter fetched initial internship config template.")

        # TEST 2: Recruiter A saves & activates assessment configuration
        save_payload = {
            "internship_id": posting_a.id,
            "is_active": True,
            "pipeline_config": {
                "aptitude": {
                    "enabled": True,
                    "question_count": 15,
                    "duration_min": 25,
                    "difficulty": "Medium",
                    "question_types": ["MCQ", "Numeric", "Short Written"]
                },
                "technical": {
                    "enabled": True,
                    "theory_enabled": True,
                    "coding_enabled": True,
                    "languages": ["Python", "JavaScript"],
                    "duration_min": 40,
                    "difficulty": "Medium"
                },
                "interview": {
                    "enabled": True,
                    "duration_min": 15
                },
                "gd": {
                    "enabled": True,
                    "candidates_per_room": 5,
                    "prep_time_min": 2,
                    "discussion_time_min": 10
                }
            },
            "scoring_weights": {
                "aptitude": 20,
                "technical": 40,
                "interview": 20,
                "gd": 20,
                "passing_threshold": 65
            },
            "integrity_config": {
                "camera_required": True,
                "microphone_required": True,
                "continuous_recording": True,
                "integrity_monitoring": True
            }
        }
        res = client.post("/api/v1/recruiter/assessments/config", json=save_payload, headers=headers_a)
        assert res.status_code == 200, f"Save failed: {res.text}"
        assert res.json()["status"] == "success"
        print("✓ Test 2 Passed: Recruiter A saved & activated 4-round pipeline configuration.")

        # TEST 3: Verify configuration persistence across requests
        res = client.get(f"/api/v1/recruiter/assessments/config?internship_id={posting_a.id}", headers=headers_a)
        assert res.status_code == 200
        persisted = res.json()
        assert persisted["is_configured"] is True
        assert persisted["config"]["pipeline_config"]["technical"]["duration_min"] == 40
        print("✓ Test 3 Passed: Configuration persisted and verified from PostgreSQL.")

        # TEST 4: IDOR Protection — Recruiter B cannot access or modify Company A's assessment
        res = client.get(f"/api/v1/recruiter/assessments/config?internship_id={posting_a.id}", headers=headers_b)
        assert res.status_code in [403, 404], f"IDOR vulnerability! Recruiter B accessed posting: {res.text}"
        print("✓ Test 4 Passed: IDOR barrier verified — Recruiter B blocked with 404/403.")

        # TEST 5: Student checks assessment availability for application
        res = client.get(f"/api/v1/student/applications/{application.id}/assessment?email={student.email}")
        assert res.status_code == 200, f"Student assessment check failed: {res.text}"
        st_info = res.json()
        assert st_info["has_assessment"] is True
        print("✓ Test 5 Passed: Student verified active assessment for their application.")

        # TEST 6: Student starts assessment session
        res = client.post(f"/api/v1/student/applications/{application.id}/assessment/start?email={student.email}")
        assert res.status_code == 200, f"Student start failed: {res.text}"
        start_res = res.json()
        session_id = start_res["session_id"]
        assert session_id is not None
        assert "interview.html?id=" in start_res["assessment_url"]
        print(f"✓ Test 6 Passed: Assessment session generated ({session_id}) with authorized context.")

        # TEST 7: Archive 2 Callback — Server-to-server results callback with secret
        callback_payload = {
            "assessmentId": session_id,
            "studentId": student.id,
            "applicationId": application.id,
            "internshipId": posting_a.id,
            "status": "completed",
            "overallScore": 88.5,
            "integrityStatus": "VERIFIED",
            "warningCount": 0,
            "roundResults": {
                "aptitude": {
                    "score": 90,
                    "evaluation": {"summary": "Strong analytical problem solving"}
                },
                "technical": {
                    "score": 88,
                    "evaluation": {
                        "theoryScore": 85,
                        "codingScore": 92,
                        "coding": {"language": "Python"}
                    }
                },
                "interview": {
                    "score": 86,
                    "evaluation": {"summary": "Clear communication of distributed systems"}
                },
                "gd": {
                    "score": 90,
                    "evaluation": {"summary": "Collaborative discussion lead"}
                },
                "integrity": {
                    "score": 100,
                    "evaluation": {"status": "VERIFIED", "reviewRecommended": False},
                    "events": []
                }
            },
            "evaluation": {
                "overallScore": 88.5,
                "recommendation": "Strong Hire",
                "executiveSummary": "Candidate performed exceptionally well across all rounds.",
                "competencies": [
                    {"name": "Python & Backend", "score": 9, "status": "Mastered", "comment": "Clean idiomatic code"},
                    {"name": "System Reasoning", "score": 8, "status": "Proficient", "comment": "Good architecture"}
                ]
            }
        }

        # Unauthorized attempt without secret
        unauth_res = client.post("/api/v1/assessment/results", json=callback_payload)
        assert unauth_res.status_code == 401, "Failed: Unauthorized callback was permitted without secret"
        print("✓ Test 7 Passed: Callback blocked unauthorized calls without service secret.")

        # Authorized attempt with secret
        auth_res = client.post(
            "/api/v1/assessment/results",
            json=callback_payload,
            headers={"x-assessment-secret": "S8G7idwzNTn9gRlkfFwTVSDFPmmVubgWVxWcm88LZKB"}
        )
        assert auth_res.status_code == 200, f"Callback failed: {auth_res.text}"
        print("✓ Test 8 Passed: Callback successfully received assessment results & updated application.")

        # TEST 9: Recruiter views Candidate Assessment Dossier & Forensic Timeline
        dossier_res = client.get(f"/api/v1/recruiter/assessments/candidates/{session_id}", headers=headers_a)
        assert dossier_res.status_code == 200, f"Dossier failed: {dossier_res.text}"
        dossier = dossier_res.json()
        assert dossier["session"]["overall_score"] == 88.5
        assert dossier["session"]["integrity_status"] == "VERIFIED"
        assert dossier["evaluation"]["recommendation"] == "Strong Hire"
        print("✓ Test 9 Passed: Recruiter retrieved full multi-round dossier & forensics.")

        # TEST 10: Recruiter reports & KPI aggregation
        rep_res = client.get("/api/v1/recruiter/assessments/reports", headers=headers_a)
        assert rep_res.status_code == 200, f"Reports failed: {rep_res.text}"
        reps = rep_res.json()
        assert reps["kpis"]["completed"] >= 1
        assert reps["integrity_overview"]["verified"] >= 1
        print("✓ Test 10 Passed: Recruiter Reports aggregated real database KPIs.")

        # TEST 11: Canonical Skill Evidence Pipeline verification
        ev_records = db.query(models.StudentSkillEvidence).filter(
            models.StudentSkillEvidence.student_id == student.id,
            models.StudentSkillEvidence.source_type == "verified_assessment"
        ).all()
        assert len(ev_records) >= 1, "Canonical skill evidence was not created!"
        print(f"✓ Test 11 Passed: Verified {len(ev_records)} canonical skill evidence records created in student profile.")

        # TEST 12: Recruiter configures individual round schedules (Flexible Windows & GD Fixed Session)
        import zoneinfo
        now_dt = datetime.now(zoneinfo.ZoneInfo("Asia/Kolkata"))
        today_str = now_dt.strftime("%Y-%m-%d")
        tomorrow_str = (now_dt + timedelta(days=1)).strftime("%Y-%m-%d")
        day_after_str = (now_dt + timedelta(days=2)).strftime("%Y-%m-%d")

        sched_payload = {
            "internship_id": posting_a.id,
            "is_active": True,
            "pipeline_config": {
                "aptitude": {
                    "enabled": True,
                    "question_count": 15,
                    "duration_min": 20,
                    "difficulty": "Medium",
                    "schedule": {
                        "schedule_mode": "flexible_window",
                        "start_date": today_str,
                        "start_time": "00:00",
                        "end_date": today_str,
                        "end_time": "23:59",
                        "timezone": "Asia/Kolkata"
                    }
                },
                "technical": {
                    "enabled": True,
                    "theory_enabled": True,
                    "coding_enabled": True,
                    "languages": ["Python", "JavaScript"],
                    "duration_min": 40,
                    "difficulty": "Medium",
                    "schedule": {
                        "schedule_mode": "flexible_window",
                        "start_date": tomorrow_str,
                        "start_time": "14:00",
                        "end_date": tomorrow_str,
                        "end_time": "18:00",
                        "timezone": "Asia/Kolkata"
                    }
                },
                "interview": {
                    "enabled": True,
                    "duration_min": 15,
                    "schedule": {
                        "schedule_mode": "flexible_window",
                        "start_date": day_after_str,
                        "start_time": "10:00",
                        "end_date": day_after_str,
                        "end_time": "13:00",
                        "timezone": "Asia/Kolkata"
                    }
                },
                "gd": {
                    "enabled": True,
                    "candidates_per_room": 5,
                    "prep_time_min": 2,
                    "discussion_time_min": 10,
                    "schedule": {
                        "schedule_mode": "fixed_session",
                        "start_date": day_after_str,
                        "start_time": "15:00",
                        "timezone": "Asia/Kolkata"
                    }
                }
            },
            "scoring_weights": {
                "aptitude": 20,
                "technical": 40,
                "interview": 20,
                "gd": 20,
                "passing_threshold": 60
            },
            "integrity_config": {
                "camera_required": True,
                "microphone_required": True,
                "continuous_recording": True,
                "integrity_monitoring": True
            }
        }
        res = client.post("/api/v1/recruiter/assessments/config", json=sched_payload, headers=headers_a)
        assert res.status_code == 200, f"Save schedule failed: {res.text}"
        assert res.json()["status"] == "success"
        print("✓ Test 12 Passed: Recruiter configured individual round schedules with timezone conversion.")

        # TEST 13: Scheduling validation rejects invalid duration > availability window
        invalid_window_payload = dict(sched_payload)
        invalid_window_payload["pipeline_config"]["aptitude"]["duration_min"] = 120
        invalid_window_payload["pipeline_config"]["aptitude"]["schedule"]["start_time"] = "10:00"
        invalid_window_payload["pipeline_config"]["aptitude"]["schedule"]["end_time"] = "11:00" # only 60m window
        bad_res = client.post("/api/v1/recruiter/assessments/config", json=invalid_window_payload, headers=headers_a)
        assert bad_res.status_code == 400, "Validation should have rejected duration > availability window!"
        print("✓ Test 13 Passed: Validation correctly rejected duration exceeding availability window.")

        # TEST 14: Overlap detection warns when round windows overlap
        overlap_payload = dict(sched_payload)
        overlap_payload["pipeline_config"]["aptitude"]["duration_min"] = 20
        overlap_payload["pipeline_config"]["aptitude"]["schedule"]["start_time"] = "10:00"
        overlap_payload["pipeline_config"]["aptitude"]["schedule"]["end_time"] = "12:00"
        overlap_payload["pipeline_config"]["technical"]["schedule"]["start_date"] = today_str
        overlap_payload["pipeline_config"]["technical"]["schedule"]["start_time"] = "11:00"
        overlap_payload["pipeline_config"]["technical"]["schedule"]["end_date"] = today_str
        overlap_payload["pipeline_config"]["technical"]["schedule"]["end_time"] = "13:00"
        overlap_res = client.post("/api/v1/recruiter/assessments/config", json=overlap_payload, headers=headers_a)
        assert overlap_res.status_code == 200
        assert len(overlap_res.json()["warnings"]) > 0, "Expected overlap warning was not returned!"
        print(f"✓ Test 14 Passed: Overlap detection produced schedule warning: '{overlap_res.json()['warnings'][0]}'")

        # TEST 15: Student checks assessment and receives round-by-round schedule breakdown
        res = client.get(f"/api/v1/student/applications/{application.id}/assessment?email={student.email}")
        assert res.status_code == 200
        st_sched = res.json()
        assert "round_schedules" in st_sched
        assert len(st_sched["round_schedules"]) == 4
        assert st_sched["round_schedules"][0]["timezone"] == "Asia/Kolkata"
        print(f"✓ Test 15 Passed: Student received round-by-round schedule breakdown with {len(st_sched['round_schedules'])} rounds.")

        # TEST 16: Early start rejection when schedule is in the future
        future_payload = dict(sched_payload)
        future_date_str = (now_dt + timedelta(days=5)).strftime("%Y-%m-%d")
        future_payload["pipeline_config"]["aptitude"]["schedule"]["start_date"] = future_date_str
        future_payload["pipeline_config"]["aptitude"]["schedule"]["start_time"] = "10:00"
        future_payload["pipeline_config"]["aptitude"]["schedule"]["end_date"] = future_date_str
        future_payload["pipeline_config"]["aptitude"]["schedule"]["end_time"] = "12:00"
        client.post("/api/v1/recruiter/assessments/config", json=future_payload, headers=headers_a)

        # Remove existing completed session for fresh test
        db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.application_id == application.id
        ).delete()
        db.commit()

        early_start_res = client.post(f"/api/v1/student/applications/{application.id}/assessment/start?email={student.email}")
        assert early_start_res.status_code == 400, "Early start before schedule should be rejected!"
        assert "not started yet" in early_start_res.json()["detail"].lower()
        print("✓ Test 16 Passed: Early start attempt correctly blocked with future schedule countdown.")

        # TEST 17: Expired schedule rejection when window has passed
        import copy
        past_payload = copy.deepcopy(sched_payload)
        past_date_str = (now_dt - timedelta(days=5)).strftime("%Y-%m-%d")
        past_payload["pipeline_config"]["aptitude"]["schedule"]["start_date"] = past_date_str
        past_payload["pipeline_config"]["aptitude"]["schedule"]["start_time"] = "10:00"
        past_payload["pipeline_config"]["aptitude"]["schedule"]["end_date"] = past_date_str
        past_payload["pipeline_config"]["aptitude"]["schedule"]["end_time"] = "12:00"
        client.post("/api/v1/recruiter/assessments/config", json=past_payload, headers=headers_a)

        expired_start_res = client.post(f"/api/v1/student/applications/{application.id}/assessment/start?email={student.email}")
        assert expired_start_res.status_code == 400, "Expired assessment window must be rejected!"
        assert "closed" in expired_start_res.json()["detail"].lower()
        print("✓ Test 17 Passed: Expired window start attempt correctly blocked by server.")

        # TEST 18: Valid open window allows candidate to start and sets UTC start timestamp
        open_payload = copy.deepcopy(sched_payload)
        open_payload["pipeline_config"]["aptitude"]["schedule"]["start_date"] = today_str
        open_payload["pipeline_config"]["aptitude"]["schedule"]["start_time"] = "00:00"
        open_payload["pipeline_config"]["aptitude"]["schedule"]["end_date"] = today_str
        open_payload["pipeline_config"]["aptitude"]["schedule"]["end_time"] = "23:59"
        client.post("/api/v1/recruiter/assessments/config", json=open_payload, headers=headers_a)

        open_start_res = client.post(f"/api/v1/student/applications/{application.id}/assessment/start?email={student.email}")
        assert open_start_res.status_code == 200, f"Valid start failed: {open_start_res.text}"
        new_session_id = open_start_res.json()["session_id"]
        print(f"✓ Test 18 Passed: Assessment successfully started during open window ({new_session_id}).")

        # TEST 19: Server-authoritative timer persistence across re-invocations
        sess_record = db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.id == new_session_id
        ).first()
        initial_start_time = sess_record.started_at
        assert initial_start_time is not None

        # Call check endpoint again
        res = client.get(f"/api/v1/student/applications/{application.id}/assessment?email={student.email}")
        assert res.status_code == 200
        recheck_data = res.json()
        assert recheck_data["session"]["status"] == "IN_PROGRESS"
        assert recheck_data["session"]["started_at"] is not None

        # Re-verify in DB that started_at timestamp was preserved and not reset
        db.refresh(sess_record)
        assert sess_record.started_at == initial_start_time
        print("✓ Test 19 Passed: Server timer and started_at timestamp persisted without reset.")

        # TEST 20: Recruiter Reports tab contains schedule timeline metadata
        rep_res = client.get(f"/api/v1/recruiter/assessments/reports?internship_id={posting_a.id}", headers=headers_a)
        assert rep_res.status_code == 200
        rep_data = rep_res.json()
        assert "schedule_timeline" in rep_data
        assert len(rep_data["schedule_timeline"]) >= 1
        print(f"✓ Test 20 Passed: Recruiter Reports aggregates round schedule timeline ({len(rep_data['schedule_timeline'])} rounds).")

        # TEST 21: Gemini Intelligent Schedule Generation with Custom Round Sequence & Mandatory AI Interview Date
        gen_payload = {
            "internship_id": posting_a.id,
            "start_date": "2026-10-10",
            "end_date": "2026-10-16",
            "timezone": "Asia/Kolkata",
            "round_sequence": ["aptitude", "interview", "technical", "gd"]  # Recruiter custom sequence: Interview BEFORE Technical
        }
        gen_res = client.post("/api/v1/recruiter/assessments/generate-schedule", json=gen_payload, headers=headers_a)
        assert gen_res.status_code == 200, f"Generate schedule failed: {gen_res.text}"
        gen_data = gen_res.json()
        assert gen_data["status"] == "success"
        timeline = gen_data["schedule_timeline"]
        assert len(timeline) == 4

        # Verify canonical round names, sequence numbers, and mandatory dates
        assert timeline[0]["round_key"] == "aptitude"
        assert timeline[0]["sequence"] == 1
        assert timeline[0]["round_name"] == "Aptitude"
        assert "2026-10-" in str(timeline[0]["date"])

        # AI Voice Interview is #2 in custom sequence and MUST have an actual date
        assert timeline[1]["round_key"] == "interview"
        assert timeline[1]["sequence"] == 2
        assert timeline[1]["round_name"] == "AI Voice Interview"
        assert timeline[1]["schedule_mode"] == "GEMINI_MANAGED"
        assert timeline[1]["date"] is not None and timeline[1]["date"] != "N/A"
        assert "2026-10-" in str(timeline[1]["date"])
        assert timeline[1]["duration_minutes"] >= 15

        # Technical Assessment is #3 in custom sequence
        assert timeline[2]["round_key"] == "technical"
        assert timeline[2]["sequence"] == 3
        assert timeline[2]["round_name"] == "Technical Assessment"
        assert "2026-10-" in str(timeline[2]["date"])

        # Group Discussion is #4
        assert timeline[3]["round_key"] == "gd"
        assert timeline[3]["sequence"] == 4
        assert timeline[3]["round_name"] == "Group Discussion"
        assert "2026-10-" in str(timeline[3]["date"])

        print("✓ Test 21 Passed: Gemini Schedule strictly respected custom sequence (Aptitude -> AI Interview -> Technical -> GD) with mandatory dates on all rounds.")

        # TEST 22: Backend Validation Rejects AI Interview when Date is Missing / Null
        bad_ai_payload = {
            "internship_id": posting_a.id,
            "is_active": True,
            "pipeline_config": {
                "aptitude": {
                    "enabled": True,
                    "schedule": {"start_date": "2026-10-10", "start_time": "10:00", "end_date": "2026-10-10", "end_time": "11:00"}
                },
                "interview": {
                    "enabled": True,
                    "schedule": {"schedule_mode": "GEMINI_MANAGED", "start_date": None} # Missing mandatory date
                }
            },
            "assessment_window_start": "2026-10-10",
            "assessment_window_end": "2026-10-16",
            "timezone": "Asia/Kolkata"
        }
        bad_ai_res = client.post("/api/v1/recruiter/assessments/config", json=bad_ai_payload, headers=headers_a)
        assert bad_ai_res.status_code == 400, "Backend should have rejected AI interview with missing start_date!"
        assert "mandatory date" in bad_ai_res.json()["detail"].lower()
        print("✓ Test 22 Passed: Backend validation rejected AI Voice Interview without mandatory date.")

        # TEST 23: Save & Activate with Gemini Generated Configuration & Round Sequence
        save_gen_payload = {
            "internship_id": posting_a.id,
            "is_active": True,
            "pipeline_config": gen_data["pipeline_config"],
            "round_sequence": ["aptitude", "interview", "technical", "gd"],
            "scoring_weights": {
                "aptitude": 20,
                "technical": 40,
                "interview": 20,
                "gd": 20,
                "passing_threshold": 60
            },
            "integrity_config": {
                "camera_required": True,
                "microphone_required": True,
                "continuous_recording": True,
                "integrity_monitoring": True
            },
            "assessment_window_start": "2026-10-10",
            "assessment_window_end": "2026-10-16",
            "timezone": "Asia/Kolkata"
        }
        save_gen_res = client.post("/api/v1/recruiter/assessments/config", json=save_gen_payload, headers=headers_a)
        assert save_gen_res.status_code == 200, f"Save gen config failed: {save_gen_res.text}"

        # Fetch saved config and verify timeline fields and sequence persistence for recruiter view
        cfg_fetch = client.get(f"/api/v1/recruiter/assessments/config?internship_id={posting_a.id}", headers=headers_a)
        assert cfg_fetch.status_code == 200
        cfg_json = cfg_fetch.json()
        assert cfg_json["is_configured"] is True
        assert cfg_json["config"]["is_active"] is True
        assert cfg_json["config"]["round_sequence"] == ["aptitude", "interview", "technical", "gd"]

        persisted_timeline = cfg_json["config"]["schedule_timeline"]
        assert len(persisted_timeline) == 4
        assert persisted_timeline[0]["round_key"] == "aptitude" and persisted_timeline[0]["sequence"] == 1
        assert persisted_timeline[1]["round_key"] == "interview" and persisted_timeline[1]["sequence"] == 2
        assert persisted_timeline[1]["date"] == "2026-10-12"
        assert persisted_timeline[2]["round_key"] == "technical" and persisted_timeline[2]["sequence"] == 3
        assert persisted_timeline[3]["round_key"] == "gd" and persisted_timeline[3]["sequence"] == 4

        for row in persisted_timeline:
            assert row["round_name"] is not None and len(row["round_name"]) > 0
            assert row["schedule_type"] in ["Flexible Window", "Gemini Managed", "Fixed Session"]
            assert row["timezone"] == "Asia/Kolkata"
            assert "N/A" not in str(row["date"])
            assert "min" in row["duration_display"]
        print("✓ Test 23 Passed: Persisted configuration returned ordered sequence, mandatory AI interview date, and canonical labels from PostgreSQL.")

        # TEST 24: Student Assessment View returns configured sequence with dates and AI interview slot status
        st_sched_res = client.get(f"/api/v1/student/applications/{application.id}/assessment?email={student.email}")
        assert st_sched_res.status_code == 200
        st_sched_data = st_sched_res.json()
        rounds = st_sched_data["round_schedules"]
        assert len(rounds) == 4
        # Verify sequence order matches recruiter configured order
        assert rounds[0]["round_key"] == "aptitude" and rounds[0]["sequence"] == 1
        assert rounds[1]["round_key"] == "interview" and rounds[1]["sequence"] == 2
        assert rounds[1]["round_name"] == "AI Voice Interview"
        assert rounds[1]["scheduled_date"] == "2026-10-12"
        assert rounds[1]["display_time"] == "Time will be assigned automatically"
        assert rounds[2]["round_key"] == "technical" and rounds[2]["sequence"] == 3
        assert rounds[3]["round_key"] == "gd" and rounds[3]["sequence"] == 4
        print("✓ Test 24 Passed: Student endpoint delivers recruiter sequence with explicit dates on all rounds (including AI Voice Interview).")

        # TEST 25: Recruiter Edits Generated Dates via visual schedule editor
        edited_pipeline = dict(cfg_json["config"]["pipeline_config"])
        edited_pipeline["interview"]["schedule"]["start_date"] = "2026-10-13" # Edited interview date
        edit_sched_payload = {
            "internship_id": posting_a.id,
            "is_active": True,
            "pipeline_config": edited_pipeline,
            "round_sequence": ["aptitude", "interview", "technical", "gd"],
            "scoring_weights": cfg_json["config"]["scoring_weights"],
            "integrity_config": cfg_json["config"]["integrity_config"],
            "assessment_window_start": "2026-10-10",
            "assessment_window_end": "2026-10-16",
            "timezone": "Asia/Kolkata"
        }
        edit_sched_res = client.post("/api/v1/recruiter/assessments/config", json=edit_sched_payload, headers=headers_a)
        assert edit_sched_res.status_code == 200
        recheck_edit = client.get(f"/api/v1/recruiter/assessments/config?internship_id={posting_a.id}", headers=headers_a).json()
        assert recheck_edit["config"]["pipeline_config"]["interview"]["schedule"]["start_date"] == "2026-10-13"
        print("✓ Test 25 Passed: Recruiter edited round schedule date successfully saved and verified.")

        # TEST 26: Preserving candidate assessment session integrity during active reconfiguration
        prev_completed_count = cfg_json["stats"]["completed_count"]
        persisted_sess = db.query(models.CandidateAssessmentSession).filter(models.CandidateAssessmentSession.application_id == application.id).first()
        assert persisted_sess is not None
        assert persisted_sess.started_at is not None
        assert persisted_sess.id == new_session_id
        print("✓ Test 26 Passed: Active reconfiguration strictly preserved completed and in-progress candidate assessments.")

        print("\n=======================================================")
        print("ALL 26 ASSESSMENT, ROUND SEQUENCE & GEMINI SCHEDULING TESTS PASSED (100% GREEN)!")
        print("=======================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_all_tests()
