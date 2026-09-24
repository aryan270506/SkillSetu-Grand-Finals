import json
import math
import re
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from qdrant_client import QdrantClient

from app.config import settings
from app.models import Course, CourseSkill, CourseCareer, Provider, StudentUser
from app.services import esco_service, embedding_service, course_embedding_service, course_search_service

logger = logging.getLogger("course_recommendation_service")

# ---------------------------------------------------------------------------
# Phase 5/7 Core Recommendation Scoring Weights (Preserved Foundation)
# ---------------------------------------------------------------------------
WEIGHT_SKILL_COVERAGE: float = 0.55
WEIGHT_SEMANTIC_RELEVANCE: float = 0.35
WEIGHT_CAREER_RELEVANCE: float = 0.10

# Bounded Multiplier Ranges
QUALITY_MULTIPLIER_MIN: float = 0.90
QUALITY_MULTIPLIER_MAX: float = 1.05

FRESHNESS_MULTIPLIER_MIN: float = 0.95
FRESHNESS_MULTIPLIER_MAX: float = 1.05

DIVERSITY_MULTIPLIER_MIN: float = 0.90
DIVERSITY_MULTIPLIER_MAX: float = 1.00

# Priority weights for skill gap importance
PRIORITY_WEIGHTS: Dict[str, float] = {
    "high priority": 1.0,
    "high": 1.0,
    "medium priority": 0.65,
    "medium": 0.65,
    "low priority": 0.35,
    "low": 0.35,
}
DEFAULT_PRIORITY_WEIGHT: float = 0.5


def _normalize_str(s: Optional[str]) -> str:
    """Normalize string for safe comparison."""
    return s.lower().strip() if s else ""


def _normalize_title_for_dedup(title: Optional[str]) -> str:
    """
    Normalize course title for conservative cross-provider deduplication.
    Removes common noise terms, years, and formatting artifacts.
    """
    if not title:
        return ""
    t = title.lower()
    # Remove bracketed content (e.g. [NPTEL], (Official), [2024])
    t = re.sub(r"\[.*?\]|\(.*?\)", "", t)
    # Remove 4-digit years (e.g. 2023, 2024)
    t = re.sub(r"\b(19\d\d|20\d\d)\b", " ", t)
    # Remove punctuation
    t = re.sub(r"[^\w\s]", " ", t)
    # Remove noise words
    noise_words = {
        "full", "course", "tutorial", "certification", "certificate", "nptel",
        "swayam", "freecodecamp", "youtube", "complete", "bootcamp", "training",
        "series", "learn", "introduction", "intro", "to", "for", "beginners",
        "in", "and", "of", "with", "the", "a", "an", "on"
    }
    tokens = [tok for tok in t.split() if tok and tok not in noise_words]
    return " ".join(tokens)


# ---------------------------------------------------------------------------
# 1. Course Quality Scoring
# ---------------------------------------------------------------------------
def calculate_quality_score(course: Course) -> Dict[str, Any]:
    """
    Deterministic Quality Score Q in [0.0, 1.0] based strictly on actual course metadata.
    Dimensions:
      1. Description completeness (weight 0.30)
      2. Duration & structure availability (weight 0.20)
      3. Instructor / Institution attribution (weight 0.20)
      4. Skill mapping richness (weight 0.30)
    """
    # 1. Description completeness
    desc = course.description or ""
    desc_len = len(desc.strip())
    if desc_len >= 100:
        desc_score = 1.0
    elif desc_len >= 40:
        desc_score = 0.70
    elif desc_len > 0:
        desc_score = 0.30
    else:
        desc_score = 0.0

    # 2. Duration & Structure
    duration_score = 1.0 if (course.duration is not None and course.duration > 0) else 0.50

    # 3. Instructor / Institution
    has_inst = bool(course.institution and course.institution.strip())
    has_instr = bool(course.instructor and course.instructor.strip())
    if has_inst and has_instr:
        inst_score = 1.0
    elif has_inst or has_instr:
        inst_score = 0.80
    else:
        inst_score = 0.30

    # 4. Skill mapping richness
    skills_count = len(course.skills or [])
    skills_score = min(1.0, skills_count / 5.0)

    quality_score = round(
        (0.30 * desc_score) +
        (0.20 * duration_score) +
        (0.20 * inst_score) +
        (0.30 * skills_score),
        4
    )

    # Bounded Quality Multiplier in [0.90, 1.05]
    quality_multiplier = round(
        QUALITY_MULTIPLIER_MIN + (quality_score * (QUALITY_MULTIPLIER_MAX - QUALITY_MULTIPLIER_MIN)),
        4
    )

    return {
        "score": quality_score,
        "multiplier": quality_multiplier,
        "description_score": desc_score,
        "duration_score": duration_score,
        "institution_score": inst_score,
        "skills_richness_score": skills_score,
    }


