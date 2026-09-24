import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from main import app
from app.database import SessionLocal, engine
from app import models
from app.services import course_service
from app.schemas.course import (
    NormalizedCourse,
    CourseSkillCreate,
    CourseCareerCreate,
)
from app.services.course_providers import (
    get_course_provider,
    NPTELProvider,
    YouTubeProvider,
    FreeCodeCampProvider,
    PROVIDER_REGISTRY,
)


@pytest.fixture(scope="function")
def db_session():
    """Provides a transactional database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def client():
    """FastAPI Test Client."""
    return TestClient(app)


# ===========================================================================
# 1. Provider Creation & Seeding Tests
# ===========================================================================
def test_seed_default_providers(db_session: Session):
    """Verify that default providers are seeded idempotently."""
    providers = course_service.seed_default_providers(db_session)
    slugs = [p.slug for p in providers]

    assert "nptel" in slugs
    assert "youtube" in slugs
    assert "freecodecamp" in slugs

    # Verify no duplicates on second seed
    providers_second = course_service.seed_default_providers(db_session)
    assert len(providers_second) == len(providers)


# ===========================================================================
# 2. Course Creation & Idempotent Upsert Tests
# ===========================================================================
def test_course_creation_and_upsert(db_session: Session):
    """Verify course creation and fields."""
    normalized = NormalizedCourse(
        provider_slug="nptel",
        external_id="noc24-cs01",
        title="Introduction to Machine Learning",
        description="Foundational ML concepts by IIT Kharagpur",
        url="https://nptel.ac.in/courses/106105152",
        instructor="Prof. Sudeshna Sarkar",
        institution="IIT Kharagpur",
        language="English",
        level="Intermediate",
        duration=12.0,
        duration_unit="weeks",
        price=Decimal("1000.00"),
        currency="INR",
        certificate_available=True,
        rating=4.8,
        review_count=150,
        thumbnail_url="https://nptel.ac.in/assets/ml.png",
    )

    course = course_service.upsert_course(db_session, normalized)
    assert course.id is not None
    assert course.title == "Introduction to Machine Learning"
    assert course.external_id == "noc24-cs01"
    assert course.duration == 12.0
    assert course.price == Decimal("1000.00")
    assert course.certificate_available is True
    assert course.provider.slug == "nptel"


def test_duplicate_protection_idempotency(db_session: Session):
    """
    Inserting the same (provider, external_id) twice must update the existing
    course and NOT create duplicate rows.
    """
    course1_data = NormalizedCourse(
        provider_slug="nptel",
        external_id="test-dup-101",
        title="Original Title",
        url="https://nptel.ac.in/test1",
    )
    c1 = course_service.upsert_course(db_session, course1_data)
    initial_id = c1.id

    # Upsert with updated title
    course2_data = NormalizedCourse(
        provider_slug="nptel",
        external_id="test-dup-101",
        title="Updated Title V2",
        url="https://nptel.ac.in/test1-updated",
    )
    c2 = course_service.upsert_course(db_session, course2_data)

    assert c2.id == initial_id
    assert c2.title == "Updated Title V2"
    assert c2.url == "https://nptel.ac.in/test1-updated"

    # Count records with this external_id for nptel
    provider = course_service.get_provider_by_slug(db_session, "nptel")
    count = db_session.query(models.Course).filter(
        models.Course.provider_id == provider.id,
        models.Course.external_id == "test-dup-101"
    ).count()
    assert count == 1

    # Cleanup test courses
    db_session.query(models.Course).filter(
        models.Course.provider_id == provider.id,
        models.Course.external_id == "test-dup-101"
    ).delete()
    db_session.commit()


def test_cross_provider_identical_external_id(db_session: Session):
    """
    Verify that NPTEL + '123' and Udemy + '123' can coexist as two distinct courses.
    """
    nptel_course = course_service.upsert_course(
        db_session,
        NormalizedCourse(
            provider_slug="nptel",
            external_id="same-id-123",
            title="NPTEL Python",
            url="https://nptel.ac.in/python",
        )
    )

    udemy_course = course_service.upsert_course(
        db_session,
        NormalizedCourse(
            provider_slug="udemy",
            external_id="same-id-123",
            title="Udemy Python Masterclass",
            url="https://udemy.com/python",
        )
    )

    assert nptel_course.id != udemy_course.id
    assert nptel_course.external_id == udemy_course.external_id
    assert nptel_course.provider.slug == "nptel"
    assert udemy_course.provider.slug == "udemy"

    # Cleanup test courses
    db_session.query(models.Course).filter(models.Course.external_id == "same-id-123").delete()
    db_session.commit()


# ===========================================================================
# 3. Course Skills & Course Careers Relationships
# ===========================================================================
def test_course_skill_relationship(db_session: Session):
    """Verify course to ESCO skill mapping."""
    db_session.query(models.Course).filter(models.Course.external_id == "coursera-react-01").delete()
    db_session.commit()

    # Ensure or get an ESCO skill
    esco_skill = db_session.query(models.EscoSkill).first()

    course = course_service.upsert_course(
        db_session,
        NormalizedCourse(
            provider_slug="coursera",
            external_id="coursera-react-01",
            title="React Basics",
            url="https://coursera.org/react",
            skills=[
                CourseSkillCreate(
                    skill_name="React",
                    esco_skill_id=esco_skill.id if esco_skill else None,
                    confidence=0.95,
                    source="keyword",
                )
            ]
        )
    )

    loaded_course = course_service.get_course(db_session, course.id)
    assert len(loaded_course.skills) >= 1
    assert loaded_course.skills[0].skill_name == "React"
    assert loaded_course.skills[0].confidence == 0.95

    # Cleanup
    db_session.query(models.CourseSkill).filter(models.CourseSkill.course_id == course.id).delete()
    db_session.query(models.Course).filter(models.Course.id == course.id).delete()
    db_session.commit()


def test_course_career_relationship(db_session: Session):
    """Verify course to SkillSetu Career mapping."""
    # Ensure or get a Career
    career = db_session.query(models.SkillSetuCareer).first()
    career_id = career.id if career else "car_frontend_developer"

    # If career doesn't exist, create temporary one
    if not career:
        temp_career = models.SkillSetuCareer(
            id=career_id,
            name="Frontend Developer",
            category="Software Engineering",
        )
        db_session.add(temp_career)
        db_session.commit()

    course = course_service.upsert_course(
        db_session,
        NormalizedCourse(
            provider_slug="coursera",
            external_id="coursera-frontend-01",
            title="Frontend Specialization",
            url="https://coursera.org/frontend",
            careers=[
                CourseCareerCreate(
                    career_id=career_id,
                    relevance_score=0.92,
                )
            ]
        )
    )

    loaded_course = course_service.get_course(db_session, course.id)
    assert len(loaded_course.careers) >= 1
    assert loaded_course.careers[0].career_id == career_id
    assert loaded_course.careers[0].relevance_score == 0.92

    # Cleanup
    db_session.query(models.CourseCareer).filter(models.CourseCareer.course_id == course.id).delete()
    db_session.query(models.Course).filter(models.Course.id == course.id).delete()
    db_session.commit()


# ===========================================================================
# 4. Provider Abstraction & Connector Interface Tests
# ===========================================================================
def test_provider_connectors_interface():
    """Verify provider abstraction factory and classes for 3 active providers."""
    nptel = get_course_provider("nptel")
    assert isinstance(nptel, NPTELProvider)
    assert nptel.provider_slug == "nptel"
    assert nptel.provider_name == "NPTEL"

    youtube = get_course_provider("youtube")
    assert isinstance(youtube, YouTubeProvider)

    freecodecamp = get_course_provider("freecodecamp")
    assert isinstance(freecodecamp, FreeCodeCampProvider)

    with pytest.raises(ValueError):
        get_course_provider("invalid_provider_xyz")

    with pytest.raises(ValueError):
        get_course_provider("coursera")


def test_provider_connectors_implemented():
    """Verify connectors for nptel, youtube, freecodecamp implement BaseCourseProvider interface."""
    nptel = get_course_provider("nptel")
    youtube = get_course_provider("youtube")
    freecodecamp = get_course_provider("freecodecamp")

    assert nptel.provider_slug == "nptel"
    assert youtube.provider_slug == "youtube"
    assert freecodecamp.provider_slug == "freecodecamp"
    assert hasattr(nptel, "fetch_courses")
    assert hasattr(youtube, "fetch_courses")
    assert hasattr(freecodecamp, "fetch_courses")


# ===========================================================================
# 5. API Endpoints Tests
# ===========================================================================
def test_api_list_providers(client: TestClient):
    """GET /api/v1/courses/providers"""
    response = client.get("/api/v1/courses/providers")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["count"] >= 3
    slugs = [p["slug"] for p in data["data"]]
    assert "nptel" in slugs
    assert "youtube" in slugs
    assert "freecodecamp" in slugs


def test_api_get_provider_courses(client: TestClient):
    """GET /api/v1/courses/providers/{slug}"""
    response = client.get("/api/v1/courses/providers/nptel")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["provider"]["slug"] == "nptel"
    assert "data" in data
    assert "page" in data


def test_api_list_courses_and_filters(client: TestClient):
    """GET /api/v1/courses with pagination and filtering"""
    response = client.get("/api/v1/courses?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "total" in data
    assert "data" in data
    assert len(data["data"]) <= 10

    # Test filtering by provider
    filtered_res = client.get("/api/v1/courses?provider=nptel")
    assert filtered_res.status_code == 200
    filtered_data = filtered_res.json()
    for item in filtered_data["data"]:
        assert item["provider"]["slug"] == "nptel"


def test_api_get_course_detail(client: TestClient, db_session: Session):
    """GET /api/v1/courses/{id}"""
    course = db_session.query(models.Course).first()
    assert course is not None

    response = client.get(f"/api/v1/courses/{course.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["id"] == course.id
    assert data["data"]["title"] == course.title


def test_api_course_not_found(client: TestClient):
    """GET /api/v1/courses/99999999"""
    response = client.get("/api/v1/courses/99999999")
    assert response.status_code == 404


# ===========================================================================
# 6. Migration Test
# ===========================================================================
def test_alembic_migration_upgrade_and_downgrade():
    """Verify that Alembic migrations run upgrade and downgrade cleanly on an isolated engine."""
    from alembic.config import Config
    from alembic import command
    import tempfile
    import os

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_db_path = tmp.name

    try:
        sqlite_url = f"sqlite:///{tmp_db_path}"
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", sqlite_url)

        # Test upgrade to head on isolated database
        command.upgrade(alembic_cfg, "head")

        # Test downgrade to base
        command.downgrade(alembic_cfg, "base")

        # Re-upgrade to ensure idempotency
        command.upgrade(alembic_cfg, "head")
    finally:
        if os.path.exists(tmp_db_path):
            os.remove(tmp_db_path)
