import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple, Set, Union

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models import (
    StudentUser,
    Course,
    CourseSkill,
    EscoSkill,
    StudentSkillEvidence,
    StudentGithubConnection,
    LearningPath,
    LearningPathItem
)
from app.services import esco_service

logger = logging.getLogger("skill_evidence_service")

# ---------------------------------------------------------------------------
# Constants & Thresholds
# ---------------------------------------------------------------------------
MAX_GITHUB_SCORE: float = 0.70
MAX_RESUME_SCORE: float = 0.45
MAX_COURSE_COMPLETION_SCORE: float = 0.40
MAX_PROFILE_SCORE: float = 0.20

STATUS_MISSING_THRESHOLD: float = 0.20
STATUS_DEVELOPING_THRESHOLD: float = 0.50
STATUS_EVIDENCED_THRESHOLD: float = 0.80


def _normalize_skill_key(name: Optional[str]) -> str:
    """Normalize skill name for dictionary grouping."""
    return name.lower().strip() if name else ""


def calculate_learning_evidence_score(progress_percent: float) -> float:
    """
    Deterministic, bounded learning evidence score calculator:
    0%      -> 0.00
    1-24%   -> 0.08
    25-49%  -> 0.15
    50-74%  -> 0.25
    75-99%  -> 0.32
    100%    -> 0.40
    """
    p = max(0.0, min(100.0, float(progress_percent or 0.0)))
    if p <= 0.0:
        return 0.0
    elif p < 25.0:
        return 0.08
    elif p < 50.0:
        return 0.15
    elif p < 75.0:
        return 0.25
    elif p < 100.0:
        return 0.32
    else:
        return MAX_COURSE_COMPLETION_SCORE


# ---------------------------------------------------------------------------
# 1. Bounded Multi-Source Evidence Aggregator
# ---------------------------------------------------------------------------
def aggregate_skill_scores(evidence_records: List[StudentSkillEvidence]) -> Tuple[float, str, List[Dict[str, Any]]]:
    """
    Combines multi-source evidence into a unified, bounded evidence score S in [0.0, 1.0]
    using diminishing returns / probability independent combination:
    S = 1.0 - PROD(1.0 - min(0.95, score_i * confidence_i))

    Status Classification:
    - S < 0.20: missing
    - 0.20 <= S < 0.50: developing
    - 0.50 <= S < 0.80: evidenced
    - S >= 0.80: verified (requires at least one verified technical source)
    """
    if not evidence_records:
        return 0.0, "missing", []

    product_unobserved = 1.0
    has_strong_technical_source = False
    sources_list = []

    for rec in evidence_records:
        sc = max(0.0, min(1.0, rec.evidence_score or 0.0))
        conf = max(0.0, min(1.0, rec.confidence_score if rec.confidence_score is not None else 1.0))
        effective = min(0.95, sc * conf)

        if effective > 0.0:
            product_unobserved *= (1.0 - effective)

        if rec.source_type in {"github", "verified_assessment"} and effective >= 0.40:
            has_strong_technical_source = True

        sources_list.append({
            "type": rec.source_type,
            "source_id": rec.source_id,
            "score": sc,
            "confidence": conf,
            "recorded_at": rec.updated_at.isoformat() if rec.updated_at else None
        })

    unified_score = round(max(0.0, min(1.0, 1.0 - product_unobserved)), 2)

    # Determine status
    if unified_score < STATUS_MISSING_THRESHOLD:
        status_label = "missing"
    elif unified_score < STATUS_DEVELOPING_THRESHOLD:
        status_label = "developing"
    elif unified_score < STATUS_EVIDENCED_THRESHOLD:
        status_label = "evidenced"
    else:
        # Verified requires strong technical evidence (e.g. GitHub or verified assessment)
        status_label = "verified" if has_strong_technical_source else "evidenced"

    return unified_score, status_label, sources_list


