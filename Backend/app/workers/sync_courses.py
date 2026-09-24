import asyncio
import argparse
import logging
import sys

from app.database import SessionLocal
from app.services.course_sync_service import sync_provider, get_providers_status
from app.services.course_providers import PROVIDER_REGISTRY

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sync_courses_worker")


async def run_sync(
    provider_arg: str,
    limit: int = 50,
    offset: int = 0,
    force_refresh: bool = False,
    dry_run: bool = False,
    query: str = None
):
    """Orchestrate course synchronization for requested provider(s)."""
    db = SessionLocal()
    try:
        targets = []
        if provider_arg.lower().strip() == "all":
            targets = list(PROVIDER_REGISTRY.keys())
        else:
            p_slug = provider_arg.lower().strip()
            if p_slug not in PROVIDER_REGISTRY:
                logger.error(f"Unsupported provider: '{provider_arg}'. Choose from: {list(PROVIDER_REGISTRY.keys())} or 'all'.")
                sys.exit(1)
            targets = [p_slug]

        logger.info(f"=== Starting Course Synchronization ===")
        logger.info(f"Target providers: {targets} | Limit: {limit} | Dry-run: {dry_run} | Force-refresh: {force_refresh}")

        summary = {}
        for target in targets:
            logger.info(f"\n>>> Synchronizing [{target.upper()}]...")
            result = await sync_provider(
                provider_slug=target,
                limit=limit,
                offset=offset,
                force_refresh=force_refresh,
                dry_run=dry_run,
                query=query,
                db=db
            )
            summary[target] = result
            logger.info(f"[{target.upper()}] Result: {result}")

        logger.info("\n=== Provider Status Summary ===")
        statuses = get_providers_status(db)
        for p, stat in statuses.items():
            logger.info(f"  {stat['name']} ({p}): status={stat['status']}, total={stat['course_count']}, active={stat['active_course_count']}, last_sync={stat['last_sync']}")

        logger.info("\n=== Synchronization Complete ===")
        return summary
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="SkillSetu Course Synchronization Worker")
    parser.add_argument(
        "--provider",
        type=str,
        default="all",
        help="Target provider slug (nptel, coursera, udemy, youtube) or 'all' (default: all)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Maximum courses to fetch per provider (default: 50)"
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Offset for pagination (default: 0)"
    )
    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Force overwrite existing course content and regenerate skills and embeddings"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate ingestion without saving changes to PostgreSQL or Qdrant"
    )
    parser.add_argument(
        "--query",
        type=str,
        default=None,
        help="Optional search query for targeted content discovery (especially for YouTube)"
    )

    args = parser.parse_args()
    asyncio.run(
        run_sync(
            provider_arg=args.provider,
            limit=args.limit,
            offset=args.offset,
            force_refresh=args.force_refresh,
            dry_run=args.dry_run,
            query=args.query
        )
    )


if __name__ == "__main__":
    main()
