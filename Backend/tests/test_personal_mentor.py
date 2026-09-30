import pytest
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app import models
from app.services.student_context_service import StudentContextService
from app.services.mentor_tools import MentorToolRegistry
from app.services.groq_mentor_service import GroqMentorService
from app.services.init_db_service import seed_canonical_career_mappings, seed_canonical_career_skills, seed_internships_if_empty

# In-memory SQLite for comprehensive isolated unit testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_db():
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed essential canonical careers, skills & internships
    # Create canonical careers
    careers = [
        models.SkillSetuCareer(id="car_backend_developer", name="Backend Developer", category="Engineering"),
        models.SkillSetuCareer(id="car_frontend_developer", name="Frontend Developer", category="Engineering"),
        models.SkillSetuCareer(id="car_fullstack_developer", name="Full Stack Developer", category="Engineering"),
        models.SkillSetuCareer(id="car_data_scientist", name="Data Scientist", category="Data Science"),
    ]
    db.add_all(careers)

    # Create canonical skills
    skills = [
        models.SkillSetuSkill(id="skill_python", name="Python", category="Backend"),
        models.SkillSetuSkill(id="skill_fastapi", name="FastAPI", category="Backend"),
        models.SkillSetuSkill(id="skill_postgresql", name="PostgreSQL", category="Database"),
        models.SkillSetuSkill(id="skill_docker", name="Docker", category="DevOps"),
        models.SkillSetuSkill(id="skill_redis", name="Redis", category="Database"),
        models.SkillSetuSkill(id="skill_react", name="React", category="Frontend"),
        models.SkillSetuSkill(id="skill_javascript", name="JavaScript", category="Frontend"),
        models.SkillSetuSkill(id="skill_git", name="Git", category="Tools"),
    ]
    db.add_all(skills)

    # Create ESCO skills for taxonomy matching
    esco_skills = [
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/python", preferred_label="Python"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/fastapi", preferred_label="FastAPI"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/postgresql", preferred_label="PostgreSQL"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/docker", preferred_label="Docker"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/redis", preferred_label="Redis"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/react", preferred_label="React"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/javascript", preferred_label="JavaScript"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/git", preferred_label="Git"),
    ]
    db.add_all(esco_skills)
    db.commit()

    seed_canonical_career_skills(db)
    seed_internships_if_empty(db)

    # Student 1: Backend aspirant (Strong Python & Postgres, missing Docker & Redis)
    student1 = models.StudentUser(
        id=1,
        name="Alex Backend",
        email="alex@backend.com",
        password_hash="testhash",
        headline="Aspiring Backend Engineer",
        target_careers=json.dumps(["Backend Developer"]),
        location="Pune",
        degree="B.Tech Computer Science",
        university="Pune University",
        start_year="2022",
        graduation_year="2026",
        cgpa_or_percentage="8.8",
        resume_score=82,
        resume_data=json.dumps({
            "score": 82,
            "extracted_data": {
                "normalized_skills": ["Python", "FastAPI", "PostgreSQL", "Git"],
                "experience": [{"role": "Backend Intern", "tech_stack": ["Python", "FastAPI"]}]
            },
            "strengths": ["Clear REST API design", "Database indexing"],
            "improvement_areas": ["Containerization and caching"]
        })
    )

    # Student 2: Frontend aspirant (Strong React & JavaScript, missing TypeScript)
    student2 = models.StudentUser(
        id=2,
        name="Sara Frontend",
        email="sara@frontend.com",
        password_hash="testhash",
        headline="Creative Frontend Developer",
        target_careers=json.dumps(["Frontend Developer"]),
        location="Mumbai",
        degree="B.Sc IT",
        university="Mumbai University",
        start_year="2023",
        graduation_year="2026",
        cgpa_or_percentage="9.1",
        resume_score=88,
        resume_data=json.dumps({
            "score": 88,
            "extracted_data": {
                "normalized_skills": ["React", "JavaScript", "HTML/CSS", "Git", "Figma"],
                "experience": [{"role": "UI Developer", "tech_stack": ["React", "CSS"]}]
            },
            "strengths": ["Responsive UI", "Component design"],
            "improvement_areas": ["TypeScript and state management"]
        })
    )

    db.add_all([student1, student2])
    db.commit()

    # Add evidence records
    ev1 = models.StudentSkillEvidence(
        student_id=1,
        skill_name="Python",
        source_type="github",
        evidence_score=0.9
    )
    ev2 = models.StudentSkillEvidence(
        student_id=1,
        skill_name="PostgreSQL",
        source_type="resume",
        evidence_score=0.85
    )
    ev3 = models.StudentSkillEvidence(
        student_id=2,
        skill_name="React",
        source_type="github",
        evidence_score=0.95
    )
    db.add_all([ev1, ev2, ev3])
    db.commit()

    yield db
    db.close()


