import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal
from app.services import course_service, course_skill_extraction_service
from app.schemas.course import NormalizedCourse
from app.services.course_skill_extraction_service import (
    build_course_skill_input,
    validate_and_clean_candidate_skills,
    match_skill_to_esco,
    extract_and_store_course_skills,
    heuristic_skill_extractor,
)
from app.workers.extract_course_skills import run_course_skill_extraction


@pytest.fixture(scope="function")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===========================================================================
# 1. Content Builder Tests
# ===========================================================================
def test_build_course_skill_input():
    course = models.Course(
        id=99,
        title="Introduction to Machine Learning",
        instructor="Prof. Sudeshna Sarkar",
        institution="IIT Kharagpur",
        level="Undergraduate",
        duration=8.0,
        duration_unit="weeks",
        description="Core machine learning concepts and algorithms.\nWeek 1: Regression\nWeek 2: Classification",
    )

    text_input = build_course_skill_input(course)
    assert "TITLE: Introduction to Machine Learning" in text_input
    assert "INSTRUCTOR: Prof. Sudeshna Sarkar" in text_input
    assert "INSTITUTION: IIT Kharagpur" in text_input
    assert "LEVEL: Undergraduate" in text_input
    assert "DURATION: 8.0 weeks" in text_input
    assert "Week 1: Regression" in text_input


# ===========================================================================
# 2. Validation & Normalization Tests
# ===========================================================================
def test_validate_and_clean_candidate_skills():
    raw_input = [
        {"name": "Python", "confidence": 0.95},
        {"name": "python", "confidence": 0.90},  # duplicate
        {"name": "Machine Learning", "confidence": 1.5},  # confidence > 1.0 clamped
        {"name": "Deep Learning", "confidence": -0.2},  # confidence < 0.0 clamped
        {"name": "course", "confidence": 0.99},  # generic stopword rejected
        {"name": "learning", "confidence": 0.88},  # generic stopword rejected
        {"name": "", "confidence": 0.5},  # empty rejected
        {"name": "A", "confidence": 0.5},  # too short rejected
        "invalid_entry_not_dict",
    ]

    cleaned = validate_and_clean_candidate_skills(raw_input)
    names = [c["name"] for c in cleaned]

    assert "Python" in names
    assert len([n for n in names if n.lower() == "python"]) == 1
    assert "Machine Learning" in names
    assert "Deep Learning" in names
    assert "course" not in names
    assert "learning" not in names

    # Check clamped confidences
    ml_entry = next(c for c in cleaned if c["name"] == "Machine Learning")
    assert ml_entry["confidence"] == 1.0

    dl_entry = next(c for c in cleaned if c["name"] == "Deep Learning")
    assert dl_entry["confidence"] == 0.0


def test_heuristic_skill_extractor():
    text = "Introduction to Computational Fluid Dynamics (CFD), Aerodynamics, and Machine Learning using Python."
    skills = heuristic_skill_extractor(text)
    names = [s["name"].lower() for s in skills]

    assert any("computational fluid dynamics" in n or "cfd" in n for n in names)
    assert any("aerodynamics" in n for n in names)
    assert any("machine learning" in n for n in names)
    assert any("python" in n for n in names)


# ===========================================================================
# 3. ESCO Multi-Tier Matching Tests
# ===========================================================================
def test_esco_exact_match(db_session: Session):
    # 'aerodynamics' or 'computational fluid dynamics'
    match = match_skill_to_esco("Aerodynamics", db_session)
    assert match is not None
    assert match["mapping_method"] == "esco_exact"
    assert match["esco_id"] is not None
    assert match["mapping_confidence"] >= 0.95


def test_esco_alias_match(db_session: Session):
    # 'Python' maps via taxonomy alias
    match = match_skill_to_esco("Python", db_session)
    assert match is not None
    assert match["esco_id"] is not None
    assert match["mapping_confidence"] >= 0.90


