import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple, Set

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models import (
    StudentUser,
    Course,
    CourseSkill,
    EscoSkill,
    LearningPath,
    LearningPathItem,
    Provider
)
from app.services import esco_service, course_recommendation_service

logger = logging.getLogger("learning_path_service")


def _serialize_course(course: Optional[Course]) -> Optional[Dict[str, Any]]:
    """Helper to serialize course metadata for API responses."""
    if not course:
        return None

    duration_str = None
    if course.duration is not None:
        unit = course.duration_unit or "weeks"
        duration_str = f"{course.duration} {unit}"

    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "provider": course.provider.slug if course.provider else "nptel",
        "provider_name": course.provider.name if course.provider else "NPTEL",
        "external_id": course.external_id,
        "url": course.url,
        "instructor": course.instructor,
        "institution": course.institution,
        "level": course.level,
        "language": course.language,
        "duration": duration_str,
        "price": float(course.price) if course.price is not None else 0.0,
        "currency": course.currency or "INR",
        "certificate_available": bool(course.certificate_available)
    }


def _serialize_path_item(item: LearningPathItem) -> Dict[str, Any]:
    """Helper to serialize a single learning path item with multi-skill and gap closure metadata."""
    all_course_skills = [s.skill_name for s in item.course.skills] if (item.course and item.course.skills) else []
    
    # Extract secondary gaps from course skills excluding primary skill
    primary_norm = (item.skill_name or "").lower().strip()
    secondary = [s for s in all_course_skills if s.lower().strip() != primary_norm][:4]

    # Find confidence
    conf = 0.90
    if item.course and item.course.skills:
        for cs in item.course.skills:
            if cs.skill_name.lower().strip() == primary_norm and cs.confidence is not None:
                conf = cs.confidence
                break

    if conf >= 0.85:
        gap_closure_type = "Closes Gap"
    elif conf >= 0.70:
        gap_closure_type = "Supports Skill"
    else:
        gap_closure_type = "Related Skill"

    return {
        "id": item.id,
        "learning_path_id": item.learning_path_id,
        "course_id": item.course_id,
        "skill_id": item.skill_id,
        "skill_name": item.skill_name,
        "primary_gap": item.skill_name,
        "secondary_gaps": secondary,
        "gap_closure_type": gap_closure_type,
        "stage": item.stage,
        "sequence_order": item.sequence_order,
        "status": item.status,
        "progress_percent": round(item.progress_percent or 0.0, 1),
        "reason": item.reason,
        "started_at": item.started_at.isoformat() if item.started_at else None,
        "completed_at": item.completed_at.isoformat() if item.completed_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        "course": _serialize_course(item.course)
    }


def _serialize_learning_path(
    path: LearningPath,
    total_gaps_identified: Optional[int] = None
) -> Dict[str, Any]:
    """Format LearningPath object into standardized API response."""
    items = path.items or []
    serialized_items = [_serialize_path_item(item) for item in items]

    # Group by stage
    stages = {
        "Foundation": [],
        "Intermediate": [],
        "Advanced": []
    }
    for item in serialized_items:
        st = item.get("stage", "Intermediate")
        if st in stages:
            stages[st].append(item)
        else:
            stages["Intermediate"].append(item)

    # Sort each stage by sequence_order
    for st in stages:
        stages[st].sort(key=lambda x: x["sequence_order"])

    # Skills metrics
    unique_skills_in_path = {item["skill_name"].lower().strip() for item in serialized_items if item.get("skill_name")}
    completed_skills = {
        item["skill_name"].lower().strip()
        for item in serialized_items
        if item.get("status") == "completed" and item.get("skill_name")
    }

    total_skills = total_gaps_identified if (total_gaps_identified is not None and total_gaps_identified > 0) else max(len(unique_skills_in_path), 1)
    addressed_skills = len(completed_skills)
    remaining_skills = max(0, total_skills - addressed_skills)

    target_careers_list = []
    if path.target_careers:
        try:
            target_careers_list = json.loads(path.target_careers) if path.target_careers.startswith("[") else [c.strip() for c in path.target_careers.split(",")]
        except Exception:
            target_careers_list = [path.target_careers]

    student_email = path.student.email if path.student else None

    return {
        "id": path.id,
        "student_id": path.student_id,
        "student_email": student_email,
        "name": path.name,
        "target_careers": target_careers_list,
        "status": path.status,
        "progress_percent": round(path.progress_percent or 0.0, 1),
        "skills_summary": {
            "total": total_skills,
            "addressed": addressed_skills,
            "remaining": remaining_skills
        },
        "stages": stages,
        "items": serialized_items,
        "created_at": path.created_at.isoformat() if path.created_at else None,
        "updated_at": path.updated_at.isoformat() if path.updated_at else None,
        "completed_at": path.completed_at.isoformat() if path.completed_at else None
    }


