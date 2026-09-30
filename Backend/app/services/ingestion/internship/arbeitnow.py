import requests
import logging
from typing import List, Dict, Any, Optional
from app.services.ingestion.base_source import BaseSourceAdapter

logger = logging.getLogger("skillsetu_ingestion")


class ArbeitnowAdapter(BaseSourceAdapter):
    """
    Adapter for Arbeitnow Public Job Board API (Free developer feed).
    Docs: https://documenter.getpostman.com/view/18545278/UVJbJwkQ
    """
    source_name = "arbeitnow"
    source_type = "internships"
    BASE_URL = "https://www.arbeitnow.com/api/job-board-api"

    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        headers = {
            "User-Agent": "SkillSetu-Platform/1.0 (academic research)"
        }
        try:
            res = requests.get(self.BASE_URL, headers=headers, timeout=12.0)
            if res.status_code == 200:
                data = res.json()
                jobs = data.get("data", [])
                logger.info(f"Fetched {len(jobs)} raw jobs from Arbeitnow API.")
                return jobs[:limit]
            else:
                logger.warning(f"Arbeitnow API returned non-200 status: {res.status_code}")
                return []
        except Exception as e:
            logger.error(f"Arbeitnow API request failed: {e}")
            return []

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        title = (raw.get("title") or "").strip()
        tags = [t.lower() for t in raw.get("tags", [])]
        job_types = [jt.lower() for jt in raw.get("job_types", [])]

        if not title:
            return None

        # Filter for junior, intern, entry, software, web, or developer
        is_relevant = any(k in title.lower() for k in ["intern", "junior", "trainee", "entry", "developer", "engineer"]) or \
                      any(k in tags for k in ["internship", "junior", "python", "react", "node", "javascript", "docker"]) or \
                      any(k in job_types for k in ["internship", "part-time"])

        if not is_relevant:
            return None

        slug = raw.get("slug") or title
        apply_url = raw.get("url") or "https://www.arbeitnow.com/"

        # Determine career
        title_lower = title.lower()
        career_id = "car_fullstack_developer"
        if "backend" in title_lower or "python" in title_lower or "go" in title_lower:
            career_id = "car_backend_developer"
        elif "frontend" in title_lower or "react" in title_lower or "vue" in title_lower:
            career_id = "car_frontend_developer"
        elif "data" in title_lower:
            career_id = "car_data_analyst"

        is_remote = bool(raw.get("remote"))

        normalized = {
            "source": self.source_name,
            "source_id": f"arbeitnow_{slug}",
            "source_url": apply_url,
            "title": title,
            "company_name": (raw.get("company_name") or "Tech Organization").strip(),
            "company_logo": "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=100&auto=format&fit=crop&q=60",
            "description": raw.get("description", "")[:1000] or f"Engineering position: {title}",
            "career_id": career_id,
            "industry_id": "ind_tech",
            "location_name": raw.get("location") or ("Remote (Worldwide)" if is_remote else "Global"),
            "stipend": "Competitive Market Compensation",
            "stipend_min": 30000.00,
            "stipend_max": 50000.00,
            "currency": "INR",
            "duration": "3 - 6 Months",
            "opportunity_type": "internship",
            "work_preference": "remote" if is_remote else "hybrid",
            "min_cgpa": 6.0,
            "openings": 1,
            "batch_eligible": "2026, 2027",
            "education_requirements": "B.Tech / B.E. / STEM Degree",
            "branch_requirements": "Computer Science, IT, or related fields",
            "apply_url": apply_url,
            "application_deadline": None,
            "is_active": True,
            "skills": [t.title() for t in raw.get("tags", [])[:5]] or ["Git & GitHub", "RESTful APIs"]
        }

        normalized["content_hash"] = self.generate_content_hash(normalized)
        return normalized
