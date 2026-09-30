import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.database import Base, get_db
from app import models
from app.services.init_db_service import seed_canonical_career_skills, seed_internships_if_empty

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed essential canonical careers, skills & internships
    careers = [
        models.SkillSetuCareer(id="car_backend_developer", name="Backend Developer", category="Engineering"),
        models.SkillSetuCareer(id="car_frontend_developer", name="Frontend Developer", category="Engineering"),
        models.SkillSetuCareer(id="car_fullstack_developer", name="Full Stack Developer", category="Engineering"),
    ]
    db.add_all(careers)

    skills = [
        models.SkillSetuSkill(id="skill_python", name="Python", category="Backend"),
        models.SkillSetuSkill(id="skill_fastapi", name="FastAPI", category="Backend"),
        models.SkillSetuSkill(id="skill_postgresql", name="PostgreSQL", category="Database"),
        models.SkillSetuSkill(id="skill_docker", name="Docker", category="DevOps"),
        models.SkillSetuSkill(id="skill_react", name="React", category="Frontend"),
        models.SkillSetuSkill(id="skill_javascript", name="JavaScript", category="Frontend"),
        models.SkillSetuSkill(id="skill_git", name="Git", category="Tools"),
    ]
    db.add_all(skills)

    esco_skills = [
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/python", preferred_label="Python"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/fastapi", preferred_label="FastAPI"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/postgresql", preferred_label="PostgreSQL"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/docker", preferred_label="Docker"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/react", preferred_label="React"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/javascript", preferred_label="JavaScript"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/git", preferred_label="Git"),
    ]
    db.add_all(esco_skills)
    db.commit()

    seed_canonical_career_skills(db)
    seed_internships_if_empty(db)

    # Create Student
    student = models.StudentUser(
        id=1,
        name="Alex Dev",
        email="alex@skillsetu.com",
        password_hash="testhash",
        headline="Aspiring Backend Engineer",
        target_careers=json.dumps(["Backend Developer"]),
        location="Pune",
        degree="B.Tech Computer Science",
        university="Pune University",
        start_year="2022",
        graduation_year="2026",
        cgpa_or_percentage="8.9",
        resume_score=84,
        resume_data=json.dumps({
            "score": 84,
            "extracted_data": {
                "normalized_skills": ["Python", "FastAPI", "PostgreSQL", "Git"],
                "experience": [{"role": "Backend Intern", "tech_stack": ["Python", "FastAPI"]}]
            },
            "strengths": ["Clear REST API design", "Database indexing"],
            "improvement_areas": ["Containerization and caching"]
        })
    )
    db.add(student)
    db.commit()

    # Evidence
    ev = models.StudentSkillEvidence(
        student_id=1,
        skill_name="Python",
        source_type="github",
        evidence_score=0.92
    )
    db.add(ev)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_mentor_chat_endpoint():
    """Test POST /api/v1/mentor/chat endpoint."""
    response = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "alex@skillsetu.com"},
        json={"message": "What internships fit my profile?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sender"] == "ai"
    assert "conversation_id" in data
    assert len(data["text"]) > 10
    assert data["richContent"] is not None


def test_mentor_suggested_prompts_endpoint():
    """Test GET /api/v1/mentor/suggested-prompts endpoint."""
    response = client.get(
        "/api/v1/mentor/suggested-prompts",
        headers={"X-User-Email": "alex@skillsetu.com"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["suggested_prompts"]) > 0


def test_mentor_student_context_endpoint():
    """Test GET /api/v1/mentor/student-context endpoint."""
    response = client.get(
        "/api/v1/mentor/student-context",
        headers={"X-User-Email": "alex@skillsetu.com"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    ctx = data["context"]
    assert ctx["student"]["name"] == "Alex Dev"
    assert ctx["student"]["email"] == "alex@skillsetu.com"
    assert ctx["career"]["targetCareer"] == "Backend Developer"


def test_mentor_history_and_reset_endpoints():
    """Test conversation history and session reset."""
    # 1. Send first message
    chat_resp = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "alex@skillsetu.com"},
        json={"message": "What is my biggest skill gap?"}
    )
    assert chat_resp.status_code == 200
    conv_id = chat_resp.json()["conversation_id"]

    # 2. Get history
    hist_resp = client.get(
        f"/api/v1/mentor/history?conversation_id={conv_id}",
        headers={"X-User-Email": "alex@skillsetu.com"}
    )
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert len(hist_data["messages"]) >= 2  # user message and ai response

    # 3. Reset conversation
    reset_resp = client.post(
        "/api/v1/mentor/reset",
        headers={"X-User-Email": "alex@skillsetu.com"}
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json()["status"] == "success"
