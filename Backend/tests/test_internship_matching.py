import pytest
from app.services.internship_matching_service import InternshipMatchingService
from app.models import (
    InternshipListing,
    InternshipRequiredSkill,
    StudentUser,
    StudentSkillEvidence,
    StudentPracticeAttempt,
    SkillPracticeChallenge,
    StudentAssessmentAttempt
)
from app.database import SessionLocal


def test_score_readiness_status_thresholds():
    """
    TEST 1, TEST 2, TEST 3, TEST 4, TEST 5, TEST 6:
    Deterministic readiness classification:
    score >= 80.0 => READY_TO_APPLY
    score < 80.0  => NEEDS_DEVELOPMENT
    No artificial score inflation, rounding up, or boosting.
    """
    service = InternshipMatchingService()
    
    student = StudentUser(
        id=501,
        name="Threshold Tester",
        email="threshold_test@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.5",
        target_careers="Backend Developer",
        work_preferences="Remote",
        preferred_locations="All"
    )

    listing = {
        "id": "live_job_001",
        "title": "Backend Developer Intern",
        "company": "TechNova",
        "min_cgpa": 7.0,
        "work_mode": "Remote",
        "location": "Remote",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"]
    }

    # Case A: Full 5/5 matched skills -> Score ~100% (>= 80) -> READY_TO_APPLY
    evidence_full = [
        StudentSkillEvidence(skill_name="Python", evidence_score=0.90, source_type="assessment"),
        StudentSkillEvidence(skill_name="FastAPI", evidence_score=0.85, source_type="project"),
        StudentSkillEvidence(skill_name="PostgreSQL", evidence_score=0.85, source_type="course"),
        StudentSkillEvidence(skill_name="Docker", evidence_score=0.85, source_type="github"),
        StudentSkillEvidence(skill_name="Redis", evidence_score=0.85, source_type="assignment"),
    ]
    res_full = service.evaluate_match(student, listing, student_evidence=evidence_full)
    assert res_full["match_score"] >= 80.0
    assert res_full["readiness_status"] == "READY_TO_APPLY"
    assert res_full["hard_eligible"] is True

    # Case B: 3/5 matched skills (Python, FastAPI, PostgreSQL), 2 missing (Docker, Redis)
    # Skill match = (3/5)*100 = 60%.
    # Total score = (60 * 0.45) + (100 * 0.25) + (100 * 0.15) + (100 * 0.15) = 27 + 25 + 15 + 15 = 82.0% -> READY_TO_APPLY
    evidence_3 = [
        StudentSkillEvidence(skill_name="Python", evidence_score=0.85, source_type="assessment"),
        StudentSkillEvidence(skill_name="FastAPI", evidence_score=0.85, source_type="project"),
        StudentSkillEvidence(skill_name="PostgreSQL", evidence_score=0.85, source_type="course"),
    ]
    res_3 = service.evaluate_match(student, listing, student_evidence=evidence_3)
    assert res_3["match_score"] == 82.0
    assert res_3["readiness_status"] == "READY_TO_APPLY"

    # Case C: 2/5 matched skills (Python, FastAPI), 3 missing (PostgreSQL, Docker, Redis)
    # Skill match = (2/5)*100 = 40%.
    # Total score = (40 * 0.45) + (100 * 0.25) + (100 * 0.15) + (100 * 0.15) = 18 + 25 + 15 + 15 = 73.0%
    # 73.0% < 80.0% -> NEEDS_DEVELOPMENT
    evidence_2 = [
        StudentSkillEvidence(skill_name="Python", evidence_score=0.85, source_type="assessment"),
        StudentSkillEvidence(skill_name="FastAPI", evidence_score=0.85, source_type="project"),
    ]
    res_2 = service.evaluate_match(student, listing, student_evidence=evidence_2)
    assert res_2["match_score"] == 73.0
    assert res_2["match_score"] < 80.0
    assert res_2["readiness_status"] == "NEEDS_DEVELOPMENT"
    assert res_2["hard_eligible"] is True
    assert len(res_2["skill_gaps"]) == 3  # PostgreSQL, Docker, Redis

    # Case D: 1/5 matched skills (Python) -> Total score = (20 * 0.45) + 55 = 9 + 55 = 64.0% -> NEEDS_DEVELOPMENT
    evidence_1 = [
        StudentSkillEvidence(skill_name="Python", evidence_score=0.85, source_type="assessment"),
    ]
    res_1 = service.evaluate_match(student, listing, student_evidence=evidence_1)
    assert res_1["match_score"] == 64.0
    assert res_1["readiness_status"] == "NEEDS_DEVELOPMENT"
    assert res_1["hard_eligible"] is True

    # Case E: 0 matched skills -> Total score = (0 * 0.45) + 55 = 55.0% -> NEEDS_DEVELOPMENT
    res_0 = service.evaluate_match(student, listing, student_evidence=[])
    assert res_0["match_score"] == 55.0
    assert res_0["readiness_status"] == "NEEDS_DEVELOPMENT"
    assert res_0["hard_eligible"] is True


