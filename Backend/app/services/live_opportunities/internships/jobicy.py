import logging
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from app.services.live_opportunities.base_source import BaseLiveSource

logger = logging.getLogger("live_source_jobicy")

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
}


class JobicyLiveSource(BaseLiveSource):
    """
    Live API adapter for Jobicy public developer & engineering jobs feed.
    High-speed direct API querying with browser headers and strict timeout budgets.
    Filters strictly for internships, student, graduate, and junior/entry developer roles.
    """

    API_URL = "https://jobicy.com/api/v2/remote-jobs"

    def __init__(self):
        super().__init__(source_name="jobicy", source_type="internships")

    def fetch_live_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            session = requests.Session()
            session.headers.update(DEFAULT_HEADERS)
            resp = session.get(self.API_URL, params={"count": 100}, timeout=1.1)
            if resp.status_code == 200:
                data = resp.json()
                jobs = data.get("jobs", [])
                logger.info(f"⚡ Jobicy fetched {len(jobs)} raw records.")
                return jobs if limit is None else jobs[:limit]
        except Exception as e:
            logger.debug(f"Jobicy live fetch skipped: {e}")
        return []

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        title = str(raw.get("jobTitle") or "").strip()
        desc = str(raw.get("jobDescription") or "")
        title_lower = title.lower()
        level_lower = str(raw.get("jobLevel", "")).lower()

        # Exclude senior / lead / manager / principal / director / VP roles
        is_senior = any(k in title_lower for k in ["senior", "sr.", "sr ", "lead", "principal", "manager", "director", "head of", "vp "])
        if is_senior:
            return None

        # Filter for intern / student / graduate / entry / junior / trainee / developer / associate / engineer roles
        is_intern_or_entry = (
            any(k in title_lower for k in ["intern", "student", "graduate", "junior", "trainee", "entry", "fellow", "associate", "developer", "engineer", "analyst", "assistant"]) or
            any(k in level_lower for k in ["intern", "junior", "entry", "student", "graduate", "associate"])
        )

        if not is_intern_or_entry:
            return None

        source_id = str(raw.get("id") or raw.get("jobId") or "")
        if not source_id:
            return None

        # Extract skills
        skills = []
        if raw.get("jobTechTags"):
            if isinstance(raw["jobTechTags"], list):
                skills.extend(raw["jobTechTags"])
            elif isinstance(raw["jobTechTags"], str):
                skills.extend([s.strip() for s in raw["jobTechTags"].split(",") if s.strip()])

        if not skills:
            for kw in ["React", "Python", "Node.js", "JavaScript", "TypeScript", "FastAPI", "SQL", "PostgreSQL", "Docker", "Git"]:
                if kw.lower() in title_lower or kw.lower() in desc.lower():
                    skills.append(kw)

        now_dt = datetime.now(timezone.utc)

        min_sal = raw.get("annualSalaryMin")
        max_sal = raw.get("annualSalaryMax")
        stipend_str = None
        if min_sal and max_sal:
            stipend_str = f"${int(min_sal)//12:,} - ${int(max_sal)//12:,} / mo"
        elif min_sal:
            stipend_str = f"${int(min_sal)//12:,} / mo"

        return {
            "id": f"jobicy_{source_id}",
            "source": "jobicy",
            "source_type": "external_aggregator",
            "verification_status": "UNVERIFIED",
            "source_id": source_id,
            "source_url": raw.get("url") or "https://jobicy.com",
            "apply_url": raw.get("url") or raw.get("jobSlug") or "https://jobicy.com",
            "title": title,
            "company_name": str(raw.get("companyName", "Tech Employer")).strip(),
            "company_logo": raw.get("companyLogo") or "",
            "description": (desc[:500] if desc else ""),
            "location": raw.get("jobGeo", "Remote"),
            "work_preference": "Remote",
            "stipend": stipend_str,
            "stipend_min": float(min_sal) if min_sal else None,
            "stipend_max": float(max_sal) if max_sal else None,
            "currency": "USD" if stipend_str else None,
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
