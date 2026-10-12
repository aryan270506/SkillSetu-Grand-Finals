import sys
import os
import json
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app import models
from app.security import create_access_token
from app.services.session_cache_service import SessionCacheService

client = TestClient(app)

def publish_catalyst_coders_internships():
    db = SessionLocal()

    # Find the existing Catalyst Coders company (ID: 3)
    company = db.query(models.Company).filter(models.Company.id == 3).first()
    if not company:
        company = db.query(models.Company).filter(models.Company.name == "Catalyst Coders").first()
    
    assert company is not None, "Catalyst Coders company not found in database!"
    print(f"Using Existing Company: ID={company.id}, Name='{company.name}'")

    # Find the existing registered recruiter for Catalyst Coders
    recruiter = db.query(models.RecruiterUser).filter(models.RecruiterUser.company_id == company.id).first()
    if not recruiter:
        recruiter = db.query(models.RecruiterUser).filter(models.RecruiterUser.email == "abhoge5@gmail.com").first()
    
    assert recruiter is not None, "Recruiter for Catalyst Coders not found in database!"
    print(f"Using Existing Recruiter: ID={recruiter.id}, Name='{recruiter.name}', Email='{recruiter.email}'")

    # Recruiter auth token
    token = create_access_token({"sub": recruiter.email, "role": "recruiter", "user_id": recruiter.id})
    headers = {"Authorization": f"Bearer {token}"}

    deadline_iso = (datetime.now(timezone.utc) + timedelta(days=60)).isoformat()

    internships_to_publish = [
        {
            "title": "Full Stack Developer Intern",
            "department": "Engineering & Cloud",
            "description": "Join Catalyst Coders as a Full Stack Developer Intern. You will design, develop, and maintain robust end-to-end web applications with React frontend architectures and scalable Node.js/PostgreSQL backend services. Work in a high-velocity agile team building modern cloud features.",
            "required_skills": ["React", "JavaScript", "TypeScript", "Node.js", "REST APIs", "PostgreSQL", "Git/GitHub"],
            "location": "Pune, Maharashtra (Hybrid)",
            "work_mode": "Hybrid",
            "duration": "6 Months",
            "stipend": "₹15,000/month",
            "openings": 3,
            "application_threshold": 75,
            "deadline": deadline_iso
        },
        {
            "title": "React Native Developer Intern",
            "department": "Mobile Engineering",
            "description": "Develop cutting-edge cross-platform mobile apps for iOS and Android using React Native and Expo. Collaborate with UI/UX designers to implement pixel-perfect interactive mobile interfaces, offline storage, and responsive APIs.",
            "required_skills": ["React Native", "JavaScript", "TypeScript", "Expo", "REST APIs", "Git/GitHub"],
            "location": "Pune, Maharashtra (Hybrid)",
            "work_mode": "Hybrid",
            "duration": "6 Months",
            "stipend": "₹12,000/month",
            "openings": 2,
            "application_threshold": 70,
            "deadline": deadline_iso
        },
        {
            "title": "Backend Developer Intern",
            "department": "Platform Infrastructure",
            "description": "Architect and implement high-throughput asynchronous REST APIs and database pipelines using Python, FastAPI, SQL, and PostgreSQL. Focus on clean architecture, performance optimization, data security, and containerized deployments.",
            "required_skills": ["Python", "FastAPI", "REST APIs", "PostgreSQL", "SQL", "Git/GitHub"],
            "location": "Remote (India)",
            "work_mode": "Remote",
            "duration": "6 Months",
            "stipend": "₹14,000/month",
            "openings": 4,
            "application_threshold": 75,
            "deadline": deadline_iso
        },
        {
            "title": "AI/ML Developer Intern",
            "department": "AI & Intelligence Labs",
            "description": "Build and integrate generative AI pipelines, LLM agents, NLP models, and machine learning inference services using Python and FastAPI. Evaluate state-of-the-art embedding models and vector databases to deliver intelligent user experiences.",
            "required_skills": ["Python", "Machine Learning", "NLP", "FastAPI", "AI/LLMs", "Git/GitHub"],
            "location": "Pune, Maharashtra (Hybrid)",
            "work_mode": "Hybrid",
            "duration": "6 Months",
            "stipend": "₹15,000/month",
            "openings": 2,
            "application_threshold": 80,
            "deadline": deadline_iso
        },
        {
            "title": "Frontend Developer Intern",
            "department": "User Experience & Web",
            "description": "Craft highly engaging, accessible, and responsive user interfaces using modern React, JavaScript/TypeScript, HTML5, CSS3, and Tailwind CSS. Optimize web vitals, build reusable component design systems, and connect with live backend services.",
            "required_skills": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind CSS", "Git/GitHub"],
            "location": "Remote (India)",
            "work_mode": "Remote",
            "duration": "4 Months",
            "stipend": "₹10,000/month",
            "openings": 3,
            "application_threshold": 70,
            "deadline": deadline_iso
        }
    ]

    published_records = []

    print("\n--- Publishing 5 Real Internships via Recruiter Posting Endpoint ---")
    for int_payload in internships_to_publish:
        # Check if already exists for this company
        existing = db.query(models.InternshipPosting).filter(
            models.InternshipPosting.company_id == company.id,
            models.InternshipPosting.title == int_payload["title"]
        ).first()

        if existing:
            # Update existing posting to active/published with requested values
            patch_res = client.patch(f"/api/v1/recruiter/internships/{existing.id}", headers=headers, json={
                "title": int_payload["title"],
                "department": int_payload["department"],
                "description": int_payload["description"],
                "required_skills": int_payload["required_skills"],
                "location": int_payload["location"],
                "work_mode": int_payload["work_mode"],
                "duration": int_payload["duration"],
                "stipend": int_payload["stipend"],
                "openings": int_payload["openings"],
                "application_threshold": int_payload["application_threshold"],
                "status": "Active"
            })
            assert patch_res.status_code == 200, f"Failed to patch {int_payload['title']}: {patch_res.text}"
            rec_data = patch_res.json()["internship"]
            existing.deadline = datetime.fromisoformat(deadline_iso)
            db.commit()
            published_records.append(rec_data)
            print(f"✓ Updated & Published Existing: ID={existing.id} | {existing.title}")
        else:
            post_res = client.post("/api/v1/recruiter/internships", headers=headers, json=int_payload)
            assert post_res.status_code == 200, f"Failed to post {int_payload['title']}: {post_res.text}"
            rec_data = post_res.json()["internship"]
            published_records.append(rec_data)
            print(f"✓ Created & Published: ID={rec_data['id']} | {rec_data['title']}")

    # Clear opportunity cache
    SessionCacheService.clear_all_cache()

    print("\n================================================================================")
    print("VERIFYING PUBLISHED INTERNSHIPS IN POSTGRESQL & RECRUITER DASHBOARD")
    print("================================================================================")

    rec_list_res = client.get("/api/v1/recruiter/internships", headers=headers)
    assert rec_list_res.status_code == 200
    rec_postings = rec_list_res.json()["internships"]
    print(f"Recruiter Internships Count for Catalyst Coders: {len(rec_postings)}")
    for p in rec_postings:
        print(f"  • ID={p['id']} | Title='{p['title']}' | Company='{p['company_name']}' | Threshold={p['application_threshold']}% | Openings={p['openings']} | Status={p['status']}")

    print("\n================================================================================")
    print("VERIFYING VERIFIED RECRUITER OPPORTUNITIES IN STUDENT FEED")
    print("================================================================================")

    # Use student user
    student = db.query(models.StudentUser).first()
    stu_token = create_access_token({"sub": student.email, "role": "student"})
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    stu_res = client.get(f"/api/v1/internships/recommended?email={student.email}&force_refresh=true", headers=stu_headers)
    assert stu_res.status_code == 200
    stu_items = stu_res.json().get("items", [])

    catalyst_student_items = [it for it in stu_items if it.get("company_id") == company.id or "Catalyst Coders" in (it.get("company_name") or "")]
    print(f"Student Feed Verified Opportunities for Catalyst Coders: {len(catalyst_student_items)}")
    for s_it in catalyst_student_items:
        print(f"  ★ ID={s_it['id']} | Title='{s_it['title']}' | Company='{s_it['company_name']}' | Verified={s_it['is_verified']} | Source='{s_it['source']}' | Threshold={s_it['application_threshold']}% | Match={s_it['match_score']}% | Readiness={s_it['readiness_status']}")

    assert len(catalyst_student_items) == 5, f"Expected 5 Catalyst Coders opportunities in student feed, got {len(catalyst_student_items)}"
    print("\n✓ SUCCESS: All 5 Catalyst Coders internships are live, published, and verified in PostgreSQL!")

if __name__ == "__main__":
    publish_catalyst_internships_script = publish_catalyst_coders_internships()