def test_hard_eligibility_failure_exclusion():
    """
    TEST 7: Hard eligibility failures (e.g. CGPA cutoff) strictly mark status NOT_ELIGIBLE,
    match_score 0.0, and are excluded from ranked recommendations.
    """
    service = InternshipMatchingService()
    
    student = StudentUser(
        id=502,
        name="Low CGPA Student",
        email="low_cgpa@test.com",
        password_hash="hash",
        cgpa_or_percentage="6.2"
    )

    listing = {
        "id": "hard_cutoff_job",
        "title": "Elite Research Intern",
        "company": "Premier AI",
        "min_cgpa": 8.0,
        "work_mode": "Remote",
        "required_skills": ["Python"]
    }

    res = service.evaluate_match(student, listing)
    assert res["eligibility_status"] == "NOT_ELIGIBLE"
    assert res["hard_eligible"] is False
    assert res["match_score"] == 0.0
    assert any("CGPA" in r for r in res["hard_failures"])


def test_skill_gaps_and_targeted_learning_recommendations():
    """
    TEST 8: For an opportunity below 80% (e.g. 73% match), verify that:
    1. Granular skill gaps are identified with student level vs required level.
    2. Targeted courses, benchmark tests, and practical projects are generated specifically for those missing skills.
    """
    service = InternshipMatchingService()
    session = SessionLocal()
    
    student = StudentUser(
        id=503,
        name="Gap Analysis Student",
        email="gap_student@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.0",
        target_careers="Backend Developer",
        work_preferences="Remote"
    )

    listing = {
        "id": "gap_eval_job",
        "title": "Backend Developer Intern",
        "company": "CloudScale",
        "min_cgpa": 7.0,
        "work_mode": "Remote",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"]
    }

    # Student only possesses Python & FastAPI
    evidence = [
        StudentSkillEvidence(skill_name="Python", evidence_score=0.85, source_type="assessment"),
        StudentSkillEvidence(skill_name="FastAPI", evidence_score=0.85, source_type="project"),
    ]

    res = service.evaluate_match(student, listing, student_evidence=evidence, db=session)
    session.close()

    assert res["match_score"] == 73.0
    assert res["readiness_status"] == "NEEDS_DEVELOPMENT"
    assert res["target_score"] == 80.0
    
    # Check skill gaps structure
    assert len(res["skill_gaps"]) >= 3
    gap_skills = [g["skill_name"] for g in res["skill_gaps"]]
    assert "PostgreSQL" in gap_skills
    assert "Docker" in gap_skills
    assert "Redis" in gap_skills

    for g in res["skill_gaps"]:
        assert "student_level" in g
        assert "required_level" in g
        assert "gap" in g
        assert g["required_level"] >= 0.70

    # Check targeted learning recommendations
    assert len(res["recommended_courses"]) > 0
    assert len(res["recommended_tests"]) > 0
    assert len(res["recommended_projects"]) > 0

    # Ensure recommendations target the missing skills (PostgreSQL / Docker / Redis)
    rec_course_skills = [c.get("skill_name") for c in res["recommended_courses"]]
    assert any(s in rec_course_skills for s in ["PostgreSQL", "Docker", "Redis"])


