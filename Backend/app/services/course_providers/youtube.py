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

# Fallback curated educational YouTube catalog for offline/development/test scenarios
YOUTUBE_CURATED_COURSES: List[Dict[str, Any]] = [
    {
        "external_id": "yt_react_native_full_course_01",
        "title": "React Native Full Course 2026 - Build Mobile Apps for iOS & Android",
        "description": "Complete hands-on tutorial to master React Native, Expo, React Navigation, State Management, API integration, and cross-platform native UI components from scratch.",
        "instructor": "freeCodeCamp.org",
        "institution": "YouTube Educational / freeCodeCamp",
        "duration_hours": 8.5,
        "duration_unit": "hours",
        "language": "English",
        "url": "https://www.youtube.com/watch?v=0-S5a0eXPoc",
        "skills": ["React Native", "Mobile Application Development", "JavaScript", "React", "Mobile Architecture", "RESTful APIs", "State Management"],
        "level": "Beginner to Intermediate",
        "resource_type": "video"
    },
    {
        "external_id": "yt_express_backend_api_02",
        "title": "Node.js & Express.js Full Course - Build Secure RESTful APIs",
        "description": "Learn backend development with Node.js and Express.js covering routing, middleware, JWT token authentication, error handling pipelines, and PostgreSQL database integration.",
        "instructor": "Traversy Media",
        "institution": "YouTube Educational / Traversy Media",
        "duration_hours": 6.0,
        "duration_unit": "hours",
        "language": "English",
        "url": "https://www.youtube.com/watch?v=Oe421EPjeBE",
        "skills": ["Express.js", "Node.js", "RESTful APIs", "JavaScript", "Backend Development", "JSON Web Tokens", "Middleware"],
        "level": "Beginner to Intermediate",
        "resource_type": "video"
    },
    {
        "external_id": "yt_docker_kubernetes_complete_03",
        "title": "Docker and Kubernetes Tutorial for Beginners - Complete Hands-On Course",
        "description": "Master containerization using Docker, Dockerfile best practices, multi-container Docker Compose architectures, volume persistence, and Kubernetes cluster deployments.",
        "instructor": "TechWorld with Nana",
        "institution": "YouTube Educational",
        "duration_hours": 4.5,
        "duration_unit": "hours",
        "language": "English",
        "url": "https://www.youtube.com/watch?v=3c-iBn73dDE",
        "skills": ["Docker", "Kubernetes", "Containerization", "DevOps", "Docker Compose", "Continuous Integration"],
        "level": "Intermediate",
        "resource_type": "video"
    },
    {
        "external_id": "yt_cloud_computing_aws_04",
        "title": "Cloud Computing Architecture & AWS Fundamentals Complete Course",
        "description": "Comprehensive foundation in cloud computing principles, virtualization, distributed storage, AWS EC2, S3, IAM security, Lambda serverless, and cloud scalability.",
        "instructor": "freeCodeCamp.org",
        "institution": "YouTube Educational / freeCodeCamp",
        "duration_hours": 10.0,
        "duration_unit": "hours",
        "language": "English",
        "url": "https://www.youtube.com/watch?v=2LaAJq1lB1Q",
        "skills": ["Cloud Computing", "Amazon Web Services", "Distributed Systems", "Virtualization", "Cloud Security"],
        "level": "Beginner to Intermediate",
        "resource_type": "video"
    },
    {
        "external_id": "yt_playlist_fullstack_dev_05",
        "title": "Full Stack Web Development Lecture Series & Project Playlist",
        "description": "Comprehensive structured playlist covering modern frontend React, backend Node.js APIs, SQL databases, responsive design, and end-to-end full stack deployments.",
        "instructor": "Programming with Mosh",
        "institution": "YouTube Educational",
        "duration_hours": 15.0,
        "duration_unit": "hours",
        "language": "English",
        "url": "https://www.youtube.com/playlist?list=PLTjRvDozrdly3S4p-xK07pG8v4tU7qfX9",
        "skills": ["Full Stack Development", "React", "Node.js", "JavaScript", "SQL", "RESTful APIs", "Web Development"],
        "level": "Intermediate",
        "resource_type": "playlist"
    }
]


def is_educational_quality(
    title: str,
    description: Optional[str] = None,
    duration_val: Optional[float] = None,
    duration_unit: Optional[str] = None
) -> bool:
    """
    Quality gate for YouTube content:
    Rejects shorts, trailers, promo clips, non-educational videos, and extremely short clips.
    """
    clean_title = title.lower().strip()
    clean_desc = (description or "").lower().strip()

    # 1. Reject obvious non-educational / promotional tags
    rejected_keywords = [
        "#shorts", " shorts", "shorts ", "/shorts", "trailer", "teaser", "promo",
        "reaction video", "vlog", "tiktok", "status video", "gameplay", "funny moments",
        "unboxing", "review only"
    ]
    if any(k in clean_title for k in rejected_keywords):
        return False

    # 2. Duration filter: Reject videos < 5 minutes (0.08 hours)
    if duration_val is not None:
        if duration_unit == "minutes" and duration_val < 5.0:
            return False
        elif duration_unit == "hours" and duration_val < 0.08:
            return False

    # 3. Require educational relevance signals in title or description
    educational_signals = [
        "course", "tutorial", "learn", "complete", "full", "crash course", "guide",
        "introduction", "masterclass", "bootcamp", "deep dive", "series", "lecture",
        "development", "programming", "architecture", "fundamentals", "hands-on"
    ]
    has_signal = any(sig in clean_title or sig in clean_desc for sig in educational_signals)
    return has_signal


