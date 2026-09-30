import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.ingestion.base_source import BaseSourceAdapter

logger = logging.getLogger("skillsetu_ingestion")


class CuratedVerifiedInternshipAdapter(BaseSourceAdapter):
    """
    Adapter for vetted verified partner internships stored in authoritative seed JSON.
    """
    source_name = "curated_verified"
    source_type = "internships"

    def __init__(self, json_path: Optional[str] = None):
        if not json_path:
            # __file__ is in Backend/app/services/ingestion/internship/curated_loader.py
            cur_dir = os.path.abspath(__file__)
            for _ in range(5):
                cur_dir = os.path.dirname(cur_dir)
            self.json_path = os.path.join(cur_dir, "data", "verified_internships_seed.json")
        else:
            self.json_path = json_path

    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not os.path.exists(self.json_path):
            logger.warning(f"Verified internships seed file not found at {self.json_path}")
            return []
        try:
            with open(self.json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data[:limit]
        except Exception as e:
            logger.error(f"Failed to read verified internships seed file: {e}")
            return []

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        title = raw.get("title", "").strip()
        company = raw.get("company_name", "").strip()
        if not title or not company:
            return None

        # Parse application deadline if string
        deadline = raw.get("application_deadline")
        if deadline and isinstance(deadline, str):
            try:
                deadline_dt = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            except Exception:
                deadline_dt = None
        elif isinstance(deadline, datetime):
            deadline_dt = deadline
        else:
            deadline_dt = None

        normalized = {
            "source": raw.get("source") or self.source_name,
            "source_id": raw.get("source_id"),
            "source_url": raw.get("source_url"),
            "title": title,
            "company_name": company,
            "company_logo": raw.get("company_logo"),
            "description": raw.get("description"),
            "career_id": raw.get("career_id"),
            "industry_id": raw.get("industry_id"),
            "location_id": raw.get("location_id"),
            "location_name": raw.get("location_name") or "Pune, India",
            "stipend": raw.get("stipend") or "₹25,000 / month",
            "stipend_min": raw.get("stipend_min"),
            "stipend_max": raw.get("stipend_max"),
            "currency": raw.get("currency") or "INR",
            "duration": raw.get("duration") or "6 Months",
            "opportunity_type": raw.get("opportunity_type") or "internship",
            "work_preference": raw.get("work_preference") or "hybrid",
            "min_cgpa": float(raw.get("min_cgpa", 0.0)),
            "openings": int(raw.get("openings", 1)),
            "batch_eligible": raw.get("batch_eligible"),
            "education_requirements": raw.get("education_requirements"),
            "branch_requirements": raw.get("branch_requirements"),
            "apply_url": raw.get("apply_url"),
            "application_deadline": deadline_dt,
            "is_active": True,
            "skills": raw.get("skills", [])
        }

        normalized["content_hash"] = self.generate_content_hash(normalized)
        return normalized
