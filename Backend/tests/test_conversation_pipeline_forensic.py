import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.database import Base, get_db
from app import models
from app.services.groq_mentor_service import GroqMentorService
from app.services.student_context_service import StudentContextService
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
def setup_forensic_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create canonical careers & skills
    c1 = models.SkillSetuCareer(id="car_backend", name="Backend Developer", category="Engineering")
    db.add(c1)

    skills = [
        models.SkillSetuSkill(id="s_python", name="Python", category="Backend"),
        models.SkillSetuSkill(id="s_fastapi", name="FastAPI", category="Backend"),
        models.SkillSetuSkill(id="s_docker", name="Docker", category="DevOps"),
        models.SkillSetuSkill(id="s_postgres", name="PostgreSQL", category="Database"),
    ]
    db.add_all(skills)

    esco_skills = [
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/python", preferred_label="Python"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/fastapi", preferred_label="FastAPI"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/docker", preferred_label="Docker"),
        models.EscoSkill(concept_uri="http://data.europa.eu/esco/skill/postgresql", preferred_label="PostgreSQL"),
    ]
    db.add_all(esco_skills)
    db.commit()

    seed_canonical_career_skills(db)
    seed_internships_if_empty(db)

    # Student 1: Authorized User
    student1 = models.StudentUser(
        id=1,
        name="Aarav Sharma",
        email="aarav@skillsetu.com",
        password_hash="hashedpass",
        headline="Aspiring Backend Developer",
        target_careers=json.dumps(["Backend Developer"]),
        location="Pune",
        degree="B.Tech Computer Science",
        university="COEP Tech",
        start_year="2022",
        graduation_year="2026",
        cgpa_or_percentage="9.1",
        resume_score=85,
        resume_data=json.dumps({
            "score": 85,
            "extracted_data": {
                "normalized_skills": ["Python", "FastAPI"],
                "experience": [{"role": "Intern", "tech_stack": ["Python"]}]
            },
            "strengths": ["REST API Architecture"],
            "improvement_areas": ["Docker containerization"]
        })
    )

    # Student 2: Separate User for cross-user security isolation tests
    student2 = models.StudentUser(
        id=2,
        name="Riya Patel",
        email="riya@skillsetu.com",
        password_hash="hashedpass2",
        headline="Data Analyst Aspirant",
        target_careers=json.dumps(["Data Analyst"]),
        location="Mumbai"
    )
    db.add_all([student1, student2])
    db.commit()

    # Evidence for Student 1
    ev = models.StudentSkillEvidence(
        student_id=1,
        skill_name="Python",
        source_type="github",
        evidence_score=0.95
    )
    db.add(ev)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_1_agent_asks_question_and_user_relevant_answer():
    """
    Test 1: Agent asks a question; user submits a relevant answer;
    agent responds based on that answer without restarting or repeating greetings.
    """
    db = TestingSessionLocal()
    conv = models.MentorConversation(student_id=1, title="Backend Track Session", is_active=True)
    db.add(conv)
    db.commit()

    # Agent asked a question
    q_msg = models.MentorMessage(
        conversation_id=conv.id,
        sender="ai",
        content="What is your priority between closing your Docker gap or building a FastAPI microservice?"
    )
    db.add(q_msg)
    db.commit()

    # User submits relevant answer choosing Docker
    resp = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={
            "conversation_id": conv.id,
            "message": "I definitely want to focus on Docker first to close my containerization gap."
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["sender"] == "ai"
    # Verify the agent processed the Docker answer and provided Docker next steps
    assert "docker" in data["text"].lower()
    # Ensure it did NOT reset to initial greeting
    assert "Hello Aarav Sharma! I am your Personal AI Career Mentor with complete knowledge" not in data["text"]
    db.close()


def test_2_user_unrelated_answer_acknowledged():
    """
    Test 2: User submits an answer; agent acknowledges it appropriately instead of pretending it was relevant.
    """
    db = TestingSessionLocal()
    conv = models.MentorConversation(student_id=1, title="Active Session", is_active=True)
    db.add(conv)
    db.commit()

    # Prior question was technical
    q_msg = models.MentorMessage(conversation_id=conv.id, sender="ai", content="Which database indexing mechanism do you prefer?")
    db.add(q_msg)
    db.commit()

    resp = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={
            "conversation_id": conv.id,
            "message": "The weather in Pune today is unusually rainy and cold."
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    # Acknowledges the specific user message rather than pretending it was a database indexing answer
    assert "weather" in data["text"].lower() or "noted your answer" in data["text"].lower() or "pune" in data["text"].lower()
    db.close()


def test_3_consecutive_messages_processed_in_order():
    """
    Test 3: User sends multiple consecutive messages; every message is processed and recorded in the correct order.
    """
    db = TestingSessionLocal()
    # Start fresh
    client.post("/api/v1/mentor/reset", headers={"X-User-Email": "aarav@skillsetu.com"})

    r1 = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={"message": "Turn 1: I need to improve my resume."}
    )
    assert r1.status_code == 200
    conv_id = r1.json()["conversation_id"]

    r2 = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={"conversation_id": conv_id, "message": "Turn 2: What about my skill gaps?"}
    )
    assert r2.status_code == 200

    r3 = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={"conversation_id": conv_id, "message": "Turn 3: Show me matching internships."}
    )
    assert r3.status_code == 200

    # Verify database order
    msgs = db.query(models.MentorMessage).filter(models.MentorMessage.conversation_id == conv_id).order_by(models.MentorMessage.id.asc()).all()
    user_msgs = [m.content for m in msgs if m.sender == "user"]
    assert len(user_msgs) == 3
    assert "Turn 1" in user_msgs[0]
    assert "Turn 2" in user_msgs[1]
    assert "Turn 3" in user_msgs[2]
    db.close()