def calculate_overall_path_progress(items: List[LearningPathItem]) -> float:
    """
    Calculate deterministic path progress:
    Average progress percentage across active/non-skipped items.
    """
    if not items:
        return 0.0

    evaluable_items = [item for item in items if item.status != "skipped"]
    if not evaluable_items:
        return 100.0 if all(item.status == "skipped" for item in items) else 0.0

    total_progress = sum(min(100.0, max(0.0, item.progress_percent or 0.0)) for item in evaluable_items)
    return round(total_progress / len(evaluable_items), 2)


# ---------------------------------------------------------------------------
# 1. Generate Learning Path (Multi-Skill Deduplicated & Marginal Coverage)
# ---------------------------------------------------------------------------
def generate_learning_path(
    db: Session,
    student_email: str,
    target_careers: Optional[List[str]] = None,
    name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a personalized, stage-sequenced learning path based on the student's
    active skill gaps and course recommendations.
    Deduplicates courses so one course can address multiple skill gaps without redundant cards.
    """
    clean_email = student_email.lower().strip()
    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
    if not student:
        raise ValueError(f"Student with email '{clean_email}' not found.")

    # 1. Resolve target careers
    resolved_careers: List[str] = []
    if target_careers and len(target_careers) > 0:
        resolved_careers = [c.strip() for c in target_careers if c and c.strip()]
    elif student.target_careers:
        try:
            tc_data = json.loads(student.target_careers) if student.target_careers.startswith("[") else [s.strip() for s in student.target_careers.split(",")]
            resolved_careers = [c for c in tc_data if c and c.strip()]
        except Exception:
            resolved_careers = [student.target_careers]

    if not resolved_careers:
        resolved_careers = ["Full Stack Developer", "Backend Developer"]

    # 2. Run multi-career skill-gap engine
    github_skills, resume_parsed, profile_skills = esco_service.load_student_evidence_from_db(clean_email, db)
    gap_analysis = esco_service.calculate_multi_career_skill_gaps(
        target_careers=resolved_careers,
        github_skills=github_skills,
        resume_data=resume_parsed,
        profile_skills=profile_skills,
        db=db
    )

    skill_gaps = gap_analysis.get("skill_gaps", [])
    if not skill_gaps:
        skill_gaps = gap_analysis.get("all_skills", [])

    # 3. Retrieve personalized course recommendations
    recommendations_dossier = course_recommendation_service.get_personalized_course_recommendations(
        db=db,
        student_email=clean_email,
        career_override=" & ".join(resolved_careers[:2]),
        limit=50
    )
    recommended_courses = recommendations_dossier.get("data", [])

    # 4. Map recommended courses to skill gaps using marginal coverage
    path_name = name.strip() if name and name.strip() else f"{' & '.join(resolved_careers[:2])} Learning Path"

    # Create parent LearningPath record
    learning_path = LearningPath(
        student_id=student.id,
        name=path_name,
        target_careers=json.dumps(resolved_careers),
        status="active",
        progress_percent=0.0
    )
    db.add(learning_path)
    db.flush()

    # Track sequence counters per stage
    stage_counters = {
        "Foundation": 1,
        "Intermediate": 10,
        "Advanced": 20
    }

    items_to_add: List[LearningPathItem] = []
    seen_course_ids: Set[int] = set()
    unaddressed_gaps = list(skill_gaps)

    while unaddressed_gaps:
        gap = unaddressed_gaps[0]
        gap_name = gap.get("skill_name", "").strip()
        if not gap_name:
            unaddressed_gaps.pop(0)
            continue

        norm_gap = gap_name.lower()
        req_careers = gap.get("required_by_careers", resolved_careers)
        priority = gap.get("priority", "Medium Priority")

        # Find candidate courses covering this gap that have not been selected yet
        matching_courses = []
        for rc in recommended_courses:
            if rc["course_id"] in seen_course_ids:
                continue

            c_skills = [s.lower() for s in rc.get("all_skills", [])]
            covered_gaps = [cg.get("skill_name", "").lower() for cg in rc.get("covered_skill_gaps", [])]

            if norm_gap in c_skills or norm_gap in covered_gaps or any(norm_gap in s or s in norm_gap for s in c_skills):
                # Count how many other unaddressed gaps this course covers (marginal coverage)
                unaddressed_names = {g.get("skill_name", "").lower() for g in unaddressed_gaps}
                overlap_count = sum(1 for s in c_skills if s in unaddressed_names)
                matching_courses.append((rc, overlap_count))

        if matching_courses:
            # Sort by overlap_count (marginal coverage) desc, then recommendation_score desc
            matching_courses.sort(key=lambda x: (x[1], x[0].get("recommendation_score", 0.0)), reverse=True)
            chosen_rc = matching_courses[0][0]
        else:
            # Direct database lookup for courses explicitly tagged with this skill
            db_skill_match = (
                db.query(CourseSkill)
                .join(Course, Course.id == CourseSkill.course_id)
                .filter(
                    CourseSkill.skill_name.ilike(f"%{norm_gap}%"),
                    ~CourseSkill.course_id.in_(seen_course_ids)
                )
                .first()
            )
            if db_skill_match and db_skill_match.course:
                c_obj = db_skill_match.course
                c_all_skills = [cs.skill_name for cs in (c_obj.skills or [])]
                chosen_rc = {
                    "course_id": c_obj.id,
                    "title": c_obj.title,
                    "description": c_obj.description,
                    "provider": c_obj.provider.slug if c_obj.provider else "nptel",
                    "provider_name": c_obj.provider.name if c_obj.provider else "NPTEL",
                    "url": c_obj.url,
                    "all_skills": c_all_skills,
                    "recommendation_score": 0.85
                }
            else:
                # If no course in catalog teaches this specific skill, move to next gap without polluting roadmap
                unaddressed_gaps.pop(0)
                continue

        course_id = chosen_rc["course_id"]
        seen_course_ids.add(course_id)

        # Identify gap closed by this chosen course
        covered_from_unaddressed = [gap]
        primary_gap = gap_name
        secondary_gaps = [
            s for s in chosen_rc.get("all_skills", [])
            if s.lower() != gap_name.lower()
        ][:3]

        # Determine stage based on canonical technical skill domain
        def get_skill_default_stage(sname: str, default_stg: str) -> str:
            s_low = sname.lower()
            if any(k in s_low for k in ['html', 'css', 'javascript', 'git', 'sql', 'python', 'ide', 'markup']):
                return 'Foundation'
            elif any(k in s_low for k in ['node', 'react', 'express', 'fastapi', 'postgres', 'rest', 'data analysis', 'pandas']):
                return 'Intermediate'
            elif any(k in s_low for k in ['docker', 'kubernetes', 'aws', 'cloud', 'machine learning', 'tensorflow', 'pytorch', 'architecture']):
                return 'Advanced'
            return default_stg

        rc_stage = chosen_rc.get("learning_path", {}).get("stage", "Intermediate")
        learning_path_stage = get_skill_default_stage(primary_gap, rc_stage)

        seq_num = stage_counters[learning_path_stage]
        stage_counters[learning_path_stage] += 1

        # Build explainable reason with multi-skill coverage
        if secondary_gaps:
            reason = f"Addresses primary requirement in {primary_gap} and also covers {', '.join(secondary_gaps[:3])} for {', '.join(req_careers[:2])}."
        elif len(req_careers) > 1:
            reason = f"Essential for both {', '.join(req_careers[:2])}. Closes identified gap in {primary_gap}."
        else:
            reason = f"Directly addresses technical skill in {primary_gap} required for {req_careers[0] if req_careers else 'target career'}."

        esco_skill_obj = db.query(EscoSkill).filter(func.lower(EscoSkill.preferred_label) == primary_gap.lower()).first()
        esco_id = esco_skill_obj.id if esco_skill_obj else None

        path_item = LearningPathItem(
            learning_path_id=learning_path.id,
            course_id=course_id,
            skill_id=esco_id,
            skill_name=primary_gap,
            stage=learning_path_stage,
            sequence_order=seq_num,
            status="not_started",
            progress_percent=0.0,
            reason=reason
        )
        items_to_add.append(path_item)

        # Pop current gap from unaddressed_gaps
        unaddressed_gaps.pop(0)

    # If no items were created (e.g. no gaps), create paths from top recommendations
    if not items_to_add and recommended_courses:
        for idx, rc in enumerate(recommended_courses[:5], 1):
            st = rc.get("learning_path", {}).get("stage", "Intermediate")
            path_item = LearningPathItem(
                learning_path_id=learning_path.id,
                course_id=rc["course_id"],
                skill_id=None,
                skill_name=rc.get("title", "Core Curriculum"),
                stage=st,
                sequence_order=idx,
                status="not_started",
                progress_percent=0.0,
                reason=rc.get("reason", "Curated course for target career.")
            )
            items_to_add.append(path_item)

    db.add_all(items_to_add)
    db.commit()

    # Re-fetch complete path with joined loads
    path = (
        db.query(LearningPath)
        .options(
            joinedload(LearningPath.student),
            joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.provider),
            joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.skills)
        )
        .filter(LearningPath.id == learning_path.id)
        .first()
    )

    return _serialize_learning_path(path, total_gaps_identified=len(skill_gaps))


# ---------------------------------------------------------------------------
# 2. Get Learning Paths for Student
# ---------------------------------------------------------------------------
def get_student_learning_paths(
    db: Session,
    student_email: str
) -> List[Dict[str, Any]]:
    """Retrieve all learning paths created for a student."""
    clean_email = student_email.lower().strip()
    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
    if not student:
        return []

    paths = (
        db.query(LearningPath)
        .options(
            joinedload(LearningPath.student),
            joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.provider)
        )
        .filter(LearningPath.student_id == student.id)
        .order_by(LearningPath.created_at.desc())
        .all()
    )

    return [_serialize_learning_path(p) for p in paths]


# ---------------------------------------------------------------------------
# 3. Get Learning Path Detail by ID
# ---------------------------------------------------------------------------
def get_learning_path_detail(
    db: Session,
    path_id: int,
    student_email: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Fetch complete detail for a single learning path."""
    query = (
        db.query(LearningPath)
        .options(
            joinedload(LearningPath.student),
            joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.provider)
        )
        .filter(LearningPath.id == path_id)
    )

    if student_email:
        clean_email = student_email.lower().strip()
        query = query.join(StudentUser).filter(StudentUser.email == clean_email)

    path = query.first()
    if not path:
        return None

    return _serialize_learning_path(path)


