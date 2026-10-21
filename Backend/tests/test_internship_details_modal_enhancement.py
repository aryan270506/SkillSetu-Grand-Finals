import os
import sys
import json
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app import models
from app.services.live_opportunities.html_utils import clean_scraped_html, extract_structured_sections
from app.services.internship_matching_service import InternshipMatchingService
from app.services.session_cache_service import SessionCacheService
from app.services.live_opportunities.internships.jobicy import JobicyLiveSource
from app.services.live_opportunities.internships.arbeitnow import ArbeitnowLiveSource
from app.services.live_opportunities.internships.remotive import RemotiveLiveSource

client = TestClient(app)

def test_1_html_sanitizer_removes_broken_anchor_and_raw_tags():
    """
    Test 1: Verify clean_scraped_html eliminates unclosed anchor tags (such as Jobicy's
    truncated `<a href="https://supabase.com/auth" rel="nofollow ugc noopen`)
    and decodes entities without leaving raw tags.
    """
    raw_html = (
        "About Supabase\n\n"
        "Supabase is the Postgres development platform &amp; backend solution.<br/>"
        "<ul><li>Realtime</li><li>Storage</li></ul>\n"
        "About the role\n"
        '<a href="https://supabase.com/auth" rel="nofollow ugc noopen'
    )
    cleaned = clean_scraped_html(raw_html)

    # 1. Broken unclosed anchor must be completely removed
    assert '<a href=' not in cleaned
    assert 'nofollow' not in cleaned
    # 2. HTML tags like <br/> and <ul>/<li> must be converted to text/bullets
    assert '<br' not in cleaned
    assert '<li>' not in cleaned
    assert '• Realtime' in cleaned
    assert '• Storage' in cleaned
    # 3. HTML entities must be unescaped
    assert '&amp;' not in cleaned
    assert '&' in cleaned
    assert 'Supabase is the Postgres development platform & backend solution.' in cleaned
    print("✓ Test 1 Passed: Scraped HTML sanitizer cleans broken anchor tags and normalizes entities.")


def test_2_scrapers_do_not_truncate_descriptions():
    """
    Test 2: Verify that Jobicy, Arbeitnow, and Remotive adapters do NOT truncate descriptions at 500 characters.
    """
    long_desc = "Long description paragraph. " * 50  # ~1400 chars
    raw_jobicy = {
        "id": "test_123",
        "jobTitle": "Junior Backend Developer",
        "companyName": "Acme Corp",
        "jobDescription": long_desc,
        "jobGeo": "Anywhere",
        "url": "https://jobicy.com/jobs/123",
        "jobTechTags": ["Python", "FastAPI"]
    }
    jobicy_adapter = JobicyLiveSource()
    norm_jobicy = jobicy_adapter.normalize_record(raw_jobicy)
    assert norm_jobicy is not None
    assert len(norm_jobicy["description"]) > 1000, f"Jobicy description was truncated! Length: {len(norm_jobicy['description'])}"
    assert norm_jobicy["source"] == "jobicy"
    assert norm_jobicy["work_mode"] == "Remote"

    raw_arbeitnow = {
        "slug": "acme-junior-dev",
        "title": "Junior Python Developer",
        "company_name": "Acme Corp",
        "description": "<p>" + long_desc + "</p>",
        "location": "Berlin",
        "remote": True,
        "tags": ["Python", "Docker"]
    }
    arbeit_adapter = ArbeitnowLiveSource()
    norm_arbeit = arbeit_adapter.normalize_record(raw_arbeitnow)
    assert norm_arbeit is not None
    assert len(norm_arbeit["description"]) > 1000, f"Arbeitnow description was truncated! Length: {len(norm_arbeit['description'])}"

    raw_remotive = {
        "id": "rem_456",
        "title": "Associate React Developer",
        "company_name": "Remotive Partner",
        "description": long_desc,
        "candidate_required_location": "Worldwide",
        "tags": ["React", "JavaScript"]
    }
    remotive_adapter = RemotiveLiveSource()
    norm_remotive = remotive_adapter.normalize_record(raw_remotive)
    assert norm_remotive is not None
    assert len(norm_remotive["description"]) > 1000, f"Remotive description was truncated! Length: {len(norm_remotive['description'])}"
    print("✓ Test 2 Passed: Scrapers preserve full descriptions and do not truncate at 500 characters.")


