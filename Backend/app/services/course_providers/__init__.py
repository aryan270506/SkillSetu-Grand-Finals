from typing import Dict, Type
from app.services.course_providers.base import BaseCourseProvider
from app.services.course_providers.nptel import NPTELProvider
from app.services.course_providers.youtube import YouTubeProvider
from app.services.course_providers.freecodecamp import FreeCodeCampProvider

PROVIDER_REGISTRY: Dict[str, Type[BaseCourseProvider]] = {
    "nptel": NPTELProvider,
    "youtube": YouTubeProvider,
    "freecodecamp": FreeCodeCampProvider,
}


def get_course_provider(slug: str) -> BaseCourseProvider:
    """
    Factory function to retrieve an instance of the provider connector by its slug.
    Supported providers: nptel, youtube, freecodecamp.
    """
    normalized_slug = slug.strip().lower()
    provider_cls = PROVIDER_REGISTRY.get(normalized_slug)
    if not provider_cls:
        raise ValueError(f"Unsupported course provider: '{slug}'. Supported providers: {list(PROVIDER_REGISTRY.keys())}")
    return provider_cls()


__all__ = [
    "BaseCourseProvider",
    "NPTELProvider",
    "YouTubeProvider",
    "FreeCodeCampProvider",
    "PROVIDER_REGISTRY",
    "get_course_provider",
]