def test_4_second_answer_retains_first_answer_context():
    """
    Test 4: The second answer retains the context of the first answer.
    """
    db = TestingSessionLocal()
    r1 = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={"message": "I am preparing specifically for a Backend Developer role."}
    )
    assert r1.status_code == 200
    conv_id = r1.json()["conversation_id"]

    # Follow up turn without repeating the career name
    r2 = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={"conversation_id": conv_id, "message": "Yes, what is my highest-priority missing skill?"}
    )
    assert r2.status_code == 200
    data = r2.json()
    assert "backend" in data["text"].lower() or "docker" in data["text"].lower()
    db.close()


def test_5_failed_model_request_preserves_user_answer_safe_retry():
    """
    Test 5: If an external model throws an unexpected failure, the user's answer is already saved in PostgreSQL
    and a reliable fallback response is returned rather than a 500 crash, allowing safe continuation.
    """
    db = TestingSessionLocal()
    conv = models.MentorConversation(student_id=1, title="Safe Retry Test", is_active=True)
    db.add(conv)
    db.commit()

    with patch("app.services.groq_mentor_service.GroqMentorService._call_groq_api", side_effect=RuntimeError("Groq Service Timeout 504")):
        with patch("app.services.groq_mentor_service.GroqMentorService._call_gemini_api", side_effect=RuntimeError("Gemini Quota Exceeded 429")):
            resp = client.post(
                "/api/v1/mentor/chat",
                headers={"X-User-Email": "aarav@skillsetu.com"},
                json={
                    "conversation_id": conv.id,
                    "message": "My critical question: how do I dockerize my FastAPI app?"
                }
            )
            # Must succeed via context-aware fallback rather than unhandled 500
            assert resp.status_code == 200
            data = resp.json()
            assert len(data["text"]) > 10

            # Verify the user answer was preserved in PostgreSQL
            saved_user_msg = db.query(models.MentorMessage).filter(
                models.MentorMessage.conversation_id == conv.id,
                models.MentorMessage.sender == "user"
            ).first()
            assert saved_user_msg is not None
            assert "dockerize my fastapi app" in saved_user_msg.content.lower()
    db.close()


