import pytest
from unittest.mock import patch, MagicMock
from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app import models
from app.database import SessionLocal
from main import app
from app.services import course_recommendation_service, course_service
from app.schemas.course import NormalizedCourse


@pytest.fixture(scope="function")
def db_session():
    """Provides a transactional database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client():
    """Test client for FastAPI app."""
    return TestClient(app)


# ===========================================================================
# 1. Skill Coverage & Priority Weighting Tests
# ===========================================================================
def test_skill_coverage_priority_weighting():
    """Test that high-priority missing skills contribute more to coverage than low-priority skills."""
    skill_gaps = [
        {"skill_name": "machine learning", "priority": "High Priority", "gap": 100, "required_by_careers": ["AI Engineer"]},
        {"skill_name": "python", "priority": "High Priority", "gap": 80, "required_by_careers": ["AI Engineer"]},
        {"skill_name": "communication", "priority": "Low Priority", "gap": 50, "required_by_careers": ["AI Engineer"]},
    ]

    # Course A covers high-priority "machine learning" + "python"
    course_skills_a = [
        models.CourseSkill(skill_name="machine learning", esco_skill_id=101),
        models.CourseSkill(skill_name="python", esco_skill_id=102),
    ]
    score_a, covered_a = course_recommendation_service.calculate_skill_coverage(course_skills_a, skill_gaps)

    # Course B covers only low-priority "communication"
    course_skills_b = [
        models.CourseSkill(skill_name="communication", esco_skill_id=103),
    ]
    score_b, covered_b = course_recommendation_service.calculate_skill_coverage(course_skills_b, skill_gaps)

    assert len(covered_a) == 2
    assert len(covered_b) == 1
    assert score_a > score_b
    assert score_a > 0.80  # (1.0 + 1.0) / (1.0 + 1.0 + 0.35) = 2.0 / 2.35 = 0.8511
    assert score_b < 0.20  # 0.35 / 2.35 = 0.1489


def test_skill_coverage_multi_career_leverage():
    """Test that skills required by multiple target careers receive a multi-career boost factor."""
    skill_gaps = [
        {"skill_name": "python", "priority": "High Priority", "gap": 100, "required_by_careers": ["AI Engineer", "Data Analyst"]},
        {"skill_name": "scikit-learn", "priority": "High Priority", "gap": 100, "required_by_careers": ["AI Engineer"]},
    ]

    # Course covering python (needed by 2 careers)
    course_skills_python = [models.CourseSkill(skill_name="python", esco_skill_id=102)]
    score_python, covered_python = course_recommendation_service.calculate_skill_coverage(course_skills_python, skill_gaps)

    # Course covering scikit-learn (needed by only 1 career)
    course_skills_sklearn = [models.CourseSkill(skill_name="scikit-learn", esco_skill_id=104)]
    score_sklearn, covered_sklearn = course_recommendation_service.calculate_skill_coverage(course_skills_sklearn, skill_gaps)

    # Python weight is 1.0 * 1.25 = 1.25; Sklearn weight is 1.0 * 1.0 = 1.0
    assert score_python > score_sklearn


def test_skill_coverage_empty_cases():
    """Verify empty skill gaps or course skills return 0.0 safely."""
    score, covered = course_recommendation_service.calculate_skill_coverage([], [])
    assert score == 0.0
    assert covered == []

    score, covered = course_recommendation_service.calculate_skill_coverage(
        [models.CourseSkill(skill_name="c++")], []
    )
    assert score == 0.0
    assert covered == []


# ===========================================================================
# 2. Career Relevance Tests
# ===========================================================================
def test_career_relevance_scoring():
    """Verify career relevance: matching=1.0, unmapped=0.5 (neutral), mismatched=0.4."""
    # Matched career
    cc_matched = [models.CourseCareer(career_id="car_fullstack_developer")]
    assert course_recommendation_service.calculate_career_relevance(cc_matched, ["car_fullstack_developer"]) == 1.0

    # Unmapped career (no course careers registered yet) -> neutral 0.5
    assert course_recommendation_service.calculate_career_relevance([], ["Full Stack Developer"]) == 0.5

    # Unrelated career -> 0.4
    cc_unrelated = [models.CourseCareer(career_id="car_mechanical_engineer")]
    assert course_recommendation_service.calculate_career_relevance(cc_unrelated, ["Full Stack Developer"]) == 0.4


# ===========================================================================
# 3. Deterministic Explanation & Categorization Tests
# ===========================================================================
def test_deterministic_explanation_and_categories():
    """Verify deterministic explanations and categories match scoring data."""
    # Case 1: Multiple covered gaps with high priority -> Strong Match
    covered_gaps_1 = [
        {"skill_name": "machine learning", "priority": "High Priority"},
        {"skill_name": "python", "priority": "High Priority"},
    ]
    reason_1, cat_1 = course_recommendation_service.generate_recommendation_reason(
        covered_gaps=covered_gaps_1,
        target_careers=["AI Engineer"],
        semantic_score=0.85,
        career_relevance=1.0
    )
    assert cat_1 == "Strong Match"
    assert "Directly closes 2 skill gaps (2 high-priority)" in reason_1

    # Case 2: 1 non-high-priority gap -> Skill Builder
    covered_gaps_2 = [
        {"skill_name": "git", "priority": "Medium Priority"}
    ]
    reason_2, cat_2 = course_recommendation_service.generate_recommendation_reason(
        covered_gaps=covered_gaps_2,
        target_careers=["Full Stack Developer"],
        semantic_score=0.60,
        career_relevance=0.5
    )
    assert cat_2 == "Skill Builder"
    assert "Closes 1 relevant skill gap" in reason_2

    # Case 3: 0 gaps covered, but high semantic score -> Semantic Match
    reason_3, cat_3 = course_recommendation_service.generate_recommendation_reason(
        covered_gaps=[],
        target_careers=["Data Analyst"],
        semantic_score=0.78,
        career_relevance=0.5
    )
    assert cat_3 == "Semantic Match"
    assert "High semantic syllabus alignment" in reason_3


# ===========================================================================
# 4. Candidate Retrieval, Deduplication & Scoring Pipeline Tests
# ===========================================================================
def test_get_personalized_course_recommendations_deduplication(db_session: Session):
    """Verify a course returned from both Signal A (ESCO skills) and Signal B (Qdrant) appears once."""
    # Create test provider & active course
    provider = course_service.get_provider_by_slug(db_session, "nptel")
    if not provider:
        provider = models.Provider(name="NPTEL", slug="nptel")
        db_session.add(provider)
        db_session.commit()

    norm_course = NormalizedCourse(
        provider_slug="nptel",
        title="Python for Data Science and Machine Learning",
        description="Learn Python, data analysis, and basic machine learning techniques.",
        url="https://onlinecourses.nptel.ac.in/noc26_cs99/preview",
        external_id="noc26_cs99_rec_test",
        instructor="Prof. Test",
        institution="IIT Madras",
        level="Undergraduate",
        language="English",
        duration=12.0,
        duration_unit="weeks",
        is_active=True,
    )
    course_obj = course_service.upsert_course(db_session, norm_course)
    
    # Add course skill
    cs = models.CourseSkill(course_id=course_obj.id, skill_name="python", confidence=Decimal("0.95"))
    db_session.add(cs)
    db_session.commit()

    # Mock Qdrant client returning the same course ID
    mock_qdrant = MagicMock()
    mock_point = MagicMock()
    mock_point.id = course_obj.id
    mock_point.score = 0.88
    mock_point.payload = {"course_id": course_obj.id}
    mock_qdrant.collection_exists.return_value = True
    mock_qdrant.query_points.return_value = MagicMock(points=[mock_point])
    mock_qdrant.search.return_value = [mock_point]

    with patch("app.services.embedding_service.embed_text", return_value=[0.1] * 384):
        with patch("app.services.esco_service.load_student_evidence_from_db", return_value=({}, {}, [])):
            with patch("app.services.esco_service.calculate_multi_career_skill_gaps", return_value={
                "target_careers": ["Data Analyst"],
                "skill_gaps": [{"skill_name": "python", "priority": "High Priority", "gap": 90, "required_by_careers": ["Data Analyst"]}]
            }):
                result = course_recommendation_service.get_personalized_course_recommendations(
                    db=db_session,
                    student_email="test_student@example.com",
                    limit=10,
                    qdrant_client=mock_qdrant
                )

    assert result["status"] == "success"
    # Verify course_obj.id appears at most once in results
    rec_ids = [r["course_id"] for r in result["data"]]
    assert rec_ids.count(course_obj.id) == 1

    # Cleanup test course
    db_session.query(models.CourseSkill).filter(models.CourseSkill.course_id == course_obj.id).delete()
    db_session.query(models.Course).filter(models.Course.id == course_obj.id).delete()
    db_session.commit()


def test_inactive_courses_filtered_by_default(db_session: Session):
    """Verify inactive courses are excluded by default and included when include_inactive=True."""
    provider = course_service.get_provider_by_slug(db_session, "nptel")
    
    inactive_norm = NormalizedCourse(
        provider_slug="nptel",
        title="Archived Obsolete Course",
        description="This course is no longer offered.",
        url="https://onlinecourses.nptel.ac.in/noc20_cs01/preview",
        external_id="noc20_cs01_archived",
        is_active=False
    )
    inactive_course = course_service.upsert_course(db_session, inactive_norm)
    cs = models.CourseSkill(course_id=inactive_course.id, skill_name="legacy_skill", confidence=Decimal("0.90"))
    db_session.add(cs)
    db_session.commit()

    with patch("app.services.esco_service.load_student_evidence_from_db", return_value=({}, {}, [])):
        with patch("app.services.esco_service.calculate_multi_career_skill_gaps", return_value={
            "target_careers": ["Legacy Engineer"],
            "skill_gaps": [{"skill_name": "legacy_skill", "priority": "High Priority", "gap": 100, "required_by_careers": ["Legacy Engineer"]}]
        }):
            # Test default: include_inactive=False
            res_default = course_recommendation_service.get_personalized_course_recommendations(
                db=db_session,
                include_inactive=False
            )
            rec_ids_default = [r["course_id"] for r in res_default["data"]]
            assert inactive_course.id not in rec_ids_default

            # Test include_inactive=True
            res_inactive = course_recommendation_service.get_personalized_course_recommendations(
                db=db_session,
                include_inactive=True
            )
            rec_ids_inactive = [r["course_id"] for r in res_inactive["data"]]
            assert inactive_course.id in rec_ids_inactive

    # Cleanup
    db_session.query(models.CourseSkill).filter(models.CourseSkill.course_id == inactive_course.id).delete()
    db_session.query(models.Course).filter(models.Course.id == inactive_course.id).delete()
    db_session.commit()


def test_missing_metadata_safety(db_session: Session):
    """Verify courses with None duration, dates, level, and price do not crash scoring."""
    provider = course_service.get_provider_by_slug(db_session, "nptel")

    sparse_norm = NormalizedCourse(
        provider_slug="nptel",
        title="Sparse Metadata Course",
        description="Valid description without optional dates or duration.",
        url="https://onlinecourses.nptel.ac.in/noc26_cs00_sparse/preview",
        external_id="noc26_cs00_sparse",
        duration=None,
        duration_unit=None,
        start_date=None,
        end_date=None,
        level=None,
        price=None,
        is_active=True
    )
    sparse_course = course_service.upsert_course(db_session, sparse_norm)

    with patch("app.services.esco_service.load_student_evidence_from_db", return_value=({}, {}, [])):
        with patch("app.services.esco_service.calculate_multi_career_skill_gaps", return_value={
            "target_careers": ["General Tech"],
            "skill_gaps": []
        }):
            result = course_recommendation_service.get_personalized_course_recommendations(
                db=db_session,
                limit=10
            )
            assert result["status"] == "success"

    # Cleanup
    db_session.query(models.Course).filter(models.Course.id == sparse_course.id).delete()
    db_session.commit()


# ===========================================================================
# 5. API Endpoint Tests
# ===========================================================================
def test_api_recommendations_endpoint(client: TestClient):
    """Test GET /api/v1/courses/recommendations returns 200 and schema matches."""
    response = client.get("/api/v1/courses/recommendations?limit=5")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert "target_careers" in data
    assert "recommendations_count" in data
    assert isinstance(data["data"], list)

    if len(data["data"]) > 0:
        first_rec = data["data"][0]
        assert "course_id" in first_rec
        assert "title" in first_rec
        assert "recommendation_score" in first_rec
        assert "skill_coverage_score" in first_rec
        assert "semantic_relevance_score" in first_rec
        assert "career_relevance_score" in first_rec
        assert "reason" in first_rec
        assert "category" in first_rec
        assert "covered_skill_gaps" in first_rec


def test_no_mongodb_imported():
    """Verify MongoDB is not introduced into the codebase."""
    import sys
    assert "pymongo" not in sys.modules
    assert "motor" not in sys.modules
