import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import SessionLocal
from app import models
from app.services import (
    course_service,
    course_skill_extraction_service,
    course_embedding_service,
)
from app.services.course_providers import (
    get_course_provider,
    PROVIDER_REGISTRY,
    BaseCourseProvider,
)

logger = logging.getLogger("course_sync_service")


def get_providers_status(db: Session) -> Dict[str, Any]:
    """
    Check the health, credential status, course counts, and latest sync timestamp
    for all registered course providers.
    """
    status_report = {}

    for slug, provider_cls in PROVIDER_REGISTRY.items():
        connector: BaseCourseProvider = provider_cls()
        is_configured = getattr(connector, "is_configured", lambda: True)()

        provider_record = db.query(models.Provider).filter(models.Provider.slug == slug).first()
        
        course_count = 0
        active_count = 0
        last_sync_iso = None
        latest_status = "not_synced"

        if provider_record:
            course_count = db.query(func.count(models.Course.id)).filter(models.Course.provider_id == provider_record.id).scalar() or 0
            active_count = db.query(func.count(models.Course.id)).filter(
                models.Course.provider_id == provider_record.id,
                models.Course.is_active == True
            ).scalar() or 0

            latest_log = (
                db.query(models.CourseSyncLog)
                .filter(models.CourseSyncLog.provider_id == provider_record.id)
                .order_by(models.CourseSyncLog.started_at.desc())
                .first()
            )
            if latest_log:
                last_sync_iso = latest_log.completed_at.isoformat() if latest_log.completed_at else (latest_log.started_at.isoformat() if latest_log.started_at else None)
                latest_status = latest_log.status

        # Determine overarching health status
        if not is_configured:
            health_status = "not_configured"
        elif latest_status == "failed":
            health_status = "error"
        elif course_count > 0:
            health_status = "healthy"
        else:
            health_status = "ready"

        status_report[slug] = {
            "name": connector.provider_name,
            "configured": is_configured,
            "status": health_status,
            "course_count": course_count,
            "active_course_count": active_count,
            "last_sync": last_sync_iso,
            "base_url": connector.base_url
        }

    return status_report


