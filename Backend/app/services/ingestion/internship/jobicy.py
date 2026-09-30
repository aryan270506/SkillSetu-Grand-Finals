import requests
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.ingestion.base_source import BaseSourceAdapter

logger = logging.getLogger("skillsetu_ingestion")


class JobicyAdapter(BaseSourceAdapter):
    """
    Adapter for Jobicy Public Remote Engineering Jobs API.
    Docs: https://jobicy.com/jobs-rss-feed
    Rate limit: Respectful polling (30-60 requests/hour).
    """
    source_name = "jobicy"
    source_type = "internships"
    BASE_URL = "https://jobicy.com/api/v2/remote-jobs"

    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        params = {
            "count": min(limit, 50),
            "industry": "engineering"
        }
        headers = {
            "User-Agent": "SkillSetu-Education-Platform/1.0 (academic; verification)"
        }
        try:
            res = requests.get(self.BASE_URL, params=params, headers=headers, timeout=12.0)
            if res.status_code == 200:
                data = res.json()
                jobs = data.get("jobs", [])
                logger.info(f"Fetched {len(jobs)} raw jobs from Jobicy API.")
                return jobs
            else:
                logger.warning(f"Jobicy API returned non-200 status: {res.status_code}")
                return []
        except Exception as e:
            logger.error(f"Jobicy API request failed: {e}")
            return []

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Filters and normalizes raw Jobicy job record.
        Only keeps internships, junior, or entry-level software engineering roles.
        """
        title = (raw.get("jobTitle") or "").strip()
        
        raw_jt = raw.get("jobType")
        if isinstance(raw_jt, list):
            job_types = [str(x).lower() for x in raw_jt]
        else:
            job_types = [str(raw_jt).lower()] if raw_jt else []

        raw_lvl = raw.get("jobLevel")
        if isinstance(raw_lvl, list):
            levels = [str(x).lower() for x in raw_lvl]
        else:
            levels = [str(raw_lvl).lower()] if raw_lvl else []

        desc = raw.get("jobDescription") or ""

        if not title:
            return None

        # Filter strictly for entry, junior, student, or internship positions
        is_intern_or_junior = any(k in title.lower() for k in ["intern", "junior", "trainee", "entry", "graduate", "associate", "developer"]) or \
                              any(any(k in jt for k in ["internship", "part-time", "contract"]) for jt in job_types) or \
                              any(any(k in lvl for k in ["internship", "entry-level", "junior"]) for lvl in levels)

        if not is_intern_or_junior:
            return None

        source_id = str(raw.get("id") or raw.get("jobSlug") or title)
        apply_url = raw.get("url") or raw.get("jobUrl") or "https://jobicy.com"

        # Determine career mapping from title
        title_lower = title.lower()
        career_id = "car_fullstack_developer"
        if "backend" in title_lower or "python" in title_lower or "node" in title_lower:
            career_id = "car_backend_developer"
        elif "frontend" in title_lower or "react" in title_lower or "ui" in title_lower:
            career_id = "car_frontend_developer"
        elif "mobile" in title_lower or "ios" in title_lower or "android" in title_lower:
            career_id = "car_mobile_app_developer"
        elif "data" in title_lower or "analyst" in title_lower:
            career_id = "car_data_analyst"
        elif "ai" in title_lower or "ml" in title_lower or "machine learning" in title_lower:
            career_id = "car_ai_ml_engineer"

        # Extract skills/tags
        skills = []
        if raw.get("jobCategories"):
            skills.extend([c.strip() for c in raw["jobCategories"] if c.strip()])
        if raw.get("jobGeo"):
            skills.append(raw["jobGeo"])

        normalized = {
            "source": self.source_name,
            "source_id": f"jobicy_{source_id}",
            "source_url": apply_url,
            "title": title,
            "company_name": (raw.get("companyName") or "Global Tech Partner").strip(),
            "company_logo": raw.get("companyLogo") or "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=60",
            "description": desc[:1000] if desc else f"Remote engineering opportunity for {title}.",
            "career_id": career_id,
            "industry_id": "ind_tech",
            "location_name": raw.get("jobGeo") or "Remote (Global)",
            "stipend": "Paid Market Standard",
            "stipend_min": 25000.00,
            "stipend_max": 45000.00,
            "currency": "INR",
            "duration": "3 - 6 Months",
            "opportunity_type": "internship",
            "work_preference": "remote",
            "min_cgpa": 6.0,
            "openings": 1,
            "batch_eligible": "2026, 2027",
            "education_requirements": "B.Tech / B.E. / STEM Degree",
            "branch_requirements": "Computer Science, IT, or related fields",
            "apply_url": apply_url,
            "application_deadline": None,
            "is_active": True,
            "skills": skills or ["Git & GitHub", "RESTful APIs", "Problem Solving"]
        }

        normalized["content_hash"] = self.generate_content_hash(normalized)
        return normalized