# ---------------------------------------------------------------------------
# 2. Record Course Learning Evidence
# ---------------------------------------------------------------------------
def record_learning_progress_evidence(
    db: Session,
    student_id: int,
    course_id: int,
    progress_percent: float,
    skill_name: Optional[str] = None
) -> List[StudentSkillEvidence]:
    """
    Record or update learning evidence when a student makes progress or completes a course.
    """
    course = db.query(Course).options(joinedload(Course.skills), joinedload(Course.provider)).filter(Course.id == course_id).first()
    if not course:
        return []

    clean_progress = max(0.0, min(100.0, progress_percent))
    evidence_score = calculate_learning_evidence_score(clean_progress)

    if clean_progress >= 100.0:
        source_type = "course_completion"
        confidence = 1.00
    else:
        source_type = "learning_progress"
        if clean_progress <= 0.0:
            confidence = 0.0
        elif clean_progress < 25.0:
            confidence = 0.60
        elif clean_progress < 50.0:
            confidence = 0.70
        elif clean_progress < 75.0:
            confidence = 0.80
        else:
            confidence = 0.90

    # Identify targeted skills
    skills_to_record = []
    if skill_name and skill_name.strip():
        skills_to_record.append(skill_name.strip())

    for cs in (course.skills or []):
        if cs.skill_name and cs.skill_name.strip() not in skills_to_record:
            skills_to_record.append(cs.skill_name.strip())

    if not skills_to_record:
        skills_to_record.append(course.title)

    source_id = f"course:{course.id}"
    metadata_json = json.dumps({
        "course_id": course.id,
        "course_title": course.title,
        "provider": course.provider.slug if course.provider else "unknown",
        "progress_percent": clean_progress,
        "duration": f"{course.duration} {course.duration_unit or 'weeks'}" if course.duration else None,
        "certificate_available": bool(course.certificate_available)
    })

    now_utc = datetime.now(timezone.utc)
    recorded_records = []

    for s_name in skills_to_record:
        # Find matching ESCO skill ID
        esco_skill = db.query(EscoSkill).filter(func.lower(EscoSkill.preferred_label) == s_name.lower().strip()).first()
        esco_id = esco_skill.id if esco_skill else None

        existing = (
            db.query(StudentSkillEvidence)
            .filter(
                StudentSkillEvidence.student_id == student_id,
                func.lower(StudentSkillEvidence.skill_name) == s_name.lower().strip(),
                StudentSkillEvidence.source_id == source_id
            )
            .first()
        )

        if existing:
            existing.evidence_score = evidence_score
            existing.confidence_score = confidence
            existing.source_type = source_type
            existing.evidence_metadata = metadata_json
            existing.updated_at = now_utc
            recorded_records.append(existing)
        else:
            new_rec = StudentSkillEvidence(
                student_id=student_id,
                esco_skill_id=esco_id,
                skill_name=s_name,
                source_type=source_type,
                source_id=source_id,
                evidence_score=evidence_score,
                confidence_score=confidence,
                evidence_metadata=metadata_json,
                created_at=now_utc,
                updated_at=now_utc
            )
            db.add(new_rec)
            recorded_records.append(new_rec)

    db.commit()
    return recorded_records


