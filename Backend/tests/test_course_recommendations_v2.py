import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

from app.models import Course, CourseSkill, CourseCareer, Provider
from app.services.course_recommendation_service import (
    calculate_quality_score,
    calculate_freshness_score,
    assign_learning_path_stage,
    deduplicate_candidate_courses,
    apply_diversity_reranking,
    _normalize_title_for_dedup,
    get_personalized_course_recommendations,
    calculate_skill_coverage,
    generate_recommendation_reason,
    generate_recommendation_bullets
)


def test_quality_score_complete_vs_sparse():
    # 1. Complete metadata course
    complete_course = Course(
        id=1,
        title="Comprehensive Deep Learning Specialization",
        description="A comprehensive, in-depth deep learning course covering convolutional networks, RNNs, transformers, and optimization techniques across 15 weeks.",
        duration=15,
        duration_unit="weeks",
        institution="IIT Madras",
        instructor="Prof. Andrew Miller",
        skills=[
            CourseSkill(skill_name="Python"),
            CourseSkill(skill_name="Deep Learning"),
            CourseSkill(skill_name="Neural Networks"),
            CourseSkill(skill_name="PyTorch"),
            CourseSkill(skill_name="Computer Vision"),
        ]
    )
    res_complete = calculate_quality_score(complete_course)
    assert res_complete["score"] >= 0.90
    assert 0.90 <= res_complete["multiplier"] <= 1.05
    assert res_complete["description_score"] == 1.0
    assert res_complete["duration_score"] == 1.0
    assert res_complete["institution_score"] == 1.0
    assert res_complete["skills_richness_score"] == 1.0

    # 2. Sparse metadata course
    sparse_course = Course(
        id=2,
        title="Quick Clip",
        description="short",
        duration=None,
        institution=None,
        instructor=None,
        skills=[]
    )
    res_sparse = calculate_quality_score(sparse_course)
    assert res_sparse["score"] < 0.40
    assert 0.90 <= res_sparse["multiplier"] <= 1.05
    assert res_sparse["skills_richness_score"] == 0.0


def test_freshness_score_decay_and_fallback():
    now = datetime.now(timezone.utc)
    
    # 1. Brand new course (updated today)
    fresh_course = Course(
        id=1,
        updated_at=now - timedelta(days=1)
    )
    res_fresh = calculate_freshness_score(fresh_course)
    assert res_fresh["score"] >= 0.95
    assert 0.95 <= res_fresh["multiplier"] <= 1.05

    # 2. Older course (updated 360 days ago)
    old_course = Course(
        id=2,
        updated_at=now - timedelta(days=360)
    )
    res_old = calculate_freshness_score(old_course)
    assert 0.10 <= res_old["score"] <= 0.20
    assert 0.95 <= res_old["multiplier"] <= 1.05

    # 3. No timestamp (evergreen fallback)
    no_time_course = Course(id=3, updated_at=None, created_at=None)
    res_fallback = calculate_freshness_score(no_time_course)
    assert res_fallback["score"] == 0.85
    assert 0.95 <= res_fallback["multiplier"] <= 1.05


def test_learning_path_stage_assignment():
    c_foundation = Course(title="Introduction to Programming with Python", level="Beginner")
    lp_f = assign_learning_path_stage(c_foundation)
    assert lp_f["stage"] == "Foundation"
    assert lp_f["sequence_order"] == 1

    c_intermediate = Course(title="Database Management and SQL Queries", level="Undergraduate")
    lp_i = assign_learning_path_stage(c_intermediate)
    assert lp_i["stage"] == "Intermediate"
    assert lp_i["sequence_order"] == 2

    c_advanced = Course(title="Advanced Distributed Systems and Microservices", level="Postgraduate")
    lp_a = assign_learning_path_stage(c_advanced)
    assert lp_a["stage"] == "Advanced"
    assert lp_a["sequence_order"] == 3