# ---------------------------------------------------------------------------
# 4. Update Learning Path Item Progress
# ---------------------------------------------------------------------------
def update_learning_path_item_progress(
    db: Session,
    path_id: int,
    item_id: int,
    progress_percent: Optional[float] = None,
    status_override: Optional[str] = None,
    student_email: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update item progress and apply automatic status transitions:
    0% -> not_started
    1-99% -> in_progress
    100% -> completed
    """
    # Fetch item and parent path
    item = (
        db.query(LearningPathItem)
        .options(
            joinedload(LearningPathItem.course).joinedload(Course.provider),
            joinedload(LearningPathItem.learning_path).joinedload(LearningPath.student)
        )
        .filter(LearningPathItem.id == item_id, LearningPathItem.learning_path_id == path_id)
        .first()
    )

    if not item:
        raise ValueError(f"Learning path item with ID {item_id} not found in path {path_id}.")

    # Student ownership check if email provided
    if student_email:
        clean_email = student_email.lower().strip()
        if item.learning_path.student and item.learning_path.student.email.lower() != clean_email:
            raise PermissionError("Access denied: You do not own this learning path.")

    now_utc = datetime.now(timezone.utc)

    # 1. Update Progress and Determine Status
    if progress_percent is not None:
        if progress_percent < 0.0 or progress_percent > 100.0:
            raise ValueError("progress_percent must be between 0.0 and 100.0.")
        item.progress_percent = progress_percent

    if status_override:
        valid_statuses = {"not_started", "in_progress", "completed", "skipped"}
        clean_status = status_override.lower().strip()
        if clean_status not in valid_statuses:
            raise ValueError(f"Invalid status '{status_override}'. Must be one of {valid_statuses}.")
        item.status = clean_status
    else:
        # Automatic status transitions based on progress
        if item.progress_percent <= 0.0:
            item.status = "not_started"
        elif 0.0 < item.progress_percent < 100.0:
            item.status = "in_progress"
            if not item.started_at:
                item.started_at = now_utc
        elif item.progress_percent >= 100.0:
            item.status = "completed"
            if not item.completed_at:
                item.completed_at = now_utc

    if item.status == "in_progress" and not item.started_at:
        item.started_at = now_utc
    elif item.status == "completed" and not item.completed_at:
        item.completed_at = now_utc

    item.updated_at = now_utc

    # 2. Re-calculate overall parent LearningPath progress
    all_items = db.query(LearningPathItem).filter(LearningPathItem.learning_path_id == path_id).all()
    overall_progress = calculate_overall_path_progress(all_items)
    item.learning_path.progress_percent = overall_progress

    # If all items are completed or skipped, mark learning path as completed
    if all_items and all(it.status in {"completed", "skipped"} for it in all_items):
        item.learning_path.status = "completed"
        if not item.learning_path.completed_at:
            item.learning_path.completed_at = now_utc
    else:
        item.learning_path.status = "active"

    db.commit()

    return _serialize_path_item(item)


# ---------------------------------------------------------------------------
# 5. Refresh Learning Path
# ---------------------------------------------------------------------------
def refresh_learning_path(
    db: Session,
    path_id: int,
    student_email: Optional[str] = None
) -> Dict[str, Any]:
    """
    Refresh learning path against latest student evidence and active skill gaps.
    - Preserves completed items.
    - Preserves in-progress items.
    - Adds newly relevant courses for remaining or newly emerged gaps.
    - Removes obsolete unstarted courses.
    - Re-sequences stage order.
    """
    path = (
        db.query(LearningPath)
        .options(
            joinedload(LearningPath.student),
            joinedload(LearningPath.items).joinedload(LearningPathItem.course)
        )
        .filter(LearningPath.id == path_id)
        .first()
    )

    if not path:
        raise ValueError(f"Learning path with ID {path_id} not found.")

    if student_email and path.student:
        clean_email = student_email.lower().strip()
        if path.student.email.lower() != clean_email:
            raise PermissionError("Access denied: You do not own this learning path.")

    # 1. Resolve target careers
    target_careers: List[str] = []
    if path.target_careers:
        try:
            target_careers = json.loads(path.target_careers) if path.target_careers.startswith("[") else [c.strip() for c in path.target_careers.split(",")]
        except Exception:
            target_careers = [path.target_careers]

    if not target_careers:
        target_careers = ["Full Stack Developer", "Backend Developer"]

    # 2. Recalculate skill gaps
    clean_email = path.student.email
    github_skills, resume_parsed, profile_skills = esco_service.load_student_evidence_from_db(clean_email, db)
    gap_analysis = esco_service.calculate_multi_career_skill_gaps(
        target_careers=target_careers,
        github_skills=github_skills,
        resume_data=resume_parsed,
        profile_skills=profile_skills,
        db=db
    )

    current_skill_gaps = gap_analysis.get("skill_gaps", [])
    active_gap_names = {g.get("skill_name", "").lower().strip() for g in current_skill_gaps if g.get("skill_name")}

    # 3. Categorize existing items: keep completed & in_progress
    existing_items = path.items or []
    preserved_items = []
    items_to_delete = []
    covered_skills_in_preserved = set()

    for it in existing_items:
        it_skill = it.skill_name.lower().strip()
        if it.status in {"completed", "in_progress"}:
            preserved_items.append(it)
            covered_skills_in_preserved.add(it_skill)
        elif it.status == "not_started" and it_skill not in active_gap_names:
            # Skill gap has already been satisfied or is no longer relevant
            items_to_delete.append(it)
        else:
            preserved_items.append(it)
            covered_skills_in_preserved.add(it_skill)

    for it in items_to_delete:
        db.delete(it)

    # 4. Find newly emerged gaps not yet in preserved items
    new_gaps = [g for g in current_skill_gaps if g.get("skill_name", "").lower().strip() not in covered_skills_in_preserved]

    if new_gaps:
        recommendations_dossier = course_recommendation_service.get_personalized_course_recommendations(
            db=db,
            student_email=clean_email,
            career_override=" & ".join(target_careers[:2]),
            limit=20
        )
        recommended_courses = recommendations_dossier.get("data", [])

        seen_course_skill_pairs = {(it.course_id, it.skill_name.lower().strip()) for it in preserved_items}
        for gap in new_gaps:
            gap_name = gap.get("skill_name", "").strip()
            norm_gap = gap_name.lower()
            matching = [
                rc for rc in recommended_courses
                if (rc["course_id"], norm_gap) not in seen_course_skill_pairs and (
                    norm_gap in [s.lower() for s in rc.get("all_skills", [])] or
                    norm_gap in [cg.get("skill_name", "").lower() for cg in rc.get("covered_skill_gaps", [])]
                )
            ]
            if not matching and recommended_courses:
                unseen = [rc for rc in recommended_courses if (rc["course_id"], norm_gap) not in seen_course_skill_pairs]
                matching = [unseen[0]] if unseen else [recommended_courses[0]]

            if matching:
                top_c = matching[0]
                seen_course_skill_pairs.add((top_c["course_id"], norm_gap))
                st = top_c.get("learning_path", {}).get("stage", "Intermediate")
                new_item = LearningPathItem(
                    learning_path_id=path.id,
                    course_id=top_c["course_id"],
                    skill_id=None,
                    skill_name=gap_name,
                    stage=st,
                    sequence_order=99,
                    status="not_started",
                    progress_percent=0.0,
                    reason=f"Added during refresh: addresses skill gap in {gap_name}."
                )
                db.add(new_item)
                preserved_items.append(new_item)

    # 5. Re-sequence all active items deterministically
    stage_counters = {"Foundation": 1, "Intermediate": 10, "Advanced": 20}
    for it in preserved_items:
        st = it.stage if it.stage in stage_counters else "Intermediate"
        it.sequence_order = stage_counters[st]
        stage_counters[st] += 1

    path.updated_at = datetime.now(timezone.utc)
    path.progress_percent = calculate_overall_path_progress(preserved_items)
    db.commit()

    # Re-fetch and return serialized path
    refreshed_path = (
        db.query(LearningPath)
        .options(
            joinedload(LearningPath.student),
            joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.provider)
        )
        .filter(LearningPath.id == path.id)
        .first()
    )

    return _serialize_learning_path(refreshed_path, total_gaps_identified=len(current_skill_gaps))


# ---------------------------------------------------------------------------
# 6. Learning Path Analytics
# ---------------------------------------------------------------------------
def get_learning_path_analytics(
    db: Session,
    path_id: int,
    student_email: Optional[str] = None
) -> Dict[str, Any]:
    """Calculate detailed progress and metrics for analytics dashboards."""
    path = (
        db.query(LearningPath)
        .options(
            joinedload(LearningPath.student),
            joinedload(LearningPath.items).joinedload(LearningPathItem.course)
        )
        .filter(LearningPath.id == path_id)
        .first()
    )

    if not path:
        raise ValueError(f"Learning path with ID {path_id} not found.")

    if student_email and path.student:
        clean_email = student_email.lower().strip()
        if path.student.email.lower() != clean_email:
            raise PermissionError("Access denied: You do not own this learning path.")

    items = path.items or []
    total_courses = len(items)
    completed_courses = len([it for it in items if it.status == "completed"])
    in_progress_courses = len([it for it in items if it.status == "in_progress"])
    not_started_courses = len([it for it in items if it.status == "not_started"])
    skipped_courses = len([it for it in items if it.status == "skipped"])

    unique_skills = {it.skill_name.lower().strip() for it in items if it.skill_name}
    addressed_skills = {it.skill_name.lower().strip() for it in items if it.status == "completed" and it.skill_name}

    # Target careers coverage
    target_careers = []
    if path.target_careers:
        try:
            target_careers = json.loads(path.target_careers) if path.target_careers.startswith("[") else [c.strip() for c in path.target_careers.split(",")]
        except Exception:
            target_careers = [path.target_careers]

    career_coverage = {}
    for c in target_careers:
        career_coverage[c] = round(path.progress_percent, 1)

    return {
        "path_id": path.id,
        "name": path.name,
        "status": path.status,
        "progress_percent": round(path.progress_percent or 0.0, 1),
        "courses_total": total_courses,
        "courses_completed": completed_courses,
        "courses_in_progress": in_progress_courses,
        "courses_not_started": not_started_courses,
        "courses_skipped": skipped_courses,
        "skills_addressed": len(addressed_skills),
        "skills_remaining": max(0, len(unique_skills) - len(addressed_skills)),
        "skills_total": len(unique_skills),
        "career_coverage": career_coverage
    }
