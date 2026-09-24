import pytest
import asyncio
from unittest.mock import patch, MagicMock
from decimal import Decimal
import httpx
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal
from app.services import course_service
from app.schemas.course import NormalizedCourse
from app.services.course_providers.nptel import (
    NPTELProvider,
    parse_sveltekit_data,
    clean_html_text,
    normalize_duration,
    calculate_content_hash,
)
from app.workers.sync_nptel import run_nptel_sync


@pytest.fixture(scope="function")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===========================================================================
# 1. SvelteKit & HTML Parsing Tests
# ===========================================================================
SAMPLE_SVELTEKIT_CATALOG = {
    "type": "data",
    "nodes": [
        None,
        {
            "type": "data",
            "data": [
                {"courses": 1},
                [2, 3],
                {
                    "id": 4,
                    "title": 5,
                    "instituteName": 6,
                    "professor": 7,
                    "contentType": 8,
                },
                {
                    "id": 9,
                    "title": 10,
                    "instituteName": 11,
                    "professor": 12,
                    "contentType": 8,
                },
                106105152,
                "Introduction to Machine Learning",
                "IIT Kharagpur",
                "Prof. Sudeshna Sarkar",
                "Video",
                106106184,
                "Deep Learning",
                "IIT Madras",
                "Prof. Mitesh Khapra",
            ]
        }
    ]
}

SAMPLE_SVELTEKIT_DETAIL = {
    "type": "data",
    "nodes": [
        None,
        {
            "type": "data",
            "data": [
                {"courseOutline": 1},
                {
                    "nocCourse": 2,
                    "title": 3,
                    "professor": 4,
                    "instituteName": 5,
                    "syllabus": 6,
                    "units": 7,
                },
                True,
                "Introduction to Machine Learning",
                "Prof. Sudeshna Sarkar",
                "IIT Kharagpur",
                {
                    "courseId": 8,
                    "title": 3,
                    "instructor": 4,
                    "institute": 5,
                    "meta": 9,
                    "aboutHtml": 10,
                    "weeks": 11,
                },
                [],
                "106105152",
                [12, 13, 14],
                "<p>Fundamental machine learning concepts.<br/>Algorithms covered.</p>",
                [15, 16],
                {"label": 17, "value": 18},
                {"label": 19, "value": 20},
                {"label": 21, "value": 22},
                {"week": 23, "topic": 24},
                {"week": 25, "topic": 26},
                "Duration",
                "8 weeks",
                "Level",
                "Undergraduate",
                "Language",
                "English",
                "Week 1",
                "Linear Regression and Basics",
                "Week 2",
                "Decision Trees and Ensembles",
            ]
        }
    ]
}


def test_sveltekit_catalog_parser():
    parsed = parse_sveltekit_data(SAMPLE_SVELTEKIT_CATALOG)
    assert parsed is not None
    assert "courses" in parsed
    courses = parsed["courses"]
    assert len(courses) == 2
    assert courses[0]["id"] == 106105152
    assert courses[0]["title"] == "Introduction to Machine Learning"
    assert courses[0]["professor"] == "Prof. Sudeshna Sarkar"
    assert courses[1]["id"] == 106106184
    assert courses[1]["title"] == "Deep Learning"


def test_sveltekit_detail_parser():
    parsed = parse_sveltekit_data(SAMPLE_SVELTEKIT_DETAIL)
    assert parsed is not None
    assert "courseOutline" in parsed
    outline = parsed["courseOutline"]
    assert outline["title"] == "Introduction to Machine Learning"
    assert outline["professor"] == "Prof. Sudeshna Sarkar"
    syllabus = outline["syllabus"]
    assert syllabus["aboutHtml"] == "<p>Fundamental machine learning concepts.<br/>Algorithms covered.</p>"
    assert len(syllabus["weeks"]) == 2
    assert syllabus["weeks"][0]["topic"] == "Linear Regression and Basics"


def test_clean_html_text():
    raw_html = "<div><h3>Title</h3><p>Hello <b>World</b>!</p><br/><ul><li>Item 1</li><li>Item 2</li></ul></div>"
    cleaned = clean_html_text(raw_html)
    assert "<b>" not in cleaned
    assert "<h3>" not in cleaned
    assert "Title" in cleaned
    assert "Hello World!" in cleaned
    assert "Item 1" in cleaned


def test_normalize_duration():
    assert normalize_duration("12 weeks") == (12.0, "weeks")
    assert normalize_duration("8 Weeks") == (8.0, "weeks")
    assert normalize_duration("40 hours") == (40.0, "hours")
    assert normalize_duration("30 mins") == (30.0, "minutes")
    assert normalize_duration("4") == (4.0, "weeks")
    assert normalize_duration(None) == (None, None)
    assert normalize_duration("") == (None, None)


def test_deterministic_content_hash():
    fields_a = {
        "title": "Machine Learning",
        "description": "Intro course",
        "instructor": "Prof. Sarkar",
        "institution": "IITKGP",
        "level": "Undergraduate",
        "language": "English",
        "duration": 8.0,
        "duration_unit": "weeks",
        "syllabus": "Week 1: Intro",
    }
    hash_a1 = calculate_content_hash(fields_a)
    hash_a2 = calculate_content_hash(fields_a)
    assert hash_a1 == hash_a2

    # Change description -> hash changes
    fields_b = dict(fields_a, description="Updated course syllabus")
    hash_b = calculate_content_hash(fields_b)
    assert hash_a1 != hash_b


