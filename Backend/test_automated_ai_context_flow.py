import os
import json
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from app.database import Base, get_db
from app import models, security
from app.services.student_context_service import StudentContextBuilder

# Test In-Memory / SQLite Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_ai_context_flow.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # 1. Create Student User with rich structured data
    student = models.StudentUser(
        id=101,
        name="Aryan Bhoge",
        email="aryan.context.test@skillsetu.com",
        password_hash=security.hash_password("SecretPass123!"),
        headline="Aspiring Full Stack Engineer",
        bio="Passionate builder specializing in React Native and FastAPI microservices.",
        university="Pune Institute of Computer Technology",
        degree="B.Tech",
        branch="Computer Engineering",
        start_year="2023",
        graduation_year="2027",
        cgpa_or_percentage="9.2",
        location="Pune, Maharashtra",
        resume_data=json.dumps({
            "score": 92,
            "extracted_data": {
                "projects": [
                    {
                        "title": "SkillSetu Core Platform",
                        "description": "Engineered real-time proctoring and career intelligence pipeline.",
                        "tech_stack": ["React Native", "FastAPI", "PostgreSQL", "LiveKit"]
                    },
                    {
                        "title": "Cloud Scale Cache",
                        "description": "High throughput distributed in-memory cache system in Go.",
                        "tech_stack": ["Go", "Distributed Systems", "gRPC"]
                    }
                ],
                "experience": [
                    {
                        "role": "Backend Engineering Intern",
                        "company": "OpenSource Foundation",
                        "tech_stack": ["Python", "FastAPI", "Docker"]
                    }
                ],
                "certifications": [
                    {"name": "AWS Certified Cloud Practitioner"},
                    {"name": "PostgreSQL Professional Schema Design"}
                ],
                "achievements": [
                    {"title": "Smart India Hackathon Finalist 2026"}
                ]
            }
        })
    )
    db.add(student)

    # 2. Student 2 (Minimal profile - no github, no projects)
    student_minimal = models.StudentUser(
        id=102,
        name="Neha Sharma",
        email="neha.minimal.test@skillsetu.com",
        password_hash=security.hash_password("SecretPass123!"),
        headline="Frontend Enthusiast",
        university="University of Mumbai",
        degree="B.Sc",
        branch="Information Technology",
        graduation_year="2026"
    )
    db.add(student_minimal)

    # 3. Student GitHub Connection for Aryan
    gh_conn = models.StudentGithubConnection(
        student_email="aryan.context.test@skillsetu.com",
        github_username="aryanbhoge",
        github_profile_url="https://github.com/aryanbhoge",
        connection_status="CONNECTED",
        repos_json=json.dumps([
            {
                "name": "skillsetu-core",
                "description": "Full stack AI mentoring and assessment engine",
                "language": "Python",
                "stargazers_count": 42,
                "html_url": "https://github.com/aryanbhoge/skillsetu-core"
            },
            {
                "name": "fastapi-microservices",
                "description": "Event driven distributed backend",
                "language": "Python",
                "stargazers_count": 18,
                "html_url": "https://github.com/aryanbhoge/fastapi-microservices"
            }
        ]),
        skills_json=json.dumps([
            {"skill_name": "Python", "confidence": 0.95},
            {"skill_name": "FastAPI", "confidence": 0.90},
            {"skill_name": "PostgreSQL", "confidence": 0.88}
        ])
    )
    db.add(gh_conn)

    # 4. Canonical Skills Evidence
    ev1 = models.StudentSkillEvidence(
        student_id=101,
        skill_name="Python",
        source_type="GITHUB_ANALYSIS",
        evidence_score=0.92
    )
    ev2 = models.StudentSkillEvidence(
        student_id=101,
        skill_name="PostgreSQL",
        source_type="PROJECT_SUBMISSION",
        evidence_score=0.85
    )
    db.add_all([ev1, ev2])

    # 5. Company & Recruiter
    company = models.Company(
        id=501,
        name="Catalyst Coders Technologies",
        website="https://catalystcoders.io",
        industry="Information Technology",
        description="Pioneering enterprise AI workflows."
    )
    db.add(company)
    db.flush()

    recruiter = models.RecruiterUser(
        id=601,
        company_id=501,
        email="recruiter.context.test@catalystcoders.io",
        name="Sarah Connor",
        company_name="Catalyst Coders Technologies",
        designation="Hiring Lead",
        password_hash=security.hash_password("RecruiterPass123!"),
        status="APPROVED"
    )
    db.add(recruiter)
    db.flush()

    # 6. Internship Postings (Role A: Backend, Role B: Frontend)
    posting_backend = models.InternshipPosting(
        id=701,
        company_id=501,
        recruiter_id=601,
        title="Backend Developer Intern",
        description="Design high performance microservices with FastAPI and PostgreSQL.",
        required_skills=json.dumps(["Python", "FastAPI", "PostgreSQL", "REST APIs", "Docker"]),
        location="Hybrid - Pune",
        duration="6 Months",
        stipend="₹25,000 / month",
        status="Active"
    )

    posting_frontend = models.InternshipPosting(
        id=702,
        company_id=501,
        recruiter_id=601,
        title="Frontend Developer Intern",
        description="Build reactive components using React Native and modern CSS.",
        required_skills=json.dumps(["React", "React Native", "TypeScript", "Redux"]),
        location="Remote",
        duration="3 Months",
        stipend="₹20,000 / month",
        status="Active"
    )
    db.add_all([posting_backend, posting_frontend])
    db.flush()

    # 7. Internship Assessment Pipeline Config
    config_backend = models.InternshipAssessmentConfig(
        id=801,
        internship_id=701,
        company_id=501,
        recruiter_id=601,
        is_active=True,
        pipeline_config=json.dumps({
            "round_sequence": ["aptitude", "technical", "interview", "gd"],
            "aptitude": {"enabled": True, "duration_min": 20, "question_count": 6},
            "technical": {"enabled": True, "duration_min": 35, "theory_enabled": True, "coding_enabled": True},
            "interview": {"enabled": True, "duration_min": 15},
            "gd": {"enabled": True, "discussion_time_min": 10}
        })
    )
    db.add(config_backend)

    # 8. Applications
    app_backend = models.InternshipApplication(
        id=901,
        student_id=101,
        company_id=501,
        internship_id=701,
        source="internal",
        source_id="701",
        title_snapshot="Backend Developer Intern",
        company_snapshot="Catalyst Coders Technologies",
        status="SHORTLISTED"
    )

    app_frontend = models.InternshipApplication(
        id=902,
        student_id=101,
        company_id=501,
        internship_id=702,
        source="internal",
        source_id="702",
        title_snapshot="Frontend Developer Intern",
        company_snapshot="Catalyst Coders Technologies",
        status="APPLIED"
    )
    db.add_all([app_backend, app_frontend])
    db.commit()

    yield db
    db.close()
    if os.path.exists("./test_ai_context_flow.db"):
        os.remove("./test_ai_context_flow.db")


