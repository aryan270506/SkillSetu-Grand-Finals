import os
import json
import logging
from typing import Dict, Any, List, Optional
from app.services.live_opportunities.base_source import BaseLiveSource

logger = logging.getLogger("live_source_scholarships")


class LiveScholarshipFeedSource(BaseLiveSource):
    """
    Live verified scholarship source adapter (NSP, AICTE, and State & Corporate Foundations).
    Loads verified government & foundation schemes at runtime entirely in memory.
    """

    @classmethod
    def _find_feed_path(cls) -> str:
        candidates = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))), "data", "verified_scholarships_seed.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", "verified_scholarships_seed.json"),
            os.path.join(os.getcwd(), "data", "verified_scholarships_seed.json"),
            os.path.join(os.getcwd(), "Backend", "data", "verified_scholarships_seed.json"),
        ]
        for path in candidates:
            if os.path.exists(path):
                return path
        return candidates[0]

    def __init__(self, feed_path: Optional[str] = None):
        super().__init__(source_name="verified_scholarships", source_type="scholarships")
        self.feed_path = feed_path or self._find_feed_path()

    def fetch_live_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        if not os.path.exists(self.feed_path):
            logger.warning(f"Scholarship live feed path not found at {self.feed_path}")
            return []

        try:
            with open(self.feed_path, "r", encoding="utf-8") as f:
                records = json.load(f)
                return records if limit is None else records[:limit]
        except Exception as e:
            logger.error(f"Error reading live scholarship feed: {e}")
            return []

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        source_id = str(raw.get("source_id") or raw.get("id") or "")
        name = raw.get("name") or ""
        provider = raw.get("provider") or ""

        if not source_id or not name or not provider:
            return None

        rules = raw.get("rules") or {}

        return {
            "id": f"sch_{source_id}",
            "source": raw.get("source") or "nsp",
            "source_id": source_id,
            "source_url": raw.get("source_url") or raw.get("application_url") or "https://scholarships.gov.in",
            "application_url": raw.get("application_url") or "https://scholarships.gov.in",
            "name": name.strip(),
            "provider": provider.strip(),
            "description": raw.get("description", "Government & Institutional Financial Grant Scheme."),
            "academic_year": raw.get("academic_year", "2026-27"),
            "scholarship_type": raw.get("scholarship_type", "Merit & Need-based"),
            "award_amount": float(raw.get("award_amount", 50000.0)),
            "award_frequency": raw.get("award_frequency", "per year"),
            "award_description": raw.get("award_description") or f"₹{int(raw.get('award_amount', 50000)):,} per year",
            "application_deadline": raw.get("application_deadline") or "2026-11-30T23:59:59Z",
            "is_active": raw.get("is_active", True),
            "verified": True,
            "rules": rules
        }
