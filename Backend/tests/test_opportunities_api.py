import pytest
from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import (
    StudentUser,
    InternshipListing,
    Scholarship,
    SavedInternship,
    SavedScholarship,
    InternshipApplication,
    ScholarshipApplication
)

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_recommended_internships_endpoint(client):
    """Test GET /api/v1/internships/recommended returns live results."""
    response = client.get("/api/v1/internships/recommended?email=abhoge27@gmail.com")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "items" in data
    assert isinstance(data["items"], list)
    if len(data["items"]) > 0:
        first = data["items"][0]
        assert "match_score" in first
        assert "eligibility_status" in first
        assert "source" in first


def test_eligible_scholarships_endpoint(client):
    """Test GET /api/v1/scholarships/eligible returns deterministic rule evaluated scholarships."""
    response = client.get("/api/v1/scholarships/eligible?email=abhoge27@gmail.com")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "items" in data
    assert isinstance(data["items"], list)
    if len(data["items"]) > 0:
        first = data["items"][0]
        assert "eligibility_status" in first
        assert "evaluation_checkpoints" in first


def test_scholarship_simulator_endpoint(client):
    """Test POST /api/v1/scholarships/simulate simulates eligibility dynamically."""
    payload = {
        "email": "abhoge27@gmail.com",
        "cgpa": 9.2,
        "annual_family_income": 350000.0,
        "social_category": "OBC",
        "gender": "Female"
    }
    response = client.post("/api/v1/scholarships/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "evaluated_scholarships" in data["data"]


def test_user_isolation_saved_items(client, db):
    """Test that Student A's saved items are not visible to Student B."""
    # Ensure two students exist
    email_a = "isolated_student_a@test.com"
    email_b = "isolated_student_b@test.com"
    
    student_a = db.query(StudentUser).filter(StudentUser.email == email_a).first()
    if not student_a:
        student_a = StudentUser(email=email_a, name="Student A", password_hash="dummy_hash")
        db.add(student_a)
        db.commit()
        db.refresh(student_a)
        
    student_b = db.query(StudentUser).filter(StudentUser.email == email_b).first()
    if not student_b:
        student_b = StudentUser(email=email_b, name="Student B", password_hash="dummy_hash")
        db.add(student_b)
        db.commit()
        db.refresh(student_b)
        
    listing = db.query(InternshipListing).filter(InternshipListing.is_active == True).first()
    if listing:
        # Save for Student A
        res_save = client.post(f"/api/v1/internships/{listing.id}/save", json={"email": email_a, "save": True})
        assert res_save.status_code == 200
        
        # Check recommendations for Student A vs Student B
        res_a = client.get(f"/api/v1/internships/recommended?email={email_a}&limit=50")
        res_b = client.get(f"/api/v1/internships/recommended?email={email_b}&limit=50")
        
        items_a = {(item.get("id") or item.get("internship_id")): item["is_saved"] for item in res_a.json().get("items", []) or res_a.json().get("data", [])}
        items_b = {(item.get("id") or item.get("internship_id")): item["is_saved"] for item in res_b.json().get("items", []) or res_b.json().get("data", [])}
        
        assert items_a.get(listing.id) is True
        assert items_b.get(listing.id) is False


def test_student_applications_endpoint(client):
    """Test GET /api/v1/student/applications returns unified tracking."""
    response = client.get("/api/v1/student/applications?email=abhoge27@gmail.com")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "stats" in data["data"]
    assert "internships" in data["data"]
    assert "scholarships" in data["data"]