def test_student_context_builder_sanitization_and_whitelisting(setup_db):
    """
    Test 1: Verify StudentContextBuilder builds accurate, sanitized context
    without exposing passwords, hashes, tokens, or raw secrets.
    """
    db = setup_db
    context = StudentContextBuilder.build_assessment_agent_context(
        db=db,
        student_identifier=101,
        application_id=901,
        internship_id=701,
        target_round_key="technical",
        mode="REAL"
    )

    assert context["mode"] == "REAL"
    assert context["student"]["profile"]["name"] == "Aryan Bhoge"
    assert context["student"]["profile"]["email"] == "aryan.context.test@skillsetu.com"
    assert "password_hash" not in context["student"]["profile"]
    assert "password" not in context["student"]["profile"]

    # Verify Projects
    projects = context["student"]["projects"]
    assert len(projects) >= 1
    proj_titles = [p.get("title") for p in projects]
    assert "SkillSetu Core Platform" in proj_titles or "skillsetu-core" in proj_titles

    # Verify Internship
    assert context["internship"]["title"] == "Backend Developer Intern"
    assert context["internship"]["company"] == "Catalyst Coders Technologies"
    assert "Python" in context["internship"]["requiredSkills"]
    assert "FastAPI" in context["internship"]["requiredSkills"]

    # Verify Round Context
    assert context["round"]["id"] == "technical"
    assert context["round"]["type"] == "TECHNICAL"
    assert context["round"]["sequence"] == 2

    # Verify Prompt Text Contains Key Facts
    prompt_text = context["agent_prompt_context_text"]
    assert "Aryan Bhoge" in prompt_text
    assert "Backend Developer Intern" in prompt_text
    assert "REQUIRED SKILLS" in prompt_text
    assert "STORED STUDENT PROJECTS" in prompt_text


def test_missing_optional_data_graceful_handling(setup_db):
    """
    Test 2: Student with minimal profile (no GitHub, no stored projects)
    receives valid empty structures without crashing or mock fabrication.
    """
    db = setup_db
    context = StudentContextBuilder.build_assessment_agent_context(
        db=db,
        student_identifier=102,
        internship_id=702,
        target_round_key="interview",
        mode="PRACTICE"
    )

    assert context["mode"] == "PRACTICE"
    assert context["student"]["profile"]["name"] == "Neha Sharma"
    assert context["student"]["githubEvidence"] == []
    assert context["internship"]["title"] == "Frontend Developer Intern"
    assert "React" in context["internship"]["requiredSkills"]


def test_practice_assessment_start_endpoint_does_not_mutate_application(setup_db):
    """
    Test 3: POST /api/v1/student/assessment/practice/start
    starts practice session with full backend context and does NOT alter official application status.
    """
    db = setup_db

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    # Initial application status
    app_record = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == 901).first()
    assert app_record.status == "SHORTLISTED"

    resp = client.post(
        "/api/v1/student/assessment/practice/start",
        json={
            "application_id": 901,
            "internship_id": 701,
            "target_round": "interview",
            "email": "aryan.context.test@skillsetu.com"
        }
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["mode"] == "PRACTICE"
    assert data["session_id"].startswith("practice_")
    assert "/interview.html?id=practice_" in data["assessment_url"]
    assert "candidate_context" in data
    assert data["candidate_context"]["student"]["profile"]["name"] == "Aryan Bhoge"

    # Verify official application status remained UNTOUCHED
    db.refresh(app_record)
    assert app_record.status == "SHORTLISTED"

    app.dependency_overrides.clear()
