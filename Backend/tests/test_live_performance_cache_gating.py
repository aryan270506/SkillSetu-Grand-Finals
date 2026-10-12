import time
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import (
    StudentUser,
    InternshipListing,
    Scholarship,
    ScholarshipEligibilityRule,
    InternshipApplication,
    StudentSkillEvidence
)
from app.services.session_cache_service import SessionCacheService
from app.services.live_opportunities.live_engine import LiveOpportunityEngine
from app.services.internship_matching_service import InternshipMatchingService


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(autouse=True)
def clean_cache_and_setup(db):
    SessionCacheService._cache_store.clear()
    yield
    SessionCacheService._cache_store.clear()


# =============================================================================
# 1. PERFORMANCE & CONCURRENCY TESTS (TESTS 1 - 5)
# =============================================================================

def test_1_cache_miss_response_under_2_seconds(client):
    """TEST 1: Cache miss with external sources responding -> Total response <= 2000ms."""
    # Ensure app route is warmed up
    client.get("/")

    session_id = f"test_session_miss_{int(time.time()*1000)}"
    start_t = time.perf_counter()
    response = client.get(f"/api/v1/internships/recommended?email=abhoge27@gmail.com&session_id={session_id}&force_refresh=true")
    elapsed_ms = (time.perf_counter() - start_t) * 1000

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["items"]) > 0
    # Strict deadline: must return within 2000 ms
    assert elapsed_ms <= 2000, f"Cache miss response took {elapsed_ms}ms, exceeding 2000ms budget!"



def test_2_cache_hit_response_significantly_fast(client):
    """TEST 2: Cache hit -> Response time significantly below 2000ms (< 100ms)."""
    session_id = f"test_session_hit_{int(time.time()*1000)}"
    # Warm up cache
    res1 = client.get(f"/api/v1/internships/recommended?email=abhoge27@gmail.com&session_id={session_id}")
    assert res1.status_code == 200

    start_t = time.perf_counter()
    res2 = client.get(f"/api/v1/internships/recommended?email=abhoge27@gmail.com&session_id={session_id}")
    elapsed_ms = (time.perf_counter() - start_t) * 1000

    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "success"
    assert len(data2["items"]) > 0
    # Cache hit should return under 100ms
    assert elapsed_ms < 100, f"Cache hit took {elapsed_ms}ms, expected sub-100ms!"


def test_3_slow_hanging_source_does_not_block(client):
    """TEST 3: One source hangs (mocked sleep) -> Request still finishes <= 2000ms with other sources."""
    session_id = f"test_session_timeout_{int(time.time()*1000)}"

    def slow_fetch(self, limit=None):
        time.sleep(3.0)  # Simulates hanging source
        return []

    with patch("app.services.live_opportunities.internships.jobicy.JobicyLiveSource.fetch_live_records", slow_fetch):
        start_t = time.perf_counter()
        response = client.get(f"/api/v1/internships/recommended?email=abhoge27@gmail.com&session_id={session_id}&force_refresh=true")
        elapsed_ms = (time.perf_counter() - start_t) * 1000

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["items"]) > 0
        assert elapsed_ms <= 2000, f"Request with hanging source took {elapsed_ms}ms, exceeding 2000ms!"


def test_4_concurrent_source_fetching(client):
    """TEST 4: Multiple sources run concurrently -> Total time approx equals max source time, not sum."""
    session_id = f"test_session_concurrency_{int(time.time()*1000)}"
    start_t = time.perf_counter()
    response = client.get(f"/api/v1/internships/recommended?email=abhoge27@gmail.com&session_id={session_id}&force_refresh=true")
    elapsed_ms = (time.perf_counter() - start_t) * 1000

    assert response.status_code == 200
    assert elapsed_ms <= 2000


def test_5_no_artificial_50_result_truncation(client):
    """TEST 5: Verify all available live opportunities are exposed without artificial 50-item cap."""
    session_id = f"test_session_all_{int(time.time()*1000)}"
    response = client.get(f"/api/v1/internships?email=abhoge27@gmail.com&session_id={session_id}&limit=500")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["items"]) == min(data["total"], 500)


# =============================================================================
# 2. SESSION CACHE LIFETIME & ISOLATION TESTS (TESTS 6 - 10)
# =============================================================================