# ---------------------------------------------------------------------------
# 3. Synchronize All Student Evidence Sources
# ---------------------------------------------------------------------------
def sync_all_student_evidence(db: Session, student_email: str) -> Dict[str, Any]:
    """
    Ingests & updates evidence records across GitHub, Resume, Profile, and Learning history.
    """
    clean_email = student_email.lower().strip()
    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
    if not student:
        raise ValueError(f"Student with email '{clean_email}' not found.")

    now_utc = datetime.now(timezone.utc)
    records_count = 0

    # 1. GitHub Evidence Sync
    gh_conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == clean_email).first()
    if gh_conn and gh_conn.skills_json:
        try:
            gh_data = json.loads(gh_conn.skills_json)
            gh_items = gh_data.items() if isinstance(gh_data, dict) else [(item.get("name") or item.get("skill"), item.get("score", 70.0)) for item in gh_data]
            for sk_name, raw_score in gh_items:
                if not sk_name:
                    continue
                score_val = float(raw_score)
                norm_score = (score_val / 100.0) * MAX_GITHUB_SCORE if score_val > 1.0 else score_val * MAX_GITHUB_SCORE
                norm_score = round(min(MAX_GITHUB_SCORE, max(0.05, norm_score)), 2)

                source_id = f"github:{gh_conn.github_username}"
                meta = json.dumps({"username": gh_conn.github_username, "synced_at": gh_conn.last_synced_at.isoformat() if gh_conn.last_synced_at else None})

                existing = db.query(StudentSkillEvidence).filter(
                    StudentSkillEvidence.student_id == student.id,
                    func.lower(StudentSkillEvidence.skill_name) == sk_name.lower().strip(),
                    StudentSkillEvidence.source_type == "github"
                ).first()

                if existing:
                    existing.evidence_score = norm_score
                    existing.confidence_score = 0.95
                    existing.updated_at = now_utc
                else:
                    db.add(StudentSkillEvidence(
                        student_id=student.id,
                        skill_name=sk_name,
                        source_type="github",
                        source_id=source_id,
                        evidence_score=norm_score,
                        confidence_score=0.95,
                        evidence_metadata=meta,
                        created_at=now_utc,
                        updated_at=now_utc
                    ))
                records_count += 1
        except Exception as e:
            logger.warning(f"Error syncing GitHub evidence for {clean_email}: {e}")

    # 2. Resume Evidence Sync
    if student.resume_data:
        try:
            res_obj = json.loads(student.resume_data) if isinstance(student.resume_data, str) else student.resume_data
            extracted = res_obj.get("extracted_data", {}) if isinstance(res_obj, dict) else {}
            resume_skills = extracted.get("normalized_skills", []) or extracted.get("coreTechnologies", []) or res_obj.get("coreTechnologies", [])
            for item in resume_skills:
                sk_name = item.get("name") if isinstance(item, dict) else item
                if not sk_name or not isinstance(sk_name, str):
                    continue
                source_id = "resume:parsed"
                meta = json.dumps({"resume_score": student.resume_score, "extracted_skill": sk_name})

                existing = db.query(StudentSkillEvidence).filter(
                    StudentSkillEvidence.student_id == student.id,
                    func.lower(StudentSkillEvidence.skill_name) == sk_name.lower().strip(),
                    StudentSkillEvidence.source_type == "resume"
                ).first()

                if existing:
                    existing.evidence_score = MAX_RESUME_SCORE
                    existing.confidence_score = 0.85
                    existing.updated_at = now_utc
                else:
                    db.add(StudentSkillEvidence(
                        student_id=student.id,
                        skill_name=sk_name,
                        source_type="resume",
                        source_id=source_id,
                        evidence_score=MAX_RESUME_SCORE,
                        confidence_score=0.85,
                        evidence_metadata=meta,
                        created_at=now_utc,
                        updated_at=now_utc
                    ))
                records_count += 1
        except Exception as e:
            logger.warning(f"Error syncing Resume evidence for {clean_email}: {e}")

    # 3. Profile Declared Skills Sync
    if student.skill_ids:
        try:
            prof_skills = json.loads(student.skill_ids) if student.skill_ids.startswith('[') else [s.strip() for s in student.skill_ids.split(',')]
            for sk_name in prof_skills:
                if not sk_name:
                    continue
                clean_sk = sk_name.replace("sk_", "").replace("_", " ").title()
                source_id = "profile:declared"
                meta = json.dumps({"declared": True})

                existing = db.query(StudentSkillEvidence).filter(
                    StudentSkillEvidence.student_id == student.id,
                    func.lower(StudentSkillEvidence.skill_name) == clean_sk.lower().strip(),
                    StudentSkillEvidence.source_type == "profile"
                ).first()

                if existing:
                    existing.evidence_score = MAX_PROFILE_SCORE
                    existing.confidence_score = 0.50
                    existing.updated_at = now_utc
                else:
                    db.add(StudentSkillEvidence(
                        student_id=student.id,
                        skill_name=clean_sk,
                        source_type="profile",
                        source_id=source_id,
                        evidence_score=MAX_PROFILE_SCORE,
                        confidence_score=0.50,
                        evidence_metadata=meta,
                        created_at=now_utc,
                        updated_at=now_utc
                    ))
                records_count += 1
        except Exception as e:
            logger.warning(f"Error syncing Profile evidence for {clean_email}: {e}")

    # 4. Learning Path Items Sync
    lp_items = (
        db.query(LearningPathItem)
        .join(LearningPath)
        .filter(LearningPath.student_id == student.id, LearningPathItem.progress_percent > 0)
        .all()
    )
    for it in lp_items:
        rec_list = record_learning_progress_evidence(
            db=db,
            student_id=student.id,
            course_id=it.course_id,
            progress_percent=it.progress_percent,
            skill_name=it.skill_name
        )
        records_count += len(rec_list)

    db.commit()

    return {
        "status": "success",
        "email": clean_email,
        "records_created_or_updated": records_count,
        "message": f"Successfully synced {records_count} skill evidence records for {clean_email}."
    }


