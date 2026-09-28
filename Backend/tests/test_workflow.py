import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import RecruiterUser, AdminUser

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("STARTING COMPREHENSIVE RECRUITER & ADMIN WORKFLOW TESTS")
    print("=" * 60)

    # Clean up test recruiters if exist
    db = SessionLocal()
    recruiter_1_email = "pending_recruiter_test@techcorp.com"
    recruiter_2_email = "rejected_recruiter_test@scam.com"
    db.query(RecruiterUser).filter(RecruiterUser.email.in_([recruiter_1_email, recruiter_2_email])).delete(synchronize_session=False)
    db.commit()
    db.close()

    # 1. Recruiter Signup (Pending)
    signup_payload = {
        "name": "Alex Mercer",
        "email": recruiter_1_email,
        "password": "SecurePassword123!",
        "phone": "+1987654321",
        "company_name": "Tech Corp Solutions",
        "company_website": "https://techcorp.example.com",
        "industry": "Software Engineering",
        "company_size": "50-200",
        "designation": "Head of Talent Acquisition"
    }
    
    print("\n1. Testing Recruiter Signup...")
    res = client.post("/api/v1/recruiter/register", json=signup_payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["status"] == "pending_approval"
    assert res.json()["user"]["status"] == "PENDING"
    assert "access_token" not in res.json()
    recruiter_1_id = res.json()["user"]["id"]
    print("[OK] Recruiter registration submitted successfully and set to PENDING.")

    # 2. Duplicate signup attempt
    print("\n2. Testing Duplicate Signup Prevention...")
    res = client.post("/api/v1/recruiter/register", json=signup_payload)
    assert res.status_code == 400
    print("[OK] Duplicate signup correctly blocked.")

    # 3. Recruiter Login while PENDING
    print("\n3. Testing Recruiter Login while PENDING...")
    res = client.post("/api/v1/recruiter/login", json={
        "email": recruiter_1_email,
        "password": "SecurePassword123!"
    })
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 403
    assert "awaiting admin verification" in res.json()["detail"]
    print("[OK] Login correctly blocked for PENDING recruiter.")

    # 4. Admin Login
    print("\n4. Testing Admin Login...")
    admin_login_res = client.post("/api/v1/admin/login", json={
        "email": "admin@skillsetu.com",
        "password": "admin123"
    })
    print(f"Status: {admin_login_res.status_code}, Response: {admin_login_res.json()}")
    assert admin_login_res.status_code == 200
    admin_token = admin_login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[OK] Admin login successful and JWT token retrieved.")

    # 5. Admin retrieves pending recruiters
    print("\n5. Testing Admin GET Pending Recruiters...")
    res = client.get("/api/v1/admin/recruiters/pending", headers=admin_headers)
    print(f"Status: {res.status_code}, Count: {res.json().get('count')}")
    assert res.status_code == 200
    pending_ids = [r["id"] for r in res.json()["recruiters"]]
    assert recruiter_1_id in pending_ids
    print("[OK] Pending recruiter listed in admin pending endpoint.")

    # 6. Admin views recruiter details
    print("\n6. Testing Admin GET Recruiter Details...")
    res = client.get(f"/api/v1/admin/recruiters/{recruiter_1_id}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["recruiter"]["email"] == recruiter_1_email
    print("[OK] Recruiter details retrieved successfully by Admin.")

    # 7. Admin Approves Recruiter
    print("\n7. Testing Admin Approve Recruiter...")
    res = client.put(f"/api/v1/admin/recruiters/{recruiter_1_id}/approve", headers=admin_headers)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["recruiter"]["status"] == "APPROVED"
    print("[OK] Recruiter status successfully updated to APPROVED.")

    # 8. Recruiter Login Post-Approval
    print("\n8. Testing Recruiter Login Post-Approval...")
    res = client.post("/api/v1/recruiter/login", json={
        "email": recruiter_1_email,
        "password": "SecurePassword123!"
    })
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    recruiter_token = res.json()["access_token"]
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}
    print("[OK] Approved recruiter logged in successfully and received JWT token.")

    # 9. Recruiter Access Protected Endpoint
    print("\n9. Testing Recruiter Access to Protected Endpoint...")
    res = client.get("/api/v1/recruiter/dashboard", headers=recruiter_headers)
    assert res.status_code == 200
    print("[OK] Approved recruiter successfully accessed protected /dashboard endpoint.")

    # 10. Test Rejection Flow
    print("\n10. Registering Second Recruiter for Rejection Flow...")
    res = client.post("/api/v1/recruiter/register", json={
        "name": "Fake Recruiter",
        "email": recruiter_2_email,
        "password": "Password123!",
        "company_name": "Unknown Entity"
    })
    recruiter_2_id = res.json()["user"]["id"]

    print("\n11. Testing Admin Reject Recruiter...")
    res = client.put(f"/api/v1/admin/recruiters/{recruiter_2_id}/reject", json={
        "reason": "Invalid company registration documents."
    }, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["recruiter"]["status"] == "REJECTED"
    print("[OK] Recruiter successfully marked as REJECTED with reason.")

    # 12. Rejected Recruiter Login Attempt
    print("\n12. Testing Rejected Recruiter Login...")
    res = client.post("/api/v1/recruiter/login", json={
        "email": recruiter_2_email,
        "password": "Password123!"
    })
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 403
    assert "rejected" in res.json()["detail"]
    print("[OK] Login correctly blocked for REJECTED recruiter.")

    # 13. Security: Recruiter Token on Admin Endpoint
    print("\n13. Testing Security: Recruiter Token on Admin Endpoint...")
    res = client.get("/api/v1/admin/recruiters/pending", headers=recruiter_headers)
    print(f"Status: {res.status_code}, Detail: {res.json()}")
    assert res.status_code == 403
    print("[OK] Recruiter token strictly forbidden on Admin endpoints.")

    # 14. Admin Dashboard Stats
    print("\n14. Testing Admin Dashboard Stats...")
    res = client.get("/api/v1/admin/dashboard/stats", headers=admin_headers)
    print(f"Status: {res.status_code}, Stats: {res.json()}")
    assert res.status_code == 200
    stats = res.json()["stats"]
    assert stats["total_recruiters"] >= 2
    assert stats["approved_recruiters"] >= 1
    assert stats["rejected_recruiters"] >= 1
    print("[OK] Admin Dashboard stats returns real database metrics.")

    print("\n" + "=" * 60)
    print("ALL 14 WORKFLOW TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