def test_dynamic_recalculation_after_learning_completion():
    """
    TEST 9: Dynamic recalculation without hardcoded numbers.
    Initial state: student has 2 skills -> match score 73% (NEEDS_DEVELOPMENT).
    Student completes PostgreSQL course + assessment -> evidence added.
    Recalculate -> match score increases to 82.0% (READY_TO_APPLY).
    """
    service = InternshipMatchingService()
    
    student = StudentUser(
        id=504,
        name="Dynamic Learner",
        email="learner@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.5",
        target_careers="Backend Developer",
        work_preferences="Remote"
    )

    listing = {
        "id": "dynamic_job_101",
        "title": "Backend Developer Intern",
        "company": "TechNova",
        "min_cgpa": 7.0,
        "work_mode": "Remote",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"]
    }

    # Step 1: Initial State (Python + FastAPI)
    initial_evidence = [
        StudentSkillEvidence(skill_name="Python", evidence_score=0.85, source_type="assessment"),
        StudentSkillEvidence(skill_name="FastAPI", evidence_score=0.85, source_type="project"),
    ]
    res_initial = service.evaluate_match(student, listing, student_evidence=initial_evidence)
    assert res_initial["match_score"] == 73.0
    assert res_initial["readiness_status"] == "NEEDS_DEVELOPMENT"

    # Step 2: Student completes PostgreSQL assessment and Docker project
    updated_evidence = list(initial_evidence) + [
        StudentSkillEvidence(skill_name="PostgreSQL", evidence_score=0.85, source_type="assessment"),
        StudentSkillEvidence(skill_name="Docker", evidence_score=0.90, source_type="project"),
    ]

    # Step 3: Dynamic Recalculation
    # 4/5 skills matched -> Skill match = 80% -> Final score = (80 * 0.45) + 55 = 36 + 55 = 91.0%
    res_updated = service.evaluate_match(student, listing, student_evidence=updated_evidence)
    assert res_updated["match_score"] == 91.0
    assert res_updated["readiness_status"] == "READY_TO_APPLY"
    assert "PostgreSQL" in res_updated["matched_skills"]
    assert "Docker" in res_updated["matched_skills"]


def test_large_dataset_no_50_cap(monkeypatch):
    """
    REQUIRED TEST 1: Source returns 250+ unique mock opportunities.
    Verify that backend does NOT cap or truncate catalog at 50, and total equals 250+.
    """
    from app.services.live_opportunities.live_engine import LiveOpportunityEngine
    
    mock_250 = [
        {
            "id": f"mock_job_{i}",
            "source": "mock_feed",
            "source_type": "external_aggregator",
            "verification_status": "UNVERIFIED",
            "source_id": f"src_{i}",
            "title": f"Software Engineer Intern #{i}",
            "company_name": f"Employer {i}",
            "location": "Remote",
            "work_preference": "Remote",
            "stipend": "₹40,000 / month",
            "min_cgpa": 6.0,
            "required_skills": ["Python", "FastAPI"]
        }
        for i in range(1, 261)
    ]
    
    monkeypatch.setattr(LiveOpportunityEngine, "get_live_internships", classmethod(lambda cls, *args, **kwargs: mock_250 if kwargs.get("limit") is None else mock_250[:kwargs.get("limit")]))

    session = SessionLocal()
    student = StudentUser(
        id=601,
        name="Scale Tester",
        email="scale_test@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.5"
    )

    bundle = InternshipMatchingService.get_ranked_recommendations_bundle(
        student=student,
        db=session,
        limit=20,
        page=1
    )
    session.close()

    assert bundle["total"] == 260
    assert bundle["total"] >= 250
    assert bundle["total"] != 50
    assert len(bundle["items"]) == 20
    assert bundle["has_more"] is True


def test_pagination_100_opportunities(monkeypatch):
    """
    REQUIRED TEST 2: Source returns 100 opportunities.
    Verify all 100 available opportunities can be accessed across pages without truncation.
    """
    from app.services.live_opportunities.live_engine import LiveOpportunityEngine
    
    mock_100 = [
        {
            "id": f"mock_job_100_{i}",
            "source": "jobicy",
            "source_type": "external_aggregator",
            "verification_status": "UNVERIFIED",
            "source_id": f"src_100_{i}",
            "title": f"Developer Intern #{i}",
            "company_name": f"TechCorp {i}",
            "location": "Remote",
            "work_preference": "Remote",
            "min_cgpa": 6.0,
            "required_skills": ["Python"]
        }
        for i in range(1, 101)
    ]
    monkeypatch.setattr(LiveOpportunityEngine, "get_live_internships", classmethod(lambda cls, *args, **kwargs: mock_100 if kwargs.get("limit") is None else mock_100[:kwargs.get("limit")]))

    session = SessionLocal()
    student = StudentUser(id=602, email="paged@test.com", password_hash="hash", cgpa_or_percentage="8.0")
    
    # Page 1: 50 items
    bundle_p1 = InternshipMatchingService.get_ranked_recommendations_bundle(student=student, db=session, limit=50, page=1)
    # Page 2: next 50 items
    bundle_p2 = InternshipMatchingService.get_ranked_recommendations_bundle(student=student, db=session, limit=50, page=2)
    session.close()

    assert bundle_p1["total"] == 100
    assert len(bundle_p1["items"]) == 50
    assert bundle_p1["has_more"] is True

    assert bundle_p2["total"] == 100
    assert len(bundle_p2["items"]) == 50
    assert bundle_p2["has_more"] is False

    # Ensure items across page 1 and page 2 are distinct
    p1_ids = {x["id"] for x in bundle_p1["items"]}
    p2_ids = {x["id"] for x in bundle_p2["items"]}
    assert len(p1_ids.intersection(p2_ids)) == 0