# ---------------------------------------------------------------------------
# 2. Course Freshness Scoring
# ---------------------------------------------------------------------------
def calculate_freshness_score(course: Course) -> Dict[str, Any]:
    """
    Deterministic Freshness Score F in [0.0, 1.0] using exponential decay:
    F = exp(-delta_days / 180)
    Bounded Freshness Multiplier in [0.95, 1.05].
    """
    ref_time = None
    if course.updated_at:
        ref_time = course.updated_at
    elif course.created_at:
        ref_time = course.created_at

    now_utc = datetime.now(timezone.utc)
    if ref_time:
        if ref_time.tzinfo is None:
            ref_time = ref_time.replace(tzinfo=timezone.utc)
        delta_days = max(0, (now_utc - ref_time).days)
        freshness_score = round(max(0.10, min(1.0, math.exp(-delta_days / 180.0))), 4)
        last_synced_str = ref_time.isoformat()
    else:
        # Default evergreen freshness
        freshness_score = 0.85
        last_synced_str = None

    freshness_multiplier = round(
        FRESHNESS_MULTIPLIER_MIN + (freshness_score * (FRESHNESS_MULTIPLIER_MAX - FRESHNESS_MULTIPLIER_MIN)),
        4
    )

    return {
        "score": freshness_score,
        "multiplier": freshness_multiplier,
        "last_synced": last_synced_str
    }


# ---------------------------------------------------------------------------
# 3. Learning Path Stage Assignment
# ---------------------------------------------------------------------------
def assign_learning_path_stage(course: Course) -> Dict[str, Any]:
    """
    Categorize course into deterministic learning path sequence:
    Foundation -> Intermediate -> Advanced.
    """
    level_str = _normalize_str(course.level)
    title_str = _normalize_str(course.title)

    if any(k in level_str for k in ["beginner", "introductory", "basic", "foundation"]) or \
       any(k in title_str for k in ["intro", "introduction", "basics", "fundamental", "beginner", "101", "starting"]):
        stage = "Foundation"
        order = 1
    elif any(k in level_str for k in ["postgraduate", "advanced", "expert", "specialization"]) or \
         any(k in title_str for k in ["advanced", "deep dive", "expert", "specialization", "architecture", "mastering"]):
        stage = "Advanced"
        order = 3
    else:
        stage = "Intermediate"
        order = 2

    return {
        "stage": stage,
        "sequence_order": order
    }


# ---------------------------------------------------------------------------
# 4. Cross-Provider Deduplication
# ---------------------------------------------------------------------------
def deduplicate_candidate_courses(courses: List[Course]) -> Tuple[List[Course], int]:
    """
    Conservative deduplication across courses.
    Suppresses exact URL matches and normalized title matches, retaining the highest
    quality course candidate.
    Returns: (deduplicated_courses, duplicate_count)
    """
    seen_urls: Set[str] = set()
    seen_titles: Dict[str, Course] = {}
    deduped_courses: List[Course] = []
    removed_count = 0

    for c in courses:
        # 1. Exact Canonical URL check
        c_url = c.url.strip() if c.url else ""
        if c_url and c_url in seen_urls:
            removed_count += 1
            continue
        if c_url:
            seen_urls.add(c_url)

        # 2. Normalized Title check
        norm_title = _normalize_title_for_dedup(c.title)
        if norm_title and len(norm_title) >= 5:
            if norm_title in seen_titles:
                existing_c = seen_titles[norm_title]
                # Compare metadata richness
                existing_skills = len(existing_c.skills or [])
                current_skills = len(c.skills or [])
                if current_skills > existing_skills:
                    # Replace with richer course
                    deduped_courses = [c if x.id == existing_c.id else x for x in deduped_courses]
                    seen_titles[norm_title] = c
                removed_count += 1
                continue
            else:
                seen_titles[norm_title] = c

        deduped_courses.append(c)

    return deduped_courses, removed_count