def test_normalize_title_for_dedup():
    t1 = "[NPTEL] Programming in Python (Official) - 2024"
    t2 = "Programming in Python Full Course Tutorial"
    assert _normalize_title_for_dedup(t1) == _normalize_title_for_dedup(t2) == "programming python"


def test_cross_provider_deduplication():
    # Course with identical canonical URLs
    c1 = Course(id=1, url="https://example.com/course-a", title="Python 101", skills=[CourseSkill(skill_name="Python")])
    c2 = Course(id=2, url="https://example.com/course-a", title="Python 101 Duplicate", skills=[])
    
    # Courses with same normalized title across providers, c4 has richer skills
    c3 = Course(id=3, url="https://nptel.ac.in/c3", title="[NPTEL] Machine Learning Course", skills=[CourseSkill(skill_name="ML")])
    c4 = Course(id=4, url="https://youtube.com/watch?v=123", title="Machine Learning Full Tutorial", skills=[
        CourseSkill(skill_name="ML"), CourseSkill(skill_name="Python"), CourseSkill(skill_name="Data Science")
    ])

    courses = [c1, c2, c3, c4]
    deduped, removed_count = deduplicate_candidate_courses(courses)
    
    assert removed_count == 2
    assert len(deduped) == 2
    deduped_ids = {c.id for c in deduped}
    assert 1 in deduped_ids
    # c4 should replace c3 due to richer skills
    assert 4 in deduped_ids


def test_diversity_reranking():
    # 5 courses from the same provider 'nptel'
    items = [
        {"course_id": i, "provider": "nptel", "ranking_score": 0.85 - (i * 0.01)}
        for i in range(1, 6)
    ]
    # 1 course from freecodecamp
    items.append({"course_id": 10, "provider": "freecodecamp", "ranking_score": 0.80})

    reranked = apply_diversity_reranking(items, limit=6)
    assert len(reranked) == 6
    # First 2 nptel courses get diversity multiplier 1.0
    assert reranked[0]["provider"] == "nptel"
    assert reranked[0]["diversity_multiplier"] == 1.0
    assert reranked[1]["provider"] == "nptel"
    assert reranked[1]["diversity_multiplier"] == 1.0
    
    # 3rd course becomes freecodecamp because 3rd nptel was penalized
    assert reranked[2]["provider"] == "freecodecamp"
    assert reranked[2]["diversity_multiplier"] == 1.0

    # The remaining nptel courses have diversity multiplier < 1.0
    assert reranked[3]["provider"] == "nptel"
    assert reranked[3]["diversity_multiplier"] < 1.0
    assert reranked[3]["diversity_multiplier"] >= 0.90


