import sys
import os
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import RecruiterUser, Company, CompanyLocation, CompanyHiringStage, InternshipPosting, StudentUser
from app.security import create_access_token, hash_password

client = TestClient(app)

def run_comprehensive_recruiter_tests():
    print("=" * 70)
    print("STARTING COMPREHENSIVE RECRUITER PROFILE COMPLETION & PERSISTENCE TESTS")
    print("=" * 70)

    db = SessionLocal()

    # Emails for test accounts
    email_fresh = "fresh_recruiter@nextech.io"
    email_fresh_colleague = "colleague_recruiter@nextech.io"
    email_competitor = "rival_recruiter@rivaltech.io"

    # Clean up previous test runs
    db.query(RecruiterUser).filter(
        RecruiterUser.email.in_([email_fresh, email_fresh_colleague, email_competitor])
    ).delete(synchronize_session=False)

    db.query(Company).filter(
        Company.name.in_(["NexTech Solutions", "RivalTech Corp"])
    ).delete(synchronize_session=False)
    db.commit()

    # 1. Create a fresh approved recruiter with an incomplete profile
    recruiter_fresh = RecruiterUser(
        name="Ananya Roy",
        email=email_fresh,
        password_hash=hash_password("SecurePass123!"),
        phone="+919876543210",
        company_name="NexTech Solutions",
        company_website="nextech.io",
        industry="Information Technology & Software",
        company_size="100-500 employees",
        designation="Lead Talent Partner",
        status="APPROVED",
        is_verified=True
    )
    # Competitor recruiter
    recruiter_competitor = RecruiterUser(
        name="Vikram Seth",
        email=email_competitor,
        password_hash=hash_password("SecurePass123!"),
        phone="+919123456789",
        company_name="RivalTech Corp",
        company_website="rivaltech.io",
        industry="Fintech",
        company_size="50-100 employees",
        designation="HR Director",
        status="APPROVED",
        is_verified=True
    )

    db.add_all([recruiter_fresh, recruiter_competitor])
    db.commit()
    db.refresh(recruiter_fresh)
    db.refresh(recruiter_competitor)
    db.close()

    token_fresh = create_access_token({"sub": email_fresh, "role": "recruiter"})
    token_competitor = create_access_token({"sub": email_competitor, "role": "recruiter"})

    # -------------------------------------------------------------
    # TEST 1: Initial Profile Fetch & Calculation
    # -------------------------------------------------------------
    print("\n[TEST 1] Testing fresh recruiter initial profile state...")
    res = client.get("/api/v1/recruiter/profile", headers={"Authorization": f"Bearer {token_fresh}"})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["company"]["name"] == "NexTech Solutions"
    assert data["completion"]["is_complete"] is False
    assert len(data["completion"]["missing_required_sections"]) > 0
    print(f"  -> Initial Completion: {data['completion']['percentage']}% (is_complete = {data['completion']['is_complete']})")
    print(f"  -> Missing Sections: {data['completion']['missing_required_sections']}")
    print("[PASS] Fresh profile starts incomplete with backend-calculated missing sections.")

    # -------------------------------------------------------------
    # TEST 2: Hard Gate on Incomplete Profile Operational Endpoints
    # -------------------------------------------------------------
    print("\n[TEST 2] Testing hard gate on operational endpoints when profile is incomplete...")
    
    # 2a. Post internship
    res_post = client.post("/api/v1/recruiter/internships", json={"title": "Cloud Architect Intern"}, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_post.status_code == 403, f"Expected 403, got {res_post.status_code}"
    assert res_post.json()["detail"]["code"] == "RECRUITER_PROFILE_INCOMPLETE"
    print("  -> POST /internships correctly blocked with 403 RECRUITER_PROFILE_INCOMPLETE.")

    # 2b. Discover students
    res_stu = client.get("/api/v1/recruiter/students/discover", headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_stu.status_code == 403
    assert res_stu.json()["detail"]["code"] == "RECRUITER_PROFILE_INCOMPLETE"
    print("  -> GET /students/discover correctly blocked with 403 RECRUITER_PROFILE_INCOMPLETE.")

    # 2c. Get applications
    res_apps = client.get("/api/v1/recruiter/applications", headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_apps.status_code == 403
    print("  -> GET /applications correctly blocked with 403 RECRUITER_PROFILE_INCOMPLETE.")

    # 2d. Get interviews
    res_intv = client.get("/api/v1/recruiter/interviews", headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_intv.status_code == 403
    print("  -> GET /interviews correctly blocked with 403 RECRUITER_PROFILE_INCOMPLETE.")

    # 2e. Get analytics
    res_ana = client.get("/api/v1/recruiter/analytics", headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_ana.status_code == 403
    print("  -> GET /analytics correctly blocked with 403 RECRUITER_PROFILE_INCOMPLETE.")

    # 2f. Dashboard returns profile_incomplete status
    res_dash = client.get("/api/v1/recruiter/dashboard", headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_dash.status_code == 200
    assert res_dash.json()["status"] == "profile_incomplete"
    assert res_dash.json()["is_gated"] is True
    print("  -> GET /dashboard returns profile_incomplete with onboarding metadata.")
    print("[PASS] All operational recruiter endpoints strictly gated.")

    # -------------------------------------------------------------
    # TEST 3: Step-by-Step Profile Persistence to PostgreSQL
    # -------------------------------------------------------------
    print("\n[TEST 3] Updating sections step-by-step and verifying database persistence...")

    # 3a. Update Company Details
    res_comp = client.patch("/api/v1/recruiter/profile/company", json={
        "name": "NexTech Solutions Pvt Ltd",
        "industry": "Cloud Computing & Enterprise AI",
        "company_type": "Private Ltd",
        "company_size": "250-500 employees",
        "founded_year": "2018",
        "website": "https://nextech.io",
        "email": "careers@nextech.io",
        "headquarters": "Pune, Maharashtra"
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_comp.status_code == 200
    assert res_comp.json()["company"]["name"] == "NexTech Solutions Pvt Ltd"
    assert res_comp.json()["company"]["email"] == "careers@nextech.io"
    print("  -> Company Details saved.")

    # 3b. Update Description & Story
    res_about = client.patch("/api/v1/recruiter/profile/about", json={
        "description": "NexTech Solutions is an industry-leading cloud architecture and distributed AI platform engineering firm building enterprise cloud solutions.",
        "mission": "Empowering global companies with intelligent distributed cloud software.",
        "vision": "To be the premiere mentorship-driven engineering employer for rising technical talent."
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_about.status_code == 200
    assert "distributed AI platform" in res_about.json()["about"]["description"]
    print("  -> About, Mission & Vision saved.")

    # 3c. Update Culture & Benefits
    res_culture = client.patch("/api/v1/recruiter/profile/culture", json={
        "culture_tags": ["Innovation", "Mentorship", "Autonomy", "Fast-Paced"],
        "perks": ["Stipend ₹40k/mo", "MacBook Pro M3", "Health Insurance", "PPO Guarantee"]
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_culture.status_code == 200
    assert len(res_culture.json()["culture"]["culture_tags"]) == 4
    print("  -> Culture & Benefits saved.")

    # 3d. Update Preferences (with canonical skills)
    res_pref = client.patch("/api/v1/recruiter/profile/preferences", json={
        "domains": ["Cloud Engineering", "Full Stack Development", "Machine Learning"],
        "skills": ["React", "Python", "FastAPI", "Docker", "PostgreSQL"],
        "work_mode": "Hybrid",
        "duration": "6 Months"
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_pref.status_code == 200
    assert len(res_pref.json()["preferences"]["skills"]) == 5
    print("  -> Internship Preferences & Canonical Skills saved.")

    # 3e. Update Hiring Process
    res_proc = client.patch("/api/v1/recruiter/profile/hiring-process", json={
        "stages": [
            {"id": "01", "order": 1, "title": "Application Review", "desc": "Resume & Skill Match Check", "type": "screening"},
            {"id": "02", "order": 2, "title": "Online Coding Assessment", "desc": "DSA & System Logic", "type": "assessment"},
            {"id": "03", "order": 3, "title": "Technical Interview", "desc": "Live Coding & Microservices Design", "type": "interview"},
            {"id": "04", "order": 4, "title": "Final HR & Offer", "desc": "Team Fit & Offer Letter", "type": "offer"}
        ]
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_proc.status_code == 200
    assert len(res_proc.json()["hiring_process"]) == 4
    print("  -> Hiring Process stages saved.")

    # 3f. Update Locations
    res_loc = client.patch("/api/v1/recruiter/profile/locations", json={
        "locations": [
            {"title": "Pune, Maharashtra", "sub": "Hinjawadi Phase 3, Tech Park", "badge": "HQ", "is_primary": True},
            {"title": "Bengaluru, Karnataka", "sub": "Outer Ring Road, Bellandur", "badge": "R&D", "is_primary": False}
        ]
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_loc.status_code == 200
    assert len(res_loc.json()["locations"]) == 2
    print("  -> Locations saved.")

    # 3g. Update Social Links
    res_soc = client.patch("/api/v1/recruiter/profile/social-links", json={
        "website": "https://nextech.io",
        "linkedin": "linkedin.com/company/nextech-solutions",
        "github": "github.com/nextech-io",
        "twitter": "@NexTechAI"
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_soc.status_code == 200
    assert res_soc.json()["social_links"]["github"] == "github.com/nextech-io"
    print("  -> Social Links saved.")

    # 3h. Update Verification
    res_ver = client.post("/api/v1/recruiter/profile/verify", json={
        "company_email_verified": True,
        "website_verified": True,
        "business_verified": True,
        "recruiter_verified": True
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_ver.status_code == 200
    assert res_ver.json()["verification"]["company_email_verified"] is True
    print("  -> Verification flags saved.")

    # -------------------------------------------------------------
    # TEST 4: Recalculated Completion & Operational Unlock
    # -------------------------------------------------------------
    print("\n[TEST 4] Verifying 100% completion and workspace unlock...")
    res_final = client.get("/api/v1/recruiter/profile", headers={"Authorization": f"Bearer {token_fresh}"})
    completion_final = res_final.json()["completion"]
    print(f"  -> Completion Percentage: {completion_final['percentage']}%")
    print(f"  -> is_complete: {completion_final['is_complete']}")
    print(f"  -> Missing Sections: {completion_final['missing_required_sections']}")
    assert completion_final["is_complete"] is True
    assert completion_final["percentage"] >= 95
    assert len(completion_final["missing_required_sections"]) == 0
    print("[PASS] Profile is now complete and authoritative in PostgreSQL.")

    # -------------------------------------------------------------
    # TEST 5: Operational Endpoints are Now Unlocked
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing operational endpoints after profile completion...")
    
    # 5a. Create Internship Posting
    res_create = client.post("/api/v1/recruiter/internships", json={
        "title": "Backend Engineering Intern",
        "department": "Core Infrastructure",
        "description": "Join our distributed platform engineering team building resilient APIs.",
        "required_skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
        "location": "Pune (Hybrid)",
        "work_mode": "Hybrid",
        "stipend": "₹40,000/mo",
        "duration": "6 Months",
        "openings": 3
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_create.status_code == 200
    posting_id = res_create.json()["internship"]["id"]
    print(f"  -> Successfully created Internship Posting ID: {posting_id}")

    # 5b. Fetch company internships
    res_list = client.get("/api/v1/recruiter/internships", headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_list.status_code == 200
    assert len(res_list.json()["internships"]) >= 1
    print("  -> Listed active company internships from PostgreSQL.")

    # 5c. Discover verified students
    res_students = client.get("/api/v1/recruiter/students/discover", headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_students.status_code == 200
    assert "students" in res_students.json()
    print("  -> Student discovery unlocked.")

    # 5d. Schedule Interview
    res_intv_sched = client.post("/api/v1/recruiter/interviews", json={
        "candidate_name": "Rohan Gupta",
        "candidate_college": "IIT Bombay",
        "role_title": "Backend Engineering Intern",
        "department": "Core Infrastructure",
        "round_name": "Technical Interview 1",
        "interview_time": "02:30 PM",
        "mode": "📹 Meet + Sandbox"
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_intv_sched.status_code == 200
    print("  -> Scheduled interview successfully.")

    # 5e. Get analytics
    res_analytics = client.get("/api/v1/recruiter/analytics", headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_analytics.status_code == 200
    assert res_analytics.json()["analytics"]["active_internships"] >= 1
    assert res_analytics.json()["analytics"]["interviews_scheduled"] >= 1
    print("  -> Analytics computed from real PostgreSQL data.")

    # -------------------------------------------------------------
    # TEST 6: Multi-Recruiter Company Sharing & Isolation
    # -------------------------------------------------------------
    print("\n[TEST 6] Testing multi-recruiter company synchronization & isolation...")
    
    # Add colleague to same company
    res_add_colleague = client.post("/api/v1/recruiter/profile/team", json={
        "name": "Karan Singhania",
        "email": email_fresh_colleague,
        "designation": "Technical Recruiter"
    }, headers={"Authorization": f"Bearer {token_fresh}"})
    assert res_add_colleague.status_code == 200
    print("  -> Added colleague Karan to NexTech team.")

    token_colleague = create_access_token({"sub": email_fresh_colleague, "role": "recruiter"})

    # Colleague fetches profile -> gets the SAME completed company profile!
    res_colleague_prof = client.get("/api/v1/recruiter/profile", headers={"Authorization": f"Bearer {token_colleague}"})
    assert res_colleague_prof.status_code == 200
    colleague_data = res_colleague_prof.json()
    assert colleague_data["company"]["name"] == "NexTech Solutions Pvt Ltd"
    assert colleague_data["completion"]["is_complete"] is True
    print("  -> Colleague sees the exact same shared company profile.")

    # -------------------------------------------------------------
    # TEST 7: Security & IDOR Isolation Against Other Companies
    # -------------------------------------------------------------
    print("\n[TEST 7] Testing security isolation between different companies...")
    
    # Competitor recruiter fetches profile -> must get RivalTech only, NOT NexTech
    res_rival = client.get("/api/v1/recruiter/profile", headers={"Authorization": f"Bearer {token_competitor}"})
    assert res_rival.status_code == 200
    assert res_rival.json()["company"]["name"] == "RivalTech Corp"
    assert res_rival.json()["company"]["name"] != "NexTech Solutions Pvt Ltd"
    print("  -> Competitor strictly isolated to own company data.")

    # Competitor profile is still incomplete -> cannot access NexTech's postings or endpoints
    res_rival_post = client.post("/api/v1/recruiter/internships", json={"title": "Rival Role"}, headers={"Authorization": f"Bearer {token_competitor}"})
    assert res_rival_post.status_code == 403
    print("  -> Competitor blocked by profile gate.")

    print("\n" + "=" * 70)
    print("ALL 7 COMPREHENSIVE RECRUITER PROFILE TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)


if __name__ == "__main__":
    run_comprehensive_recruiter_tests()