# ---------------------------------------------------------------------------
# 5. Diversity Re-ranking
# ---------------------------------------------------------------------------
def apply_diversity_reranking(
    scored_items: List[Dict[str, Any]],
    limit: int
) -> List[Dict[str, Any]]:
    """
    Apply bounded diversity multiplier to prevent provider or topic monopolization
    while preserving top skill-gap relevance.
    """
    provider_counts: Dict[str, int] = {}
    final_items = []

    for item in scored_items:
        prov = item.get("provider", "unknown")
        count = provider_counts.get(prov, 0)

        # Apply progressive penalty if provider count >= 2
        if count >= 2:
            diversity_multiplier = max(DIVERSITY_MULTIPLIER_MIN, round(0.96 ** (count - 1), 4))
        else:
            diversity_multiplier = 1.0

        item["diversity_multiplier"] = diversity_multiplier
        # Adjust final score
        item["recommendation_score"] = round(item["ranking_score"] * diversity_multiplier, 4)
        item["score"] = item["recommendation_score"]
        provider_counts[prov] = count + 1
        final_items.append(item)

    # Re-sort by final recommendation_score
    final_items.sort(key=lambda x: x["recommendation_score"], reverse=True)
    return final_items[:limit]


# ---------------------------------------------------------------------------
# 6. Skill Coverage & Career Relevance
# ---------------------------------------------------------------------------
def calculate_skill_coverage(
    course_skills: List[CourseSkill],
    skill_gaps: List[Dict[str, Any]]
) -> tuple[float, List[Dict[str, Any]]]:
    """
    Calculate priority-weighted skill coverage score and return covered skill gaps.
    Returns: (coverage_score: float [0.0, 1.0], covered_gaps: List[Dict])
    """
    if not skill_gaps or not course_skills:
        return 0.0, []

    # Map of normalized course skill names
    course_skill_map = {}
    for cs in course_skills:
        norm_name = _normalize_str(cs.skill_name)
        if norm_name:
            course_skill_map[norm_name] = cs

    covered_gaps = []
    weighted_covered = 0.0
    weighted_total = 0.0

    for gap in skill_gaps:
        g_name = gap.get("skill_name", "")
        norm_g_name = _normalize_str(g_name)
        if not norm_g_name:
            continue

        priority_str = _normalize_str(gap.get("priority", "medium"))
        base_weight = PRIORITY_WEIGHTS.get(priority_str, DEFAULT_PRIORITY_WEIGHT)
        
        # Multi-career leverage boost: skill needed by multiple careers is more valuable
        req_careers = gap.get("required_by_careers", [])
        career_factor = 1.25 if len(req_careers) > 1 else 1.0
        gap_weight = base_weight * career_factor

        weighted_total += gap_weight

        # Check if course covers this skill gap (exact name match or substring match)
        is_covered = False
        matched_course_skill = None

        if norm_g_name in course_skill_map:
            is_covered = True
            matched_course_skill = course_skill_map[norm_g_name]
        else:
            # Substring check for technical skill variations
            for cs_norm, cs_obj in course_skill_map.items():
                if cs_norm in norm_g_name or norm_g_name in cs_norm:
                    is_covered = True
                    matched_course_skill = cs_obj
                    break

        if is_covered and matched_course_skill:
            weighted_covered += gap_weight
            covered_gaps.append({
                "skill_name": g_name,
                "course_skill_name": matched_course_skill.skill_name,
                "esco_skill_id": matched_course_skill.esco_skill_id,
                "priority": gap.get("priority", "Medium Priority"),
                "gap_score": gap.get("gap", 0),
                "required_by_careers": req_careers
            })

    if weighted_total <= 0.0:
        return 0.0, []

    coverage_score = round(min(1.0, weighted_covered / weighted_total), 4)
    return coverage_score, covered_gaps