# ---------------------------------------------------------------------------
# 4. Get Unified Skill Evidence Dossier
# ---------------------------------------------------------------------------
def get_unified_skill_evidence(
    db: Session,
    student_email: str
) -> Dict[str, Any]:
    """
    Retrieve all aggregated skill evidence for a student across all sources.
    """
    clean_email = student_email.lower().strip()
    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
    if not student:
        raise ValueError(f"Student with email '{clean_email}' not found.")

    sync_all_student_evidence(db, clean_email)

    records = (
        db.query(StudentSkillEvidence)
        .filter(StudentSkillEvidence.student_id == student.id)
        .order_by(StudentSkillEvidence.updated_at.desc())
        .all()
    )

    grouped: Dict[str, List[StudentSkillEvidence]] = {}
    display_names: Dict[str, str] = {}
    esco_ids: Dict[str, Optional[int]] = {}

    for rec in records:
        key = _normalize_skill_key(rec.skill_name)
        if key not in grouped:
            grouped[key] = []
            display_names[key] = rec.skill_name
            esco_ids[key] = rec.esco_skill_id
        grouped[key].append(rec)

    target_careers: List[str] = []
    if student.target_careers:
        try:
            target_careers = json.loads(student.target_careers) if student.target_careers.startswith("[") else [c.strip() for c in student.target_careers.split(",")]
        except Exception:
            target_careers = [student.target_careers]

    skills_summary_list = []
    verified_count = 0
    evidenced_count = 0
    developing_count = 0

    for key, rec_list in grouped.items():
        score, status_label, _ = aggregate_skill_scores(rec_list)

        if status_label == "verified":
            verified_count += 1
        elif status_label == "evidenced":
            evidenced_count += 1
        elif status_label == "developing":
            developing_count += 1

        sources_serialized = []
        for r in rec_list:
            meta = None
            if r.evidence_metadata:
                try:
                    meta = json.loads(r.evidence_metadata)
                except Exception:
                    pass
            sources_serialized.append({
                "type": r.source_type,
                "source_id": r.source_id,
                "score": r.evidence_score,
                "confidence": r.confidence_score if r.confidence_score is not None else 1.0,
                "details": meta,
                "recorded_at": r.updated_at.isoformat() if r.updated_at else None
            })

        latest_time = max([r.updated_at for r in rec_list if r.updated_at], default=None)

        skills_summary_list.append({
            "skill_id": esco_ids.get(key),
            "skill_name": display_names[key],
            "score": score,
            "status": status_label,
            "required_by_careers": target_careers,
            "sources": sources_serialized,
            "last_updated": latest_time.isoformat() if latest_time else None
        })

    skills_summary_list.sort(key=lambda x: x["score"], reverse=True)

    return {
        "status": "success",
        "student_email": clean_email,
        "total_skills": len(skills_summary_list),
        "verified_skills_count": verified_count,
        "evidenced_skills_count": evidenced_count,
        "developing_skills_count": developing_count,
        "skills": skills_summary_list
    }


