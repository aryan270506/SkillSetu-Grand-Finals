import hashlib
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger("live_opportunity_source")

class BaseLiveSource(ABC):
    """
    Abstract base class for all runtime live opportunity adapters.
    Returns normalized in-memory Python objects without writing to PostgreSQL.
    """

    def __init__(self, source_name: str, source_type: str = "internships"):
        self.source_name = source_name
        self.source_type = source_type
        self.is_available = True

    @abstractmethod
    def fetch_live_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Fetches live opportunities directly from upstream API or verified feed.
        Returns a list of raw dictionaries.
        """
        pass

    @abstractmethod
    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parses and standardizes a single opportunity into a canonical runtime schema.
        """
        pass

    def get_live_opportunities(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Template method that executes live fetching and normalization in memory.
        """
        if not self.is_available:
            logger.info(f"Source {self.source_name} is currently marked unavailable. Skipping.")
            return []

        try:
            raw_records = self.fetch_live_records(limit=limit)
            normalized = []
            for r in raw_records:
                try:
                    norm = self.normalize_record(r)
                    if norm and self.validate_record(norm):
                        norm["content_hash"] = self.compute_hash(norm)
                        norm["source"] = norm.get("source") or self.source_name
                        normalized.append(norm)
                except Exception as ex:
                    logger.warning(f"Error normalizing record in {self.source_name}: {ex}")
            return normalized
        except Exception as e:
            logger.error(f"Failed to fetch live records from {self.source_name}: {e}")
            return []

    def validate_record(self, record: Dict[str, Any]) -> bool:
        """
        Validates presence of essential identity and application routing fields.
        """
        if self.source_type == "internships":
            if not record.get("title") or not record.get("company_name") or not record.get("source_id"):
                return False
        else:
            if not record.get("name") or not record.get("provider") or not record.get("source_id"):
                return False
        return True

    @staticmethod
    def compute_hash(record: Dict[str, Any]) -> str:
        """
        Generates deterministic SHA-256 hash using meaningful content fields (ignoring timestamps).
        """
        hash_dict = {
            "title": record.get("title") or record.get("name"),
            "company": record.get("company_name") or record.get("provider"),
            "description": (record.get("description") or "")[:200],
            "deadline": str(record.get("application_deadline") or record.get("deadline") or "")
        }
        encoded = json.dumps(hash_dict, sort_keys=True).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()