def test_exact_75_and_30_opportunity_counts(monkeypatch):
    """
    REQUIRED TEST 3 & TEST 4:
    - 75 opportunities -> returns exactly 75 (NOT 50).
    - 30 opportunities -> returns exactly 30 (NOT padded to 50).
    """
    from app.services.live_opportunities.live_engine import LiveOpportunityEngine
    
    session = SessionLocal()
    student = StudentUser(id=603, email="counts@test.com", password_hash="hash", cgpa_or_percentage="8.0")

    # Case 75
    mock_75 = [
        {"id": f"job_75_{i}", "source": "jobicy", "source_type": "external_aggregator", "verification_status": "UNVERIFIED", "title": f"Dev {i}", "company_name": f"Co {i}", "min_cgpa": 6.0, "required_skills": ["Python"]}
        for i in range(1, 76)
    ]
    monkeypatch.setattr(LiveOpportunityEngine, "get_live_internships", classmethod(lambda cls, *args, **kwargs: mock_75 if kwargs.get("limit") is None else mock_75[:kwargs.get("limit")]))
    bundle_75 = InternshipMatchingService.get_ranked_recommendations_bundle(student=student, db=session, limit=None, page=1)
    assert bundle_75["total"] == 75
    assert len(bundle_75["items"]) == 75

    # Case 30
    mock_30 = [
        {"id": f"job_30_{i}", "source": "jobicy", "source_type": "external_aggregator", "verification_status": "UNVERIFIED", "title": f"Dev {i}", "company_name": f"Co {i}", "min_cgpa": 6.0, "required_skills": ["Python"]}
        for i in range(1, 31)
    ]
    monkeypatch.setattr(LiveOpportunityEngine, "get_live_internships", classmethod(lambda cls, *args, **kwargs: mock_30 if kwargs.get("limit") is None else mock_30[:kwargs.get("limit")]))
    bundle_30 = InternshipMatchingService.get_ranked_recommendations_bundle(student=student, db=session, limit=None, page=1)
    assert bundle_30["total"] == 30
    assert len(bundle_30["items"]) == 30

    session.close()


def test_provenance_badges_and_readiness():
    """
    REQUIRED TEST 5, TEST 6, TEST 7, TEST 8:
    - Match < 80% (e.g. 76% or 73%) -> visible, NEEDS_DEVELOPMENT, UNVERIFIED if external aggregator
    - Match >= 80% (e.g. 84% or 82%) -> visible, READY_TO_APPLY, UNVERIFIED if external aggregator
    - Verified partner internship -> verification_status == 'VERIFIED'
    - Jobicy internship -> verification_status == 'UNVERIFIED'
    """
    service = InternshipMatchingService()
    student = StudentUser(
        id=604,
        email="provenance@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.0",
        target_careers="Frontend Developer",
        work_preferences="Remote"
    )

    # Scraped Jobicy opportunity (External Aggregator -> UNVERIFIED)
    jobicy_job = {
        "id": "jobicy_123",
        "source": "jobicy",
        "source_type": "external_aggregator",
        "verification_status": "UNVERIFIED",
        "title": "Frontend Developer Intern",
        "company_name": "Jobicy Startup",
        "location": "Remote",
        "work_preference": "Remote",
        "min_cgpa": 6.5,
        "required_skills": ["React", "TypeScript", "TailwindCSS"]
    }

    # Match ~70-75% (<80)
    ev_dev = [StudentSkillEvidence(skill_name="React", evidence_score=0.85, source_type="project")]
    res_dev = service.evaluate_match(student, jobicy_job, student_evidence=ev_dev)
    assert res_dev["match_score"] < 80.0
    assert res_dev["readiness_status"] == "NEEDS_DEVELOPMENT"
    assert res_dev["verification_status"] == "UNVERIFIED"
    assert res_dev["source_type"] == "external_aggregator"

    # Match >= 80%
    ev_ready = [
        StudentSkillEvidence(skill_name="React", evidence_score=0.85, source_type="project"),
        StudentSkillEvidence(skill_name="TypeScript", evidence_score=0.85, source_type="course"),
        StudentSkillEvidence(skill_name="TailwindCSS", evidence_score=0.85, source_type="assessment"),
    ]
    res_ready = service.evaluate_match(student, jobicy_job, student_evidence=ev_ready)
    assert res_ready["match_score"] >= 80.0
    assert res_ready["readiness_status"] == "READY_TO_APPLY"
    assert res_ready["verification_status"] == "UNVERIFIED"

    # Authorized Partner Opportunity -> VERIFIED
    partner_job = {
        "id": "partner_google_01",
        "source": "curated_partner",
        "source_type": "authorized_partner",
        "verification_status": "VERIFIED",
        "title": "Software Engineering Intern",
        "company_name": "Google",
        "location": "Bengaluru",
        "work_preference": "Hybrid",
        "min_cgpa": 7.0,
        "required_skills": ["Python", "Algorithms"]
    }
    res_partner = service.evaluate_match(student, partner_job, student_evidence=ev_ready)
    assert res_partner["verification_status"] == "VERIFIED"
    assert res_partner["source_type"] == "authorized_partner"


