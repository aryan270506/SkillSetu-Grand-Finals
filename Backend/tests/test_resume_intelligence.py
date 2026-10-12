import io
import json
import pytest
from fastapi.testclient import TestClient
from main import app
from app.database import get_db, SessionLocal
from app import models

client = TestClient(app)

SAMPLE_RESUME_TEXT = """
Alex Johnson
Email: alex.johnson@example.com
Phone: +1 555 123 4567
Location: San Francisco, CA

SUMMARY
Senior Software Engineer with 4 years of experience specializing in Python, FastAPI, PostgreSQL, and REST APIs.

SKILLS
Python, FastAPI, Django, PostgreSQL, SQL, Redis, Docker, Git, REST APIs, TypeScript

EXPERIENCE
Software Engineer | CloudTech Labs | 2022 - Present
- Designed and built high-performance microservices in Python and FastAPI.
- Optimized PostgreSQL database queries reducing latency by 40%.
- Integrated Docker container pipelines and Redis caching layers.

Junior Developer | DataSphere Inc | 2020 - 2022
- Maintained RESTful APIs and wrote automated unit tests.

PROJECTS
SkillSetu Intelligence Service
- Developed a distributed resume parser and ATS scoring pipeline using Python and FastAPI.

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley | 2016 - 2020 | CGPA: 3.8

LINKS
GitHub: https://github.com/alexjohnson
LinkedIn: https://linkedin.com/in/alexjohnson
"""

def test_resume_intelligence_isolated_analysis():
    # 1. Test Dashboard Isolated Analysis Endpoint
    file_bytes = SAMPLE_RESUME_TEXT.encode('utf-8')
    files = {
        'file': ('candidate_resume.txt', io.BytesIO(file_bytes), 'text/plain')
    }
    
    response = client.post("/api/v1/student/resume/analyze-intelligence", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["filename"] == "candidate_resume.txt"
    assert "ats_score" in data
    assert 0 <= data["ats_score"] <= 100
    assert "ats_breakdown" in data
    assert "role_fit" in data
    assert "extracted_skills" in data
    assert len(data["extracted_skills"]) > 0
    assert "skillsetu_value" in data
    assert len(data["skillsetu_value"]) > 0
    
    ats_score_dash = data["ats_score"]
    
    # 2. Test that identical resume processed in Profile produces the EXACT SAME ATS score
    db = SessionLocal()
    try:
        # Create student if not exists
        student = db.query(models.StudentUser).filter(models.StudentUser.email == "test_student@skillsetu.com").first()
        if not student:
            student = models.StudentUser(
                email="test_student@skillsetu.com",
                name="Test Student",
                password_hash="hash"
            )
            db.add(student)
            db.commit()
            db.refresh(student)
            
        initial_resume_url = student.resume_url
        
        # Test Dashboard does not mutate student DB record
        files_dash = {
            'file': ('friend_resume.txt', io.BytesIO(file_bytes), 'text/plain')
        }
        res_dash = client.post("/api/v1/student/resume/analyze-intelligence", files=files_dash, data={"email": "test_student@skillsetu.com"})
        assert res_dash.status_code == 200
        
        db.refresh(student)
        assert student.resume_url == initial_resume_url  # Profile record not modified by dashboard analysis!

        # Test Profile upload uses same ATS pipeline
        files_profile = {
            'file': ('profile_resume.txt', io.BytesIO(file_bytes), 'text/plain')
        }
        res_profile = client.post("/api/v1/student/upload-resume", files=files_profile, data={"email": "test_student@skillsetu.com"})
        assert res_profile.status_code == 200
        data_profile = res_profile.json()
        
        ats_score_profile = data_profile["score"]
        
        # Verify ATS scores match identically
        assert ats_score_dash == ats_score_profile
        
    finally:
        db.close()
