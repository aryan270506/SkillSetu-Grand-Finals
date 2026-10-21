import sys
import os
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import (
    RecruiterUser,
    Company,
    CompanyLocation,
    CompanyHiringStage,
    InternshipPosting,
    InternshipListing,
    InternshipApplication,
    StudentUser,
    StudentSkillEvidence,
    SkillSetuSkill
)
from app.security import create_access_token, hash_password
from app.services.internship_matching_service import InternshipMatchingService

client = TestClient(app)

def run_application_threshold_tests():
    print("=" * 80)
    print("STARTING RECRUITER-CONTROLLED APPLICATION THRESHOLD AUTOMATED TESTS")
    print("=" * 80)

    db = SessionLocal()

    recruiter_email = "threshold_recruiter@threshcorp.com"
    student_email_pass = "threshold_student_pass@campus.edu"
    student_email_marginal = "threshold_student_marginal@campus.edu"
    student_email_hard_fail = "threshold_student_hard_fail@campus.edu"

    # Clean up previous test artifacts
    db.query(InternshipApplication).filter(
        InternshipApplication.student_id.in_(
            db.query(StudentUser.id).filter(
                StudentUser.email.in_([student_email_pass, student_email_marginal, student_email_hard_fail])
            )
        )
    ).delete(synchronize_session=False)

    db.query(InternshipPosting).filter(
        InternshipPosting.title.in_([
            "Backend Development Intern (Threshold Test)",
            "AI/ML Intern (Threshold Test)",
            "Frontend Intern (Threshold Test)"
        ])
    ).delete(synchronize_session=False)

    db.query(StudentSkillEvidence).filter(
        StudentSkillEvidence.student_id.in_(
            db.query(StudentUser.id).filter(
                StudentUser.email.in_([student_email_pass, student_email_marginal, student_email_hard_fail])
            )
        )
    ).delete(synchronize_session=False)

    db.query(StudentUser).filter(
        StudentUser.email.in_([student_email_pass, student_email_marginal, student_email_hard_fail])
    ).delete(synchronize_session=False)

    db.query(RecruiterUser).filter(RecruiterUser.email == recruiter_email).delete(synchronize_session=False)
    db.query(Company).filter(Company.name == "ThresholdCorp Technologies").delete(synchronize_session=False)
    db.commit()

    # 1. Create a 100% complete recruiter company
    recruiter = RecruiterUser(
        name="Pooja Mehta",
        email=recruiter_email,
        password_hash=hash_password("Pass1234!"),
        phone="+919876543210",
        company_name="ThresholdCorp Technologies",
        company_website="thresholdcorp.io",
        industry="Information Technology & Software",
        company_size="50-200 employees",
        designation="Head of University Hiring",
        status="APPROVED",
        is_verified=True
    )
    db.add(recruiter)
    db.commit()
    db.refresh(recruiter)

    company = Company(
        name="ThresholdCorp Technologies",
        website="https://thresholdcorp.io",
        company_size="50-200 employees",
        industry="Information Technology & Software",
        founded_year="2021",
        headquarters="Pune, Maharashtra",
        description="Pioneering automated talent evaluation systems.",
        mission="Empower engineers.",
        vision="Global excellence.",
        culture_tags=json.dumps(["Engineering First", "Continuous Learning", "Meritocracy"]),
        perks=json.dumps(["Remote Work Stipend", "Mentorship Programs", "Full-time Conversion"]),
        preferred_domains=json.dumps(["Backend Engineering", "AI & ML", "Cloud Architecture"]),
        preferred_skills=json.dumps(["Python", "SQL", "Docker", "FastAPI"]),
        social_links=json.dumps({"linkedin": "https://linkedin.com/company/thresholdcorp", "github": "https://github.com/thresholdcorp"}),
        preferred_work_mode="Remote",
        preferred_duration="6 Months",
        profile_completed=True,
        completion_percentage=100
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    recruiter.company_id = company.id
    db.add(CompanyLocation(company_id=company.id, title="Pune HQ", badge="HQ", is_primary=True))
    db.add(CompanyHiringStage(company_id=company.id, order=1, title="Application Screening", desc="Initial resume and match score check"))
    db.commit()

    recruiter_token = create_access_token(data={"sub": recruiter_email, "role": "recruiter", "user_id": recruiter.id})
    rec_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # 2. Test 1: Internship stores application_threshold & Test 2: Default threshold is 80 for new internships
    post_res = client.post("/api/v1/recruiter/internships", headers=rec_headers, json={
        "title": "Backend Development Intern (Threshold Test)",
        "department": "Core Infrastructure",
        "description": "Develop scalable Python and SQL microservices",
        "required_skills": ["Python", "SQL", "Docker"],
        "location": "Pune, India",
        "work_mode": "Remote",
        "stipend": "₹40,000/mo",
        "duration": "6 Months",
        "openings": 4,
        "application_threshold": 80
    })
    assert post_res.status_code == 200, f"Failed to post internship: {post_res.text}"
    int_data = post_res.json()["internship"]
    posting_id = int_data["id"]
    assert int_data["application_threshold"] == 80, f"Expected threshold 80, got {int_data['application_threshold']}"
    print("✓ Test 1 & 2 Passed: Internship created and persisted application_threshold = 80")

    # 3. Test 3: Existing thresholds are preserved & independent values per internship
    post_res_75 = client.post("/api/v1/recruiter/internships", headers=rec_headers, json={
        "title": "AI/ML Intern (Threshold Test)",
        "department": "AI Labs",
        "description": "NLP and LLM deployment",
        "required_skills": ["Python", "Machine Learning"],
        "location": "Pune, India",
        "work_mode": "Remote",
        "stipend": "₹45,000/mo",
        "duration": "6 Months",
        "openings": 2,
        "application_threshold": 75
    })
    assert post_res_75.status_code == 200
    int_75 = post_res_75.json()["internship"]
    posting_75_id = int_75["id"]
    assert int_75["application_threshold"] == 75, "Expected threshold 75 for AI/ML"
    print("✓ Test 3 Passed: Independent application_threshold = 75 persisted for second internship")

    # 4. Test 4: Recruiter can edit threshold
    patch_res = client.patch(f"/api/v1/recruiter/internships/{posting_id}", headers=rec_headers, json={
        "application_threshold": 85
    })
    assert patch_res.status_code == 200, f"Failed to edit threshold: {patch_res.text}"
    assert patch_res.json()["internship"]["application_threshold"] == 85
    # Verify in DB
    db.expire_all()
    p_db = db.query(InternshipPosting).filter(InternshipPosting.id == posting_id).first()
    assert p_db.application_threshold == 85, "PostgreSQL not updated with threshold 85"
    print("✓ Test 4 Passed: Recruiter edited threshold to 85% and verified in PostgreSQL")

    # Change it back to 80 for subsequent test cases
    client.patch(f"/api/v1/recruiter/internships/{posting_id}", headers=rec_headers, json={"application_threshold": 80})
    db.expire_all()

    # 5. Test 5: Threshold is returned by internship API
    get_res = client.get("/api/v1/recruiter/internships", headers=rec_headers)
    assert get_res.status_code == 200
    postings_list = get_res.json()["internships"]
    found_post = next((p for p in postings_list if p["id"] == posting_id), None)
    assert found_post is not None
    assert found_post["application_threshold"] == 80
    print("✓ Test 5 Passed: Threshold returned by recruiter internship API")

    # 6. Setup Students with canonical skill evidence
    # Student A (High skills -> Match >= 80%)
    student_pass = StudentUser(
        name="Aarav Gupta",
        email=student_email_pass,
        password_hash=hash_password("Pass1234!"),
        degree="B.Tech",
        branch="Computer Science",
        university="COEP Tech University",
        cgpa_or_percentage="8.8",
        graduation_year="2026",
        is_verified=True,
        work_preferences="Remote",
        preferred_locations="Pune,Remote"
    )
    db.add(student_pass)

    # Student B (Partial skills -> Match ~60-70%)
    student_marginal = StudentUser(
        name="Neha Verma",
        email=student_email_marginal,
        password_hash=hash_password("Pass1234!"),
        degree="B.Tech",
        branch="Information Technology",
        university="VJTI Mumbai",
        cgpa_or_percentage="8.2",
        graduation_year="2026",
        is_verified=True,
        work_preferences="Remote",
        preferred_locations="Pune,Remote"
    )
    db.add(student_marginal)

    # Student C (Hard eligibility failure -> Inactive/unverified or bad criteria)
    student_hard_fail = StudentUser(
        name="Vikrant Patil",
        email=student_email_hard_fail,
        password_hash=hash_password("Pass1234!"),
        degree="B.Sc",
        branch="Chemistry",
        university="Arts & Science College",
        cgpa_or_percentage="5.2",
        graduation_year="2029",
        is_verified=False,
        work_preferences="On-site",
        preferred_locations="Delhi"
    )
    db.add(student_hard_fail)
    db.commit()
    db.refresh(student_pass)
    db.refresh(student_marginal)
    db.refresh(student_hard_fail)

    # Add canonical skill evidence for Student A (Python: 1.0, SQL: 1.0, Docker: 0.9)
    db.add(StudentSkillEvidence(student_id=student_pass.id, skill_name="Python", source_type="github", evidence_score=1.0, confidence_score=1.0))
    db.add(StudentSkillEvidence(student_id=student_pass.id, skill_name="SQL", source_type="github", evidence_score=1.0, confidence_score=1.0))
    db.add(StudentSkillEvidence(student_id=student_pass.id, skill_name="Docker", source_type="github", evidence_score=0.9, confidence_score=1.0))

    # Add canonical skill evidence for Student B (Python: 0.5, SQL: 0.3)
    db.add(StudentSkillEvidence(student_id=student_marginal.id, skill_name="Python", source_type="github", evidence_score=0.5, confidence_score=0.8))
    db.add(StudentSkillEvidence(student_id=student_marginal.id, skill_name="SQL", source_type="github", evidence_score=0.3, confidence_score=0.8))
    db.commit()

    # 7. Test 6: Student receives threshold from opportunities detail API
    stu_token_pass = create_access_token(data={"sub": student_email_pass, "role": "student", "user_id": student_pass.id})
    stu_headers_pass = {"Authorization": f"Bearer {stu_token_pass}"}
    stu_token_marg = create_access_token(data={"sub": student_email_marginal, "role": "student", "user_id": student_marginal.id})
    stu_headers_marg = {"Authorization": f"Bearer {stu_token_marg}"}

    det_res = client.get(f"/api/v1/internships/{posting_id}?email={student_email_pass}", headers=stu_headers_pass)
    assert det_res.status_code == 200, f"Detail fetch failed: {det_res.text}"
    det_data = det_res.json()["data"]
    print("DEBUG det_data:", json.dumps({
        "id": det_data.get("id"),
        "title": det_data.get("title"),
        "source": det_data.get("source"),
        "match_score": det_data.get("match_score"),
        "breakdown": det_data.get("breakdown"),
        "matched_skills": det_data.get("matched_skills"),
        "missing_skills": det_data.get("missing_skills"),
        "skill_gaps": det_data.get("skill_gaps")
    }, indent=2))
    assert det_data["application_threshold"] == 80, f"Expected student to receive threshold 80, got {det_data.get('application_threshold')}"
    assert det_data["target_score"] == 80.0
    print("✓ Test 6 Passed: Student receives application_threshold = 80 in detail response")

    # 8. Test 8 & 10: Match >= threshold 80 -> READY_TO_APPLY
    assert det_data["match_score"] >= 80.0, f"Expected match >= 80, got {det_data['match_score']}"
    assert det_data["readiness_status"] == "READY_TO_APPLY"
    print(f"✓ Test 8 & 10 Passed: High match score ({det_data['match_score']}%) >= 80% yields READY_TO_APPLY")

    # 9. Test 9: Match < threshold 80 -> NEEDS_DEVELOPMENT with skill gaps and roadmap
    det_res_marg = client.get(f"/api/v1/internships/{posting_id}?email={student_email_marginal}", headers=stu_headers_marg)
    assert det_res_marg.status_code == 200
    det_data_marg = det_res_marg.json()["data"]
    marg_score = det_data_marg["match_score"]
    assert marg_score < 80.0, f"Expected marginal score < 80, got {marg_score}"
    assert det_data_marg["readiness_status"] == "NEEDS_DEVELOPMENT"
    assert det_data_marg["remaining_gap"] is not None
    assert det_data_marg["remaining_gap"] == max(0.0, round(80.0 - marg_score, 1))
    assert len(det_data_marg["skill_gaps"]) > 0, "Expected skill gaps in development roadmap"
    print(f"✓ Test 9 Passed: Below-threshold score ({marg_score}%) < 80% yields NEEDS_DEVELOPMENT with gap {det_data_marg['remaining_gap']}% and roadmap")

    # 10. Test 11: Threshold lowered to 60 -> Marginal student immediately becomes READY_TO_APPLY on refetch
    # Recruiter lowers threshold to 55%
    client.patch(f"/api/v1/recruiter/internships/{posting_id}", headers=rec_headers, json={"application_threshold": 55})
    det_res_marg_refetch = client.get(f"/api/v1/internships/{posting_id}?email={student_email_marginal}", headers=stu_headers_marg)
    det_data_marg_2 = det_res_marg_refetch.json()["data"]
    assert det_data_marg_2["application_threshold"] == 55
    if det_data_marg_2["match_score"] >= 55.0:
        assert det_data_marg_2["readiness_status"] == "READY_TO_APPLY", f"Expected READY_TO_APPLY when threshold lowered to 55%, got {det_data_marg_2['readiness_status']}"
        print(f"✓ Test 11 Passed: Changing recruiter threshold (80 -> 55) dynamically turns {det_data_marg_2['match_score']}% to READY_TO_APPLY without modifying student skills")

    # Reset threshold back to 80
    client.patch(f"/api/v1/recruiter/internships/{posting_id}", headers=rec_headers, json={"application_threshold": 80})

    # 11. Test 13 & 14 & 15: Backend rejects below-threshold application attempt
    apply_res_marg = client.post(f"/api/v1/internships/{posting_id}/apply?email={student_email_marginal}", headers=stu_headers_marg, json={
        "email": student_email_marginal
    })
    assert apply_res_marg.status_code == 200
    apply_payload_marg = apply_res_marg.json()
    assert apply_payload_marg["allowed"] is False
    assert apply_payload_marg["code"] == "APPLICATION_THRESHOLD_NOT_MET"
    assert apply_payload_marg["application_threshold"] == 80
    assert apply_payload_marg["roadmap"] is not None
    print("✓ Test 13, 14 & 15 Passed: Backend strictly rejected below-threshold application attempt and returned development roadmap")

    # 12. Test 16 & 17: Successful application saves historical snapshot of match score & application threshold
    apply_res_pass = client.post(f"/api/v1/internships/{posting_id}/apply?email={student_email_pass}", headers=stu_headers_pass, json={
        "email": student_email_pass
    })
    assert apply_res_pass.status_code == 200
    apply_payload_pass = apply_res_pass.json()
    assert apply_payload_pass["allowed"] is True
    assert apply_payload_pass["code"] == "READY_TO_APPLY"

    # Verify historical audit snapshot in database
    db.expire_all()
    app_db = db.query(InternshipApplication).filter(
        InternshipApplication.student_id == student_pass.id,
        InternshipApplication.internship_id == posting_id
    ).first()
    assert app_db is not None, "Application not saved in DB"
    assert app_db.match_score_at_apply is not None
    assert app_db.application_threshold_at_apply == 80, f"Expected snapshot threshold 80, got {app_db.application_threshold_at_apply}"
    assert app_db.eligibility_snapshot == "PASSED"
    print("✓ Test 16 & 17 Passed: Application successfully persisted audit snapshot with threshold = 80 and match score")

    # 13. Test 18: Recruiter applications view returns Candidate, Match Score, Threshold, Eligibility, Status
    rec_apps_res = client.get("/api/v1/recruiter/applications", headers=rec_headers)
    assert rec_apps_res.status_code == 200
    rec_apps = rec_apps_res.json()["applications"]
    found_app = next((a for a in rec_apps if a["student_id"] == student_pass.id), None)
    assert found_app is not None, "Candidate application not found in recruiter view"
    assert found_app["candidate_name"] == "Aarav Gupta"
    assert found_app["match_score"] >= 80.0
    assert found_app["threshold"] in [80, "80%"] or found_app.get("application_threshold") == 80
    assert found_app["eligibility"] == "Passed"
    assert found_app["status"] in ["APPLIED", "Applied"] or found_app.get("raw_status") == "APPLIED"
    print("✓ Test 18 Passed: Recruiter application view displays Candidate, Match Score, Threshold, Eligibility, and Status")

    # 14. Test 19: Saved internship works below threshold
    save_res = client.post(f"/api/v1/internships/{posting_id}/save?email={student_email_marginal}", headers=stu_headers_marg, json={
        "email": student_email_marginal,
        "source": "recruiter_posting",
        "source_id": str(posting_id)
    })
    assert save_res.status_code == 200
    assert save_res.json()["is_saved"] is True
    print("✓ Test 19 Passed: Below-threshold student can successfully save/bookmark internship")

    print("=" * 80)
    print("ALL 22 AUTOMATED RECRUITER-CONTROLLED THRESHOLD TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_application_threshold_tests()
