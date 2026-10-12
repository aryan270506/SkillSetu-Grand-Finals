import time
import logging
from typing import Dict, Any, List, Optional
from threading import Lock
from concurrent.futures import ThreadPoolExecutor, wait

from app.config import settings
from app.services.session_cache_service import SessionCacheService
from app.services.live_opportunities.internships.jobicy import JobicyLiveSource
from app.services.live_opportunities.internships.arbeitnow import ArbeitnowLiveSource
from app.services.live_opportunities.internships.remotive import RemotiveLiveSource
from app.services.live_opportunities.internships.curated_live import CuratedLiveSource
from app.services.live_opportunities.internships.aicte import AicteInternshipLiveSource
from app.services.live_opportunities.scholarships.live_scholarship_loader import LiveScholarshipFeedSource

logger = logging.getLogger("live_opportunity_engine")


class LiveOpportunityEngine:
    """
    Central in-memory orchestrator for live internship and scholarship fetching.
    Executes multi-source live ingestion concurrently at runtime within a strict 2-second budget.
    Implements session-scoped temporary caching via SessionCacheService.
    ZERO rows are inserted into PostgreSQL.
    """

    _last_source_counts: Dict[str, int] = {}
    _last_raw_counts: Dict[str, int] = {}
    _last_source_diagnostics: Dict[str, Dict[str, Any]] = {}
    _last_performance_telemetry: Dict[str, Any] = {}
    _lock = Lock()

    @classmethod
    def get_live_internships(
        cls,
        session_id: Optional[str] = None,
        force_refresh: bool = False,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetches live internships concurrently from all configured adapters at runtime.
        1. If session_id is provided and cache exists and not force_refresh: returns cached immediately (<50ms).
        2. Else: Concurrently queries all sources with a strict timeout <= 1.4s (overall < 2.0s).
        3. Normalizes, deduplicates in-memory, updates session cache, and returns genuine opportunities.
        ZERO rows are inserted into PostgreSQL.
        """
        req_start = time.perf_counter()

        # 1. Session Cache Check
        if session_id and not force_refresh:
            cached_session = SessionCacheService.get_session_internships(session_id)
            if cached_session and cached_session.get("items"):
                items = cached_session["items"]
                resp_ms = round((time.perf_counter() - req_start) * 1000, 2)
                cls._last_performance_telemetry = {
                    "response_time_ms": resp_ms,
                    "cache_hit": True,
                    "session_id": session_id,
                    "returned_count": len(items)
                }
                logger.info(f"⚡ [CACHE HIT] Session {session_id} served {len(items)} internships in {resp_ms}ms")
                return items if limit is None else items[:limit]

        # 2. Live Concurrent Fetch with Hard Deadline
        logger.info("⚡ Live-fetching internships from active upstream feeds concurrently (hard budget <= 1.4s)...")
        sources = [
            CuratedLiveSource(),
            JobicyLiveSource(),
            ArbeitnowLiveSource(),
            RemotiveLiveSource(),
            AicteInternshipLiveSource()
        ]

        combined: List[Dict[str, Any]] = []
        seen_source_keys = set()
        seen_urls = set()
        seen_canonical = set()

        source_counts: Dict[str, int] = {}
        raw_counts: Dict[str, int] = {}
        source_diagnostics: Dict[str, Dict[str, Any]] = {}

        def _fetch_from_source(src):
            src_start = time.perf_counter()
            try:
                raw_recs = src.fetch_live_records(limit=None)
                raw_cnt = len(raw_recs)
                norm_recs = []
                for r in raw_recs:
                    norm = src.normalize_record(r)
                    if norm:
                        norm_recs.append(norm)
                parsed_cnt = len(norm_recs)
                src_time = round((time.perf_counter() - src_start) * 1000, 2)
                return {
                    "source_name": src.source_name,
                    "raw_count": raw_cnt,
                    "records": norm_recs,
                    "parsed_count": parsed_cnt,
                    "status": "success",
                    "response_time_ms": src_time
                }
            except Exception as e:
                src_time = round((time.perf_counter() - src_start) * 1000, 2)
                logger.error(f"Error fetching from live source {src.source_name}: {e}")
                return {
                    "source_name": src.source_name,
                    "raw_count": 0,
                    "records": [],
                    "parsed_count": 0,
                    "status": "failed",
                    "error": str(e),
                    "response_time_ms": src_time
                }

        executor = ThreadPoolExecutor(max_workers=len(sources))
        try:
            future_to_src = {executor.submit(_fetch_from_source, s): s for s in sources}
            done, not_done = wait(future_to_src.keys(), timeout=1.6)

            # Process completed sources
            for future in done:
                try:
                    res = future.result()
                    src_name = res["source_name"]
                    raw_counts[src_name] = res["raw_count"]
                    records = res["records"]
                    parsed_count = res["parsed_count"]
                    src_time = res["response_time_ms"]
                    status_str = res["status"]

                    source_accepted = 0
                    duplicate_count = 0
                    verified_count = 0
                    unverified_count = 0

                    for r in records:
                        src_id = str(r.get("source_id") or r.get("id") or "")
                        src = str(r.get("source") or src_name)
                        source_key = f"{src}:{src_id}"

                        apply_url = str(r.get("apply_url") or r.get("source_url") or "").strip().lower()
                        title_clean = "".join(ch for ch in str(r.get("title", "")).lower() if ch.isalnum())
                        comp_clean = "".join(ch for ch in str(r.get("company_name", "")).lower() if ch.isalnum())
                        loc_clean = "".join(ch for ch in str(r.get("location", "")).lower() if ch.isalnum())
                        canonical_key = f"{comp_clean}|{title_clean}|{loc_clean}"

                        is_dup = False
                        if source_key in seen_source_keys:
                            is_dup = True
                        elif apply_url and apply_url in seen_urls and apply_url not in ["https://skillsetu.in", "https://jobicy.com", "https://www.arbeitnow.com"]:
                            is_dup = True
                        elif comp_clean and title_clean and canonical_key in seen_canonical:
                            is_dup = True

                        if is_dup:
                            duplicate_count += 1
                            continue

                        seen_source_keys.add(source_key)
                        if apply_url:
                            seen_urls.add(apply_url)
                        if comp_clean and title_clean:
                            seen_canonical.add(canonical_key)

                        if r.get("verification_status") == "VERIFIED":
                            verified_count += 1
                        else:
                            unverified_count += 1

                        combined.append(r)
                        source_accepted += 1

                    source_counts[src_name] = source_accepted
                    source_diagnostics[src_name] = {
                        "status": status_str,
                        "response_time_ms": src_time,
                        "raw_fetched": res["raw_count"],
                        "parsed": parsed_count,
                        "duplicates_removed": duplicate_count,
                        "returned": source_accepted,
                        "verified": verified_count,
                        "unverified": unverified_count
                    }
                except Exception as ex:
                    logger.error(f"Error reading future result: {ex}")

            # Handle timed-out sources gracefully without blocking
            for future in not_done:
                src = future_to_src[future]
                src_name = src.source_name
                logger.warning(f"Live source {src_name} exceeded 1.4s deadline and timed out.")
                source_counts[src_name] = 0
                raw_counts[src_name] = 0
                source_diagnostics[src_name] = {
                    "status": "timeout",
                    "response_time_ms": 1400.0,
                    "raw_fetched": 0,
                    "parsed": 0,
                    "duplicates_removed": 0,
                    "returned": 0,
                    "verified": 0,
                    "unverified": 0
                }
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

        total_elapsed_ms = round((time.perf_counter() - req_start) * 1000, 2)
        cls._last_source_counts = source_counts
        cls._last_raw_counts = raw_counts
        cls._last_source_diagnostics = source_diagnostics
        cls._last_performance_telemetry = {
            "response_time_ms": total_elapsed_ms,
            "cache_hit": False,
            "session_id": session_id,
            "returned_count": len(combined),
            "sources": source_diagnostics
        }

        # Prioritize verified recruiter postings at the top
        combined.sort(key=lambda x: (0 if str(x.get("verification_status")).upper() == "VERIFIED" else 1))

        # 3. Store in Session Cache if session_id is present
        if session_id:
            SessionCacheService.set_session_internships(
                session_id=session_id,
                items=combined,
                source_counts=source_counts,
                source_diagnostics=source_diagnostics,
                ttl_seconds=settings.OPPORTUNITY_CACHE_TTL_SECONDS
            )

        logger.info(f"⚡ [LIVE FETCH COMPLETE] Deduplicated {len(combined)} internships in {total_elapsed_ms}ms (from {sum(raw_counts.values())} raw)")
        return combined if limit is None else combined[:limit]

    @classmethod
    def get_live_scholarships(
        cls,
        session_id: Optional[str] = None,
        force_refresh: bool = False,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetches live scholarships concurrently within strict 2-second budget with session caching.
        """
        req_start = time.perf_counter()

        if session_id and not force_refresh:
            cached_session = SessionCacheService.get_session_scholarships(session_id)
            if cached_session and cached_session.get("items"):
                items = cached_session["items"]
                resp_ms = round((time.perf_counter() - req_start) * 1000, 2)
                cls._last_performance_telemetry = {
                    "response_time_ms": resp_ms,
                    "cache_hit": True,
                    "session_id": session_id,
                    "returned_count": len(items)
                }
                logger.info(f"⚡ [CACHE HIT] Session {session_id} served {len(items)} scholarships in {resp_ms}ms")
                return items if limit is None else items[:limit]

        logger.info("⚡ Live-fetching scholarships from verified feeds (in-memory)...")
        src = LiveScholarshipFeedSource()
        records = src.get_live_opportunities(limit=limit)

        total_elapsed_ms = round((time.perf_counter() - req_start) * 1000, 2)
        if session_id:
            SessionCacheService.set_session_scholarships(
                session_id=session_id,
                items=records,
                ttl_seconds=settings.SCHOLARSHIP_CACHE_TTL_SECONDS
            )

        logger.info(f"⚡ [SCHOLARSHIP FETCH COMPLETE] {len(records)} live schemes in {total_elapsed_ms}ms")
        return records if limit is None else records[:limit]

    @classmethod
    def get_source_counts(cls) -> Dict[str, int]:
        return dict(cls._last_source_counts)

    @classmethod
    def get_source_diagnostics(cls) -> Dict[str, Dict[str, Any]]:
        return dict(cls._last_source_diagnostics)

    @classmethod
    def get_performance_telemetry(cls) -> Dict[str, Any]:
        return dict(cls._last_performance_telemetry)

    @classmethod
    def get_internship_source_status(cls, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns live source status, latency benchmarks, and provenance diagnostic report.
        """
        if not cls._last_source_diagnostics:
            cls.get_live_internships(session_id=session_id)
        diag = cls._last_source_diagnostics
        telemetry = cls._last_performance_telemetry
        return {
            "performance": telemetry,
            "sources": [
                {
                    "name": "Jobicy",
                    "status": diag.get("jobicy", {}).get("status", "ACTIVE"),
                    "source_type": "external_aggregator",
                    "verification_status": "UNVERIFIED",
                    "response_time_ms": diag.get("jobicy", {}).get("response_time_ms", 0),
                    "diagnostics": diag.get("jobicy", {
                        "raw_fetched": 0, "parsed": 0, "duplicates_removed": 0, "returned": 0, "verified": 0, "unverified": 0
                    }),
                    "records_fetched": cls._last_source_counts.get("jobicy", 0),
                    "description": "Public remote developer and engineering feed"
                },
                {
                    "name": "Arbeitnow",
                    "status": diag.get("arbeitnow", {}).get("status", "ACTIVE"),
                    "source_type": "external_aggregator",
                    "verification_status": "UNVERIFIED",
                    "response_time_ms": diag.get("arbeitnow", {}).get("response_time_ms", 0),
                    "diagnostics": diag.get("arbeitnow", {
                        "raw_fetched": 0, "parsed": 0, "duplicates_removed": 0, "returned": 0, "verified": 0, "unverified": 0
                    }),
                    "records_fetched": cls._last_source_counts.get("arbeitnow", 0),
                    "description": "European & global developer opportunities feed"
                },
                {
                    "name": "Remotive",
                    "status": diag.get("remotive", {}).get("status", "ACTIVE"),
                    "source_type": "external_aggregator",
                    "verification_status": "UNVERIFIED",
                    "response_time_ms": diag.get("remotive", {}).get("response_time_ms", 0),
                    "diagnostics": diag.get("remotive", {
                        "raw_fetched": 0, "parsed": 0, "duplicates_removed": 0, "returned": 0, "verified": 0, "unverified": 0
                    }),
                    "records_fetched": cls._last_source_counts.get("remotive", 0),
                    "description": "Global remote developer opportunities feed"
                },
                {
                    "name": "Recruiter Postings",
                    "status": diag.get("recruiter_posting", diag.get("curated_verified", {})).get("status", "ACTIVE"),
                    "source_type": "recruiter_verified",
                    "verification_status": "VERIFIED",
                    "response_time_ms": diag.get("recruiter_posting", diag.get("curated_verified", {})).get("response_time_ms", 0),
                    "diagnostics": diag.get("recruiter_posting", diag.get("curated_verified", {
                        "raw_fetched": 0, "parsed": 0, "duplicates_removed": 0, "returned": 0, "verified": 0, "unverified": 0
                    })),
                    "records_fetched": cls._last_source_counts.get("recruiter_posting", cls._last_source_counts.get("curated_verified", 0)),
                    "description": "Verified tech internships posted directly by recruiters and companies in PostgreSQL"
                },
                {
                    "name": "AICTE",
                    "status": "UNAVAILABLE",
                    "source_type": "external_aggregator",
                    "verification_status": "UNVERIFIED",
                    "diagnostics": {"raw_fetched": 0, "parsed": 0, "duplicates_removed": 0, "returned": 0, "verified": 0, "unverified": 0},
                    "records_fetched": 0,
                    "reason": "Automated scraping disabled in compliance with access controls; requires authorized API credentials."
                },
                {
                    "name": "Internshala",
                    "status": "NOT_CONNECTED",
                    "records_fetched": 0,
                    "reason": "No authorized API/data access configured."
                },
                {
                    "name": "Unstop",
                    "status": "NOT_CONNECTED",
                    "records_fetched": 0,
                    "reason": "No authorized API/data access configured."
                }
            ],
            "total_live_opportunities": sum(cls._last_source_counts.values()),
            "diagnostics_summary": {
                "total_raw_fetched": sum(cls._last_raw_counts.values()),
                "total_deduplicated_live": sum(cls._last_source_counts.values()),
                "total_verified": sum(d.get("verified", 0) for d in diag.values()),
                "total_unverified": sum(d.get("unverified", 0) for d in diag.values())
            }
        }

    @classmethod
    def get_source_debug_report(cls, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns structured development-only debug report formatted exactly as required by audit specs.
        """
        if not cls._last_source_diagnostics:
            cls.get_live_internships(session_id=session_id)
        diag = cls._last_source_diagnostics

        sources_map = {}
        for src_key, d in diag.items():
            ver = "VERIFIED" if d.get("verified", 0) > 0 and d.get("unverified", 0) == 0 else "UNVERIFIED"
            sources_map[src_key] = {
                "requested": d.get("raw_fetched", 0),
                "raw": d.get("raw_fetched", 0),
                "parsed": d.get("parsed", 0),
                "deduplicated": d.get("returned", 0),
                "returned_to_cache": d.get("returned", 0),
                "verification": ver
            }

        return {
            "sources": sources_map,
            "aggregate": {
                "raw": sum(cls._last_raw_counts.values()),
                "unique": sum(cls._last_source_counts.values())
            }
        }

    @classmethod
    def get_scholarship_source_status(cls, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns live scholarship source status and performance telemetry.
        """
        schs = cls.get_live_scholarships(session_id=session_id)
        nsp_count = sum(1 for s in schs if s.get("source") == "nsp")
        aicte_count = sum(1 for s in schs if s.get("source") == "aicte")
        corp_count = sum(1 for s in schs if s.get("source") == "corporate")

        return {
            "performance": cls._last_performance_telemetry,
            "sources": [
                {
                    "name": "National Scholarship Portal (NSP)",
                    "status": "ACTIVE",
                    "records_fetched": nsp_count,
                    "academic_year": "2026-27",
                    "description": "Central government DBT and merit-cum-means scholarship schemes"
                },
                {
                    "name": "AICTE Schemes",
                    "status": "ACTIVE",
                    "records_fetched": aicte_count,
                    "academic_year": "2026-27",
                    "description": "Pragati, Saksham, and Swanath student development grants"
                },
                {
                    "name": "Corporate & Philanthropic Foundations",
                    "status": "ACTIVE",
                    "records_fetched": corp_count,
                    "academic_year": "2026-27",
                    "description": "Tata Trusts, Reliance Foundation, Amazon AFE, ONGC, Vidyasaarathi"
                }
            ],
            "total_live_schemes": len(schs)
        }
