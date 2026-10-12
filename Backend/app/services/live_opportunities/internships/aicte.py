import logging
from typing import Dict, Any, List, Optional
from app.services.live_opportunities.base_source import BaseLiveSource

logger = logging.getLogger("live_source_aicte_internship")

class AicteInternshipLiveSource(BaseLiveSource):
    """
    AICTE Internship Portal live adapter interface.
    Adheres to Terms and access controls. Direct scraping is disabled without authorized API credentials.
    """

    def __init__(self):
        super().__init__(source_name="aicte_internship", source_type="internships")
        # In compliance with rule 13/14, automated scraping without official credentials is kept disabled.
        self.is_available = False

    def fetch_live_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        logger.info("AICTE direct automated scraping is disabled due to access control restrictions.")
        return []

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return None
