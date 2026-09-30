import logging
import sys
from app.database import SessionLocal
from app.services.ingestion.sync_engine import OpportunitySyncEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("sync_opportunities")


def main():
    logger.info("Starting Opportunities & Scholarships Ingestion Worker...")
    db = SessionLocal()
    try:
        # 1. Sync internships
        int_stats = OpportunitySyncEngine.run_internship_sync(db, include_external=True)
        logger.info(f"Internships sync finished: {int_stats}")

        # 2. Sync scholarships
        sch_stats = OpportunitySyncEngine.run_scholarship_sync(db)
        logger.info(f"Scholarships sync finished: {sch_stats}")

        print("\n=======================================================")
        print("  OPPORTUNITY & SCHOLARSHIP SYNC SUMMARY")
        print("=======================================================")
        print(f"  Internships Found:       {int_stats['records_found']}")
        print(f"  Internships Created:     {int_stats['records_created']}")
        print(f"  Internships Updated:     {int_stats['records_updated']}")
        print(f"  Internships Deactivated: {int_stats['records_deactivated']}")
        print(f"  Scholarships Found:      {sch_stats['records_found']}")
        print(f"  Scholarships Created:    {sch_stats['records_created']}")
        print(f"  Scholarships Updated:    {sch_stats['records_updated']}")
        print("=======================================================\n")
    except Exception as e:
        logger.error(f"Fatal error during opportunity sync: {e}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