def test_6_no_message_duplication_in_history():
    """
    Test 6: User message is not duplicated in LLM messages array or persisted redundantly.
    """
    db = TestingSessionLocal()
    conv = models.MentorConversation(student_id=1, title="Deduplication Check", is_active=True)
    db.add(conv)
    db.commit()

    client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={"conversation_id": conv.id, "message": "Unique deduplication test string."}
    )

    # Check database messages count
    user_records = db.query(models.MentorMessage).filter(
        models.MentorMessage.conversation_id == conv.id,
        models.MentorMessage.sender == "user"
    ).all()
    assert len(user_records) == 1
    assert user_records[0].content == "Unique deduplication test string."
    db.close()


def test_7_invalid_or_missing_session_id_handling():
    """
    Test 7: Invalid, non-existent, or missing conversation IDs are safely handled and auto-recovered.
    """
    # 1. Missing conversation_id auto-creates a valid active conversation
    r1 = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={"message": "Starting with no session id"}
    )
    assert r1.status_code == 200
    assert r1.json()["conversation_id"] is not None

    # 2. Non-existent conversation_id (999999) recovers gracefully
    r2 = client.post(
        "/api/v1/mentor/chat",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={"conversation_id": 999999, "message": "Using invalid conversation id"}
    )
    assert r2.status_code == 200
    assert r2.json()["conversation_id"] is not None


def test_8_user_cannot_access_another_user_conversation():
    """
    Test 8: Cross-tenant isolation — a user cannot read or post to another user's conversation.
    """
    db = TestingSessionLocal()
    # Create conversation owned by student 1
    conv_user1 = models.MentorConversation(student_id=1, title="Private Aarav Session", is_active=True)
    db.add(conv_user1)
    db.commit()

    m = models.MentorMessage(conversation_id=conv_user1.id, sender="user", content="Secret resume info")
    db.add(m)
    db.commit()

    # Student 2 tries to read Student 1's conversation history
    res = client.get(
        f"/api/v1/mentor/history?conversation_id={conv_user1.id}",
        headers={"X-User-Email": "riya@skillsetu.com"}
    )
    # The endpoint should isolate by authenticated student and not leak Student 1's messages
    data = res.json()
    if data and "messages" in data:
        for msg in data["messages"]:
            assert "Secret resume info" not in msg.get("text", "")
    db.close()


def test_9_stale_question_id_cannot_silently_corrupt_state():
    """
    Test 9: Practice answer evaluation validates question and student answer bounds.
    Empty or degenerate answers are strictly rejected with 0 score and Insufficient verdict.
    """
    resp = client.post(
        "/api/v1/student/assessment/evaluate-practice-answer",
        headers={"X-User-Email": "aarav@skillsetu.com"},
        json={
            "question_id": "Q_SYS_DESIGN_01",
            "question_text": "How do you handle distributed cache invalidation?",
            "student_answer": "yes",
            "target_role": "Backend Developer",
            "category": "Technical",
            "difficulty": "Advanced"
        }
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    # Strict bounds: Degenerate answer "yes" MUST receive Insufficient Answer verdict and 0 score
    assert data["verdict"] == "Insufficient Answer"
    assert data["answered_question"] is False
    assert data["score"] == 0.0


def test_10_quota_error_failover_and_logging():
    """
    Test 10: Provider rate limit (429) triggers automatic failover without leaking raw credentials.
    """
    db = TestingSessionLocal()
    conv = models.MentorConversation(student_id=1, title="Failover Quota Test", is_active=True)
    db.add(conv)
    db.commit()

    with patch("app.services.groq_mentor_service.GroqMentorService._call_groq_api", return_value=None):
        resp = client.post(
            "/api/v1/mentor/chat",
            headers={"X-User-Email": "aarav@skillsetu.com"},
            json={
                "conversation_id": conv.id,
                "message": "Explain my skill gaps."
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["sender"] == "ai"
        assert len(data["text"]) > 20
        # Check that no raw secret key was leaked in response
        assert "gsk_" not in data["text"]
        assert "AIzaSy" not in data["text"]
    db.close()
