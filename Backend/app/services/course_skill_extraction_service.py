import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple, Set
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app import models
from app.config import settings
from app.services.esco_service import normalize_skill_name

logger = logging.getLogger("course_skill_extraction")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

GENERIC_STOP_WORDS = {
    "course", "learning", "education", "student", "study", "introduction",
    "overview", "basics", "fundamental", "fundamentals", "concept", "concepts",
    "engineering", "science", "skills", "knowledge", "class", "lecture",
    "module", "week", "session", "theory", "practice", "practical", "advanced",
    "intermediate", "beginner", "exam", "assignment", "tutorial", "topics"
}

EXACT_MATCH_THRESHOLD = 0.98
ALIAS_MATCH_THRESHOLD = 0.95
ALT_LABEL_THRESHOLD = 0.90
SUBSTRING_THRESHOLD = 0.80
MIN_ACCEPTANCE_THRESHOLD = 0.75


# ===========================================================================
# Phase 3B: Course Content Builder
# ===========================================================================
def build_course_skill_input(course: models.Course) -> str:
    """
    Constructs clean, structured text for skill extraction from course metadata.
    Combines Title, Description, Syllabus, Instructor, Institution, and Level.
    """
    lines = []
    lines.append(f"TITLE: {course.title.strip()}")

    if course.institution:
        lines.append(f"INSTITUTION: {course.institution.strip()}")
    if course.instructor:
        lines.append(f"INSTRUCTOR: {course.instructor.strip()}")
    if course.level:
        lines.append(f"LEVEL: {course.level.strip()}")
    if course.duration and course.duration_unit:
        lines.append(f"DURATION: {course.duration} {course.duration_unit}")

    if course.description:
        desc = course.description.strip()
        lines.append(f"\nDESCRIPTION & SYLLABUS:\n{desc}")

    return "\n".join(lines)