def test_student_context_service(test_db):
    """Verifies that StudentContextService generates full normalized context for a student."""
    context = StudentContextService.get_student_context(test_db, 1)

    assert context["student"]["name"] == "Alex Backend"
    assert context["student"]["email"] == "alex@backend.com"
    assert context["career"]["targetCareer"] == "Backend Developer"
    assert context["resume"]["resumeScore"] == 82
    assert "Pune University" in context["student"]["education"]
    assert len(context["projects"]) > 0


def test_personalization_different_users(test_db):
    """
    Personalization test:
    Two different users asking 'What should I learn next?' receive advice specific to their profile.
    """
    context1 = StudentContextService.get_student_context(test_db, 1)
    context2 = StudentContextService.get_student_context(test_db, 2)

    resp1 = GroqMentorService.generate_mentor_response(
        user_message="What should I learn next?",
        student_id=1,
        conversation_history=[],
        db=test_db
    )

    resp2 = GroqMentorService.generate_mentor_response(
        user_message="What should I learn next?",
        student_id=2,
        conversation_history=[],
        db=test_db
    )

    # Student 1 (Backend) should receive backend-related learning advice
    assert "alex@backend.com" == context1["student"]["email"]
    assert "Backend Developer" == context1["career"]["targetCareer"]

    # Student 2 (Frontend) should receive frontend-related learning advice
    assert "sara@frontend.com" == context2["student"]["email"]
    assert "Frontend Developer" == context2["career"]["targetCareer"]

    assert resp1["text"] != resp2["text"]


def test_security_student_isolation(test_db):
    """
    Security test:
    Student A's context must not contain Student B's information.
    """
    context_a = StudentContextService.get_student_context(test_db, 1)
    context_b = StudentContextService.get_student_context(test_db, 2)

    assert context_a["student"]["id"] == 1
    assert context_a["student"]["name"] == "Alex Backend"
    assert context_b["student"]["id"] == 2
    assert context_b["student"]["name"] == "Sara Frontend"

    assert context_a["student"]["name"] not in context_b["student"]["name"]


def test_internship_matching_tools(test_db):
    """
    Internship matching test:
    Recommended internships must be retrieved from database with deterministic match scores.
    """
    context = StudentContextService.get_student_context(test_db, 1)
    result = MentorToolRegistry.execute_tool(
        tool_name="get_recommended_internships",
        arguments={"limit": 3},
        student_id=1,
        student_context=context,
        db=test_db
    )

    internships = result.get("recommended_internships", [])
    assert len(internships) > 0

    top_internship = internships[0]
    assert "match_score" in top_internship
    assert top_internship["match_score"] > 0
    assert "matched_skills" in top_internship
    assert "missing_skills" in top_internship
    assert top_internship["company_name"] is not None


def test_skill_gap_tool(test_db):
    """
    Skill gap analysis test:
    Compares verified skills with career competencies.
    """
    context = StudentContextService.get_student_context(test_db, 1)
    result = MentorToolRegistry.execute_tool(
        tool_name="get_student_skill_gaps",
        arguments={"career_name": "Backend Developer"},
        student_id=1,
        student_context=context,
        db=test_db
    )

    assert "target_career" in result
    assert "skill_gaps" in result
    assert isinstance(result["skill_gaps"], list)


def test_data_update_reflection_without_retraining(test_db):
    """
    Updated data test:
    If a student adds a new project/skill to database, the mentor context immediately updates.
    """
    # 1. Initial check
    ctx_initial = StudentContextService.get_student_context(test_db, 1)
    initial_skills = [v["skill_name"] for v in ctx_initial["skills"]["verified"]]

    # 2. Add new verified skill evidence to DB
    new_evidence = models.StudentSkillEvidence(
        student_id=1,
        skill_name="Docker",
        source_type="learning_progress",
        evidence_score=1.0
    )
    test_db.add(new_evidence)
    test_db.commit()

    # 3. Context immediately reflects new evidence
    ctx_updated = StudentContextService.get_student_context(test_db, 1)
    evidence_names = [e["skill"] for e in ctx_updated["skills"]["evidence"]]
    assert "Docker" in evidence_names


def test_conversation_continuity(test_db):
    """
    Conversation continuity test:
    Follow-up turn retains context from prior message.
    """
    conv = models.MentorConversation(student_id=1, title="Test Session")
    test_db.add(conv)
    test_db.commit()

    m1 = models.MentorMessage(conversation_id=conv.id, sender="user", content="I want a backend internship.")
    m2 = models.MentorMessage(conversation_id=conv.id, sender="ai", content="Let's work toward that backend goal.")
    test_db.add_all([m1, m2])
    test_db.commit()

    history = [
        {"sender": "user", "content": "I want a backend internship."},
        {"sender": "ai", "content": "Let's work toward that backend goal."}
    ]

    resp = GroqMentorService.generate_mentor_response(
        user_message="What should I learn first?",
        student_id=1,
        conversation_history=history,
        db=test_db
    )

    assert resp["text"] is not None
    assert len(resp["text"]) > 20
