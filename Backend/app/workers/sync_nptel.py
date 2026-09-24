"""
SkillSetu NPTEL / SWAYAM Course Catalog Sync Worker & CLI
Supports live incremental synchronization, dry-run mode, rate limiting, and observability.
"""
import argparse
import asyncio
import logging
import sys
import time
from datetime import datetime, timezone
from typing import Optional

from app import models
from app.database import SessionLocal
from app.services import course_service
from app.services.course_providers.nptel import NPTELProvider

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nptel_sync_worker")


async def run_nptel_sync(
    dry_run: bool = False,
    limit: Optional[int] = None,
    offset: int = 0,
    force_refresh: bool = False,
    delay_seconds: Optional[float] = None,
) -> dict:
    """
    Executes live NPTEL course catalog synchronization into PostgreSQL.
    """
    start_time = time.time()
    db = SessionLocal()

    # 1. Initialize and ensure NPTEL provider exists
    course_service.seed_default_providers(db)
    provider = course_service.get_provider_by_slug(db, "nptel")
    if not provider:
        raise RuntimeError("NPTEL provider not found in database.")

    # 2. Initialize sync log record if not dry-run
    sync_log: Optional[models.CourseSyncLog] = None
    if not dry_run:
        sync_log = course_service.create_sync_log(db, provider_id=provider.id)
        logger.info(f"Started sync log #{sync_log.id} for provider NPTEL")

    nptel_connector = NPTELProvider(delay_seconds=delay_seconds)

    # Statistics
    stats = {
        "catalog_discovered": 0,
        "courses_created": 0,
        "courses_updated": 0,
        "courses_unchanged": 0,
        "courses_failed": 0,
        "status": "completed",
        "dry_run": dry_run,
        "duration_seconds": 0.0,
    }

    try:
        logger.info(f"Discovering NPTEL courses (limit={limit}, offset={offset})...")
        discovered_courses = await nptel_connector.fetch_courses(
            limit=limit if limit is not None else 0,
            offset=offset
        )
        stats["catalog_discovered"] = len(discovered_courses)
        logger.info(f"Discovered {len(discovered_courses)} courses from NPTEL catalog.")

        for idx, summary in enumerate(discovered_courses, start=1):
            ext_id = summary.external_id
            logger.info(f"[{idx}/{len(discovered_courses)}] Processing NPTEL course: {ext_id} - '{summary.title}'")

            # Check existing course in DB
            existing_course = db.query(models.Course).filter(
                models.Course.provider_id == provider.id,
                models.Course.external_id == ext_id
            ).first()

            try:
                # Fetch full course details including syllabus, instructor, duration, level
                detailed_course = await nptel_connector.fetch_course_details(ext_id)
                if not detailed_course:
                    # Use summary if detail page 404s
                    detailed_course = summary

                if dry_run:
                    # Dry Run evaluation
                    if not existing_course:
                        stats["courses_created"] += 1
                        logger.info(f"  [DRY RUN] Would INSERT: {ext_id} ('{detailed_course.title}')")
                    elif (
                        existing_course.content_hash is not None
                        and detailed_course.content_hash is not None
                        and existing_course.content_hash == detailed_course.content_hash
                    ):
                        stats["courses_unchanged"] += 1
                        logger.info(f"  [DRY RUN] UNCHANGED: {ext_id} (hash match)")
                    else:
                        stats["courses_updated"] += 1
                        logger.info(f"  [DRY RUN] Would UPDATE: {ext_id} ('{detailed_course.title}')")
                else:
                    # Live DB Upsert
                    course, status = course_service.upsert_course_with_status(db, detailed_course)
                    if status == "created":
                        stats["courses_created"] += 1
                        logger.info(f"  INSERTED: {ext_id} (id={course.id})")
                    elif status == "updated":
                        stats["courses_updated"] += 1
                        logger.info(f"  UPDATED: {ext_id} (id={course.id})")
                    else:
                        stats["courses_unchanged"] += 1
                        logger.info(f"  UNCHANGED: {ext_id} (id={course.id})")

            except Exception as exc:
                stats["courses_failed"] += 1
                logger.error(f"  FAILED to process course {ext_id}: {exc}")

        # Determine overall sync status
        if stats["courses_failed"] > 0 and (stats["courses_created"] > 0 or stats["courses_updated"] > 0 or stats["courses_unchanged"] > 0):
            stats["status"] = "partial"
        elif stats["courses_failed"] > 0 and stats["courses_created"] == 0 and stats["courses_updated"] == 0 and stats["courses_unchanged"] == 0:
            stats["status"] = "failed"
        else:
            stats["status"] = "completed"

    except Exception as general_exc:
        logger.error(f"Fatal error during NPTEL sync: {general_exc}", exc_info=True)
        stats["status"] = "failed"
        if sync_log and not dry_run:
            course_service.complete_sync_log(
                db,
                log_id=sync_log.id,
                status="failed",
                error_message=str(general_exc),
            )
        raise general_exc

    finally:
        duration = round(time.time() - start_time, 2)
        stats["duration_seconds"] = duration

        if sync_log and not dry_run:
            course_service.complete_sync_log(
                db,
                log_id=sync_log.id,
                courses_found=stats["catalog_discovered"],
                courses_created=stats["courses_created"],
                courses_updated=stats["courses_updated"],
                courses_deactivated=0,
                courses_failed=stats["courses_failed"],
                status=stats["status"],
            )

        db.close()

    # Formatted Console Summary
    mode_header = "DRY RUN" if dry_run else "LIVE SYNC"
    print("\n" + "=" * 45)
    print(f"SkillSetu NPTEL Sync — {mode_header}")
    print("=" * 45)
    print(f"Provider: NPTEL / SWAYAM")
    print(f"Catalog discovered: {stats['catalog_discovered']}")
    print(f"New courses:        {stats['courses_created']}")
    print(f"Updated courses:    {stats['courses_updated']}")
    print(f"Unchanged:          {stats['courses_unchanged']}")
    print(f"Failed:             {stats['courses_failed']}")
    print(f"Sync status:        {stats['status'].upper()}")
    print(f"Duration:           {duration}s")
    if dry_run:
        print("\nNote: No database changes were written (dry-run mode).")
    print("=" * 45 + "\n")

    return stats


def main():
    parser = argparse.ArgumentParser(description="SkillSetu NPTEL Course Catalog Sync CLI")
    parser.add_argument("--dry-run", action="store_true", help="Simulate ingestion without writing to PostgreSQL")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of courses to discover and sync")
    parser.add_argument("--offset", type=int, default=0, help="Offset into course catalog")
    parser.add_argument("--force-refresh", action="store_true", help="Force refresh metadata even if content hash matches")
    parser.add_argument("--delay", type=float, default=None, help="Polite delay between requests in seconds")

    args = parser.parse_args()

    asyncio.run(
        run_nptel_sync(
            dry_run=args.dry_run,
            limit=args.limit,
            offset=args.offset,
            force_refresh=args.force_refresh,
            delay_seconds=args.delay,
        )
    )


if __name__ == "__main__":
    main()