# ===========================================================================
# Phase 3C: LLM Skill Extraction with Groq
# ===========================================================================
def extract_candidate_skills_with_llm(
    course_text: str,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    max_retries: int = 3,
    timeout_seconds: float = 15.0,
) -> List[Dict[str, Any]]:
    """
    Calls Groq LLM API to extract professional, technical skills from course content.
    Returns structured list of candidate skills: [{"name": "...", "confidence": 0.95}, ...]
    """
    key = api_key or settings.GROQ_API_KEY
    if not key:
        logger.warning("GROQ_API_KEY not configured. Using heuristic extractor.")
        return heuristic_skill_extractor(course_text)

    target_model = model or settings.GROQ_MODEL or "qwen/qwen3.8-27b"

    system_prompt = (
        "You are an expert curriculum and skill taxonomy specialist.\n"
        "Your task is to extract core technical, scientific, and professional skills from the course syllabus.\n\n"
        "RULES:\n"
        "1. Extract standard, canonical industry and academic skill concepts (e.g. 'Aerodynamics', 'Aeronautical Engineering', 'Aircraft Design', 'Machine Learning', 'Python', 'Systems Engineering', 'Computational Fluid Dynamics', 'Structural Analysis', 'Mechanical Engineering').\n"
        "2. Avoid hyper-specific lecture numbers or sentence fragments. Use concise, recognized skill/competence names.\n"
        "3. Do NOT invent skills that are not covered in the syllabus.\n"
        "4. Assign a confidence score between 0.0 and 1.0 for each skill based on how central it is to the course.\n"
        "5. Return STRICT JSON with key 'skills' containing a list of objects with 'name' and 'confidence'."
    )

    user_prompt = (
        f"Course Information:\n\n{course_text}\n\n"
        "Extract technical skills and return strict JSON:\n"
        "{\n"
        '  "skills": [\n'
        '    {"name": "<skill_name>", "confidence": <float_between_0_and_1>}\n'
        "  ]\n"
        "}"
    )

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": "SkillSetu-CourseSkillExtractor/1.0"
    }

    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1
    }

    for attempt in range(max_retries + 1):
        try:
            with httpx.Client(timeout=timeout_seconds) as client:
                resp = client.post(GROQ_API_URL, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    raw_skills = parsed.get("skills", [])
                    if isinstance(raw_skills, list):
                        return validate_and_clean_candidate_skills(raw_skills)
                    return []
                elif resp.status_code == 429:
                    retry_after_hdr = resp.headers.get("retry-after")
                    wait_time = float(retry_after_hdr) if retry_after_hdr and retry_after_hdr.isdigit() else (2.0 * (2 ** attempt))
                    logger.warning(f"Groq Rate Limit (429). Waiting {wait_time:.1f}s before retry (attempt {attempt + 1}/{max_retries + 1})...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.warning(f"Groq HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"Groq request error ({e}), attempt {attempt + 1}/{max_retries + 1}")

        if attempt < max_retries:
            time.sleep(1.5 * (2 ** attempt))

    logger.warning("Groq API unavailable after retries. Falling back to heuristic extractor.")
    return heuristic_skill_extractor(course_text)


def heuristic_skill_extractor(text: str) -> List[Dict[str, Any]]:
    """
    Fallback extractor for offline environments or when LLM API quota is exceeded.
    Identifies common technical and engineering terms from course title and outline.
    """
    candidates = []
    # Known key phrases
    patterns = [
        r"\b(aerodynamics)\b",
        r"\b(computational fluid dynamics|cfd)\b",
        r"\b(machine learning|deep learning)\b",
        r"\b(python|pytorch|tensorflow|keras)\b",
        r"\b(finite element method|finite element analysis|fem|fea)\b",
        r"\b(propulsion|rocket propulsion|aircraft propulsion)\b",
        r"\b(aircraft design|aircraft structures)\b",
        r"\b(vibration analysis|mechanical vibration)\b",
        r"\b(stability and control|flight mechanics|flight control)\b",
        r"\b(unmanned aerial vehicles|uav|drone)\b",
        r"\b(fluid mechanics|thermodynamics)\b",
        r"\b(composite materials|smart structures)\b",
        r"\b(turbomachinery|compressors)\b",
    ]

    seen = set()
    for pat in patterns:
        matches = re.finditer(pat, text, re.IGNORECASE)
        for m in matches:
            sk = m.group(0).strip().title()
            if sk.lower() not in seen:
                seen.add(sk.lower())
                candidates.append({"name": sk, "confidence": 0.90})

    return candidates


# ===========================================================================
# Phase 3D: Validation of Candidate Skills
# ===========================================================================
def validate_and_clean_candidate_skills(raw_skills: List[Any]) -> List[Dict[str, Any]]:
    """
    Validates JSON schema, normalizes names, removes stopwords, bounds confidence to [0,1],
    and removes duplicates.
    """
    valid_skills: List[Dict[str, Any]] = []
    seen_names: Set[str] = set()

    for item in raw_skills:
        if not isinstance(item, dict):
            continue

        name = item.get("name")
        if not name or not isinstance(name, str):
            continue

        clean_name = re.sub(r"[^\w\s\-\+\#\.\/]", " ", name).strip()
        # Clean multi-space
        clean_name = re.sub(r"\s+", " ", clean_name)
        if not clean_name or len(clean_name) < 2 or len(clean_name) > 80:
            continue

        # Check against generic stop words
        if clean_name.lower() in GENERIC_STOP_WORDS:
            continue

        # Confidence validation
        raw_conf = item.get("confidence", 0.8)
        try:
            conf = float(raw_conf)
            conf = max(0.0, min(1.0, conf))
        except (ValueError, TypeError):
            conf = 0.8

        normalized_key = clean_name.lower()
        if normalized_key in seen_names:
            continue

        seen_names.add(normalized_key)
        valid_skills.append({
            "name": clean_name,
            "confidence": round(conf, 2),
        })

    return valid_skills


# ===========================================================================
# Phase 3E: Skill Normalization
# ===========================================================================
def normalize_extracted_skill(skill_name: str) -> str:
    """
    Applies canonical normalization (alias resolution, prefix/suffix stripping).
    """
    return normalize_skill_name(skill_name)


# ===========================================================================
# Phase 3F: Multi-Tier ESCO Skill Matching
# ===========================================================================
def match_skill_to_esco(
    skill_name: str,
    db: Session,
    min_confidence: float = MIN_ACCEPTANCE_THRESHOLD
) -> Optional[Dict[str, Any]]:
    """
    Matches candidate skill to PostgreSQL ESCO taxonomy using a 4-tier strategy:
      1. Exact match on ESCO preferred_label (confidence: 0.98)
      2. Alias match via SkillSetuSkillAlias (85k aliases) (confidence: 0.95)
      3. ESCO alt_labels phrase match (confidence: 0.90)
      4. Substring / Token-overlap match (confidence: 0.80)
    """
    canonical_name = normalize_extracted_skill(skill_name)
    search_term = canonical_name.lower().strip()
    if not search_term:
        return None

    # -------------------------------------------------------------
    # Tier 1: Exact preferred_label match
    # -------------------------------------------------------------
    exact = db.query(models.EscoSkill).filter(
        func.lower(models.EscoSkill.preferred_label) == search_term
    ).first()

    if exact and EXACT_MATCH_THRESHOLD >= min_confidence:
        return {
            "esco_id": exact.id,
            "esco_uri": exact.concept_uri,
            "esco_label": exact.preferred_label,
            "skill_name": exact.preferred_label,
            "mapping_method": "esco_exact",
            "mapping_confidence": EXACT_MATCH_THRESHOLD,
        }

    # -------------------------------------------------------------
    # Tier 2: SkillSetu 85k Alias match
    # -------------------------------------------------------------
    alias = db.query(models.SkillSetuSkillAlias).filter(
        func.lower(models.SkillSetuSkillAlias.alias_name) == search_term
    ).first()

    if alias and ALIAS_MATCH_THRESHOLD >= min_confidence:
        # Find canonical skill
        sk = db.query(models.SkillSetuSkill).filter(models.SkillSetuSkill.id == alias.canonical_skill_id).first()
        if sk:
            esco_match = None
            if sk.esco_uri:
                esco_match = db.query(models.EscoSkill).filter(models.EscoSkill.concept_uri == sk.esco_uri).first()
            if not esco_match:
                esco_match = db.query(models.EscoSkill).filter(
                    func.lower(models.EscoSkill.preferred_label) == sk.name.lower()
                ).first()

            if esco_match:
                return {
                    "esco_id": esco_match.id,
                    "esco_uri": esco_match.concept_uri,
                    "esco_label": esco_match.preferred_label,
                    "skill_name": sk.name,
                    "mapping_method": "taxonomy_alias",
                    "mapping_confidence": ALIAS_MATCH_THRESHOLD,
                }

    # -------------------------------------------------------------
    # Tier 3: ESCO alt_labels phrase match
    # -------------------------------------------------------------
    alt = db.query(models.EscoSkill).filter(
        models.EscoSkill.alt_labels.isnot(None),
        models.EscoSkill.alt_labels.ilike(f"%{search_term}%")
    ).first()

    if alt and ALT_LABEL_THRESHOLD >= min_confidence:
        return {
            "esco_id": alt.id,
            "esco_uri": alt.concept_uri,
            "esco_label": alt.preferred_label,
            "skill_name": alt.preferred_label,
            "mapping_method": "esco_alt_label",
            "mapping_confidence": ALT_LABEL_THRESHOLD,
        }

    # -------------------------------------------------------------
    # Tier 4: Substring / Prefix match in ESCO preferred_label
    # -------------------------------------------------------------
    if len(search_term) >= 4:
        substring_match = db.query(models.EscoSkill).filter(
            models.EscoSkill.preferred_label.ilike(f"%{search_term}%")
        ).order_by(func.length(models.EscoSkill.preferred_label).asc()).first()

        if substring_match and SUBSTRING_THRESHOLD >= min_confidence:
            return {
                "esco_id": substring_match.id,
                "esco_uri": substring_match.concept_uri,
                "esco_label": substring_match.preferred_label,
                "skill_name": substring_match.preferred_label,
                "mapping_method": "esco_substring",
                "mapping_confidence": SUBSTRING_THRESHOLD,
            }

    return None


# ===========================================================================
# Phase 3G & 3H: Orchestration & Idempotent Storage
# ===========================================================================
def extract_and_store_course_skills(
    course: models.Course,
    db: Session,
    force_refresh: bool = False,
    dry_run: bool = False,
    min_confidence: float = MIN_ACCEPTANCE_THRESHOLD,
) -> Dict[str, Any]:
    """
    Extracts candidate skills from a course, maps them to ESCO, and stores
    them in course_skills idempotently.
    """
    # Check existing mapped skills
    existing_skills = db.query(models.CourseSkill).filter(
        models.CourseSkill.course_id == course.id
    ).all()

    if existing_skills and not force_refresh:
        logger.info(f"Course {course.id} ('{course.title}') already has {len(existing_skills)} skills. Skipping (use --force-refresh to override).")
        return {
            "course_id": course.id,
            "title": course.title,
            "status": "skipped",
            "candidate_skills_count": len(existing_skills),
            "accepted_mappings_count": sum(1 for s in existing_skills if s.esco_skill_id is not None),
            "rejected_mappings_count": sum(1 for s in existing_skills if s.esco_skill_id is None),
            "mappings": [
                {
                    "skill_name": s.skill_name,
                    "esco_skill_id": s.esco_skill_id,
                    "confidence": s.confidence,
                    "source": s.source
                }
                for s in existing_skills
            ]
        }

    if force_refresh:
        # Clear existing skills for this course to ensure clean overwrite
        db.query(models.CourseSkill).filter(models.CourseSkill.course_id == course.id).delete()
        db.flush()

    # 1. Build course input text
    content_input = build_course_skill_input(course)

    # 2. Extract candidate skills with LLM
    candidate_skills = extract_candidate_skills_with_llm(content_input)

    mappings_summary = []
    accepted_count = 0
    rejected_count = 0

    seen_esco_ids: Set[int] = set()
    seen_unmatched_names: Set[str] = set()

    # 3. Match each candidate skill to ESCO
    for cand in candidate_skills:
        raw_name = cand["name"]
        llm_conf = cand["confidence"]

        esco_match = match_skill_to_esco(raw_name, db, min_confidence=min_confidence)

        if esco_match:
            esco_id = esco_match["esco_id"]
            if esco_id in seen_esco_ids:
                # Already mapped this ESCO competency for this course
                continue
            seen_esco_ids.add(esco_id)

            accepted_count += 1
            final_conf = round((llm_conf + esco_match["mapping_confidence"]) / 2.0, 2)
            source_tag = f"llm_{esco_match['mapping_method']}"
            skill_label = esco_match["skill_name"]
        else:
            norm_name = raw_name.strip().title()
            if norm_name.lower() in seen_unmatched_names:
                continue
            seen_unmatched_names.add(norm_name.lower())

            rejected_count += 1
            final_conf = round(llm_conf * 0.7, 2)
            source_tag = "llm_unmatched"
            esco_id = None
            skill_label = norm_name

        mappings_summary.append({
            "extracted_name": raw_name,
            "skill_name": skill_label,
            "esco_skill_id": esco_id,
            "confidence": final_conf,
            "source": source_tag,
            "is_matched": esco_id is not None,
        })

        if not dry_run:
            c_skill = models.CourseSkill(
                course_id=course.id,
                esco_skill_id=esco_id,
                skill_name=skill_label,
                confidence=final_conf,
                source=source_tag,
            )
            db.add(c_skill)

    if not dry_run:
        db.commit()

    return {
        "course_id": course.id,
        "title": course.title,
        "status": "extracted",
        "candidate_skills_count": len(candidate_skills),
        "accepted_mappings_count": accepted_count,
        "rejected_mappings_count": rejected_count,
        "mappings": mappings_summary,
    }
