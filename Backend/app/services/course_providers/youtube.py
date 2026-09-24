import re
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import httpx

from app.config import settings
from app.services.course_providers.base import BaseCourseProvider
from app.schemas.course import NormalizedCourse

logger = logging.getLogger("youtube_provider")

ISO_DURATION_REGEX = re.compile(
    r"PT(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?"
)


def parse_iso_duration(iso_duration: Optional[str]) -> tuple[Optional[float], Optional[str]]:
    """
    Parse ISO 8601 duration (e.g., PT1H25M30S) into (duration_value, duration_unit).
    Returns (hours, 'hours') or (minutes, 'minutes').
    """
    if not iso_duration:
        return None, None

    match = ISO_DURATION_REGEX.match(iso_duration)
    if not match:
        return None, None

    hours = int(match.group("hours") or 0)
    minutes = int(match.group("minutes") or 0)
    seconds = int(match.group("seconds") or 0)

    total_seconds = hours * 3600 + minutes * 60 + seconds
    if total_seconds == 0:
        return None, None

    if total_seconds >= 3600:
        duration_hours = round(total_seconds / 3600.0, 2)
        return duration_hours, "hours"
    else:
        duration_mins = round(total_seconds / 60.0, 1)
        return duration_mins, "minutes"


class YouTubeProvider(BaseCourseProvider):
    """
    YouTube Educational Content / Playlist Ingestion Provider.
    Uses official YouTube Data API v3 (search.list and videos.list).
    Requires: YOUTUBE_API_KEY
    """

    @property
    def provider_slug(self) -> str:
        return "youtube"

    @property
    def provider_name(self) -> str:
        return "YouTube"

    @property
    def base_url(self) -> Optional[str]:
        return "https://www.youtube.com"

    def is_configured(self) -> bool:
        """Returns True only when valid YOUTUBE_API_KEY is configured."""
        return bool(settings.YOUTUBE_API_KEY)

    async def _fetch_video_details(self, video_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch contentDetails and statistics for a batch of video IDs."""
        if not self.is_configured() or not video_ids:
            return {}

        details_map = {}
        api_url = f"{settings.YOUTUBE_BASE_URL}/videos"
        # YouTube allows max 50 IDs per request
        chunk_size = 50
        for i in range(0, len(video_ids), chunk_size):
            chunk = video_ids[i:i + chunk_size]
            params = {
                "part": "snippet,contentDetails,statistics",
                "id": ",".join(chunk),
                "key": settings.YOUTUBE_API_KEY
            }

            try:
                async with httpx.AsyncClient(timeout=settings.YOUTUBE_REQUEST_TIMEOUT_SECONDS) as client:
                    response = await client.get(api_url, params=params)
                    if response.status_code == 200:
                        data = response.json()
                        for item in data.get("items", []):
                            details_map[item.get("id")] = item
                    else:
                        logger.warning(f"YouTube videos.list returned HTTP {response.status_code}")
            except Exception as e:
                logger.error(f"Error fetching YouTube video details: {e}")

        return details_map

    def _normalize_search_item(
        self,
        item: Dict[str, Any],
        video_detail: Optional[Dict[str, Any]] = None
    ) -> Optional[NormalizedCourse]:
        """Convert YouTube search result item and detail payload into NormalizedCourse."""
        id_info = item.get("id", {})
        kind = id_info.get("kind", "")
        
        video_id = id_info.get("videoId") if kind == "youtube#video" else None
        playlist_id = id_info.get("playlistId") if kind == "youtube#playlist" else None

        if not video_id and not playlist_id:
            return None

        snippet = item.get("snippet", {})
        if video_detail and "snippet" in video_detail:
            snippet = video_detail["snippet"]

        title = snippet.get("title", "").strip() or "Untitled YouTube Video"
        description = snippet.get("description", "")
        channel_title = snippet.get("channelTitle")

        # Thumbnail URL
        thumbnails = snippet.get("thumbnails", {})
        thumbnail_url = (
            thumbnails.get("high", {}).get("url") or
            thumbnails.get("medium", {}).get("url") or
            thumbnails.get("default", {}).get("url")
        )

        # Published date
        published_at = None
        if snippet.get("publishedAt"):
            try:
                published_at = datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00"))
            except Exception:
                pass

        # Duration and statistics
        duration_val, duration_unit = None, None
        review_count = None
        if video_detail:
            content_details = video_detail.get("contentDetails", {})
            iso_dur = content_details.get("duration")
            duration_val, duration_unit = parse_iso_duration(iso_dur)

            stats = video_detail.get("statistics", {})
            try:
                review_count = int(stats.get("commentCount", 0))
            except (ValueError, TypeError):
                pass

        if video_id:
            external_id = video_id
            url = f"https://www.youtube.com/watch?v={video_id}"
        else:
            external_id = f"playlist_{playlist_id}"
            url = f"https://www.youtube.com/playlist?list={playlist_id}"

        # Language
        language = snippet.get("defaultAudioLanguage") or snippet.get("defaultLanguage") or "English"

        return NormalizedCourse(
            provider_slug=self.provider_slug,
            title=title,
            description=description if description else None,
            url=url,
            external_id=external_id,
            instructor=channel_title,
            institution=channel_title,
            level="All Levels",
            language=language,
            duration=duration_val,
            duration_unit=duration_unit,
            price=0.0,
            currency="INR",
            certificate_available=False,
            start_date=published_at,
            end_date=None,
            rating=None,
            review_count=review_count,
            thumbnail_url=thumbnail_url,
            is_active=True
        )

    async def fetch_courses(
        self,
        limit: int = 50,
        offset: int = 0,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        YouTube educational content discovery: queries default core educational topics.
        """
        if not self.is_configured():
            logger.info("YouTube API key not configured (YOUTUBE_API_KEY missing). Skipping fetch.")
            return []

        default_queries = ["computer science full course", "machine learning tutorial for beginners", "python programming tutorial"]
        results = []
        for q in default_queries:
            courses = await self.search_courses(q, limit=limit // len(default_queries) + 1)
            results.extend(courses)
            if len(results) >= limit:
                break

        return results[:limit]

    async def fetch_course_details(
        self,
        external_id: str
    ) -> Optional[NormalizedCourse]:
        """
        Fetch details for a single YouTube video by video ID.
        """
        if not self.is_configured() or not external_id:
            return None

        # Clean playlist prefix if present
        clean_id = external_id.replace("playlist_", "")
        details_map = await self._fetch_video_details([clean_id])
        video_detail = details_map.get(clean_id)
        if not video_detail:
            return None

        raw_item = {
            "id": {"kind": "youtube#video", "videoId": clean_id},
            "snippet": video_detail.get("snippet", {})
        }
        return self._normalize_search_item(raw_item, video_detail)

    async def search_courses(
        self,
        query: str,
        limit: int = 50,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        Search YouTube Data API for educational videos and playlists.
        """
        if not self.is_configured() or not query:
            return []

        api_url = f"{settings.YOUTUBE_BASE_URL}/search"
        params = {
            "part": "snippet",
            "type": "video,playlist",
            "q": f"{query} tutorial course",
            "maxResults": min(50, max(1, limit)),
            "relevanceLanguage": "en",
            "safeSearch": "moderate",
            "key": settings.YOUTUBE_API_KEY
        }

        try:
            async with httpx.AsyncClient(timeout=settings.YOUTUBE_REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.get(api_url, params=params)
                if response.status_code == 403:
                    logger.error("YouTube API quota exceeded or invalid API key.")
                    return []
                elif response.status_code != 200:
                    logger.error(f"YouTube search request failed: HTTP {response.status_code}")
                    return []

                data = response.json()
                items = data.get("items", [])

                # Extract video IDs for batch detail lookup
                video_ids = [
                    it["id"]["videoId"]
                    for it in items
                    if it.get("id", {}).get("kind") == "youtube#video" and "videoId" in it.get("id", {})
                ]
                details_map = await self._fetch_video_details(video_ids)

                courses = []
                for it in items:
                    vid = it.get("id", {}).get("videoId")
                    v_detail = details_map.get(vid)
                    norm = self._normalize_search_item(it, v_detail)
                    if norm:
                        courses.append(norm)

                return courses
        except Exception as e:
            logger.error(f"Error searching YouTube for query '{query}': {e}")
            return []
