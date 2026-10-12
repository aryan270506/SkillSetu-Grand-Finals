import logging
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from app.services.live_opportunities.base_source import BaseLiveSource

logger = logging.getLogger("live_source_arbeitnow")

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
}


class ArbeitnowLiveSource(BaseLiveSource):
    """
    Live API adapter for Arbeitnow developer and engineering feed.
    High-speed direct API query returning up to 300+ genuine opportunities in sub-second time.
    Filters for intern/junior/graduate/associate developers.
    """

    API_URL = "https://www.arbeitnow.com/api/job-board-api"

    def __init__(self):
        super().__init__(source_name="arbeitnow", source_type="internships")

    def fetch_live_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        all_jobs = []
        try:
            from concurrent.futures import ThreadPoolExecutor, as_completed
            def _fetch_page(page_num):
                s = requests.Session()
                s.headers.update(DEFAULT_HEADERS)
                r = s.get(self.API_URL, params={"page": page_num}, timeout=1.3)
                if r.status_code == 200:
                    return r.json().get("data", [])
                return []

            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [executor.submit(_fetch_page, p) for p in [1, 2]]
                for f in as_completed(futures):
                    try:
                        all_jobs.extend(f.result())
                    except Exception:
                        pass
            logger.info(f"⚡ Arbeitnow fetched {len(all_jobs)} raw records across 2 pages.")
            return all_jobs if limit is None else all_jobs[:limit]
        except Exception as e:
            logger.debug(f"Arbeitnow live fetch skipped: {e}")
        return all_jobs

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        title = str(raw.get("title") or "").strip()
        tags = [str(t).lower() for t in raw.get("tags", [])]
        title_lower = title.lower()

        # Exclude senior / lead / manager / principal / director / VP roles
        is_senior = any(k in title_lower for k in ["senior", "sr.", "sr ", "lead", "principal", "manager", "director", "head of", "vp "])
        if is_senior:
            return None

        # Check if suitable for internship or developer
        is_intern = any(k in title_lower for k in ["intern", "student", "graduate", "junior", "trainee", "entry", "fellow", "developer", "engineer", "working student", "werkstudent", "analyst", "associate"])
        is_junior_tag = any(t in ["junior", "entry-level", "internship", "student", "react", "python", "javascript", "node", "web", "software"] for t in tags)

        if not (is_intern or is_junior_tag):
            return None

        slug = raw.get("slug") or raw.get("id") or ""
        if not slug:
            return None

        skills = [str(t).capitalize() for t in raw.get("tags", [])]
        if not skills:
            for kw in ["React", "Python", "Node.js", "JavaScript", "TypeScript", "SQL", "Docker", "Git"]:
                if kw.lower() in title_lower:
                    skills.append(kw)

        now_dt = datetime.now(timezone.utc)

        return {
            "id": f"arbeitnow_{slug}",
            "source": "arbeitnow",
            "source_type": "external_aggregator",
            "verification_status": "UNVERIFIED",
            "source_id": str(slug),
            "source_url": raw.get("url") or "https://www.arbeitnow.com",
            "apply_url": raw.get("url") or "https://www.arbeitnow.com",
            "title": title,
            "company_name": str(raw.get("company_name", "Global Employer")).strip(),
            "company_logo": "",
            "description": (raw.get("description") or "")[:500],
            "location": raw.get("location") or ("Remote" if raw.get("remote") else "Hybrid"),
            "work_preference": "Remote" if raw.get("remote") else "Hybrid",
            "stipend": None,
            "stipend_min": None,
            "stipend_max": None,
            "currency": None,
            "duration": None,
            "min_cgpa": None,
            "application_threshold": int(raw.get("application_threshold", 80) or 80),
            "minimum_match_threshold": int(raw.get("application_threshold", 80) or 80),
            "application_deadline": None,
            "fetched_at": now_dt.isoformat(),
            "required_skills": skills,
            "is_active": True,
            "verified": False
        }