async def sync_provider(
    provider_slug: str,
    limit: int = 50,
    offset: int = 0,
    force_refresh: bool = False,
    dry_run: bool = False,
    query: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Synchronize courses from a specified provider into PostgreSQL,
    and trigger the automatic post-sync pipeline (Skill Extraction + ESCO Mapping + Qdrant Embeddings).
    """
    norm_slug = provider_slug.strip().lower()
    if norm_slug not in PROVIDER_REGISTRY:
        raise ValueError(f"Unknown provider '{provider_slug}'. Available: {list(PROVIDER_REGISTRY.keys())}")

    owns_db_session = False
    if db is None:
        db = SessionLocal()
        owns_db_session = True

    try:
        provider_record = course_service.get_provider_by_slug(db, norm_slug)
        if not provider_record:
            connector_temp = get_course_provider(norm_slug)
            provider_record = models.Provider(name=connector_temp.provider_name, slug=norm_slug)
            db.add(provider_record)
            db.commit()
            db.refresh(provider_record)

        connector = get_course_provider(norm_slug)
        is_configured = getattr(connector, "is_configured", lambda: True)()

        # 1. Create CourseSyncLog
        sync_log = models.CourseSyncLog(
            provider_id=provider_record.id,
            status="running",
            courses_found=0,
            courses_created=0,
            courses_updated=0,
            courses_deactivated=0,
            courses_failed=0
        )
        if not dry_run:
            db.add(sync_log)
            db.commit()
            db.refresh(sync_log)

        if not is_configured:
            err_msg = f"Provider '{norm_slug}' is not configured. Missing required API credentials in environment."
            logger.warning(err_msg)
            if not dry_run:
                sync_log.status = "not_configured"
                sync_log.error_message = err_msg
                sync_log.completed_at = datetime.now(timezone.utc)
                db.commit()
            return {
                "status": "not_configured",
                "provider": norm_slug,
                "message": err_msg,
                "courses_created": 0,
                "courses_updated": 0,
                "courses_unchanged": 0,
                "courses_failed": 0
            }

        # 2. Fetch courses from provider connector
        logger.info(f"Starting course synchronization for provider '{norm_slug}' (limit={limit}, dry_run={dry_run})...")
        if query:
            raw_courses = await connector.search_courses(query=query, limit=limit)
        else:
            raw_courses = await connector.fetch_courses(limit=limit, offset=offset)

        sync_log.courses_found = len(raw_courses)

        created_courses: List[models.Course] = []
        updated_courses: List[models.Course] = []
        unchanged_count = 0
        failed_count = 0

        # 3. Ingestion & Upsert Loop
        for norm_c in raw_courses:
            try:
                # Check existing course
                existing = (
                    db.query(models.Course)
                    .filter(
                        models.Course.provider_id == provider_record.id,
                        models.Course.external_id == norm_c.external_id
                    )
                    .first()
                )

                if dry_run:
                    if not existing:
                        sync_log.courses_created += 1
                    else:
                        sync_log.courses_updated += 1
                    continue

                # Live upsert
                course_obj, status_str = course_service.upsert_course_with_status(db, norm_c)
                db.commit()

                if status_str == "created":
                    created_courses.append(course_obj)
                    sync_log.courses_created += 1
                elif status_str == "updated" or force_refresh:
                    updated_courses.append(course_obj)
                    sync_log.courses_updated += 1
                else:
                    unchanged_count += 1

            except Exception as item_err:
                logger.error(f"Error upserting course '{norm_c.title}' ({norm_c.external_id}): {item_err}")
                failed_count += 1
                sync_log.courses_failed += 1

        if not dry_run:
            sync_log.status = "completed" if failed_count == 0 else "partial"
            sync_log.completed_at = datetime.now(timezone.utc)
            db.commit()

        # 4. Automatic Post-Sync Pipeline (Skill Extraction + ESCO Mapping + Qdrant Embeddings)
        courses_to_process = created_courses + updated_courses
        extracted_skills_count = 0
        embeddings_synced_count = 0

        if not dry_run and courses_to_process:
            logger.info(f"Running automatic post-sync pipeline for {len(courses_to_process)} courses...")
            for c_obj in courses_to_process:
                try:
                    # Phase 3: Extract and store skills mapped to ESCO
                    res_skills = course_skill_extraction_service.extract_and_store_course_skills(
                        course=c_obj,
                        db=db,
                        force_refresh=force_refresh
                    )
                    extracted_skills_count += res_skills.get("accepted_mappings_count", 0)
                except Exception as ext_err:
                    logger.warning(f"Post-sync skill extraction error on course {c_obj.id}: {ext_err}")

            try:
                # Phase 4: Sync embeddings to Qdrant collection
                from app.workers.embed_courses import run_course_embedding
                emb_res = run_course_embedding(db=db, batch_size=16)
                embeddings_synced_count = emb_res.get("indexed_count", 0)
            except Exception as emb_err:
                logger.warning(f"Post-sync Qdrant embedding sync error: {emb_err}")

        logger.info(
            f"Course sync for '{norm_slug}' finished: "
            f"created={sync_log.courses_created}, updated={sync_log.courses_updated}, "
            f"unchanged={unchanged_count}, failed={sync_log.courses_failed}"
        )

        return {
            "status": "success" if not dry_run else "dry_run_completed",
            "provider": norm_slug,
            "courses_found": sync_log.courses_found,
            "courses_created": sync_log.courses_created,
            "courses_updated": sync_log.courses_updated,
            "courses_unchanged": unchanged_count,
            "courses_failed": sync_log.courses_failed,
            "skills_extracted": extracted_skills_count,
            "embeddings_synced": embeddings_synced_count,
            "dry_run": dry_run
        }

    except Exception as e:
        logger.error(f"Critical error during sync for provider '{provider_slug}': {e}", exc_info=True)
        if not dry_run and 'sync_log' in locals():
            sync_log.status = "failed"
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.now(timezone.utc)
            db.commit()
        return {
            "status": "failed",
            "provider": norm_slug,
            "error": str(e)
        }
    finally:
        if owns_db_session:
            db.close()
