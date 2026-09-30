import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.ingestion.base_source import BaseSourceAdapter

logger = logging.getLogger("skillsetu_ingestion")


class VerifiedScholarshipAdapter(BaseSourceAdapter):
    """
    Adapter for verified government and foundation scholarships with deterministic eligibility rules.
    """
    source_name = "verified_scholarships"
    source_type = "scholarships"

    def __init__(self, json_path: Optional[str] = None):
        if not json_path:
            # __file__ is in Backend/app/services/ingestion/scholarship/scholarship_loader.py
            cur_dir = os.path.abspath(__file__)
            for _ in range(5):
                cur_dir = os.path.dirname(cur_dir)
            self.json_path = os.path.join(cur_dir, "data", "verified_scholarships_seed.json")
        else:
            self.json_path = json_path

    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not os.path.exists(self.json_path):
            logger.warning(f"Verified scholarships seed file not found at {self.json_path}")
            return []
        try:
            with open(self.json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data[:limit]
        except Exception as e:
            logger.error(f"Failed to read verified scholarships seed file: {e}")
            return []

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        name = raw.get("name", "").strip()
        provider = raw.get("provider", "").strip()
        if not name or not provider:
            return None

        # Parse application deadline
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

        # Parse application open
        open_date = raw.get("application_open")
        if open_date and isinstance(open_date, str):
            try:
                open_dt = datetime.fromisoformat(open_date.replace("Z", "+00:00"))
            except Exception:
                open_dt = None
        elif isinstance(open_date, datetime):
            open_dt = open_date
        else:
            open_dt = None

        rules = raw.get("rules", {})

        normalized = {
            "source": raw.get("source") or self.source_name,
            "source_id": raw.get("source_id"),
            "source_url": raw.get("source_url"),
            "name": name,
            "provider": provider,
            "description": raw.get("description"),
            "academic_year": raw.get("academic_year") or "2026-27",
            "scholarship_type": raw.get("scholarship_type") or "Merit & Need-based",
            "award_amount": raw.get("award_amount"),
            "award_frequency": raw.get("award_frequency") or "per year",
            "award_description": raw.get("award_description"),
            "application_open": open_dt,
            "application_deadline": deadline_dt,
            "application_url": raw.get("application_url"),
            "is_active": True,
            "rules": {
                "min_cgpa": rules.get("min_cgpa"),
                "min_percentage_12th": rules.get("min_percentage_12th"),
                "max_annual_family_income": rules.get("max_annual_family_income"),
                "eligible_states": rules.get("eligible_states") or ["All"],
                "eligible_categories": rules.get("eligible_categories") or ["All"],
                "eligible_genders": rules.get("eligible_genders") or ["All"],
                "eligible_degrees": rules.get("eligible_degrees") or ["All"],
                "eligible_branches": rules.get("eligible_branches") or ["All"],
                "eligible_years": rules.get("eligible_years") or ["All"],
                "requires_pwd": bool(rules.get("requires_pwd", False)),
                "requires_minority": bool(rules.get("requires_minority", False)),
                "other_conditions": rules.get("other_conditions")
            }
        }

        normalized["content_hash"] = self.generate_content_hash(normalized)
        return normalized
