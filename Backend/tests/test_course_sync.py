import pytest
import asyncio
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.database import SessionLocal
from main import app
from app.services import course_sync_service
from app.schemas.course import NormalizedCourse
from app import models


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
    """FastAPI TestClient fixture."""
    return TestClient(app)


def test_get_providers_status_structure(db_session: Session):
    """Verify provider status endpoint returns structured health data for exactly 3 providers."""
    status_report = course_sync_service.get_providers_status(db_session)
    assert set(status_report.keys()) == {"nptel", "youtube", "freecodecamp"}

    assert status_report["nptel"]["name"] == "NPTEL"
    assert status_report["youtube"]["name"] == "YouTube"
    assert status_report["freecodecamp"]["name"] == "freeCodeCamp"
    assert "configured" in status_report["freecodecamp"]
    assert "course_count" in status_report["freecodecamp"]
    assert "status" in status_report["freecodecamp"]


def test_sync_provider_dry_run(db_session: Session):
    """Verify dry_run mode counts candidates without modifying database."""
    mock_course = NormalizedCourse(
        provider_slug="freecodecamp",
        title="Mock Dry Run Course",
        url="https://www.freecodecamp.org/learn/dry-run",
        external_id="freecodecamp:dry_run_test"
    )

    with patch("app.services.course_providers.freecodecamp.FreeCodeCampProvider.fetch_courses", return_value=[mock_course]):
        res = asyncio.run(course_sync_service.sync_provider(
            provider_slug="freecodecamp",
            limit=5,
            dry_run=True,
            db=db_session
        ))

    assert res["status"] == "dry_run_completed"
    assert res["courses_created"] == 1
    assert res["dry_run"] is True


def test_sync_provider_not_configured(db_session: Session):
    """Verify unconfigured provider returns clean not_configured status."""
    with patch("app.services.course_providers.youtube.YouTubeProvider.is_configured", return_value=False):
        res = asyncio.run(course_sync_service.sync_provider(
            provider_slug="youtube",
            limit=5,
            db=db_session
        ))

    assert res["status"] == "not_configured"
    assert res["courses_created"] == 0


def test_api_provider_status_endpoint(client: TestClient):
    """Test GET /api/v1/courses/providers/status."""
    response = client.get("/api/v1/courses/providers/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "providers" in data
    assert "nptel" in data["providers"]
    assert "youtube" in data["providers"]
    assert "freecodecamp" in data["providers"]
    assert "coursera" not in data["providers"]
    assert "udemy" not in data["providers"]


def test_api_trigger_provider_sync_dry_run(client: TestClient):
    """Test POST /api/v1/courses/providers/freecodecamp/sync?dry_run=true."""
    response = client.post("/api/v1/courses/providers/freecodecamp/sync?dry_run=true&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "freecodecamp"
    assert data["dry_run"] is True