# ===========================================================================
# 2. Mocked Provider Connector Tests
# ===========================================================================
def test_nptel_fetch_courses_mocked():
    provider = NPTELProvider(delay_seconds=0.0)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.headers = {"content-type": "application/json"}
    mock_resp.json.return_value = SAMPLE_SVELTEKIT_CATALOG

    async def _run():
        with patch.object(provider, "_make_request", return_value=mock_resp):
            courses = await provider.fetch_courses(limit=10)
            assert len(courses) == 2
            assert courses[0].external_id == "106105152"
            assert courses[0].title == "Introduction to Machine Learning"
            assert courses[0].instructor == "Prof. Sudeshna Sarkar"
            assert courses[0].institution == "IIT Kharagpur"

    asyncio.run(_run())


def test_nptel_fetch_course_details_mocked():
    provider = NPTELProvider(delay_seconds=0.0)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.headers = {"content-type": "application/json"}
    mock_resp.json.return_value = SAMPLE_SVELTEKIT_DETAIL

    async def _run():
        with patch.object(provider, "_make_request", return_value=mock_resp):
            course = await provider.fetch_course_details("106105152")
            assert course is not None
            assert course.external_id == "106105152"
            assert course.title == "Introduction to Machine Learning"
            assert course.duration == 8.0
            assert course.duration_unit == "weeks"
            assert course.level == "Undergraduate"
            assert course.language == "English"
            assert course.content_hash is not None
            assert "Fundamental machine learning concepts" in (course.description or "")

    asyncio.run(_run())


def test_nptel_fetch_course_details_404():
    provider = NPTELProvider(delay_seconds=0.0)

    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_resp.headers = {"content-type": "text/html"}

    async def _run():
        with patch.object(provider, "_make_request", return_value=mock_resp):
            course = await provider.fetch_course_details("nonexistent_id")
            assert course is None

    asyncio.run(_run())


# ===========================================================================
# 3. Incremental Sync & Duplicate Prevention Tests
# ===========================================================================
def test_incremental_sync_and_hash_detection(db_session: Session):
    course_service.seed_default_providers(db_session)
    prov = course_service.get_provider_by_slug(db_session, "nptel")
    test_ext_id = "sync-test-unique-999"
    
    # Cleanup any previous runs
    db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
    db_session.commit()

    c1_data = NormalizedCourse(
        provider_slug="nptel",
        external_id=test_ext_id,
        title="Original NPTEL Course",
        description="Version 1",
        url=f"https://nptel.ac.in/courses/{test_ext_id}",
        content_hash="hash_v1",
    )
    c1, status1 = course_service.upsert_course_with_status(db_session, c1_data)
    assert status1 == "created"
    assert c1.title == "Original NPTEL Course"

    # Upsert with unchanged hash -> status 'unchanged'
    c2, status2 = course_service.upsert_course_with_status(db_session, c1_data)
    assert status2 == "unchanged"
    assert c2.id == c1.id

    # Upsert with new hash -> status 'updated'
    c3_data = NormalizedCourse(
        provider_slug="nptel",
        external_id=test_ext_id,
        title="Updated NPTEL Course",
        description="Version 2 with new topics",
        url=f"https://nptel.ac.in/courses/{test_ext_id}",
        content_hash="hash_v2",
    )
    c3, status3 = course_service.upsert_course_with_status(db_session, c3_data)
    assert status3 == "updated"
    assert c3.id == c1.id
    assert c3.title == "Updated NPTEL Course"

    # Cleanup
    db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
    db_session.commit()


# ===========================================================================
# 4. Sync Worker & Dry Run Tests
# ===========================================================================
def test_sync_worker_dry_run_and_live(db_session: Session):
    test_ext_id = "worker-test-unique-888"
    db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
    db_session.commit()

    mock_course = NormalizedCourse(
        provider_slug="nptel",
        external_id=test_ext_id,
        title="Worker Test Course",
        description="Worker test description",
        url=f"https://nptel.ac.in/courses/{test_ext_id}",
        content_hash="mock_hash_101",
    )

    with patch.object(NPTELProvider, "fetch_courses", return_value=[mock_course]), \
         patch.object(NPTELProvider, "fetch_course_details", return_value=mock_course):

        # 1. Dry run
        dry_stats = asyncio.run(run_nptel_sync(dry_run=True, limit=1))
        assert dry_stats["dry_run"] is True
        assert dry_stats["courses_created"] == 1
        assert dry_stats["status"] == "completed"

        # Verify DB does NOT contain the course after dry-run
        prov = course_service.get_provider_by_slug(db_session, "nptel")
        in_db = db_session.query(models.Course).filter(
            models.Course.provider_id == prov.id,
            models.Course.external_id == test_ext_id
        ).first()
        assert in_db is None

        # 2. Live sync
        live_stats = asyncio.run(run_nptel_sync(dry_run=False, limit=1))
        assert live_stats["dry_run"] is False
        assert live_stats["courses_created"] == 1
        assert live_stats["status"] == "completed"

        # Verify DB now contains the course
        in_db = db_session.query(models.Course).filter(
            models.Course.provider_id == prov.id,
            models.Course.external_id == test_ext_id
        ).first()
        assert in_db is not None
        assert in_db.title == "Worker Test Course"

        # Cleanup
        db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
        db_session.commit()
