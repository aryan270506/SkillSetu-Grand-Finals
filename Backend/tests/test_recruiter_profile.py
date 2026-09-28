import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import RecruiterUser, StudentUser
from app.security import create_access_token, hash_password

client = TestClient(app)

def run_recruiter_profile_tests():
    print("=" * 60)
    print("STARTING RECRUITER PROFILE FUNCTIONALITY TESTS")
    print("=" * 60)

    db = SessionLocal()

    # Clean up test accounts
    approved_email = "approved_recruiter_test@corp.com"
    pending_email = "pending_recruiter_test@corp.com"
    rejected_email = "rejected_recruiter_test@corp.com"
    other_approved_email = "other_recruiter_test@corp.com"

    db.query(RecruiterUser).filter(
        RecruiterUser.email.in_([approved_email, pending_email, rejected_email, other_approved_email])
    ).delete(synchronize_session=False)
    db.commit()

    # Create Test Recruiters
    # 1. Approved Recruiter
    recruiter_approved = RecruiterUser(
        name="Alice Recruiter",
        email=approved_email,
        password_hash=hash_password("Pass123!"),
        phone="+1111111111",
        company_name="Apex Global",
        company_website="https://apexglobal.com",
        industry="Technology",
        company_size="500+",
        designation="Lead Recruiter",
        status="APPROVED",
        is_verified=True
    )
    # 2. Pending Recruiter
    recruiter_pending = RecruiterUser(
        name="Bob Pending",
        email=pending_email,
        password_hash=hash_password("Pass123!"),
        company_name="Pending Inc",
        status="PENDING"
    )
    # 3. Rejected Recruiter
    recruiter_rejected = RecruiterUser(
        name="Charlie Rejected",
        email=rejected_email,
        password_hash=hash_password("Pass123!"),
        company_name="Rejected Ltd",
        status="REJECTED"
    )
    # 4. Other Approved Recruiter (for unauthorized access test)
    recruiter_other = RecruiterUser(
        name="Dave Recruiter",
        email=other_approved_email,
        password_hash=hash_password("Pass123!"),
        company_name="Dave Enterprise",
        status="APPROVED",
        is_verified=True
    )

    db.add_all([recruiter_approved, recruiter_pending, recruiter_rejected, recruiter_other])
    db.commit()
    db.refresh(recruiter_approved)
    db.refresh(recruiter_pending)
    db.refresh(recruiter_rejected)
    db.refresh(recruiter_other)
    db.close()

    token_approved = create_access_token({"sub": approved_email, "role": "recruiter"})
    token_pending = create_access_token({"sub": pending_email, "role": "recruiter"})
    token_rejected = create_access_token({"sub": rejected_email, "role": "recruiter"})
    token_other = create_access_token({"sub": other_approved_email, "role": "recruiter"})
    token_student = create_access_token({"sub": "student@test.com", "role": "student"})

    # Test 1: Unauthenticated Request
    print("\n1. Testing Unauthenticated GET /profile...")
    res = client.get("/api/v1/recruiter/profile")
    assert res.status_code == 401
    print("[OK] Unauthenticated GET correctly returned 401 Unauthorized.")

    print("Testing Unauthenticated PUT /profile...")
    res = client.put("/api/v1/recruiter/profile", json={"name": "New Name"})
    assert res.status_code == 401
    print("[OK] Unauthenticated PUT correctly returned 401 Unauthorized.")

    # Test 2: Pending Recruiter Request
    print("\n2. Testing Pending Recruiter GET /profile...")
    res = client.get("/api/v1/recruiter/profile", headers={"Authorization": f"Bearer {token_pending}"})
    assert res.status_code == 403
    assert "awaiting admin verification" in res.json()["detail"]
    print("[OK] Pending recruiter GET correctly blocked with 403 Forbidden.")

    print("Testing Pending Recruiter PUT /profile...")
    res = client.put("/api/v1/recruiter/profile", json={"name": "New Name"}, headers={"Authorization": f"Bearer {token_pending}"})
    assert res.status_code == 403
    assert "awaiting admin verification" in res.json()["detail"]
    print("[OK] Pending recruiter PUT correctly blocked with 403 Forbidden.")

    # Test 3: Rejected Recruiter Request
    print("\n3. Testing Rejected Recruiter GET /profile...")
    res = client.get("/api/v1/recruiter/profile", headers={"Authorization": f"Bearer {token_rejected}"})
    assert res.status_code == 403
    assert "rejected" in res.json()["detail"]
    print("[OK] Rejected recruiter GET correctly blocked with 403 Forbidden.")

    print("Testing Rejected Recruiter PUT /profile...")
    res = client.put("/api/v1/recruiter/profile", json={"name": "New Name"}, headers={"Authorization": f"Bearer {token_rejected}"})
    assert res.status_code == 403
    assert "rejected" in res.json()["detail"]
    print("[OK] Rejected recruiter PUT correctly blocked with 403 Forbidden.")

    # Test 4: Unauthorized Access (Student Role JWT)
    print("\n4. Testing Student Token on Recruiter /profile...")
    res = client.get("/api/v1/recruiter/profile", headers={"Authorization": f"Bearer {token_student}"})
    assert res.status_code == 401
    print("[OK] Non-recruiter token correctly blocked with 401 Unauthorized.")

    # Test 5: Approved Recruiter GET /profile
    print("\n5. Testing Approved Recruiter GET /profile...")
    res = client.get("/api/v1/recruiter/profile", headers={"Authorization": f"Bearer {token_approved}"})
    assert res.status_code == 200
    profile = res.json()["profile"]
    assert profile["email"] == approved_email
    assert profile["name"] == "Alice Recruiter"
    assert profile["company_name"] == "Apex Global"
    assert profile["status"] == "APPROVED"
    print("[OK] Approved recruiter successfully retrieved profile.")

    # Test 6: Recruiter only accesses own profile (isolation test)
    print("\n6. Testing Recruiter Self Profile Isolation...")
    res_other = client.get("/api/v1/recruiter/profile", headers={"Authorization": f"Bearer {token_other}"})
    assert res_other.status_code == 200
    other_profile = res_other.json()["profile"]
    assert other_profile["email"] == other_approved_email
    assert other_profile["name"] == "Dave Recruiter"
    assert other_profile["email"] != profile["email"]
    print("[OK] Recruiter token strictly returns own profile only.")

    # Test 7: Approved Recruiter PUT /profile (Profile Update)
    print("\n7. Testing Approved Recruiter PUT /profile (Update)...")
    update_payload = {
        "name": "Alice M. Recruiter",
        "phone": "+1999888777",
        "company_name": "Apex Global Tech",
        "company_website": "https://apex.tech",
        "designation": "VP of Talent",
        "company_size": "1000+",
        "industry": "Artificial Intelligence"
    }
    res = client.put("/api/v1/recruiter/profile", json=update_payload, headers={"Authorization": f"Bearer {token_approved}"})
    assert res.status_code == 200
    updated_profile = res.json()["profile"]
    assert updated_profile["name"] == "Alice M. Recruiter"
    assert updated_profile["phone"] == "+1999888777"
    assert updated_profile["company_name"] == "Apex Global Tech"
    assert updated_profile["company_website"] == "https://apex.tech"
    assert updated_profile["designation"] == "VP of Talent"
    assert updated_profile["company_size"] == "1000+"
    assert updated_profile["industry"] == "Artificial Intelligence"
    print("[OK] Approved recruiter profile updated successfully.")

    # Verify persistent update in database
    print("\n8. Verifying DB Persistence...")
    db_verify = SessionLocal()
    rec = db_verify.query(RecruiterUser).filter(RecruiterUser.email == approved_email).first()
    assert rec.name == "Alice M. Recruiter"
    assert rec.phone == "+1999888777"
    assert rec.company_name == "Apex Global Tech"
    db_verify.close()
    print("[OK] Database changes verified.")

    print("\n" + "=" * 60)
    print("ALL RECRUITER PROFILE TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_recruiter_profile_tests()