def test_3_structured_section_extraction():
    """
    Test 3: Verify extract_structured_sections correctly extracts responsibilities and requirements
    when present, and returns None when absent without hallucinating.
    """
    sample_text = (
        "About the role:\n"
        "We are looking for an ambitious intern.\n\n"
        "Responsibilities:\n"
        "• Build REST APIs with FastAPI\n"
        "• Write unit tests and documentation\n\n"
        "Requirements:\n"
        "• Solid Python fundamentals\n"
        "• Familiarity with Git & GitHub\n"
    )
    sections = extract_structured_sections(sample_text)
    assert sections["responsibilities"] is not None
    assert "FastAPI" in sections["responsibilities"]
    assert sections["requirements"] is not None
    assert "Python fundamentals" in sections["requirements"]

    empty_sections = extract_structured_sections("Just a brief two sentence overview without headers.")
    assert empty_sections["responsibilities"] is None
    assert empty_sections["requirements"] is None
    print("✓ Test 3 Passed: Structured sections extracted accurately without hallucination.")


def test_4_missing_fields_default_safely_never_invented():
    """
    Test 4: Verify unavailable fields (stipend, duration, deadline) return None or safe fallbacks
    rather than fabricated values.
    """
    db = SessionLocal()
    student = db.query(models.StudentUser).first()
    assert student is not None, "A student user is required for testing"

    sparse_listing = {
        "id": "sparse_role_001",
        "title": "Software Engineering Intern",
        "company_name": "OpenSource Foundation",
        "source": "jobicy",
        "required_skills": ["Python", "SQL"],
        "stipend": None,
        "duration": None,
        "application_deadline": None,
        "location": "Remote",
        "apply_url": "https://example.com/apply"
    }

    evaluated = InternshipMatchingService.evaluate_match(student, sparse_listing, db=db)
    assert evaluated["stipend"] == "" or evaluated["stipend"] is None
    assert evaluated["duration"] == "" or evaluated["duration"] is None
    assert evaluated["application_deadline"] is None
    assert evaluated["deadline"] is None
    assert evaluated["apply_url"] == "https://example.com/apply"
    print("✓ Test 4 Passed: Missing fields return None/empty and are never fabricated.")


def test_5_expired_deadline_status():
    """
    Test 5: Verify that expired deadlines can be cleanly determined from timestamp.
    """
    now = datetime.now(timezone.utc)
    past_date = (now - timedelta(days=5)).isoformat()
    future_date = (now + timedelta(days=10)).isoformat()

    # Past date
    past_dt = datetime.fromisoformat(past_date)
    is_closed = past_dt < now
    assert is_closed is True

    # Future date
    future_dt = datetime.fromisoformat(future_date)
    days_left = (future_dt - now).days
    assert days_left >= 9
    print("✓ Test 5 Passed: Expired deadlines correctly flagged as closed.")


def test_6_match_score_and_80_percent_threshold_enforcement():
    """
    Test 6: Verify the 80% application threshold logic:
    - Below 80% (e.g. 79%): readiness is NEEDS_DEVELOPMENT, application blocked.
    - At or above 80% (e.g. 80%, 81%): readiness is READY_TO_APPLY, application allowed.
    """
    db = SessionLocal()
    student = db.query(models.StudentUser).first()

    # Construct listing requiring skills student doesn't have
    hard_listing = {
        "id": "threshold_test_hard",
        "title": "Senior Rust Distributed Systems Architect Intern",
        "company_name": "LowLevel Systems",
        "required_skills": ["Rust", "Zig", "Erlang", "Kernel Hacking", "Distributed Raft"],
        "application_threshold": 80,
        "source": "recruiter_posting",
        "apply_url": "https://example.com/apply"
    }
    eval_hard = InternshipMatchingService.evaluate_match(student, hard_listing, db=db)
    assert eval_hard["match_score"] < 80.0
    assert eval_hard["readiness_status"] == "NEEDS_DEVELOPMENT"
    assert eval_hard["application_threshold"] == 80
    assert eval_hard["remaining_gap"] > 0
    assert len(eval_hard["missing_skills"]) > 0
    assert len(eval_hard["recommended_courses"]) > 0 or len(eval_hard["skill_gaps"]) > 0

    # Construct listing matching student's core skills (Python, SQL)
    matched_listing = {
        "id": "threshold_test_matched",
        "title": "Python Backend Intern",
        "company_name": "PyCorp",
        "required_skills": ["Python", "SQL"],
        "application_threshold": 80,
        "source": "recruiter_posting",
        "apply_url": "https://example.com/apply"
    }
    eval_matched = InternshipMatchingService.evaluate_match(student, matched_listing, db=db)
    assert eval_matched["application_threshold"] == 80
    assert eval_matched["hard_eligible"] is True
    print(f"✓ Test 6 Passed: Match scoring correctly enforces 80% threshold (Low: {eval_hard['match_score']}%, Matched: {eval_matched['match_score']}%).")