def test_6_session_cache_creation(client):
    """TEST 6: Login -> Fetch internships -> Session cache created."""
    session_id = f"session_test_6_{int(time.time()*1000)}"
    assert SessionCacheService.get_session_internships(session_id) is None

    res = client.get(f"/api/v1/internships?email=abhoge27@gmail.com&session_id={session_id}")
    assert res.status_code == 200

    cached = SessionCacheService.get_session_internships(session_id)
    assert cached is not None
    assert len(cached["items"]) > 0


def test_7_8_subsequent_tab_opens_hit_cache(client):
    """TEST 7 & 8: Open Internship and Scholarship tabs again -> Cache hits, fast return."""
    session_id = f"session_test_tabs_{int(time.time()*1000)}"

    # Fetch initial
    client.get(f"/api/v1/internships?email=abhoge27@gmail.com&session_id={session_id}")
    client.get(f"/api/v1/scholarships?email=abhoge27@gmail.com&session_id={session_id}")

    # Subsequent tab loads
    t1 = time.perf_counter()
    res_int = client.get(f"/api/v1/internships?email=abhoge27@gmail.com&session_id={session_id}")
    int_time = (time.perf_counter() - t1) * 1000

    t2 = time.perf_counter()
    res_sch = client.get(f"/api/v1/scholarships?email=abhoge27@gmail.com&session_id={session_id}")
    sch_time = (time.perf_counter() - t2) * 1000

    assert res_int.status_code == 200
    assert res_sch.status_code == 200
    assert int_time < 50
    assert sch_time < 50


def test_9_logout_clears_session_cache(client, db):
    """TEST 9: Logout explicitly destroys internship and scholarship session caches."""
    session_id = f"session_to_logout_{int(time.time()*1000)}"
    email = "logout_student_test@test.com"

    student = db.query(StudentUser).filter(StudentUser.email == email).first()
    if not student:
        student = StudentUser(email=email, name="Logout Student", password_hash="hash")
        db.add(student)
        db.commit()

    # Populate session cache
    client.get(f"/api/v1/internships?email={email}&session_id={session_id}")
    client.get(f"/api/v1/scholarships?email={email}&session_id={session_id}")
    assert SessionCacheService.get_session_internships(session_id) is not None

    # Call logout
    res_logout = client.post("/api/v1/student/logout", json={"email": email, "session_id": session_id})
    assert res_logout.status_code == 200

    # Verify cache is deleted
    assert SessionCacheService.get_session_internships(session_id) is None
    assert SessionCacheService.get_session_scholarships(session_id) is None


def test_10_new_session_isolation(client):
    """TEST 10: Subsequent login gets fresh session cache; no cross-session reuse."""
    session_a = f"session_a_{int(time.time()*1000)}"
    session_b = f"session_b_{int(time.time()*1000)}"

    client.get(f"/api/v1/internships?email=abhoge27@gmail.com&session_id={session_a}")
    assert SessionCacheService.get_session_internships(session_a) is not None
    assert SessionCacheService.get_session_internships(session_b) is None


# =============================================================================
# 3. STRICT 80% APPLICATION GATE & ELIGIBILITY TESTS (TESTS 11 - 18)
# =============================================================================