def test_esco_low_confidence_rejection(db_session: Session):
    # Highly random string should not match or should return None
    match = match_skill_to_esco("UnrealRandomStringXyz9999", db_session, min_confidence=0.85)
    assert match is None


# ===========================================================================
# 4. Storage & Idempotency Tests
# ===========================================================================
def test_extract_and_store_course_skills_mocked(db_session: Session):
    course_service.seed_default_providers(db_session)

    course = course_service.upsert_course(
        db_session,
        NormalizedCourse(
            provider_slug="nptel",
            external_id="skill-test-101",
            title="Introduction to Aerodynamics and Machine Learning",
            description="Aerodynamics and Machine Learning course",
            url="https://nptel.ac.in/courses/skill-test-101",
        )
    )

    mock_llm_skills = [
        {"name": "Aerodynamics", "confidence": 0.95},
        {"name": "Machine Learning", "confidence": 0.92},
        {"name": "HypotheticalCustomTool", "confidence": 0.70},
    ]

    with patch.object(
        course_skill_extraction_service,
        "extract_candidate_skills_with_llm",
        return_value=mock_llm_skills
    ):
        # 1. First extraction
        result1 = extract_and_store_course_skills(
            course=course,
            db=db_session,
            force_refresh=True,
            dry_run=False,
        )

        assert result1["status"] == "extracted"
        assert result1["candidate_skills_count"] == 3
        assert result1["accepted_mappings_count"] >= 2

        # Verify DB records
        skills_in_db = db_session.query(models.CourseSkill).filter(
            models.CourseSkill.course_id == course.id
        ).all()
        assert len(skills_in_db) == 3

        # 2. Second extraction without force_refresh (should skip)
        result2 = extract_and_store_course_skills(
            course=course,
            db=db_session,
            force_refresh=False,
            dry_run=False,
        )
        assert result2["status"] == "skipped"

        # Count records in DB -> still 3 (no duplicate rows)
        count_after = db_session.query(models.CourseSkill).filter(
            models.CourseSkill.course_id == course.id
        ).count()
        assert count_after == 3


def test_dry_run_mode(db_session: Session):
    course_service.seed_default_providers(db_session)

    course = course_service.upsert_course(
        db_session,
        NormalizedCourse(
            provider_slug="nptel",
            external_id="dry-run-skill-test",
            title="Dry Run Test Course",
            description="Aerodynamics fundamentals",
            url="https://nptel.ac.in/courses/dry-run-skill-test",
        )
    )

    mock_llm_skills = [
        {"name": "Aerodynamics", "confidence": 0.95},
    ]

    with patch.object(
        course_skill_extraction_service,
        "extract_candidate_skills_with_llm",
        return_value=mock_llm_skills
    ):
        result = extract_and_store_course_skills(
            course=course,
            db=db_session,
            force_refresh=True,
            dry_run=True,
        )
        assert result["status"] == "extracted"

        # Verify ZERO course_skills rows written for this course
        skills_count = db_session.query(models.CourseSkill).filter(
            models.CourseSkill.course_id == course.id
        ).count()
        assert skills_count == 0


def test_worker_failure_isolation(db_session: Session):
    course_service.seed_default_providers(db_session)

    course1 = course_service.upsert_course(
        db_session,
        NormalizedCourse(
            provider_slug="nptel",
            external_id="iso-test-01",
            title="Isolation Course 1",
            url="https://nptel.ac.in/iso1",
        )
    )

    # Call worker on specific course ID
    with patch.object(
        course_skill_extraction_service,
        "extract_candidate_skills_with_llm",
        return_value=[{"name": "Aerodynamics", "confidence": 0.95}]
    ):
        stats = run_course_skill_extraction(course_id=course1.id, force_refresh=True)
        assert stats["courses_processed"] == 1
        assert stats["courses_success"] == 1
        assert stats["courses_failed"] == 0