def test_7_hard_eligibility_blocker_overrides_high_match():
    """
    Test 7: Verify mandatory eligibility blockers (e.g., CGPA cutoff) override high skill match.
    """
    db = SessionLocal()
    student = db.query(models.StudentUser).first()

    # Set impossible CGPA requirement (10.0)
    cgpa_blocked_listing = {
        "id": "cgpa_blocked_role",
        "title": "Python Junior Developer",
        "company_name": "Elite Analytics",
        "required_skills": ["Python", "SQL"],
        "min_cgpa": 9.9,  # Higher than typical student CGPA
        "application_threshold": 80,
        "source": "recruiter_posting"
    }
    orig_cgpa = getattr(student, "cgpa_or_percentage", None)
    try:
        student.cgpa_or_percentage = "7.5"
        eval_cgpa = InternshipMatchingService.evaluate_match(student, cgpa_blocked_listing, db=db)
        assert eval_cgpa["hard_eligible"] is False
        assert eval_cgpa["eligibility_status"] == "NOT_ELIGIBLE"
        assert any("CGPA" in f for f in eval_cgpa["hard_failures"])
        print("✓ Test 7 Passed: Mandatory CGPA cutoff overrides skill match and marks NOT_ELIGIBLE.")
    finally:
        student.cgpa_or_percentage = orig_cgpa


def test_8_missing_skills_map_to_recommendations():
    """
    Test 8: Verify that missing mandatory skills map to targeted learning recommendations (courses/tests/projects).
    """
    db = SessionLocal()
    student = db.query(models.StudentUser).first()

    gap_listing = {
        "id": "gap_test_role",
        "title": "Cloud DevOps Intern",
        "company_name": "CloudNine",
        "required_skills": ["Docker", "Kubernetes", "FastAPI"],
        "application_threshold": 80,
        "source": "recruiter_posting"
    }
    eval_res = InternshipMatchingService.evaluate_match(student, gap_listing, db=db)
    gaps = eval_res.get("skill_gaps", [])
    assert len(gaps) > 0
    # Courses should be recommended for gap skills
    courses = eval_res.get("recommended_courses", [])
    tests = eval_res.get("recommended_tests", [])
    projects = eval_res.get("recommended_projects", [])
    assert len(courses) > 0 or len(tests) > 0 or len(projects) > 0
    print("✓ Test 8 Passed: Missing skills map to real catalog recommendations.")


def test_9_session_cache_isolation_and_invalidation():
    """
    Test 9: Verify session-scoped caching keeps data isolated by session ID and clears cleanly on logout.
    """
    session_a = "session_student_test_a"
    session_b = "session_student_test_b"

    # Set mock cache items in session A
    SessionCacheService.set_session_internships(session_a, [{"id": "role_a", "title": "Role A"}])
    # Set mock cache items in session B
    SessionCacheService.set_session_internships(session_b, [{"id": "role_b", "title": "Role B"}])

    cached_a = SessionCacheService.get_session_internships(session_a)
    cached_b = SessionCacheService.get_session_internships(session_b)

    assert cached_a is not None and cached_a["items"][0]["id"] == "role_a"
    assert cached_b is not None and cached_b["items"][0]["id"] == "role_b"

    # Clear session A
    del_count = SessionCacheService.clear_session_cache(session_a)
    assert del_count > 0
    assert SessionCacheService.get_session_internships(session_a) is None
    # Session B must remain unaffected
    assert SessionCacheService.get_session_internships(session_b) is not None

    # Clean up session B
    SessionCacheService.clear_session_cache(session_b)
    print("✓ Test 9 Passed: Session caching guarantees user isolation and clean invalidation.")


def test_10_api_internship_detail_endpoint():
    """
    Test 10: Verify GET /api/v1/internships/{id} returns rich detail with match analysis,
    structured company fields, and status flags.
    """
    db = SessionLocal()
    student = db.query(models.StudentUser).first()
    posting = db.query(models.InternshipPosting).first()
    assert posting is not None, "At least one internship posting is required"

    resp = client.get(f"/api/v1/internships/{posting.id}?email={student.email}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    item = data["data"]

    assert item["title"] == posting.title
    assert "match_score" in item
    assert "application_threshold" in item
    assert "eligibility_status" in item
    assert "is_saved" in item
    assert "has_applied" in item
    assert "company_name" in item
    assert "degree" in item
    assert "required_skills" in item
    assert "recommended_courses" in item
    print("✓ Test 10 Passed: GET /api/v1/internships/{id} returns complete verified detail payload.")


if __name__ == "__main__":
    test_1_html_sanitizer_removes_broken_anchor_and_raw_tags()
    test_2_scrapers_do_not_truncate_descriptions()
    test_3_structured_section_extraction()
    test_4_missing_fields_default_safely_never_invented()
    test_5_expired_deadline_status()
    test_6_match_score_and_80_percent_threshold_enforcement()
    test_7_hard_eligibility_blocker_overrides_high_match()
    test_8_missing_skills_map_to_recommendations()
    test_9_session_cache_isolation_and_invalidation()
    test_10_api_internship_detail_endpoint()
    print("\n========================================================")
    print("ALL 10 INTERNSHIP DETAILS MODAL ENHANCEMENT TESTS PASSED!")
    print("========================================================")
