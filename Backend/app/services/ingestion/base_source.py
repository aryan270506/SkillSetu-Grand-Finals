from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
import hashlib
import json
import logging

logger = logging.getLogger("skillsetu_ingestion")


class BaseSourceAdapter(ABC):
    """
    Abstract base adapter for all opportunity and scholarship ingestion sources.
    """
    source_name: str
    source_type: str  # 'internships' or 'scholarships'

    @abstractmethod
    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Fetches and returns raw records from the external source or official scheme catalog.
        """
        pass

    @abstractmethod
    def normalize_record(self, raw_record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Validates and normalizes raw record into standard internal dictionary.
        Returns None if record fails validation.
        """
        pass

    @staticmethod
    def generate_content_hash(data: Dict[str, Any]) -> str:
        """
        Generates deterministic SHA-256 hash from meaningful content fields (excluding timestamps).
        """
        # Pick key content fields for hashing
        key_fields = {
            "title": data.get("title") or data.get("name"),
            "provider": data.get("company_name") or data.get("provider"),
            "description": (data.get("description") or "")[:500],
            "location": data.get("location_name") or data.get("eligible_states"),
            "stipend_award": str(data.get("stipend") or data.get("award_amount")),
            "url": data.get("apply_url") or data.get("application_url")
        }
        serialized = json.dumps(key_fields, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @classmethod
    def compute_content_hash(cls, **kwargs) -> str:
        """
        Convenience keyword-based content hash generator.
        """
        return cls.generate_content_hash(kwargs)
