import pytest
import asyncio

from app.services.course_providers.nptel import NPTELProvider
from app.schemas.course import NormalizedCourse


def test_nptel_provider_is_configured():
    """Verify NPTEL provider properties and configuration."""
    provider = NPTELProvider()
    assert provider.is_configured() is True
    assert provider.provider_slug == "nptel"
    assert provider.provider_name == "NPTEL"
    assert provider.base_url == "https://nptel.ac.in"
