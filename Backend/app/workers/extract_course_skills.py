"""
SkillSetu Course Skill Extraction & ESCO Mapping Worker & CLI
Extracts candidate skills from NPTEL courses, maps them to the ESCO taxonomy,
and stores verified mappings in course_skills.
"""
import argparse
import logging
import sys
import time
from collections import Counter
from typing import Optional, List, Dict, Any

from app import models
from app.database import SessionLocal
from app.services import course_skill_extraction_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("skill_extraction_worker")


def run_course_skill_extraction(
    limit: Optional[int] = None,
    offset: int = 0,
    course_id: Optional[int] = None,
    dry_run: bool = False,
    force_refresh: bool = False,
    threshold: float = 0.75,
    delay_seconds: float = 1.0,
) -> Dict[str, Any]:
    """
    Executes skill extraction and ESCO mapping for PostgreSQL courses.
    """
    start_time = time.time()
    db = SessionLocal()

    query = db.query(models.Course).filter(models.Course.is_active == True)
    if course_id is not None:
        query = query.filter(models.Course.id == course_id)
    else:
        query = query.order_by(models.Course.id.asc())
        if offset > 0:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)

    courses: List[models.Course] = query.all()
    total_courses = len(courses)

    logger.info(f"Loaded {total_courses} course(s) from PostgreSQL for skill extraction (dry_run={dry_run}, force_refresh={force_refresh}).")

    stats = {
        "courses_processed": 0,
        "courses_success": 0,
        "courses_failed": 0,
        "courses_skipped": 0,
        "total_candidate_skills": 0,
        "total_accepted_esco_mappings": 0,
        "total_rejected_mappings": 0,
        "skill_frequency": Counter(),
        "confidence_scores": [],
        "sample_mappings": [],
        "dry_run": dry_run,
        "duration_seconds": 0.0,
    }

    try:
        for idx, course in enumerate(courses, start=1):
            logger.info(f"[{idx}/{total_courses}] Processing course #{course.id}: '{course.title}' (ext_id: {course.external_id})")

            try:
                result = course_skill_extraction_service.extract_and_store_course_skills(
                    course=course,
                    db=db,
                    force_refresh=force_refresh,
                    dry_run=dry_run,
                    min_confidence=threshold,
                )

                stats["courses_processed"] += 1
                if result["status"] == "skipped":
                    stats["courses_skipped"] += 1
                else:
                    stats["courses_success"] += 1

                c_skills = result.get("candidate_skills_count", 0)
                a_esco = result.get("accepted_mappings_count", 0)
                r_esco = result.get("rejected_mappings_count", 0)

                stats["total_candidate_skills"] += c_skills
                stats["total_accepted_esco_mappings"] += a_esco
                stats["total_rejected_mappings"] += r_esco

                for m in result.get("mappings", []):
                    sk_name = m.get("skill_name") or m.get("extracted_name")
                    if sk_name:
                        stats["skill_frequency"][sk_name] += 1
                    if m.get("confidence"):
                        stats["confidence_scores"].append(m["confidence"])

                # Log sample details
                if len(stats["sample_mappings"]) < 10 and result.get("mappings"):
                    stats["sample_mappings"].append({
                        "course_id": course.id,
                        "title": course.title,
                        "mappings": result["mappings"]
                    })

                logger.info(f"  Result: {c_skills} candidate skills, {a_esco} matched to ESCO, {r_esco} unmatched")

            except Exception as exc:
                db.rollback()
                stats["courses_failed"] += 1
                logger.error(f"  Error extracting skills for course #{course.id}: {exc}", exc_info=True)

            if delay_seconds > 0 and idx < total_courses:
                time.sleep(delay_seconds)

    finally:
        db.close()
        stats["duration_seconds"] = round(time.time() - start_time, 2)

    # Compute Averages
    proc = stats["courses_processed"]
    avg_skills_per_course = round(stats["total_candidate_skills"] / proc, 1) if proc > 0 else 0.0
    avg_conf = (
        round(sum(stats["confidence_scores"]) / len(stats["confidence_scores"]), 2)
        if stats["confidence_scores"]
        else 0.0
    )

    stats["avg_skills_per_course"] = avg_skills_per_course
    stats["avg_mapping_confidence"] = avg_conf

    # Formatted Console Summary
    mode_tag = "DRY RUN (NO DB WRITES)" if dry_run else "LIVE EXTRACTION"
    print("\n" + "=" * 55)
    print(f"SkillSetu Course Skill Extraction — {mode_tag}")
    print("=" * 55)
    print(f"Courses processed:            {stats['courses_processed']}")
    print(f"Courses successfully extracted: {stats['courses_success']}")
    print(f"Courses skipped (already done): {stats['courses_skipped']}")
    print(f"Courses failed:               {stats['courses_failed']}")
    print(f"Total candidate skills:       {stats['total_candidate_skills']}")
    print(f"Accepted ESCO mappings:       {stats['total_accepted_esco_mappings']}")
    print(f"Unmatched / fallback skills:  {stats['total_rejected_mappings']}")
    print(f"Average skills / course:      {avg_skills_per_course}")
    print(f"Average mapping confidence:   {avg_conf}")
    print(f"Duration:                     {stats['duration_seconds']}s")

    print("\n--- Top Extracted Skills ---")
    for skill, count in stats["skill_frequency"].most_common(12):
        print(f"  • {skill} ({count} courses)")

    print("=" * 55 + "\n")

    return stats


def main():
    parser = argparse.ArgumentParser(description="SkillSetu Course Skill Extraction CLI")
    parser.add_argument("--dry-run", action="store_true", help="Simulate skill extraction without writing to PostgreSQL")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of courses to process")
    parser.add_argument("--offset", type=int, default=0, help="Offset into course catalog")
    parser.add_argument("--course-id", type=int, default=None, help="Process a specific course by ID")
    parser.add_argument("--force-refresh", action="store_true", help="Re-extract skills even if course already has skills")
    parser.add_argument("--threshold", type=float, default=0.75, help="Minimum ESCO match confidence threshold")

    args = parser.parse_args()

    run_course_skill_extraction(
        limit=args.limit,
        offset=args.offset,
        course_id=args.course_id,
        dry_run=args.dry_run,
        force_refresh=args.force_refresh,
        threshold=args.threshold,
    )


if __name__ == "__main__":
    main()
