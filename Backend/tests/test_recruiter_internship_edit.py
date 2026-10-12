import sys
import os
import json
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from main import app
from app.database import SessionLocal
from app import models
from app.security import hash_password, create_access_token
from app.services.session_cache_service import SessionCacheService

client = TestClient(app)

def run_internship_edit_tests():
    print("=" * 80)
    print("STARTING RECRUITER INTERNSHIP EDIT & DATABASE SYNCHRONIZATION AUDIT")
    print("=" * 80)

    db: Session = SessionLocal()
    SessionCacheService.clear_all_cache()

    # Find Catalyst Coders recruiter & company (ID: 3)
    recruiter = db.query(models.RecruiterUser).filter(models.RecruiterUser.email == "abhoge5@gmail.com").first()
    assert recruiter is not None, "Catalyst Coders recruiter abhoge5@gmail.com must exist"
    company = db.query(models.Company).filter(models.Company.id == recruiter.company_id).first()
    assert company is not None, "Catalyst Coders company must exist"
    assert company.id == 3, f"Company ID must be 3, found {company.id}"

    token = create_access_token(data={"sub": recruiter.email, "role": "recruiter", "id": recruiter.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch existing internships
    postings = db.query(models.InternshipPosting).filter(
        models.InternshipPosting.company_id == company.id
    ).order_by(models.InternshipPosting.id.asc()).all()
    assert len(postings) >= 5, f"Expected at least 5 Catalyst Coders internships, found {len(postings)}"

    target_posting = postings[0]
    target_id = target_posting.id
    print(f"Targeting Internship ID: {target_id} ('{target_posting.title}')")

    # =========================================================================
    # TEST 1: Fetch Detail (Edit Mode Pre-population)
    # =========================================================================
    print("\n--- TEST 1: Fetch Full Internship Detail for Edit Pre-population ---")
    res = client.get(f"/api/v1/recruiter/internships/{target_id}", headers=headers)
    assert res.status_code == 200, f"Detail fetch failed: {res.text}"
    detail_data = res.json()["internship"]
    assert detail_data["id"] == target_id
    assert detail_data["title"] == target_posting.title
    assert detail_data["application_threshold"] == target_posting.application_threshold
    assert detail_data["work_mode"] == target_posting.work_mode
    print(f"✓ TEST 1 PASSED: Detail fetched with title='{detail_data['title']}', threshold={detail_data['application_threshold']}%, stipend='{detail_data['stipend']}'")

    # =========================================================================
    # TEST 2: Edit Title
    # =========================================================================
    print("\n--- TEST 2: Update Internship Title ---")
    new_title = f"{target_posting.title} (Senior Track)"
    patch_res = client.patch(
        f"/api/v1/recruiter/internships/{target_id}",
        json={"title": new_title},
        headers=headers
    )
    assert patch_res.status_code == 200, f"Title patch failed: {patch_res.text}"
    
    db.expire_all()
    db_posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == target_id).first()
    assert db_posting.title == new_title
    print(f"✓ TEST 2 PASSED: Title updated to '{db_posting.title}' in PostgreSQL")

    # =========================================================================
    # TEST 3: Edit Required Skills
    # =========================================================================
    print("\n--- TEST 3: Update Required Skills (Canonical Mapping) ---")
    new_skills = ["React", "FastAPI", "PostgreSQL", "Docker", "Git/GitHub"]
    patch_res = client.patch(
        f"/api/v1/recruiter/internships/{target_id}",
        json={"required_skills": new_skills},
        headers=headers
    )
    assert patch_res.status_code == 200, f"Skills patch failed: {patch_res.text}"
    
    db.expire_all()
    db_posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == target_id).first()
    saved_skills = json.loads(db_posting.required_skills)
    assert "FastAPI" in saved_skills
    assert "Docker" in saved_skills
    print(f"✓ TEST 3 PASSED: Required skills updated to {saved_skills} in PostgreSQL")

    # =========================================================================
    # TEST 4: Edit Stipend & Duration
    # =========================================================================
    print("\n--- TEST 4: Update Stipend and Duration ---")
    new_stipend = "₹22,000/month"
    new_duration = "5 Months"
    patch_res = client.patch(
        f"/api/v1/recruiter/internships/{target_id}",
        json={"stipend": new_stipend, "duration": new_duration},
        headers=headers
    )
    assert patch_res.status_code == 200, f"Stipend patch failed: {patch_res.text}"
    
    db.expire_all()
    db_posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == target_id).first()
    assert db_posting.stipend == new_stipend
    assert db_posting.duration == new_duration
    print(f"✓ TEST 4 PASSED: Stipend='{db_posting.stipend}', Duration='{db_posting.duration}' persisted")

    # =========================================================================
    # TEST 5: Edit Application Threshold (75 -> 85)
    # =========================================================================
    print("\n--- TEST 5: Update Application Threshold (75% -> 85%) ---")
    patch_res = client.patch(
        f"/api/v1/recruiter/internships/{target_id}",
        json={"application_threshold": 85},
        headers=headers
    )
    assert patch_res.status_code == 200, f"Threshold patch failed: {patch_res.text}"
    
    db.expire_all()
    db_posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == target_id).first()
    assert db_posting.application_threshold == 85
    print(f"✓ TEST 5 PASSED: Application threshold updated to {db_posting.application_threshold}% in PostgreSQL")

    # =========================================================================
    # TEST 6: Edit Deadline & Openings
    # =========================================================================
    print("\n--- TEST 6: Update Deadline & Openings ---")
    new_deadline = "2026-12-31T23:59:59"
    new_openings = 5
    patch_res = client.patch(
        f"/api/v1/recruiter/internships/{target_id}",
        json={"deadline": new_deadline, "openings": new_openings},
        headers=headers
    )
    assert patch_res.status_code == 200, f"Deadline/openings patch failed: {patch_res.text}"
    
    db.expire_all()
    db_posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == target_id).first()
    assert db_posting.openings == 5
    assert db_posting.deadline is not None
    print(f"✓ TEST 6 PASSED: Openings={db_posting.openings}, Deadline={db_posting.deadline}")

    # =========================================================================
    # TEST 7: Status Preservation
    # =========================================================================
    print("\n--- TEST 7: Verify Status is Preserved During Unrelated Field Updates ---")
    patch_res = client.patch(
        f"/api/v1/recruiter/internships/{target_id}",
        json={"location": "Pune (Magarpatta HQ)"},
        headers=headers
    )
    assert patch_res.status_code == 200
    db.expire_all()
    db_posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == target_id).first()
    assert db_posting.status == "Active"
    print(f"✓ TEST 7 PASSED: Status remains '{db_posting.status}' after location edit")

    # =========================================================================
    # TEST 8: Cross-Company Ownership Security
    # =========================================================================
    print("\n--- TEST 8: Cross-Company Edit Rejection ---")
    # Create an arbitrary other company recruiter
    other_recruiter = db.query(models.RecruiterUser).filter(models.RecruiterUser.company_id != company.id).first()
    if not other_recruiter:
        other_comp = models.Company(name="Other Tech Org", is_verified=True, industry="Tech")
        db.add(other_comp)
        db.commit()
        db.refresh(other_comp)
        other_recruiter = models.RecruiterUser(
            company_id=other_comp.id,
            name="Other Recruiter",
            email="other.recruiter@othertech.com",
            password_hash=hash_password("Pass@123"),
            company_name=other_comp.name,
            is_verified=True,
            status="APPROVED"
        )
        db.add(other_recruiter)
        db.commit()
        db.refresh(other_recruiter)

    other_token = create_access_token(data={"sub": other_recruiter.email, "role": "recruiter", "id": other_recruiter.id})
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Attempt to edit Catalyst Coders posting using other recruiter's token
    hack_res = client.patch(
        f"/api/v1/recruiter/internships/{target_id}",
        json={"title": "Hacked Title"},
        headers=other_headers
    )
    assert hack_res.status_code in [403, 404], f"Cross-tenant edit must be rejected, got {hack_res.status_code}"
    print(f"✓ TEST 8 PASSED: Unauthorized cross-company edit rejected with status {hack_res.status_code}")

    # =========================================================================
    # TEST 9: Student Opportunities Synchronization
    # =========================================================================
    print("\n--- TEST 9: Student Opportunities Reflection After Recruiter Edit ---")
    student = db.query(models.StudentUser).first()
    student_token = create_access_token(data={"sub": student.email, "role": "student", "id": student.id})
    student_headers = {"Authorization": f"Bearer {student_token}"}

    rec_res = client.get("/api/v1/internships/recommended", headers=student_headers)
    assert rec_res.status_code == 200, f"Student recommended failed: {rec_res.text}"
    student_items = rec_res.json().get("data", [])
    catalyst_opp = next((item for item in student_items if item.get("id") == target_id), None)
    assert catalyst_opp is not None, f"Internship ID {target_id} not found in student recommendations"
    assert catalyst_opp["title"] == new_title
    assert catalyst_opp["application_threshold"] == 85
    assert catalyst_opp["stipend"] == new_stipend
    print(f"✓ TEST 9 PASSED: Student opportunity immediately received updated title='{catalyst_opp['title']}', threshold={catalyst_opp['application_threshold']}%, stipend='{catalyst_opp['stipend']}'")

    # =========================================================================
    # TEST 10: Existing Applications Integrity
    # =========================================================================
    print("\n--- TEST 10: Preserve Historical Applications on Edit ---")
    app_record = models.InternshipApplication(
        student_id=student.id,
        internship_id=target_id,
        company_id=company.id,
        title_snapshot=new_title,
        status="Applied",
        match_score_at_apply=82.0,
        application_threshold_at_apply=75
    )
    db.add(app_record)
    db.commit()
    db.refresh(app_record)

    # Edit internship again
    client.patch(
        f"/api/v1/recruiter/internships/{target_id}",
        json={"stipend": "₹25,000/month"},
        headers=headers
    )

    db.expire_all()
    preserved_app = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == app_record.id).first()
    assert preserved_app is not None, "Application record must remain intact"
    assert preserved_app.match_score_at_apply == 82.0
    assert preserved_app.application_threshold_at_apply == 75
    print(f"✓ TEST 10 PASSED: Application ID {preserved_app.id} preserved with historical snapshot intact")

    # Cleanup test application and restore title
    db.delete(preserved_app)
    orig_title = "Full Stack Developer Intern"
    db_posting.title = orig_title
    db_posting.stipend = "₹15,000/month"
    db_posting.application_threshold = 75
    db_posting.duration = "6 months"
    db_posting.openings = 3
    db.add(db_posting)
    db.commit()
    SessionCacheService.clear_all_cache()

    print("\n" + "=" * 80)
    print("ALL RECRUITER INTERNSHIP EDIT & SYNCHRONIZATION AUDIT TESTS PASSED (10/10)")
    print("=" * 80)
    db.close()

if __name__ == "__main__":
    run_internship_edit_tests()
