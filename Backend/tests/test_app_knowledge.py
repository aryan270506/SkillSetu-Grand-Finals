"""
Unit and Integration Tests for SkillSetu Application Knowledge Registry and Personal AI Mentor.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app import models
from app.services.app_knowledge_service import AppKnowledgeService
from app.services.mentor_tools import MentorToolRegistry
from app.services.groq_mentor_service import GroqMentorService
from app.services.student_context_service import StudentContextService


@pytest.fixture(scope="module")
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    student = models.StudentUser(
        id=1,
        name="Alex Chen",
        email="alex.chen@gmail.com",
        password_hash="dummy_hash",
        phone="+1 (555) 019-2834",
        headline="Aspiring Backend Engineer",
        target_careers='["Backend Developer"]',
        skill_ids='["Python", "SQL", "Git"]',
        years_of_experience="2",
        cgpa_or_percentage="8.8"
    )
    session.add(student)
    session.commit()

    yield session

    session.close()


def test_app_overview():
    overview = AppKnowledgeService.get_app_overview()
    assert overview["totalTabs"] == 9
    tab_ids = [t["tabId"] for t in overview["tabs"]]
    expected_tabs = ["Dashboard", "Profile", "Resume", "Skills", "Learning", "Opportunities", "Applications", "Scholarships", "InterviewPrep"]
    for expected in expected_tabs:
        assert expected in tab_ids


def test_screen_info():
    # Test Skills screen info
    skills_screen = AppKnowledgeService.get_screen_info("Skills")
    assert skills_screen is not None
    assert skills_screen["tabId"] == "Skills"
    assert "Career Readiness & Target Fit Score" in [f["name"] for f in skills_screen["keyFeatures"]]

    # Test Resume screen info
    resume_screen = AppKnowledgeService.get_screen_info("Resume")
    assert resume_screen is not None
    assert resume_screen["tabId"] == "Resume"

    # Test Opportunities screen info
    intern_screen = AppKnowledgeService.get_screen_info("Opportunities")
    assert intern_screen is not None
    assert intern_screen["tabId"] == "Opportunities"

    # Test Interview prep info
    interview_screen = AppKnowledgeService.get_screen_info("Interview")
    assert interview_screen is not None
    assert interview_screen["tabId"] == "InterviewPrep"


def test_metric_explanations():
    # Career Readiness Score
    cr = AppKnowledgeService.get_metric_explanation("Career Readiness Score")
    assert cr is not None
    assert "verified_skills_count" in cr["formula"]

    # Skill Index
    si = AppKnowledgeService.get_metric_explanation("Skill Index")
    assert si is not None
    assert "60%" in si["formula"] or "0.60" in si["formula"]
    assert "Core Skill Strength" in si["formula"]

    # Resume ATS Score
    ats = AppKnowledgeService.get_metric_explanation("ATS")
    assert ats is not None
    assert "Resume ATS Compatibility Score" in ats["name"]

    # Internship Match Score
    match_m = AppKnowledgeService.get_metric_explanation("Internship Match Score")
    assert match_m is not None
    assert "40% * Skill Match" in match_m["formula"] or "0.40 * Skill Match" in match_m["formula"]


def test_workflow_instructions():
    # Connect GitHub
    gh_wf = AppKnowledgeService.get_workflow_instructions("connect_github")
    assert gh_wf is not None
    assert gh_wf["actionTab"] == "Profile"
    assert any("GitHub" in s for s in gh_wf["steps"])

    # Generate Tailored Resume
    res_wf = AppKnowledgeService.get_workflow_instructions("generate_tailored_resume")
    assert res_wf is not None
    assert res_wf["actionTab"] == "Resume"

    # Apply for Internship
    app_wf = AppKnowledgeService.get_workflow_instructions("apply_for_internship")
    assert app_wf is not None
    assert app_wf["actionTab"] == "Opportunities"


def test_safe_tab_resolution():
    assert AppKnowledgeService.resolve_safe_tab("where are my skill gaps") == "Skills"
    assert AppKnowledgeService.resolve_safe_tab("find internships in pune") == "Opportunities"
    assert AppKnowledgeService.resolve_safe_tab("generate resume for backend role") == "Resume"
    assert AppKnowledgeService.resolve_safe_tab("nptel courses for docker") == "Learning"
    assert AppKnowledgeService.resolve_safe_tab("start mock interview") == "InterviewPrep"
    assert AppKnowledgeService.resolve_safe_tab("upload marksheet sarvam ocr") == "Profile"
    assert AppKnowledgeService.resolve_safe_tab("check applied applications tracker") == "Applications"
    assert AppKnowledgeService.resolve_safe_tab("tata scholarships") == "Scholarships"


def test_mentor_tool_get_app_feature_info(test_db):
    context = StudentContextService.get_student_context(test_db, 1)
    res = MentorToolRegistry.execute_tool(
        tool_name="get_app_feature_info",
        arguments={"query": "Career Readiness"},
        student_id=1,
        student_context=context,
        db=test_db
    )
    assert "query" in res
    assert res["resolvedTab"] == "Skills"
    assert len(res["matchedMetrics"]) > 0
    assert "Career Readiness Score" in res["matchedMetrics"][0]["name"]


def test_mentor_answers_how_score_is_calculated(test_db):
    context = StudentContextService.get_student_context(test_db, 1)
    ans = GroqMentorService._generate_deterministic_fallback(
        "How is Career Readiness calculated?",
        context,
        test_db
    )
    assert "Formula" in ans["text"]
    assert "verified_skills" in ans["text"]
    assert ans["richContent"]["actionTab"] == "Skills"


def test_mentor_answers_navigation_question(test_db):
    context = StudentContextService.get_student_context(test_db, 1)
    ans = GroqMentorService._generate_deterministic_fallback(
        "Where can I find my recommended internships?",
        context,
        test_db
    )
    assert ans["richContent"] is not None
    assert ans["richContent"]["actionTab"] == "Opportunities"


def test_mentor_answers_workflow_question(test_db):
    context = StudentContextService.get_student_context(test_db, 1)
    ans = GroqMentorService._generate_deterministic_fallback(
        "How do I connect GitHub?",
        context,
        test_db
    )
    assert "GitHub" in ans["text"]
    assert "Step 5" in ans["text"] or "Profile" in ans["text"]
    assert ans["richContent"]["actionTab"] == "Profile"


def test_mentor_combined_query(test_db):
    context = StudentContextService.get_student_context(test_db, 1)
    ans = GroqMentorService._generate_deterministic_fallback(
        "What is Career Readiness and why is mine at this level?",
        context,
        test_db
    )
    assert "How SkillSetu Calculates Career Readiness Score" in ans["text"]
    assert "Your Specific Status:" in ans["text"]
    assert ans["richContent"]["actionTab"] == "Skills"
