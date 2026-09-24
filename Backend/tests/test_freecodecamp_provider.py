import pytest
import asyncio

from app.services.course_providers.freecodecamp import FreeCodeCampProvider
from app.schemas.course import NormalizedCourse


def test_freecodecamp_is_configured():
    """Verify freeCodeCamp provider is open and always configured without requiring API keys."""
    provider = FreeCodeCampProvider()
    assert provider.is_configured() is True
    assert provider.provider_slug == "freecodecamp"
    assert provider.provider_name == "freeCodeCamp"
    assert provider.base_url == "https://www.freecodecamp.org"


def test_freecodecamp_fetch_courses():
    """Verify fetching official freeCodeCamp curriculum courses."""
    provider = FreeCodeCampProvider()
    courses = asyncio.run(provider.fetch_courses(limit=5, offset=0))

    assert len(courses) == 5
    for c in courses:
        assert isinstance(c, NormalizedCourse)
        assert c.provider_slug == "freecodecamp"
        assert c.external_id.startswith("freecodecamp:")
        assert c.title.endswith("Certification")
        assert c.institution == "freeCodeCamp"
        assert c.price == 0.0
        assert c.certificate_available is True
        assert c.url.startswith("https://www.freecodecamp.org/learn/")


def test_freecodecamp_fetch_course_details():
    """Verify fetching a specific curriculum course by external ID."""
    provider = FreeCodeCampProvider()
    course = asyncio.run(provider.fetch_course_details("freecodecamp:responsive-web-design"))

    assert course is not None
    assert course.external_id == "freecodecamp:responsive-web-design"
    assert course.title == "Responsive Web Design Certification"
    assert "HTML5" in course.description
    assert course.duration == 300.0
    assert course.duration_unit == "hours"


def test_freecodecamp_search_courses():
    """Verify searching freeCodeCamp curriculum by skill/topic keyword."""
    provider = FreeCodeCampProvider()
    py_courses = asyncio.run(provider.search_courses(query="python", limit=5))

    assert len(py_courses) >= 1
    titles = [c.title for c in py_courses]
    assert any("Python" in t for t in titles)