def test_in_memory_cross_source_deduplication(monkeypatch):
    """
    REQUIRED TEST 9: Duplicate internship exists in Jobicy and Arbeitnow.
    Verify in-memory deduplication retains exactly 1 final unique opportunity.
    """
    from app.services.live_opportunities.live_engine import LiveOpportunityEngine
    from app.services.live_opportunities.base_source import BaseLiveSource

    class FakeJobicySource(BaseLiveSource):
        def __init__(self):
            super().__init__("jobicy", "internships")
        def fetch_live_records(self, limit=None):
            return [{"id": "dup_1", "jobTitle": "Full Stack Intern", "companyName": "Acme Corp", "jobGeo": "Remote", "url": "https://example.com/apply/dup1"}]
        def normalize_record(self, raw):
            return {"id": "jobicy_dup1", "source": "jobicy", "source_type": "external_aggregator", "verification_status": "UNVERIFIED", "source_id": "dup_1", "title": "Full Stack Intern", "company_name": "Acme Corp", "location": "Remote", "apply_url": "https://example.com/apply/dup1", "min_cgpa": 6.0, "required_skills": ["React", "Node"]}

    class FakeArbeitnowSource(BaseLiveSource):
        def __init__(self):
            super().__init__("arbeitnow", "internships")
        def fetch_live_records(self, limit=None):
            return [{"slug": "dup-acme-intern", "title": "Full Stack Intern", "company_name": "Acme Corp", "location": "Remote", "url": "https://example.com/apply/dup1"}]
        def normalize_record(self, raw):
            return {"id": "arbeitnow_dup1", "source": "arbeitnow", "source_type": "external_aggregator", "verification_status": "UNVERIFIED", "source_id": "dup-acme-intern", "title": "Full Stack Intern", "company_name": "Acme Corp", "location": "Remote", "apply_url": "https://example.com/apply/dup1", "min_cgpa": 6.0, "required_skills": ["React", "Node"]}

    # Patch sources in LiveOpportunityEngine
    def fake_fetch_sources():
        j = FakeJobicySource()
        a = FakeArbeitnowSource()
        return [j, a]

    LiveOpportunityEngine._internship_cache = []
    LiveOpportunityEngine._internship_cache_time = 0.0

    # Test LiveOpportunityEngine directly with duplicate sources
    with monkeypatch.context() as m:
        m.setattr("app.services.live_opportunities.live_engine.CuratedLiveSource", lambda: FakeJobicySource())
        m.setattr("app.services.live_opportunities.live_engine.JobicyLiveSource", lambda: FakeJobicySource())
        m.setattr("app.services.live_opportunities.live_engine.ArbeitnowLiveSource", lambda: FakeArbeitnowSource())
        m.setattr("app.services.live_opportunities.live_engine.RemotiveLiveSource", lambda: FakeJobicySource())
        m.setattr("app.services.live_opportunities.live_engine.AicteInternshipLiveSource", lambda: FakeArbeitnowSource())

        deduped = LiveOpportunityEngine.get_live_internships(force_refresh=True)
        # Should be exactly 1 deduplicated record
        assert len(deduped) == 1
        assert deduped[0]["company_name"] == "Acme Corp"
        assert deduped[0]["title"] == "Full Stack Intern"

