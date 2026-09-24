import asyncio
import hashlib
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple, Union
import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.schemas.course import NormalizedCourse
from app.services.course_providers.base import BaseCourseProvider

logger = logging.getLogger(__name__)


def parse_sveltekit_data(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Unpacks SvelteKit devalue / flat indexed array serialized format.
    """
    nodes = payload.get("nodes", [])
    for node in nodes:
        if not node or not isinstance(node, dict):
            continue
        data = node.get("data")
        if not data or not isinstance(data, list):
            continue

        memo: Dict[int, Any] = {}

        def resolve(idx: Any) -> Any:
            if not isinstance(idx, int):
                return idx
            if idx in memo:
                return memo[idx]
            if idx < 0 or idx >= len(data):
                return idx

            val = data[idx]
            if isinstance(val, (str, int, float, bool)) or val is None:
                return val
            if isinstance(val, list):
                res: List[Any] = []
                memo[idx] = res
                for item in val:
                    res.append(resolve(item) if isinstance(item, int) else item)
                return res
            if isinstance(val, dict):
                res_dict: Dict[str, Any] = {}
                memo[idx] = res_dict
                for k, v in val.items():
                    res_dict[k] = resolve(v) if isinstance(v, int) else v
                return res_dict
            return val

        root = resolve(0)
        if isinstance(root, dict):
            return root
    return None


def clean_html_text(html_text: Optional[str]) -> str:
    """
    Strips HTML tags and normalizes whitespace into clean plaintext.
    """
    if not html_text:
        return ""
    soup = BeautifulSoup(html_text, "html.parser")
    # Replace block level elements with newlines
    for elem in soup.find_all(["p", "br", "div", "li", "h1", "h2", "h3", "h4"]):
        elem.append(" ")
    text = soup.get_text()
    # Normalize multiple whitespace/newlines
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


def normalize_duration(raw_duration: Optional[Any]) -> Tuple[Optional[float], Optional[str]]:
    """
    Converts string expressions like '8 weeks', '12 Weeks', '40 Hours' into (float, unit).
    """
    if raw_duration is None:
        return None, None

    s = str(raw_duration).strip().lower()
    if not s:
        return None, None

    # Match number + unit
    match = re.search(r"(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?", s)
    if not match:
        return None, None

    num = float(match.group(1))
    unit_str = match.group(2) or "weeks"

    if "week" in unit_str:
        unit = "weeks"
    elif "hour" in unit_str or "hr" in unit_str:
        unit = "hours"
    elif "min" in unit_str:
        unit = "minutes"
    elif "month" in unit_str:
        unit = "months"
    else:
        unit = unit_str

    return num, unit


def calculate_content_hash(fields: Dict[str, Any]) -> str:
    """
    Computes a deterministic SHA-256 hash of meaningful course content.
    Excludes timestamps and volatile metadata.
    """
    # Key normalization for deterministic hashing
    hashable_items = [
        str(fields.get("title") or "").strip().lower(),
        str(fields.get("description") or "").strip().lower(),
        str(fields.get("instructor") or "").strip().lower(),
        str(fields.get("institution") or "").strip().lower(),
        str(fields.get("level") or "").strip().lower(),
        str(fields.get("language") or "").strip().lower(),
        str(fields.get("duration") or ""),
        str(fields.get("duration_unit") or ""),
        str(fields.get("syllabus") or "").strip().lower(),
    ]
    raw_payload = "|".join(hashable_items).encode("utf-8")
    return hashlib.sha256(raw_payload).hexdigest()


class NPTELProvider(BaseCourseProvider):
    """
    Live NPTEL / SWAYAM Course Ingestion Connector.
    Fetches structured course data from NPTEL catalog and detail endpoints
    with HTML fallback, rate limiting, and exponential backoff.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        delay_seconds: Optional[float] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
    ):
        self._base_url = (base_url or settings.NPTEL_BASE_URL).rstrip("/")
        self.delay_seconds = delay_seconds if delay_seconds is not None else settings.NPTEL_REQUEST_DELAY_SECONDS
        self.timeout_seconds = timeout_seconds if timeout_seconds is not None else settings.NPTEL_REQUEST_TIMEOUT_SECONDS
        self.max_retries = max_retries if max_retries is not None else settings.NPTEL_MAX_RETRIES

        self.headers = {
            "User-Agent": "Mozilla/5.0 (SkillSetu-CourseAggregator/1.0; +https://skillsetu.in)",
            "Accept": "application/json, text/html, */*",
        }

    @property
    def provider_slug(self) -> str:
        return "nptel"

    def is_configured(self) -> bool:
        """NPTEL public catalog connector is always available."""
        return True

    @property
    def provider_name(self) -> str:
        return "NPTEL"

    @property
    def base_url(self) -> Optional[str]:
        return self._base_url

    async def _make_request(self, url: str) -> httpx.Response:
        """
        Executes an HTTP GET request with retries on transient errors and polite delays.
        Does not retry 404s.
        """
        last_exception = None

        for attempt in range(self.max_retries + 1):
            if self.delay_seconds > 0:
                await asyncio.sleep(self.delay_seconds)

            try:
                async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout_seconds, follow_redirects=True) as client:
                    response = await client.get(url)

                    # Return immediately on successful response or 404
                    if response.status_code == 200:
                        return response
                    elif response.status_code == 404:
                        logger.warning(f"Resource not found (404): {url}")
                        return response
                    elif 500 <= response.status_code < 600:
                        # Server error -> transient, retry
                        logger.warning(f"Server error ({response.status_code}) fetching {url}, attempt {attempt + 1}/{self.max_retries + 1}")
                    else:
                        logger.warning(f"Unexpected status ({response.status_code}) fetching {url}")

            except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as exc:
                last_exception = exc
                logger.warning(f"Network error ({exc}) fetching {url}, attempt {attempt + 1}/{self.max_retries + 1}")

            # Exponential backoff before next attempt
            if attempt < self.max_retries:
                backoff_time = 0.5 * (2 ** attempt)
                await asyncio.sleep(backoff_time)

        if last_exception:
            raise last_exception
        raise httpx.HTTPStatusError(f"Failed after {self.max_retries + 1} attempts", request=None, response=response)

    async def fetch_courses(
        self,
        limit: int = 50,
        offset: int = 0,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        Discover courses from NPTEL catalog.
        Fetches structured catalog from /courses/__data.json with HTML fallback.
        """
        catalog_url = f"{self._base_url}/courses/__data.json"
        html_catalog_url = f"{self._base_url}/courses"
        discovered_courses: List[NormalizedCourse] = []

        try:
            resp = await self._make_request(catalog_url)
            if resp.status_code == 200 and "json" in resp.headers.get("content-type", ""):
                parsed = parse_sveltekit_data(resp.json())
                if parsed and "courses" in parsed and isinstance(parsed["courses"], list):
                    raw_list = parsed["courses"]
                    # Apply offset and limit
                    paginated_list = raw_list[offset : offset + limit] if limit > 0 else raw_list[offset:]

                    for c in paginated_list:
                        ext_id = str(c.get("id") or "").strip()
                        if not ext_id:
                            continue

                        title = str(c.get("title") or "").strip()
                        # Clean title prefix if present e.g. "NOC:Introduction to..."
                        instructor = str(c.get("professor") or "").strip() or None
                        institution = str(c.get("instituteName") or "").strip() or None
                        url = f"{self._base_url}/courses/{ext_id}"

                        normalized = NormalizedCourse(
                            provider_slug=self.provider_slug,
                            external_id=ext_id,
                            title=title,
                            description=None,
                            url=url,
                            instructor=instructor,
                            institution=institution,
                            language="English",
                            level=None,
                            certificate_available=True,
                            is_active=True,
                        )
                        discovered_courses.append(normalized)

                    return discovered_courses

        except Exception as e:
            logger.warning(f"Failed to parse SvelteKit catalog ({e}), trying HTML fallback...")

        # Fallback: HTML parsing of /courses
        try:
            resp = await self._make_request(html_catalog_url)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                cards = soup.find_all("div", class_=lambda c: c and "course-card" in c)

                if not cards:
                    # Fallback to anchor tags
                    cards = soup.find_all("a", href=lambda h: h and "/courses/" in h)

                paginated_cards = cards[offset : offset + limit] if limit > 0 else cards[offset:]

                for card in paginated_cards:
                    link = card if card.name == "a" else card.find("a", href=True)
                    if not link or not link.get("href"):
                        continue

                    href = link["href"]
                    ext_id_match = re.search(r"/courses/([0-9a-zA-Z_-]+)", href)
                    if not ext_id_match:
                        continue
                    ext_id = ext_id_match.group(1)

                    name_elem = card.find(class_=lambda c: c and "name" in c)
                    title = name_elem.get_text(strip=True) if name_elem else link.get_text(strip=True)

                    prof_elem = card.find(class_=lambda c: c and "meta-data" in c)
                    prof_text = prof_elem.get_text(" | ", strip=True) if prof_elem else ""
                    parts = [p.strip() for p in prof_text.split("|") if p.strip()]
                    instructor = parts[0] if len(parts) > 0 else None
                    institution = parts[1] if len(parts) > 1 else None

                    normalized = NormalizedCourse(
                        provider_slug=self.provider_slug,
                        external_id=ext_id,
                        title=title,
                        description=None,
                        url=f"{self._base_url}/courses/{ext_id}",
                        instructor=instructor,
                        institution=institution,
                        language="English",
                        certificate_available=True,
                        is_active=True,
                    )
                    discovered_courses.append(normalized)

        except Exception as exc:
            logger.error(f"HTML catalog fallback failed: {exc}")

        return discovered_courses

    async def fetch_course_details(
        self,
        external_id: str
    ) -> Optional[NormalizedCourse]:
        """
        Fetch full details for a specific NPTEL course by external ID.
        Extracts title, description, instructor, institution, language, level,
        duration, weeks/syllabus, certificate availability, and calculates content hash.
        """
        ext_id = str(external_id).strip()
        data_url = f"{self._base_url}/courses/{ext_id}/__data.json"
        html_url = f"{self._base_url}/courses/{ext_id}"

        # 1. Try SvelteKit JSON data endpoint
        try:
            resp = await self._make_request(data_url)
            if resp.status_code == 200 and "json" in resp.headers.get("content-type", ""):
                parsed = parse_sveltekit_data(resp.json())
                if parsed and "courseOutline" in parsed and isinstance(parsed["courseOutline"], dict):
                    outline = parsed["courseOutline"]
                    syllabus_dict = outline.get("syllabus", {}) if isinstance(outline.get("syllabus"), dict) else {}

                    title = outline.get("title") or syllabus_dict.get("title") or f"NPTEL Course {ext_id}"
                    instructor = outline.get("professor") or syllabus_dict.get("instructor")
                    institution = outline.get("instituteName") or syllabus_dict.get("institute")

                    # Description from aboutHtml
                    about_html = syllabus_dict.get("aboutHtml", "")
                    description = clean_html_text(about_html) if about_html else None

                    # Extract metadata labels
                    meta_list = syllabus_dict.get("meta", [])
                    meta_map: Dict[str, str] = {}
                    if isinstance(meta_list, list):
                        for m in meta_list:
                            if isinstance(m, dict) and "label" in m and "value" in m:
                                meta_map[m["label"].strip().lower()] = str(m["value"]).strip()

                    # Duration
                    raw_duration = meta_map.get("duration")
                    duration_num, duration_unit = normalize_duration(raw_duration)

                    # Level
                    level = meta_map.get("level")

                    # Language
                    language = meta_map.get("language") or "English"

                    # Syllabus topics
                    weeks_data = syllabus_dict.get("weeks", [])
                    syllabus_parts = []
                    if isinstance(weeks_data, list):
                        for w in weeks_data:
                            if isinstance(w, dict):
                                w_name = w.get("week", "")
                                w_topic = w.get("topic", "")
                                syllabus_parts.append(f"{w_name}: {w_topic}")

                    syllabus_str = "\n".join(syllabus_parts) if syllabus_parts else ""

                    # Fallback units if weeks empty
                    if not syllabus_str and outline.get("units"):
                        unit_names = [u.get("name", "") for u in outline.get("units", []) if isinstance(u, dict)]
                        syllabus_str = "\n".join(filter(None, unit_names))

                    # If description was empty, use syllabus as description
                    if not description and syllabus_str:
                        description = f"Course Outline:\n{syllabus_str}"

                    # Compute deterministic content hash
                    hash_fields = {
                        "title": title,
                        "description": description,
                        "instructor": instructor,
                        "institution": institution,
                        "level": level,
                        "language": language,
                        "duration": duration_num,
                        "duration_unit": duration_unit,
                        "syllabus": syllabus_str,
                    }
                    content_hash = calculate_content_hash(hash_fields)

                    return NormalizedCourse(
                        provider_slug=self.provider_slug,
                        external_id=ext_id,
                        title=title.strip(),
                        description=description,
                        url=html_url,
                        instructor=instructor.strip() if instructor else None,
                        institution=institution.strip() if institution else None,
                        language=language,
                        level=level,
                        duration=duration_num,
                        duration_unit=duration_unit,
                        price=None,  # NPTEL courses are free to audit
                        currency=None,
                        certificate_available=True,
                        rating=None,
                        review_count=None,
                        thumbnail_url=None,
                        content_hash=content_hash,
                        is_active=True,
                    )
            elif resp.status_code == 404:
                return None

        except Exception as e:
            logger.warning(f"Error fetching SvelteKit detail for course {ext_id} ({e}), falling back to HTML...")

        # 2. HTML Fallback
        try:
            resp = await self._make_request(html_url)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")

                h3 = soup.find(["h3", "h1", "h2"])
                title = h3.get_text(strip=True) if h3 else f"NPTEL Course {ext_id}"

                about = soup.find("div", class_=lambda c: c and "about" in c)
                description = clean_html_text(str(about)) if about else None

                hash_fields = {
                    "title": title,
                    "description": description,
                    "syllabus": "",
                }
                content_hash = calculate_content_hash(hash_fields)

                return NormalizedCourse(
                    provider_slug=self.provider_slug,
                    external_id=ext_id,
                    title=title,
                    description=description,
                    url=html_url,
                    instructor=None,
                    institution=None,
                    language="English",
                    certificate_available=True,
                    content_hash=content_hash,
                    is_active=True,
                )
            elif resp.status_code == 404:
                return None
        except Exception as exc:
            logger.error(f"HTML fallback failed for {ext_id}: {exc}")

        return None

    async def search_courses(
        self,
        query: str,
        limit: int = 50,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        Search catalog courses matching query string in title or instructor.
        """
        all_courses = await self.fetch_courses(limit=0)  # Discover full catalog
        q = query.strip().lower()
        matched = [
            c for c in all_courses
            if q in c.title.lower()
            or (c.instructor and q in c.instructor.lower())
            or (c.institution and q in c.institution.lower())
        ]
        return matched[:limit]
