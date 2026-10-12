import logging
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from app.services.live_opportunities.base_source import BaseLiveSource

logger = logging.getLogger("live_source_remotive")

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
}


class RemotiveLiveSource(BaseLiveSource):
    """
    Live API adapter for Remotive developer opportunities feed.
    High-speed response (<0.5s) returning global remote engineering roles.
    """

    API_URL = "https://remotive.com/api/remote-jobs?category=software-dev&limit=100"

    def __init__(self):
        super().__init__(source_name="remotive", source_type="internships")

    def fetch_live_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            session = requests.Session()
            session.headers.update(DEFAULT_HEADERS)
            resp = session.get(self.API_URL, timeout=1.2)
            if resp.status_code == 200:
                data = resp.json()
                jobs = data.get("jobs", [])
                logger.info(f"⚡ Remotive fetched {len(jobs)} raw records.")
                return jobs if limit is None else jobs[:limit]
        except Exception as e:
            logger.debug(f"Remotive live fetch skipped: {e}")
        return []

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        title = str(raw.get("title") or "").strip()
        desc = str(raw.get("description") or "")
        title_lower = title.lower()

        is_senior = any(k in title_lower for k in ["senior", "sr.", "sr ", "lead", "principal", "manager", "director", "head of", "vp "])
        if is_senior:
            return None

        source_id = str(raw.get("id") or "")
        if not source_id:
            return None

        skills = [str(t).capitalize() for t in raw.get("tags", [])]
        if not skills:
            for kw in ["React", "Python", "Node.js", "JavaScript", "TypeScript", "SQL", "Docker", "Git"]:
                if kw.lower() in title_lower or kw.lower() in desc.lower():
                    skills.append(kw)

        now_dt = datetime.now(timezone.utc)
        salary = raw.get("salary")

        return {
            "id": f"remotive_{source_id}",
            "source": "remotive",
            "source_type": "external_aggregator",
            "verification_status": "UNVERIFIED",
            "source_id": source_id,
            "source_url": raw.get("url") or "https://remotive.com",
            "apply_url": raw.get("url") or "https://remotive.com",
            "title": title,
            "company_name": str(raw.get("company_name", "Global Employer")).strip(),
            "company_logo": raw.get("company_logo") or "",
            "description": (desc[:500] if desc else ""),
            "location": raw.get("candidate_required_location") or "Worldwide / Remote",
            "work_preference": "Remote",
            "stipend": salary if salary and ("₹" in salary or "$" in salary) else None,
            "stipend_min": None,
            "stipend_max": None,
            "currency": "INR" if salary and "₹" in str(salary) else ("USD" if salary and "$" in str(salary) else None),
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