def calculate_career_relevance(
    course_careers: List[CourseCareer],
    target_careers: List[str]
) -> float:
    """
    Calculate career relevance score [0.0, 1.0].
    - Mapped to one of the target careers: 1.0
    - Unmapped (empty): 0.5 (neutral, no penalty)
    - Mapped to completely unrelated careers only: 0.4
    """
    if not course_careers:
        return 0.5

    if not target_careers:
        return 0.5

    norm_targets = {_normalize_str(c) for c in target_careers if c}

    for cc in course_careers:
        c_names = []
        if hasattr(cc, "career") and cc.career:
            if getattr(cc.career, "name", None):
                c_names.append(_normalize_str(cc.career.name))
            if getattr(cc.career, "id", None):
                c_names.append(_normalize_str(cc.career.id))
        if hasattr(cc, "career_id") and cc.career_id:
            c_names.append(_normalize_str(str(cc.career_id)))
        if hasattr(cc, "career_name") and cc.career_name:
            c_names.append(_normalize_str(str(cc.career_name)))

        for c_name in c_names:
            if not c_name:
                continue
            for t in norm_targets:
                if t in c_name or c_name in t:
                    return 1.0

    return 0.4


def generate_recommendation_reason(
    covered_gaps: List[Dict[str, Any]],
    target_careers: List[str],
    semantic_score: float,
    career_relevance: float
) -> Tuple[str, str]:
    """
    Generate deterministic, data-backed explanation reason and category.
    Returns: (reason_str: str, category_str: str)
    """
    high_priority_covered = [g for g in covered_gaps if "high" in _normalize_str(g.get("priority", ""))]
    total_covered = len(covered_gaps)
    careers_str = " & ".join(target_careers[:2]) if target_careers else "your target career"

    # Determine primary reason
    if total_covered > 0:
        if len(high_priority_covered) > 0:
            reason = f"Directly closes {total_covered} skill gap{'s' if total_covered > 1 else ''} ({len(high_priority_covered)} high-priority) required for {careers_str}."
        else:
            reason = f"Closes {total_covered} relevant skill gap{'s' if total_covered > 1 else ''} for {careers_str}."
    elif career_relevance >= 0.9:
        reason = f"Curated core curriculum specifically mapped to {careers_str}."
    elif semantic_score >= 0.70:
        reason = f"High semantic syllabus alignment with the technical requirements of {careers_str}."
    else:
        reason = f"Relevant foundation course supporting technical development in {careers_str}."

    # Determine category
    if total_covered >= 2 or (total_covered >= 1 and len(high_priority_covered) >= 1):
        category = "Strong Match"
    elif total_covered >= 1:
        category = "Skill Builder"
    elif career_relevance >= 0.9:
        category = "Career-Relevant"
    else:
        category = "Semantic Match"

    return reason, category


def generate_recommendation_bullets(
    covered_gaps: List[Dict[str, Any]],
    target_careers: List[str],
    all_skill_gaps: Optional[List[Dict[str, Any]]] = None
) -> List[str]:
    """
    Generate rich bullet points for the explanation list.
    """
    careers_str = " & ".join(target_careers[:2]) if target_careers else "your target career"
    total_covered = len(covered_gaps)

    bullets = []
    for cg in covered_gaps[:4]:
        c_skill = cg.get("skill_name", "")
        req_c = cg.get("required_by_careers", [])
        if len(req_c) > 1:
            bullets.append(f"Covers {c_skill} (Required for {', '.join(req_c)})")
        else:
            bullets.append(f"Covers {c_skill}")

    if target_careers:
        bullets.append(f"Aligned with {careers_str}")

    if all_skill_gaps:
        total_gaps_count = len(all_skill_gaps)
        bullets.append(f"Closes {total_covered} of {total_gaps_count} identified skill gaps")

    return bullets


