import pytest
import asyncio
from unittest.mock import patch, MagicMock
import httpx

from app.config import settings
from app.services.course_providers.youtube import (
    YouTubeProvider,
    parse_iso_duration,
)
from app.schemas.course import NormalizedCourse


MOCK_YOUTUBE_SEARCH_RESPONSE = {
    "items": [
        {
            "id": {
                "kind": "youtube#video",
                "videoId": "rfscVS0vtbw"
            },
            "snippet": {
                "publishedAt": "2020-01-01T00:00:00Z",
                "channelTitle": "freeCodeCamp.org",
                "title": "Learn Python - Full Course for Beginners [Tutorial]",
                "description": "This course will give you a full introduction into all of the core concepts in python.",
                "thumbnails": {
                    "high": {"url": "https://i.ytimg.com/vi/rfscVS0vtbw/hqdefault.jpg"}
                },
                "defaultAudioLanguage": "en"
            }
        }
    ]
}

MOCK_YOUTUBE_VIDEOS_RESPONSE = {
    "items": [
        {
            "id": "rfscVS0vtbw",
            "snippet": {
                "channelTitle": "freeCodeCamp.org",
                "title": "Learn Python - Full Course for Beginners [Tutorial]",
                "description": "This course will give you a full introduction into all of the core concepts in python.",
            },
            "contentDetails": {
                "duration": "PT4H26M52S"
            },
            "statistics": {
                "viewCount": "42000000",
                "commentCount": "35000"
            }
        }
    ]
}


def test_parse_iso_duration():
    """Verify ISO 8601 duration parser accurately computes hours and minutes."""
    hours, unit = parse_iso_duration("PT4H26M52S")
    assert unit == "hours"
    assert hours == 4.45

    mins, unit_min = parse_iso_duration("PT45M30S")
    assert unit_min == "minutes"
    assert mins == 45.5

    assert parse_iso_duration(None) == (None, None)
    assert parse_iso_duration("") == (None, None)
    assert parse_iso_duration("INVALID") == (None, None)


def test_youtube_not_configured_when_no_api_key():
    """Verify YouTube reports not configured when YOUTUBE_API_KEY is unset."""
    with patch.object(settings, "YOUTUBE_API_KEY", ""):
        provider = YouTubeProvider()
        assert provider.is_configured() is False


def test_youtube_search_and_normalization_mocked():
    """Verify YouTubeProvider search and video details normalization."""
    with patch.object(settings, "YOUTUBE_API_KEY", "mock_yt_key"):
        provider = YouTubeProvider()
        assert provider.is_configured() is True

        mock_search_resp = MagicMock(spec=httpx.Response)
        mock_search_resp.status_code = 200
        mock_search_resp.json.return_value = MOCK_YOUTUBE_SEARCH_RESPONSE

        mock_video_resp = MagicMock(spec=httpx.Response)
        mock_video_resp.status_code = 200
        mock_video_resp.json.return_value = MOCK_YOUTUBE_VIDEOS_RESPONSE

        def mock_get(url, params=None, **kwargs):
            if "videos" in url:
                return mock_video_resp
            return mock_search_resp

        with patch("httpx.AsyncClient.get", side_effect=mock_get):
            courses = asyncio.run(provider.search_courses(query="python", limit=5))

        assert len(courses) == 1
        c = courses[0]
        assert isinstance(c, NormalizedCourse)
        assert c.provider_slug == "youtube"
        assert c.external_id == "rfscVS0vtbw"
        assert c.title == "Learn Python - Full Course for Beginners [Tutorial]"
        assert c.instructor == "freeCodeCamp.org"
        assert c.duration == 4.45
        assert c.duration_unit == "hours"
        assert c.price == 0.0
        assert c.review_count == 35000
        assert c.url == "https://www.youtube.com/watch?v=rfscVS0vtbw"
