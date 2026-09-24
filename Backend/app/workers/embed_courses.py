import argparse
import logging
import sys
import time
from typing import Dict, Any, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import SessionLocal
from app.models import Course, CourseSkill, Provider
from app.services import embedding_service, course_embedding_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("embed_courses_worker")


def run_course_embedding(
    db: Session,
    dry_run: bool = False,
    limit: Optional[int] = None,
    offset: int = 0,
    force_refresh: bool = False,
    provider_slug: Optional[str] = None,
    course_id: Optional[int] = None,
    batch_size: int = 16,
    qdrant_client = None,
) -> Dict[str, Any]:
    """
    Main execution routine for generating and indexing course vector embeddings into Qdrant.
    """
    start_time = time.time()
    logger.info("=======================================================")
    mode_str = "DRY RUN (No writes to DB or Qdrant)" if dry_run else "LIVE EMBEDDING & INDEXING"
    logger.info(f"SkillSetu Course Embedding Worker — {mode_str}")
    logger.info(f"Embedding model: {settings.COURSE_EMBEDDING_MODEL}")
    logger.info(f"Qdrant collection: {settings.QDRANT_COLLECTION_COURSES}")
    logger.info(f"Limit: {limit}, Offset: {offset}, Force refresh: {force_refresh}, Course ID: {course_id}")
    logger.info("=======================================================")

    # 1. Initialize / Ensure Qdrant collection (if not dry run)
    client = qdrant_client or course_embedding_service.get_qdrant_client()
    if not dry_run:
        course_embedding_service.ensure_course_collection(
            client=client,
            collection_name=settings.QDRANT_COLLECTION_COURSES,
            vector_size=embedding_service.get_embedding_dimension()
        )

    # 2. Query courses from PostgreSQL
    query = (
        db.query(Course)
        .options(
            joinedload(Course.provider),
            joinedload(Course.skills)
        )
        .filter(Course.is_active == True)
    )

    if course_id is not None:
        query = query.filter(Course.id == course_id)

    if provider_slug:
        provider = db.query(Provider).filter(Provider.slug == provider_slug.lower()).first()
        if provider:
            query = query.filter(Course.provider_id == provider.id)
        else:
            logger.error(f"Provider '{provider_slug}' not found.")
            return {
                "status": "failed",
                "error": f"Provider '{provider_slug}' not found",
                "courses_processed": 0,
            }

    query = query.order_by(Course.id.asc()).offset(offset)
    if limit is not None:
        query = query.limit(limit)

    courses: List[Course] = query.all()
    total_courses = len(courses)
    logger.info(f"Found {total_courses} courses in PostgreSQL to evaluate.")

    processed_count = 0
    embedded_count = 0
    skipped_count = 0
    failed_count = 0
    failed_courses = []

    # 3. Process courses in batches
    pending_items = []

    def flush_batch(batch: List[Dict[str, Any]]) -> None:
        nonlocal embedded_count, failed_count
        if not batch:
            return

        texts = [item["text"] for item in batch]
        course_ids = [item["course"].id for item in batch]
        
        try:
            if dry_run:
                for item in batch:
                    logger.info(f"  [DRY RUN] Course ID {item['course'].id}: '{item['course'].title}' -> Would embed (len={len(item['text'])})")
                embedded_count += len(batch)
                return

            # Generate embeddings
            vectors = embedding_service.embed_texts(texts)
            
            # Prepare Qdrant upsert payload
            qdrant_items = []
            for i, item in enumerate(batch):
                qdrant_items.append({
                    "course": item["course"],
                    "vector": vectors[i],
                    "skills": item["skills"]
                })

            # Upsert into Qdrant
            course_embedding_service.upsert_course_points_batch(
                client=client,
                items=qdrant_items,
                collection_name=settings.QDRANT_COLLECTION_COURSES
            )

            # Update PostgreSQL records
            for item in batch:
                c = item["course"]
                c.embedding_content_hash = item["hash"]
                c.embedding_model = settings.COURSE_EMBEDDING_MODEL
                c.embedding_indexed_at = func.now()
                c.embedding_status = "indexed"

            db.commit()
            embedded_count += len(batch)
            logger.info(f"  Successfully indexed batch of {len(batch)} courses: {course_ids}")

        except Exception as e:
            db.rollback()
            logger.error(f"  Failed indexing batch {course_ids}: {e}")
            failed_count += len(batch)
            for item in batch:
                failed_courses.append({
                    "course_id": item["course"].id,
                    "title": item["course"].title,
                    "error": str(e)
                })

    for idx, course in enumerate(courses, 1):
        processed_count += 1
        try:
            # Build deterministic embedding text
            skills = course.skills or []
            emb_text = course_embedding_service.build_course_embedding_text(course, skills)
            content_hash = course_embedding_service.calculate_embedding_hash(emb_text)

            # Check change detection hash
            if not force_refresh and course.embedding_content_hash == content_hash and course.embedding_status == "indexed":
                logger.info(f"[{idx}/{total_courses}] SKIP: Course ID {course.id} '{course.title}' (hash unchanged)")
                skipped_count += 1
                continue

            logger.info(f"[{idx}/{total_courses}] QUEUE: Course ID {course.id} '{course.title}' for embedding (skills: {len(skills)})")
            pending_items.append({
                "course": course,
                "skills": skills,
                "text": emb_text,
                "hash": content_hash
            })

            if len(pending_items) >= batch_size:
                flush_batch(pending_items)
                pending_items = []

        except Exception as e:
            logger.error(f"[{idx}/{total_courses}] Error preparing course ID {course.id}: {e}")
            failed_count += 1
            failed_courses.append({
                "course_id": course.id,
                "title": course.title,
                "error": str(e)
            })

    # Flush any remaining items in final batch
    if pending_items:
        flush_batch(pending_items)

    duration = round(time.time() - start_time, 2)
    logger.info("=======================================================")
    logger.info(f"SkillSetu Course Embedding — COMPLETED")
    logger.info(f"Courses evaluated:          {processed_count}")
    logger.info(f"Vectors created/updated:    {embedded_count}")
    logger.info(f"Vectors skipped (unchanged): {skipped_count}")
    logger.info(f"Failures:                   {failed_count}")
    logger.info(f"Duration:                   {duration}s")
    logger.info("=======================================================")

    return {
        "status": "completed",
        "dry_run": dry_run,
        "courses_processed": processed_count,
        "vectors_created": embedded_count,
        "vectors_skipped": skipped_count,
        "failures": failed_count,
        "failed_courses": failed_courses,
        "duration_seconds": duration
    }


def main():
    parser = argparse.ArgumentParser(description="SkillSetu Course Embedding & Qdrant Indexer Worker")
    parser.add_argument("--dry-run", action="store_true", help="Simulate embedding without modifying DB or Qdrant")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of courses to process")
    parser.add_argument("--offset", type=int, default=0, help="Starting offset index")
    parser.add_argument("--force-refresh", action="store_true", help="Force regenerate embeddings even if hash is unchanged")
    parser.add_argument("--provider", type=str, default=None, help="Filter by provider slug (e.g., 'nptel')")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size for embedding generation")

    args = parser.parse_args()

    db = SessionLocal()
    try:
        run_course_embedding(
            db=db,
            dry_run=args.dry_run,
            limit=args.limit,
            offset=args.offset,
            force_refresh=args.force_refresh,
            provider_slug=args.provider,
            batch_size=args.batch_size
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