# ---------------------------------------------------------------------------
# 7. Main Personalized Recommendations Entrypoint
# ---------------------------------------------------------------------------
def get_personalized_course_recommendations(
    db: Session,
    student_email: Optional[str] = None,
    career_override: Optional[str] = None,
    provider_slug: Optional[str] = None,
    limit: int = 10,
    include_inactive: bool = False,
    qdrant_client: Optional[QdrantClient] = None
) -> Dict[str, Any]:
    """
    Synthesize student target careers, verified skill evidence, and ESCO skill gaps
    with PostgreSQL courses and Qdrant vector retrieval to generate personalized recommendations.
    Applies Phase 7 quality scoring, freshness decay, deduplication, and diversity re-ranking.
    """
    clean_email = student_email.lower().strip() if student_email else ""

    # 1. Load student evidence & target careers
    github_skills, resume_parsed, profile_skills = esco_service.load_student_evidence_from_db(clean_email, db)
    
    target_careers: List[str] = []
    if clean_email:
        student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
        if student and student.target_careers:
            try:
                tc_data = json.loads(student.target_careers) if student.target_careers.startswith("[") else [s.strip() for s in student.target_careers.split(",")]
                target_careers = [c for c in tc_data if c and c.strip()]
            except Exception:
                pass

    if career_override and career_override.strip():
        target_careers = [career_override.strip()]

    if not target_careers:
        target_careers = ["Full Stack Developer", "Backend Developer"]

    # 2. Run existing multi-career skill-gap engine
    gap_analysis = esco_service.calculate_multi_career_skill_gaps(
        target_careers=target_careers,
        github_skills=github_skills,
        resume_data=resume_parsed,
        profile_skills=profile_skills,
        db=db
    )

    resolved_careers = gap_analysis.get("target_careers", target_careers)
    all_skill_gaps = gap_analysis.get("skill_gaps", [])
    if not all_skill_gaps:
        all_skill_gaps = gap_analysis.get("all_skills", [])

    missing_skill_names = [g["skill_name"] for g in all_skill_gaps if g.get("skill_name")]

    # 3. Candidate Course Retrieval - Signal A: PostgreSQL ESCO Skill Matches
    candidate_course_ids: Set[int] = set()
    
    if missing_skill_names:
        norm_missing = [s.lower().strip() for s in missing_skill_names[:30]]
        skill_matches = (
            db.query(CourseSkill.course_id)
            .filter(func.lower(CourseSkill.skill_name).in_(norm_missing))
            .distinct()
            .all()
        )
        for row in skill_matches:
            candidate_course_ids.add(row[0])

    # 4. Candidate Course Retrieval - Signal B: Qdrant Semantic Search
    semantic_scores_map: Dict[int, float] = {}
    
    semantic_query_parts = []
    if resolved_careers:
        semantic_query_parts.append(" ".join(resolved_careers))
    if missing_skill_names:
        semantic_query_parts.append(" ".join(missing_skill_names[:8]))
    
    semantic_query = " ".join(semantic_query_parts).strip()
    if not semantic_query:
        semantic_query = "software engineering computer science machine learning"

    try:
        qdrant = qdrant_client or course_embedding_service.get_qdrant_client()
        col_name = settings.QDRANT_COLLECTION_COURSES

        if qdrant.collection_exists(col_name):
            query_vector = embedding_service.embed_text(semantic_query)
            
            if hasattr(qdrant, "query_points"):
                search_response = qdrant.query_points(
                    collection_name=col_name,
                    query=query_vector,
                    limit=max(40, limit * 4),
                    with_payload=True
                )
                points = search_response.points
            else:
                points = qdrant.search(
                    collection_name=col_name,
                    query_vector=query_vector,
                    limit=max(40, limit * 4),
                    with_payload=True
                )

            for pt in points:
                c_id = pt.payload.get("course_id", pt.id) if pt.payload else pt.id
                try:
                    c_id_int = int(c_id)
                    score = float(pt.score)
                    norm_score = max(0.0, min(1.0, score))
                    semantic_scores_map[c_id_int] = norm_score
                    candidate_course_ids.add(c_id_int)
                except (ValueError, TypeError):
                    continue
    except Exception as e:
        logger.warning(f"Semantic candidate retrieval encountered an error: {e}")

    if not candidate_course_ids:
        fallback_courses = db.query(Course.id).filter(Course.is_active == True).limit(limit * 3).all()
        for row in fallback_courses:
            candidate_course_ids.add(row[0])

    # 5. Fetch complete candidate Course records from PostgreSQL
    query = (
        db.query(Course)
        .options(
            joinedload(Course.provider),
            joinedload(Course.skills),
            joinedload(Course.careers).joinedload(CourseCareer.career)
        )
        .filter(Course.id.in_(list(candidate_course_ids)))
    )

    if not include_inactive:
        query = query.filter(Course.is_active == True)

    if provider_slug:
        provider = db.query(Provider).filter(Provider.slug == provider_slug.lower().strip()).first()
        if provider:
            query = query.filter(Course.provider_id == provider.id)

    raw_courses = query.all()

    # 6. Apply Cross-Provider Deduplication
    courses, duplicates_removed = deduplicate_candidate_courses(raw_courses)

    # 7. Score and Build Candidate Recommendations
    scored_recommendations = []

    for course in courses:
        course_skills = course.skills or []
        course_careers = course.careers or []

        # Signal 1: Skill coverage
        skill_coverage_score, covered_gaps = calculate_skill_coverage(course_skills, all_skill_gaps)

        # Signal 2: Semantic relevance
        semantic_score = semantic_scores_map.get(course.id, 0.50)

        # Signal 3: Career relevance
        career_score = calculate_career_relevance(course_careers, resolved_careers)

        # Base score (Phase 5 formula)
        base_score = round(
            (skill_coverage_score * WEIGHT_SKILL_COVERAGE) +
            (semantic_score * WEIGHT_SEMANTIC_RELEVANCE) +
            (career_score * WEIGHT_CAREER_RELEVANCE),
            4
        )

        # Phase 7 Quality & Freshness
        quality_dossier = calculate_quality_score(course)
        freshness_dossier = calculate_freshness_score(course)
        learning_path_info = assign_learning_path_stage(course)

        # Ranking score before diversity
        ranking_score = round(
            base_score * quality_dossier["multiplier"] * freshness_dossier["multiplier"],
            4
        )

        # Explanation
        reason, category = generate_recommendation_reason(
            covered_gaps=covered_gaps,
            target_careers=resolved_careers,
            semantic_score=semantic_score,
            career_relevance=career_score
        )
        explanation_bullets = generate_recommendation_bullets(
            covered_gaps=covered_gaps,
            target_careers=resolved_careers,
            all_skill_gaps=all_skill_gaps
        )

        # Covered & Missing skills identification
        covered_names = [g["skill_name"] for g in covered_gaps]
        covered_set = set(_normalize_str(n) for n in covered_names)
        uncovered_names = [g["skill_name"] for g in all_skill_gaps if _normalize_str(g.get("skill_name")) not in covered_set]
        coverage_ratio = round(len(covered_names) / max(1, len(all_skill_gaps)), 2)

        duration_str = None
        if course.duration is not None:
            unit = course.duration_unit or "weeks"
            duration_str = f"{course.duration} {unit}"

        start_date_iso = course.start_date.isoformat() if course.start_date else None
        end_date_iso = course.end_date.isoformat() if course.end_date else None
        all_course_skills_list = [s.skill_name for s in course_skills]

        scored_recommendations.append({
            "course_id": course.id,
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
            "start_date": start_date_iso,
            "end_date": end_date_iso,
            "price": float(course.price) if course.price is not None else None,
            "currency": course.currency,
            "certificate_available": bool(course.certificate_available),
            "base_score": base_score,
            "ranking_score": ranking_score,
            "recommendation_score": ranking_score,
            "score": ranking_score,
            "category": category,
            "skill_coverage_score": skill_coverage_score,
            "semantic_relevance_score": round(semantic_score, 4),
            "career_relevance_score": round(career_score, 4),
            "covered_skill_gaps": covered_gaps,
            "all_skills": all_course_skills_list,
            "reason": reason,
            # Phase 7 Extended Schemas
            "skill_coverage": {
                "covered": covered_names,
                "missing": uncovered_names,
                "coverage_ratio": coverage_ratio
            },
            "career_alignment": {
                "careers": resolved_careers
            },
            "quality": {
                "score": quality_dossier["score"],
                "multiplier": quality_dossier["multiplier"]
            },
            "freshness": {
                "score": freshness_dossier["score"],
                "multiplier": freshness_dossier["multiplier"],
                "last_synced": freshness_dossier["last_synced"]
            },
            "learning_path": {
                "stage": learning_path_info["stage"],
                "sequence_order": learning_path_info["sequence_order"]
            },
            "explanation": explanation_bullets
        })

    # 8. Apply Diversity Re-ranking and Limit
    final_recommendations = apply_diversity_reranking(scored_recommendations, limit=limit)

    return {
        "status": "success",
        "student_email": clean_email if clean_email else None,
        "target_careers": resolved_careers,
        "total_skill_gaps_identified": len(all_skill_gaps),
        "duplicates_removed": duplicates_removed,
        "recommendations_count": len(final_recommendations),
        "data": final_recommendations
    }