@patch("app.services.esco_service.load_student_evidence_from_db")
@patch("app.services.esco_service.calculate_multi_career_skill_gaps")
def test_personalized_recommendations_phase7_schema(mock_gaps, mock_evidence):
    mock_evidence.return_value = ({"python": 0.9}, {}, ["SQL"])
    mock_gaps.return_value = {
        "target_careers": ["Full Stack Developer"],
        "skill_gaps": [
            {"skill_name": "Docker", "priority": "High Priority", "gap": 0.8, "required_by_careers": ["Full Stack Developer"]},
            {"skill_name": "REST API", "priority": "Medium Priority", "gap": 0.5, "required_by_careers": ["Full Stack Developer"]},
            {"skill_name": "PostgreSQL", "priority": "Medium Priority", "gap": 0.4, "required_by_careers": ["Full Stack Developer"]}
        ]
    }

    mock_db = MagicMock()
    mock_provider = Provider(id=1, slug="freecodecamp", name="freeCodeCamp")
    course = Course(
        id=101,
        title="Back End Development and APIs Certification",
        description="Learn backend development, microservices, REST APIs, and Node.js.",
        duration=300,
        duration_unit="hours",
        provider=mock_provider,
        provider_id=1,
        is_active=True,
        skills=[
            CourseSkill(skill_name="REST API", esco_skill_id="esco-rest-1"),
            CourseSkill(skill_name="Node.js", esco_skill_id="esco-node-1"),
        ],
        careers=[]
    )

    mock_query = mock_db.query.return_value
    mock_query.options.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.distinct.return_value = mock_query
    mock_query.all.return_value = [(101,)]  # Candidate match
    
    with patch("app.services.course_recommendation_service.deduplicate_candidate_courses", return_value=([course], 0)):
        result = get_personalized_course_recommendations(
            db=mock_db,
            student_email="student@test.com",
            limit=5
        )

    assert result["status"] == "success"
    assert result["recommendations_count"] == 1
    rec = result["data"][0]

    # Verify backward compatibility
    assert rec["course_id"] == 101
    assert "recommendation_score" in rec
    assert "covered_skill_gaps" in rec
    assert "reason" in rec

    # Verify Phase 7 extensions
    assert "skill_coverage" in rec
    assert "REST API" in rec["skill_coverage"]["covered"]
    assert "Docker" in rec["skill_coverage"]["missing"]
    assert rec["skill_coverage"]["coverage_ratio"] == round(1 / 3, 2)

    assert "quality" in rec
    assert 0.0 <= rec["quality"]["score"] <= 1.0

    assert "freshness" in rec
    assert 0.0 <= rec["freshness"]["score"] <= 1.0

    assert "learning_path" in rec
    assert rec["learning_path"]["stage"] in ["Foundation", "Intermediate", "Advanced"]

    assert "explanation" in rec
    assert len(rec["explanation"]) > 0


def test_base_score_remains_dominant():
    """Verify that quality/freshness multipliers cannot elevate a zero-skill course over a high-skill match."""
    high_match_course = Course(
        id=1,
        title="Python and SQL Masterclass",
        description="Comprehensive course",
        duration=10,
        skills=[CourseSkill(skill_name="Python"), CourseSkill(skill_name="SQL")]
    )
    unrelated_course = Course(
        id=2,
        title="Intro to Ancient History",
        description="Extensive historical overview with full metadata and active instructors and syllabus.",
        duration=12,
        institution="Top University",
        instructor="Dr. Historian",
        skills=[CourseSkill(skill_name="History")]
    )

    skill_gaps = [
        {"skill_name": "Python", "priority": "High Priority"},
        {"skill_name": "SQL", "priority": "High Priority"}
    ]

    cov_high, _ = calculate_skill_coverage(high_match_course.skills, skill_gaps)
    cov_low, _ = calculate_skill_coverage(unrelated_course.skills, skill_gaps)

    assert cov_high == 1.0
    assert cov_low == 0.0

    # Calculate final scores with multipliers
    q_high = calculate_quality_score(high_match_course)["multiplier"]
    f_high = calculate_freshness_score(high_match_course)["multiplier"]
    score_high = ((cov_high * 0.55) + (0.5 * 0.35) + (0.5 * 0.10)) * q_high * f_high

    q_low = calculate_quality_score(unrelated_course)["multiplier"]
    f_low = calculate_freshness_score(unrelated_course)["multiplier"]
    score_low = ((cov_low * 0.55) + (0.5 * 0.35) + (0.5 * 0.10)) * q_low * f_low

    assert score_high > score_low * 2.0, "High skill coverage must strongly dominate regardless of metadata quality multipliers."


def test_multi_career_skill_explanation():
    """Verify that skills required by multiple careers are explicitly highlighted in the explanation."""
    covered_gaps = [
        {
            "skill_name": "REST API",
            "required_by_careers": ["Full Stack Developer", "Mobile App Developer"],
            "priority": "High Priority"
        }
    ]
    target_careers = ["Full Stack Developer", "Mobile App Developer"]
    bullets = generate_recommendation_bullets(
        covered_gaps=covered_gaps,
        target_careers=target_careers,
        all_skill_gaps=covered_gaps
    )

    assert any("Required for Full Stack Developer, Mobile App Developer" in b for b in bullets)
    assert any("Aligned with Full Stack Developer & Mobile App Developer" in b for b in bullets)