# ---------------------------------------------------------------------------
# 5. Get Single Skill Evidence Detail & Timeline
# ---------------------------------------------------------------------------
def get_skill_evidence_detail(
    db: Session,
    student_email: str,
    skill_name_or_id: Optional[Union[str, int]] = None,
    esco_skill_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Fetch comprehensive evidence breakdown, chronological timeline, related courses,
    and explainability for a specific skill.
    """
    clean_email = student_email.lower().strip()
    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
    if not student:
        raise ValueError(f"Student with email '{clean_email}' not found.")

    sync_all_student_evidence(db, clean_email)

    target_id = esco_skill_id if esco_skill_id is not None else skill_name_or_id

    query = db.query(StudentSkillEvidence).filter(StudentSkillEvidence.student_id == student.id)
    if isinstance(target_id, int) or (isinstance(target_id, str) and target_id.isdigit()):
        query = query.filter(StudentSkillEvidence.esco_skill_id == int(target_id))
    else:
        query = query.filter(func.lower(StudentSkillEvidence.skill_name) == str(target_id).lower().strip())

    records = query.order_by(StudentSkillEvidence.updated_at.asc()).all()
    if not records:
        esco_sk = None
        if isinstance(target_id, int) or (isinstance(target_id, str) and target_id.isdigit()):
            esco_sk = db.query(EscoSkill).filter(EscoSkill.id == int(target_id)).first()
        else:
            esco_sk = db.query(EscoSkill).filter(func.lower(EscoSkill.preferred_label) == str(target_id).lower().strip()).first()
        skill_display = esco_sk.preferred_label if esco_sk else str(target_id)
        return {
            "status": "success",
            "skill_id": esco_sk.id if esco_sk else None,
            "skill_name": skill_display,
            "score": 0.0,
            "status_label": "missing",
            "required_by_careers": [],
            "sources": [],
            "timeline": [],
            "related_courses": [],
            "explanation": ["No active evidence recorded yet for this skill."]
        }

    skill_display = records[0].skill_name
    esco_id = records[0].esco_skill_id
    score, status_label, _ = aggregate_skill_scores(records)

    sources_serialized = []
    timeline = []
    explanation = []

    for r in records:
        meta = None
        if r.evidence_metadata:
            try:
                meta = json.loads(r.evidence_metadata)
            except Exception:
                pass

        sources_serialized.append({
            "type": r.source_type,
            "source_id": r.source_id,
            "score": r.evidence_score,
            "confidence": r.confidence_score if r.confidence_score is not None else 1.0,
            "details": meta,
            "recorded_at": r.updated_at.isoformat() if r.updated_at else None
        })

        dt_str = r.updated_at.strftime("%Y-%m-%d") if r.updated_at else "Recently"
        if r.source_type == "github":
            timeline.append({
                "date": dt_str,
                "source_type": "github",
                "title": "GitHub Code Analysis",
                "description": f"Verified repository implementation and code usage for {skill_display}.",
                "score_contribution": r.evidence_score
            })
            explanation.append(f"GitHub: Verified code evidence contributing {int(r.evidence_score * 100)}% strength.")
        elif r.source_type in {"course_completion", "learning_progress"}:
            c_title = meta.get("course_title", "Course") if meta else "Course"
            timeline.append({
                "date": dt_str,
                "source_type": r.source_type,
                "title": f"Learning ({'Completed' if r.source_type == 'course_completion' else 'In Progress'})",
                "description": f"{'Completed' if r.source_type == 'course_completion' else 'Studying'} '{c_title}'.",
                "score_contribution": r.evidence_score
            })
            explanation.append(f"Learning: {'Completed' if r.source_type == 'course_completion' else 'In progress on'} '{c_title}' (+{int(r.evidence_score * 100)}% learning evidence).")
        elif r.source_type == "resume":
            timeline.append({
                "date": dt_str,
                "source_type": "resume",
                "title": "Resume Project Verification",
                "description": f"Extracted and parsed from verified resume project experience.",
                "score_contribution": r.evidence_score
            })
            explanation.append(f"Resume: Applied in project experience (+{int(r.evidence_score * 100)}% evidence).")
        elif r.source_type == "profile":
            timeline.append({
                "date": dt_str,
                "source_type": "profile",
                "title": "Profile Skill Declaration",
                "description": f"Self-reported competency in student profile.",
                "score_contribution": r.evidence_score
            })
            explanation.append(f"Profile: Self-reported skill declaration (+{int(r.evidence_score * 100)}% baseline).")

    # Find related courses in PostgreSQL
    related_courses = []
    norm_sk = skill_display.lower().strip()
    matching_cskills = (
        db.query(CourseSkill)
        .options(joinedload(CourseSkill.course).joinedload(Course.provider))
        .filter(func.lower(CourseSkill.skill_name) == norm_sk)
        .limit(5)
        .all()
    )
    for cs in matching_cskills:
        c = cs.course
        if c:
            related_courses.append({
                "id": c.id,
                "title": c.title,
                "provider_name": c.provider.name if c.provider else "Provider",
                "url": c.url,
                "level": c.level,
                "duration": f"{c.duration} {c.duration_unit or 'weeks'}" if c.duration else None
            })

    target_careers: List[str] = []
    if student.target_careers:
        try:
            target_careers = json.loads(student.target_careers) if student.target_careers.startswith("[") else [c.strip() for c in student.target_careers.split(",")]
        except Exception:
            target_careers = [student.target_careers]

    return {
        "status": "success",
        "skill_id": esco_id,
        "skill_name": skill_display,
        "score": score,
        "status_label": status_label,
        "required_by_careers": target_careers,
        "sources": sources_serialized,
        "timeline": timeline,
        "related_courses": related_courses,
        "explanation": explanation
    }
