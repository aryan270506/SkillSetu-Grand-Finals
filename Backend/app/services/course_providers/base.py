from abc import ABC, abstractmethod
from typing import List, Optional, Any
from app.schemas.course import NormalizedCourse


class BaseCourseProvider(ABC):
    """
    Abstract base class for all course aggregation providers
    (e.g., NPTEL/SWAYAM, Coursera, Udemy, YouTube).
    """

    @property
    @abstractmethod
    def provider_slug(self) -> str:
        """Unique slug identifier for the provider (e.g. 'nptel')."""
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable display name for the provider (e.g. 'NPTEL')."""
        pass

    @property
    @abstractmethod
    def base_url(self) -> Optional[str]:
        """Base URL for the provider platform."""
        pass

    @abstractmethod
    async def fetch_courses(
        self,
        limit: int = 50,
        offset: int = 0,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        Fetch a batch of courses from the provider and return them normalized.
        """
        pass

    @abstractmethod
    async def fetch_course_details(
        self,
        external_id: str
    ) -> Optional[NormalizedCourse]:
        """
        Fetch details for a specific course by its external provider ID.
        """
        pass

    @abstractmethod
    async def search_courses(
        self,
        query: str,
        limit: int = 50,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        Search courses directly via provider's search mechanism.
        """
        pass