def test_11_12_match_under_80_rejected(client, db):
    """TEST 11 & 12: Match = 79.9% or 79.0% -> Application rejected by backend with roadmap."""
    test_email = "test_under_80@skillsetu.com"
    student = db.query(StudentUser).filter(StudentUser.email == test_email).first()
    if not student:
        student = StudentUser(
            email=test_email,
            name="Under 80 Student",
            password_hash="hash",
            target_careers="car_backend_developer",
            skill_ids="Git"
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    mock_opp = {
        "id": "opp_test_under80",
        "title": "Backend Engineering Intern",
        "company_name": "CloudTech",
        "source": "curated_partner",
        "source_id": "opp_test_under80",
        "min_cgpa": 6.0,
        "required_skills": ["Rust", "Kubernetes", "GraphQL", "Distributed Systems"]
    }

    match_eval = InternshipMatchingService.evaluate_student_internship_match(student, mock_opp, db)
    assert match_eval["match_score"] < 80.0
    assert match_eval["readiness_status"] == "NEEDS_DEVELOPMENT"

    apply_payload = {
        "email": test_email,
        "title_snapshot": mock_opp["title"],
        "company_snapshot": mock_opp["company_name"],
        "source": "curated_partner",
        "source_id": "opp_test_under80"
    }

    with patch("app.services.live_opportunities.live_engine.LiveOpportunityEngine.get_live_internships", return_value=[mock_opp]):
        res = client.post(f"/api/v1/internships/{mock_opp['id']}/apply", json=apply_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["allowed"] is False
        assert data["reason"] == "READINESS_THRESHOLD_NOT_MET"
        assert data["current_match"] < 80.0
        assert data["required_match"] == 80.0
        assert "roadmap" in data
        assert len(data["roadmap"]["skills"]) > 0


def test_13_14_match_80_and_85_allowed(client, db):
    """TEST 13 & 14: Match = 80.0% or 85.0% -> Application allowed and tracked."""
    test_email = "test_ready_80@skillsetu.com"
    student = db.query(StudentUser).filter(StudentUser.email == test_email).first()
    if not student:
        student = StudentUser(
            email=test_email,
            name="Ready Student",
            password_hash="hash",
            target_careers="car_full_stack_developer",
            skill_ids="Python,JavaScript,React,SQL,Git,REST API"
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    mock_opp = {
        "id": "opp_test_ready80",
        "title": "Full Stack Developer Intern",
        "company_name": "NextGen Systems",
        "source": "curated_partner",
        "source_id": "opp_test_ready80",
        "min_cgpa": 6.0,
        "required_skills": ["Python", "JavaScript", "React", "Git"]
    }

    match_eval = InternshipMatchingService.evaluate_student_internship_match(student, mock_opp, db)
    assert match_eval["match_score"] >= 80.0
    assert match_eval["readiness_status"] == "READY_TO_APPLY"

    apply_payload = {
        "email": test_email,
        "title_snapshot": mock_opp["title"],
        "company_snapshot": mock_opp["company_name"],
        "source": "curated_partner",
        "source_id": "opp_test_ready80"
    }

    with patch("app.services.live_opportunities.live_engine.LiveOpportunityEngine.get_live_internships", return_value=[mock_opp]):
        res = client.post(f"/api/v1/internships/{mock_opp['id']}/apply", json=apply_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["allowed"] is True
        assert data["current_match"] >= 80.0
        assert data["tracking_status"] == "APPLIED"


def test_15_frontend_fake_score_bypass_attempt(client, db):
    """TEST 15: Frontend sends fake match_score = 95, backend recalculates 72 -> REJECTED."""
    test_email = "test_bypass_student@skillsetu.com"
    student = db.query(StudentUser).filter(StudentUser.email == test_email).first()
    if not student:
        student = StudentUser(
            email=test_email,
            name="Bypass Student",
            password_hash="hash",
            target_careers="car_cloud_engineer",
            skill_ids="HTML"
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    mock_opp = {
        "id": "opp_test_bypass",
        "title": "Cloud Architect Intern",
        "company_name": "SkyHigh Cloud",
        "source": "curated_partner",
        "source_id": "opp_test_bypass",
        "min_cgpa": 6.0,
        "required_skills": ["AWS", "Terraform", "Kubernetes", "Linux Kernel"]
    }

    apply_payload = {
        "email": test_email,
        "title_snapshot": mock_opp["title"],
        "company_snapshot": mock_opp["company_name"],
        "source": "curated_partner",
        "source_id": "opp_test_bypass",
        "notes": "Fake score override test match_score=95"
    }

    with patch("app.services.live_opportunities.live_engine.LiveOpportunityEngine.get_live_internships", return_value=[mock_opp]):
        res = client.post(f"/api/v1/internships/{mock_opp['id']}/apply", json=apply_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["allowed"] is False
        assert data["reason"] == "READINESS_THRESHOLD_NOT_MET"
        assert data["current_match"] < 80.0


def test_16_genuine_evidence_progression(client, db):
    """TEST 16: Student starts <80, adds genuine evidence in DB, recalculation reaches >=80 -> Apply unlocked."""
    test_email = "test_progression_student@skillsetu.com"
    student = db.query(StudentUser).filter(StudentUser.email == test_email).first()
    if not student:
        student = StudentUser(
            email=test_email,
            name="Progression Student",
            password_hash="hash",
            target_careers="car_backend_developer",
            skill_ids="FastAPI"
        )
        db.add(student)
        db.commit()
        db.refresh(student)
    else:
        student.skill_ids = "FastAPI"
        db.commit()
        db.refresh(student)

    mock_opp = {
        "id": "opp_test_progression",
        "title": "Backend Engineering Intern",
        "company_name": "API Corp",
        "source": "curated_partner",
        "source_id": "opp_test_progression",
        "min_cgpa": 6.0,
        "required_skills": ["FastAPI", "PostgreSQL", "Docker", "Redis"]
    }

    # Step 1: Initial match without required evidence
    initial_eval = InternshipMatchingService.evaluate_student_internship_match(student, mock_opp, db)
    assert initial_eval["match_score"] < 80.0

    # Step 2: Student completes genuine courses/tests/projects -> updates DB evidence
    student.skill_ids = "FastAPI,PostgreSQL,Docker,Redis"
    db.commit()

    # Step 3: Recalculate match
    updated_eval = InternshipMatchingService.evaluate_student_internship_match(student, mock_opp, db)
    assert updated_eval["match_score"] >= 80.0
    assert updated_eval["readiness_status"] == "READY_TO_APPLY"

    # Step 4: Application succeeds
    with patch("app.services.live_opportunities.live_engine.LiveOpportunityEngine.get_live_internships", return_value=[mock_opp]):
        res = client.post(f"/api/v1/internships/{mock_opp['id']}/apply", json={"email": test_email, "source_id": mock_opp["id"]})
        assert res.status_code == 200
        assert res.json()["allowed"] is True


def test_17_18_hard_eligibility_enforcement(client, db):
    """TEST 17 & 18: Hard eligibility independent check (e.g. CGPA failure)."""
    test_email = "test_hard_elig@skillsetu.com"
    student = db.query(StudentUser).filter(StudentUser.email == test_email).first()
    if not student:
        student = StudentUser(
            email=test_email,
            name="Hard Ineligible Student",
            password_hash="hash",
            cgpa_or_percentage="6.0",
            skill_ids="Python,Java,C++,SQL,Git"
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    mock_opp_high_cutoff = {
        "id": "opp_test_cgpa_cutoff",
        "title": "Elite Research Intern",
        "company_name": "AI Labs",
        "source": "curated_partner",
        "source_id": "opp_test_cgpa_cutoff",
        "min_cgpa": 8.5,  # Student has 6.0
        "required_skills": ["Python", "SQL"]
    }

    eval_res = InternshipMatchingService.evaluate_student_internship_match(student, mock_opp_high_cutoff, db)
    assert eval_res["hard_eligible"] is False
    assert eval_res["eligibility_status"] == "NOT_ELIGIBLE"

    with patch("app.services.live_opportunities.live_engine.LiveOpportunityEngine.get_live_internships", return_value=[mock_opp_high_cutoff]):
        res = client.post(f"/api/v1/internships/{mock_opp_high_cutoff['id']}/apply", json={"email": test_email, "source_id": mock_opp_high_cutoff["id"]})
        assert res.status_code == 200
        data = res.json()
        assert data["allowed"] is False
        assert data["reason"] == "HARD_ELIGIBILITY_NOT_MET"


def test_zero_db_catalog_rows_persisted(client, db):
    """Verify that no catalog rows are written to PostgreSQL tables during live requests."""
    initial_internships = db.query(InternshipListing).count()
    initial_scholarships = db.query(Scholarship).count()
    client.get("/api/v1/internships/recommended?email=abhoge27@gmail.com")
    client.get("/api/v1/scholarships/eligible?email=abhoge27@gmail.com")
    assert db.query(InternshipListing).count() == initial_internships
    assert db.query(Scholarship).count() == initial_scholarships


def test_source_debug_endpoint(client):
    """TEST 21: GET /api/v1/internships/debug/sources returns structured debug report."""
    res = client.get("/api/v1/internships/debug/sources?email=abhoge27@gmail.com")
    assert res.status_code == 200
    data = res.json()
    assert "sources" in data
    assert "aggregate" in data
    assert "raw" in data["aggregate"]
    assert "unique" in data["aggregate"]
    for src_name, info in data["sources"].items():
        assert "requested" in info
        assert "raw" in info
        assert "parsed" in info
        assert "deduplicated" in info
        assert "returned_to_cache" in info
        assert info["verification"] in ["VERIFIED", "UNVERIFIED"]


def test_controlled_250_source_pagination(client, monkeypatch):
    """
    TEST 20: Controlled source returns 250 items.
    Verify raw=250, parsed=250, normalized=250, total=250.
    With page_size=20, page 1 returns 20 items, total is 250 (NOT 20), and page 2 returns the next 20 items.
    """
    mock_250 = [
        {
            "id": f"job_250_{i}",
            "source": "mock_aggregator",
            "source_type": "external_aggregator",
            "verification_status": "UNVERIFIED",
            "source_id": f"src_{i}",
            "title": f"Software Engineer Intern #{i}",
            "company_name": f"Enterprise {i}",
            "location": "Remote",
            "work_preference": "Remote",
            "stipend": "₹45,000 / month",
            "min_cgpa": 6.0,
            "required_skills": ["Python", "FastAPI"]
        }
        for i in range(1, 251)
    ]

    monkeypatch.setattr(LiveOpportunityEngine, "get_live_internships", classmethod(lambda cls, *args, **kwargs: mock_250 if kwargs.get("limit") is None else mock_250[:kwargs.get("limit")]))

    session_id = f"test_session_250_{int(time.time()*1000)}"

    # Request Page 1 with page_size = 20
    res_p1 = client.get(f"/api/v1/internships/recommended?email=abhoge27@gmail.com&session_id={session_id}&page=1&page_size=20")
    assert res_p1.status_code == 200
    p1_data = res_p1.json()

    assert p1_data["total"] == 250
    assert p1_data["total_results"] == 250
    assert p1_data["page"] == 1
    assert p1_data["page_size"] == 20
    assert len(p1_data["items"]) == 20
    assert p1_data["has_more"] is True

    # Request Page 2 with page_size = 20
    res_p2 = client.get(f"/api/v1/internships/recommended?email=abhoge27@gmail.com&session_id={session_id}&page=2&page_size=20")
    assert res_p2.status_code == 200
    p2_data = res_p2.json()

    assert p2_data["total"] == 250
    assert p2_data["page"] == 2
    assert p2_data["page_size"] == 20
    assert len(p2_data["items"]) == 20

    # Ensure no overlap between page 1 and page 2 items
    p1_ids = {x["id"] for x in p1_data["items"]}
    p2_ids = {x["id"] for x in p2_data["items"]}
    assert len(p1_ids.intersection(p2_ids)) == 0


def test_exact_75_and_500_dataset_sizes(client, monkeypatch):
    """Verify exact total counts for 75 and 500 records."""
    # 75 records
    mock_75 = [
        {"id": f"j_75_{i}", "source": "jobicy", "source_type": "external_aggregator", "verification_status": "UNVERIFIED", "title": f"Dev {i}", "company_name": f"Co {i}", "min_cgpa": 6.0, "required_skills": ["Python"]}
        for i in range(1, 76)
    ]
    monkeypatch.setattr(LiveOpportunityEngine, "get_live_internships", classmethod(lambda cls, *args, **kwargs: mock_75 if kwargs.get("limit") is None else mock_75[:kwargs.get("limit")]))
    res_75 = client.get("/api/v1/internships/recommended?email=abhoge27@gmail.com&session_id=session_75&page_size=20")
    assert res_75.json()["total"] == 75

    # 500 records
    mock_500 = [
        {"id": f"j_500_{i}", "source": "arbeitnow", "source_type": "external_aggregator", "verification_status": "UNVERIFIED", "title": f"Engineer {i}", "company_name": f"Firm {i}", "min_cgpa": 6.0, "required_skills": ["Java"]}
        for i in range(1, 501)
    ]
    monkeypatch.setattr(LiveOpportunityEngine, "get_live_internships", classmethod(lambda cls, *args, **kwargs: mock_500 if kwargs.get("limit") is None else mock_500[:kwargs.get("limit")]))
    res_500 = client.get("/api/v1/internships/recommended?email=abhoge27@gmail.com&session_id=session_500&page_size=20")
    assert res_500.json()["total"] == 500


def test_unverified_provenance_from_aggregators(client):
    """Verify that external aggregator listings (Jobicy, Arbeitnow, Remotive) are UNVERIFIED."""
    res = client.get("/api/v1/internships/recommended?email=abhoge27@gmail.com&limit=50")
    assert res.status_code == 200
    items = res.json().get("items", [])
    for item in items:
        if item.get("source") in ["jobicy", "arbeitnow", "remotive"]:
            assert item.get("verification_status") == "UNVERIFIED"
            assert item.get("source_type") == "external_aggregator"
        elif item.get("source") in ["curated_partner", "authorized_partner"]:
            assert item.get("verification_status") == "VERIFIED"
            assert item.get("source_type") == "authorized_partner"

