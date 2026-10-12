import time
import logging
from typing import Dict, Any, List, Optional
from threading import Lock
from app.config import settings

logger = logging.getLogger("skillsetu_session_cache")


class SessionCacheService:
    """
    Session-Scoped Opportunity & Matching In-Memory Cache Service.
    
    Architectural Rules:
    1. Key Structure:
       - skillsetu:opportunities:{session_id}:internships
       - skillsetu:opportunities:{session_id}:scholarships
       - skillsetu:matches:{session_id}:{user_id}
       - skillsetu:scholarship_evals:{session_id}:{user_id}
    2. Zero PostgreSQL catalog persistence.
    3. Scoped strictly per authenticated session.
    4. Configurable TTLs (OPPORTUNITY_CACHE_TTL_SECONDS, SCHOLARSHIP_CACHE_TTL_SECONDS).
    5. Full session cache destruction on logout.
    """

    _cache_store: Dict[str, Dict[str, Any]] = {}
    _lock = Lock()

    @classmethod
    def _get_key(cls, category: str, session_id: str, sub_id: Optional[str] = None) -> str:
        s_clean = str(session_id).strip()
        if sub_id:
            return f"skillsetu:{category}:{s_clean}:{str(sub_id).strip()}"
        return f"skillsetu:opportunities:{s_clean}:{category}"

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        now = time.time()
        with cls._lock:
            entry = cls._cache_store.get(key)
            if not entry:
                return None
            if entry["expires_at"] < now:
                del cls._cache_store[key]
                return None
            return entry["data"]

    @classmethod
    def set(cls, key: str, data: Any, ttl_seconds: Optional[int] = None) -> None:
        now = time.time()
        ttl = ttl_seconds if ttl_seconds is not None else settings.OPPORTUNITY_CACHE_TTL_SECONDS
        with cls._lock:
            cls._cache_store[key] = {
                "data": data,
                "created_at": now,
                "expires_at": now + ttl
            }

    @classmethod
    def delete(cls, key: str) -> bool:
        with cls._lock:
            if key in cls._cache_store:
                del cls._cache_store[key]
                return True
            return False

    # -------------------------------------------------------------------------
    # Internships Cache
    # -------------------------------------------------------------------------
    @classmethod
    def get_session_internships(cls, session_id: str) -> Optional[Dict[str, Any]]:
        key = cls._get_key("internships", session_id)
        cached = cls.get(key)
        if cached:
            logger.info(f"⚡ [Cache HIT] Retrieved live internships for session {session_id} ({len(cached.get('items', []))} items)")
            return cached
        logger.info(f"⚡ [Cache MISS] Live internships for session {session_id}")
        return None

    @classmethod
    def set_session_internships(
        cls,
        session_id: str,
        items: List[Dict[str, Any]],
        source_counts: Optional[Dict[str, int]] = None,
        source_diagnostics: Optional[Dict[str, Any]] = None,
        ttl_seconds: Optional[int] = None
    ) -> None:
        key = cls._get_key("internships", session_id)
        ttl = ttl_seconds or settings.OPPORTUNITY_CACHE_TTL_SECONDS
        payload = {
            "items": items,
            "source_counts": source_counts or {},
            "source_diagnostics": source_diagnostics or {},
            "cached_at": time.time()
        }
        cls.set(key, payload, ttl_seconds=ttl)
        logger.info(f"⚡ [Cache STORE] Cached {len(items)} live internships for session {session_id} (TTL={ttl}s)")

    # -------------------------------------------------------------------------
    # Scholarships Cache
    # -------------------------------------------------------------------------
    @classmethod
    def get_session_scholarships(cls, session_id: str) -> Optional[Dict[str, Any]]:
        key = cls._get_key("scholarships", session_id)
        cached = cls.get(key)
        if cached:
            logger.info(f"⚡ [Cache HIT] Retrieved live scholarships for session {session_id} ({len(cached.get('items', []))} items)")
            return cached
        logger.info(f"⚡ [Cache MISS] Live scholarships for session {session_id}")
        return None

    @classmethod
    def set_session_scholarships(
        cls,
        session_id: str,
        items: List[Dict[str, Any]],
        source_counts: Optional[Dict[str, int]] = None,
        source_diagnostics: Optional[Dict[str, Any]] = None,
        ttl_seconds: Optional[int] = None
    ) -> None:
        key = cls._get_key("scholarships", session_id)
        ttl = ttl_seconds or settings.SCHOLARSHIP_CACHE_TTL_SECONDS
        payload = {
            "items": items,
            "source_counts": source_counts or {},
            "source_diagnostics": source_diagnostics or {},
            "cached_at": time.time()
        }
        cls.set(key, payload, ttl_seconds=ttl)
        logger.info(f"⚡ [Cache STORE] Cached {len(items)} live scholarships for session {session_id} (TTL={ttl}s)")

    # -------------------------------------------------------------------------
    # Matching / Evaluation Cache (Student-Specific)
    # -------------------------------------------------------------------------
    @classmethod
    def get_session_matches(cls, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        key = cls._get_key("matches", session_id, sub_id=user_id)
        return cls.get(key)

    @classmethod
    def set_session_matches(
        cls,
        session_id: str,
        user_id: str,
        match_bundle: Dict[str, Any],
        ttl_seconds: Optional[int] = None
    ) -> None:
        key = cls._get_key("matches", session_id, sub_id=user_id)
        ttl = ttl_seconds or settings.OPPORTUNITY_CACHE_TTL_SECONDS
        cls.set(key, match_bundle, ttl_seconds=ttl)

    @classmethod
    def invalidate_session_matches(cls, session_id: str, user_id: Optional[str] = None) -> int:
        """
        Invalidates match cache when student evidence updates, without evicting raw live opportunities.
        """
        removed = 0
        with cls._lock:
            match_prefix = f"skillsetu:matches:{session_id}"
            if user_id:
                match_prefix = f"skillsetu:matches:{session_id}:{user_id}"
            keys_to_del = [k for k in cls._cache_store if k.startswith(match_prefix)]
            for k in keys_to_del:
                del cls._cache_store[k]
                removed += 1
        logger.info(f"⚡ Invalidated {removed} match cache entries for session {session_id}")
        return removed

    # -------------------------------------------------------------------------
    # Logout / Session Clearance
    # -------------------------------------------------------------------------
    @classmethod
    def clear_session_cache(cls, session_id: str) -> int:
        """
        Destroys ALL opportunity, matching, and scholarship cache records for this session on logout.
        """
        s_clean = str(session_id).strip()
        deleted_count = 0
        with cls._lock:
            keys_to_del = [
                k for k in cls._cache_store
                if f":{s_clean}:" in k or k.endswith(f":{s_clean}") or k.startswith(f"skillsetu:opportunities:{s_clean}:") or k.startswith(f"skillsetu:matches:{s_clean}:") or k.startswith(f"skillsetu:scholarship_evals:{s_clean}:")
            ]
            for k in keys_to_del:
                del cls._cache_store[k]
                deleted_count += 1
        logger.info(f"⚡ [LOGOUT] Cleared all {deleted_count} session cache keys for session {s_clean}")
        return deleted_count

    @classmethod
    def clear_all_for_student(cls, student_email_or_id: str) -> int:
        """
        Destroys cache for any session associated with this student.
        """
        identifier = str(student_email_or_id).lower().strip()
        deleted_count = 0
        with cls._lock:
            keys_to_del = [k for k in cls._cache_store if identifier in k]
            for k in keys_to_del:
                del cls._cache_store[k]
                deleted_count += 1
        return deleted_count

    @classmethod
    def clear_all_cache(cls) -> int:
        """
        Destroys ALL cache entries across all categories and sessions
        (e.g., when a recruiter publishes, edits, or removes an internship).
        """
        with cls._lock:
            deleted_count = len(cls._cache_store)
            cls._cache_store.clear()
        logger.info(f"⚡ Cleared all {deleted_count} session cache keys across entire platform.")
        return deleted_count

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        with cls._lock:
            now = time.time()
            active_keys = [k for k, v in cls._cache_store.items() if v["expires_at"] >= now]
            return {
                "total_cached_keys": len(active_keys),
                "keys": active_keys
            }