class YouTubeProvider(BaseCourseProvider):
    """
    YouTube Educational Content / Playlist Ingestion Provider.
    Uses official YouTube Data API v3 (search.list and videos.list).
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

    def _normalize_curated_entry(self, item: Dict[str, Any]) -> NormalizedCourse:
        """Normalize curated catalog entry."""
        return NormalizedCourse(
            provider_slug=self.provider_slug,
            title=item["title"].strip(),
            description=item.get("description", "").strip(),
            url=item.get("url", f"https://www.youtube.com/watch?v={item['external_id']}"),
            external_id=item["external_id"].strip(),
            instructor=item.get("instructor", "YouTube Creator"),
            institution=item.get("institution", "YouTube Educational"),
            level=item.get("level", "All Levels"),
            language=item.get("language", "English"),
            duration=float(item.get("duration_hours", 4.0)),
            duration_unit=item.get("duration_unit", "hours"),
            price=0.0,
            currency="INR",
            certificate_available=False,
            start_date=None,
            end_date=None,
            rating=4.8,
            review_count=500,
            thumbnail_url="https://www.youtube.com/img/desktop/yt_1200.png",
            is_active=True
        )

    async def _fetch_video_details(self, video_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch contentDetails and statistics for a batch of video IDs."""
        if not bool(settings.YOUTUBE_API_KEY) or not video_ids:
            return {}

        details_map = {}
        api_url = f"{settings.YOUTUBE_BASE_URL}/videos"
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
        """Convert YouTube search result item and detail payload into NormalizedCourse with quality filtering."""
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

        # Apply strict educational quality filter
        if not is_educational_quality(title, description, duration_val, duration_unit):
            return None

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

        if video_id:
            external_id = video_id
            url = f"https://www.youtube.com/watch?v={video_id}"
            level = "Video Tutorial"
        else:
            external_id = f"playlist_{playlist_id}"
            url = f"https://www.youtube.com/playlist?list={playlist_id}"
            level = "Course Playlist"

        # Language
        language = snippet.get("defaultAudioLanguage") or snippet.get("defaultLanguage") or "English"

        return NormalizedCourse(
            provider_slug=self.provider_slug,
            title=title,
            description=description if description else None,
            url=url,
            external_id=external_id,
            instructor=channel_title,
            institution=channel_title or "YouTube Educational",
            level=level,
            language=language,
            duration=duration_val or 3.0,
            duration_unit=duration_unit or "hours",
            price=0.0,
            currency="INR",
            certificate_available=False,
            start_date=published_at,
            end_date=None,
            rating=4.7,
            review_count=review_count or 100,
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
        Falls back to curated educational catalog when API key is unconfigured.
        """
        if not bool(settings.YOUTUBE_API_KEY):
            logger.info("Using curated educational YouTube catalog.")
            return [self._normalize_curated_entry(c) for c in YOUTUBE_CURATED_COURSES[offset:offset + limit]]

        default_queries = ["react native complete course tutorial", "express js backend api tutorial", "docker kubernetes full course"]
        results = []
        for q in default_queries:
            courses = await self.search_courses(q, limit=limit // len(default_queries) + 1)
            results.extend(courses)
            if len(results) >= limit:
                break

        if not results:
            results = [self._normalize_curated_entry(c) for c in YOUTUBE_CURATED_COURSES]

        return results[:limit]

    async def fetch_course_details(
        self,
        external_id: str
    ) -> Optional[NormalizedCourse]:
        """
        Fetch details for a single YouTube video by video ID.
        """
        if not external_id:
            return None

        # Check curated list first
        for item in YOUTUBE_CURATED_COURSES:
            if item["external_id"] == external_id:
                return self._normalize_curated_entry(item)

        if not bool(settings.YOUTUBE_API_KEY):
            return None

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
        if not query:
            return await self.fetch_courses(limit=limit)

        if not bool(settings.YOUTUBE_API_KEY):
            # Curated match
            q_tokens = [tok.lower().strip() for tok in re.split(r"\W+", query) if tok.strip()]
            matched = []
            for item in YOUTUBE_CURATED_COURSES:
                searchable = f"{item['title']} {item.get('description', '')} {' '.join(item.get('skills', []))}".lower()
                if any(token in searchable for token in q_tokens):
                    matched.append(self._normalize_curated_entry(item))
            if not matched:
                matched = [self._normalize_curated_entry(c) for c in YOUTUBE_CURATED_COURSES]
            return matched[:limit]

        api_url = f"{settings.YOUTUBE_BASE_URL}/search"
        params = {
            "part": "snippet",
            "type": "video,playlist",
            "q": f"{query} full tutorial course",
            "maxResults": min(50, max(1, limit)),
            "relevanceLanguage": "en",
            "safeSearch": "moderate",
            "key": settings.YOUTUBE_API_KEY
        }

        try:
            async with httpx.AsyncClient(timeout=settings.YOUTUBE_REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.get(api_url, params=params)
                if response.status_code == 403 or response.status_code != 200:
                    logger.warning(f"YouTube search API returned HTTP {response.status_code}. Using curated catalog.")
                    return [self._normalize_curated_entry(c) for c in YOUTUBE_CURATED_COURSES[:limit]]

                data = response.json()
                items = data.get("items", [])

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

                if not courses:
                    courses = [self._normalize_curated_entry(c) for c in YOUTUBE_CURATED_COURSES]

                return courses[:limit]
        except Exception as e:
            logger.error(f"Error searching YouTube for query '{query}': {e}")
            return [self._normalize_curated_entry(c) for c in YOUTUBE_CURATED_COURSES[:limit]]

