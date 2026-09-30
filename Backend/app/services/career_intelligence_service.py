import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models import (
    StudentUser,
    Course,
    CourseSkill,
    EscoSkill,
    SkillSetuSkill,
    LearningPath,
    LearningPathItem,
    Provider,
    StudentAssessmentAttempt,
    StudentPracticeAttempt,
    SkillPracticeChallenge,
    EscoAssessment,
    EscoAssessmentQuestion,
    ProjectSubmission,
    StudentLearningProgress,
    StudentSkillEvidence
)

from app.services import (
    esco_service,
    course_recommendation_service,
    learning_path_service,
    skill_evidence_service
)

logger = logging.getLogger("career_intelligence_service")


def get_canonical_skill_id(db: Session, skill_name: str) -> Optional[int]:
    """Resolve an ESCO skill ID or database integer ID for a given skill name."""
    if not skill_name:
        return None
    clean = skill_name.lower().strip()
    
    # 1. Exact match in EscoSkill
    esco_match = db.query(EscoSkill).filter(func.lower(EscoSkill.preferred_label) == clean).first()
    if esco_match:
        return esco_match.id

    # 2. Match in CourseSkill
    cs_match = db.query(CourseSkill).filter(func.lower(CourseSkill.skill_name) == clean).first()
    if cs_match and cs_match.skill_id:
        return cs_match.skill_id

    # 3. Substring / Alt-label match
    esco_alt = db.query(EscoSkill).filter(EscoSkill.alt_labels.ilike(f"%{clean}%")).first()
    if esco_alt:
        return esco_alt.id

    return None


def get_student_career_intelligence(
    db: Session,
    student_email: Optional[str] = None,
    career_name: Optional[str] = None,
    gaps_only: bool = False
) -> Dict[str, Any]:
    """
    Unified Career Intelligence Engine:
    Returns the single authoritative truth for career readiness, required skills,
    skill evidence, course recommendations, and learning path progress.
    Consistently consumed by both Learning (Course-Centric) and Skill Intelligence (Skill-Centric) views.
    """
    esco_service.seed_default_datasets_if_needed(db)

    clean_email = student_email.lower().strip() if student_email and student_email.strip() else ""
    student = None
    if clean_email:
        student = db.query(StudentUser).filter(func.lower(StudentUser.email) == clean_email).first()
        if not student:
            raise ValueError(f"Student user record not found for email: '{clean_email}'.")
    else:
        student = db.query(StudentUser).first()
        if student:
            clean_email = student.email

    if not student:
        raise ValueError("Student user record not found.")

    # 1. Resolve Target Careers
    raw_careers_list = []
    if student.target_careers:
        try:
            raw_tc = json.loads(student.target_careers) if student.target_careers.startswith("[") else [s.strip() for s in student.target_careers.split(",") if s.strip()]
            raw_careers_list = raw_tc
        except Exception:
            pass

    if not raw_careers_list and hasattr(student, 'target_role') and student.target_role:
        raw_careers_list = [student.target_role]

    if not raw_careers_list:
        raw_careers_list = ["Full Stack Developer", "Backend Developer"]

    # Normalize career names
    resolved_careers_list = [esco_service.resolve_career_name(c, db) for c in raw_careers_list if c]
    if not resolved_careers_list:
        resolved_careers_list = ["Full Stack Developer"]
    
    # Determine active career
    active_career_raw = career_name.strip() if career_name and career_name.strip() else resolved_careers_list[0]
    active_career = esco_service.resolve_career_name(active_career_raw, db)
    
    # Clean active career format
    active_career_id = f"car_{active_career.lower().replace(' ', '_')}"
    active_career_obj = {
        "id": active_career_id,
        "name": active_career
    }

    target_careers_objs = [
        {"id": f"car_{c.lower().replace(' ', '_')}", "name": c}
        for c in resolved_careers_list
    ]

    # 2. Run deterministic Skill-Gap Engine
    github_skills, resume_parsed, profile_skills = esco_service.load_student_evidence_from_db(clean_email, db)
    gap_analysis = esco_service.calculate_multi_career_skill_gaps(
        target_careers=[active_career] if active_career else resolved_careers_list,
        github_skills=github_skills,
        resume_data=resume_parsed,
        profile_skills=profile_skills,
        db=db
    )

    # 3. Retrieve or Generate Active Learning Path
    learning_path = (
        db.query(LearningPath)
        .options(
            joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.provider),
            joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.skills)
        )
        .filter(LearningPath.student_id == student.id)
        .order_by(LearningPath.created_at.desc())
        .first()
    )

    # If no path exists, generate one automatically
    if not learning_path or not learning_path.items:
        serialized_path = learning_path_service.generate_learning_path(
            db=db,
            student_email=clean_email,
            target_careers=[active_career]
        )
        learning_path = (
            db.query(LearningPath)
            .options(
                joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.provider),
                joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.skills)
            )
            .filter(LearningPath.id == serialized_path["id"])
            .first()
        )

    # Map learning path items by course_id and primary/secondary skill names
    path_items_by_course_id: Dict[int, LearningPathItem] = {}
    path_items_by_skill_name: Dict[str, List[LearningPathItem]] = {}

    if learning_path and learning_path.items:
        for item in learning_path.items:
            path_items_by_course_id[item.course_id] = item
            
            # Map primary skill
            if item.skill_name:
                s_key = item.skill_name.lower().strip()
                path_items_by_skill_name.setdefault(s_key, []).append(item)
            
            # Map course secondary skills
            if item.course and item.course.skills:
                for cs in item.course.skills:
                    c_sname = cs.skill_name.lower().strip()
                    if c_sname != (item.skill_name or "").lower().strip():
                        path_items_by_skill_name.setdefault(c_sname, []).append(item)

    # 4. Build Canonical Skill Intelligence Matrix
    all_required_skills = gap_analysis.get("all_skills", [])
    if not all_required_skills:
        all_required_skills = gap_analysis.get("skill_gaps", [])

    unified_skills = []
    verified_count = 0

    for sk in all_required_skills:
        s_name = sk.get("skill_name") or sk.get("skill") or ""
        if not s_name:
            continue

        s_norm = s_name.lower().strip()
        sk_id = sk.get("skill_id") or get_canonical_skill_id(db, s_name) or abs(hash(s_norm)) % 100000

        curr_level = float(sk.get("current_level") or sk.get("student_level") or sk.get("score") or 0.0)
        req_level = float(sk.get("required_level") or sk.get("target_level") or 80.0)
        gap_val = float(sk.get("gap") if sk.get("gap") is not None else (curr_level - req_level))
        
        # Determine canonical status
        raw_status = (sk.get("status") or "").upper().strip()
        if curr_level >= req_level or raw_status in ("STRONG", "VERIFIED"):
            status_label = "Verified"
            canonical_status = "verified"
            verified_count += 1
        elif curr_level >= 40.0 or raw_status in ("DEVELOPING", "LEARNING_ACTIVE"):
            status_label = "Learning Active"
            canonical_status = "learning_active"
        elif curr_level > 0:
            status_label = "Developing"
            canonical_status = "developing"
        else:
            status_label = "Needs Improvement"
            canonical_status = "needs_improvement"

        # Find linked courses for this skill from the active learning path
        linked_path_items = path_items_by_skill_name.get(s_norm, [])
        recommended_courses_for_skill = []

        seen_course_ids = set()
        for p_item in linked_path_items:
            c = p_item.course
            if not c or c.id in seen_course_ids:
                continue
            seen_course_ids.add(c.id)

            prov_slug = c.provider.slug if c.provider else "nptel"
            prov_name = c.provider.name if c.provider else "NPTEL"

            recommended_courses_for_skill.append({
                "course_id": c.id,
                "learning_path_item_id": p_item.id,
                "title": c.title,
                "provider": prov_slug,
                "provider_name": prov_name,
                "canonical_url": c.url,
                "progress_percent": round(p_item.progress_percent or 0.0, 1),
                "status": p_item.status,
                "stage": p_item.stage,
                "gap_closure_type": "Closes Gap" if p_item.skill_name and p_item.skill_name.lower().strip() == s_norm else "Supports Skill",
                "instructor": c.instructor,
                "institution": c.institution,
                "duration": f"{c.duration} {c.duration_unit or 'weeks'}" if c.duration else "Self-paced",
                "price": float(c.price or 0.0),
                "certificate_available": bool(c.certificate_available)
            })

        # If no course found in active path for this skill, look in general course catalog
        if not recommended_courses_for_skill:
            matching_courses = (
                db.query(Course)
                .join(CourseSkill, CourseSkill.course_id == Course.id)
                .filter(Course.is_active == True, func.lower(CourseSkill.skill_name) == s_norm)
                .limit(2)
                .all()
            )
            for mc in matching_courses:
                if mc.id in seen_course_ids:
                    continue
                seen_course_ids.add(mc.id)
                prov_slug = mc.provider.slug if mc.provider else "nptel"
                prov_name = mc.provider.name if mc.provider else "NPTEL"
                recommended_courses_for_skill.append({
                    "course_id": mc.id,
                    "learning_path_item_id": None,
                    "title": mc.title,
                    "provider": prov_slug,
                    "provider_name": prov_name,
                    "canonical_url": mc.url,
                    "progress_percent": 0.0,
                    "status": "not_started",
                    "stage": mc.level or "Intermediate",
                    "gap_closure_type": "Closes Gap",
                    "instructor": mc.instructor,
                    "institution": mc.institution,
                    "duration": f"{mc.duration} {mc.duration_unit or 'weeks'}" if mc.duration else "Self-paced",
                    "price": float(mc.price or 0.0),
                    "certificate_available": bool(mc.certificate_available)
                })

        unified_skills.append({
            "skill_id": sk_id,
            "esco_id": sk_id,
            "skill_name": s_name,
            "category": sk.get("category", "Core Development"),
            "current_score": round(curr_level, 1),
            "target_score": round(req_level, 1),
            "gap": round(gap_val, 1),
            "status": status_label,
            "canonical_status": canonical_status,
            "importance": sk.get("importance", "CORE"),
            "career_importance": "Core Skill" if sk.get("importance") == "CORE" else "Supporting Skill",
            "gap_explanation": sk.get("reason") or f"Target requirement for {active_career}. Current score: {curr_level:.0f}%, Target: {req_level:.0f}%.",
            "recommended_courses": recommended_courses_for_skill
        })

    # 5. Career Readiness Calculation
    total_skills_count = max(len(unified_skills), 1)
    readiness_score = round((verified_count / total_skills_count) * 100, 1)

    readiness_data = {
        "score": readiness_score,
        "verified_count": verified_count,
        "gap_count": max(0, total_skills_count - verified_count),
        "total_skills": total_skills_count,
        "status": "Ready" if readiness_score >= 80 else ("Developing" if readiness_score >= 40 else "Needs Attention"),
        "target_fit_score": min(100, max(45, round(readiness_score * 0.85 + 25)))
    }

    # 6. Serialize Full Learning Path
    serialized_learning_path = learning_path_service._serialize_learning_path(learning_path) if learning_path else None

    # 7. Dynamic Roadmap Milestones from Learning Path Stages
    roadmap_milestones = []
    if serialized_learning_path and serialized_learning_path.get("stages"):
        stages_data = serialized_learning_path["stages"]
        if isinstance(stages_data, dict):
            stage_items_list = list(stages_data.items())
        elif isinstance(stages_data, list):
            stage_items_list = [
                (
                    s.get("stage", f"Stage {idx+1}") if isinstance(s, dict) else str(s),
                    s.get("items", []) if isinstance(s, dict) else []
                )
                for idx, s in enumerate(stages_data)
            ]
        else:
            stage_items_list = []

        # Index unified skills by skill_id and lowercase name for quick lookup
        skills_by_id = {s["skill_id"]: s for s in unified_skills if s.get("skill_id")}
        skills_by_name = {s["skill_name"].lower().strip(): s for s in unified_skills if s.get("skill_name")}

        for s_idx, (stg_name, stg_items) in enumerate(stage_items_list):
            stg_total = max(len(stg_items), 1)
            completed_items = [i for i in stg_items if i.get("status") == "completed" or i.get("progress_percent") == 100]
            stg_progress = round(sum(float(i.get("progress_percent") or 0.0) for i in stg_items) / stg_total)
            
            is_done = len(completed_items) == len(stg_items) and len(stg_items) > 0
            is_active = not is_done and (stg_progress > 0 or s_idx == 0)
            m_status = "completed" if is_done else ("active" if is_active else "upcoming")
            
            # Map individual skill entities addressed in this milestone
            stage_skills = []
            for item in stg_items:
                sk_id = item.get("skill_id")
                sk_name = item.get("skill_name")
                
                # Match with canonical unified skill
                matched_sk = None
                if sk_id and sk_id in skills_by_id:
                    matched_sk = skills_by_id[sk_id]
                elif sk_name and sk_name.lower().strip() in skills_by_name:
                    matched_sk = skills_by_name[sk_name.lower().strip()]

                c_score = matched_sk.get("current_score", 0.0) if matched_sk else (item.get("progress_percent") or 0.0)
                t_score = matched_sk.get("target_score", 85.0) if matched_sk else 85.0
                g_val = matched_sk.get("gap", max(0.0, t_score - c_score)) if matched_sk else max(0.0, t_score - c_score)
                priority_label = (
                    "High Priority" if g_val > 40 else ("Medium Priority" if g_val > 0 else "Satisfied")
                )
                status_label = matched_sk.get("status", "Developing") if matched_sk else ("Verified" if g_val == 0 else "Developing")
                
                stage_skills.append({
                    "skill_id": sk_id or (matched_sk.get("skill_id") if matched_sk else f"sk_{sk_name.lower().replace(' ', '_')}"),
                    "skill_name": sk_name or (matched_sk.get("skill_name") if matched_sk else "Core Competency"),
                    "current_score": round(float(c_score), 1),
                    "target_score": round(float(t_score), 1),
                    "gap": round(float(g_val), 1),
                    "priority": priority_label,
                    "status": status_label,
                    "learning_path_item_id": item.get("id"),
                    "progress_percent": round(float(item.get("progress_percent") or 0.0), 1),
                    "item_status": item.get("status", "not_started"),
                    "course": item.get("course")
                })

            m_title = stg_name
            num_skills = len(stage_skills)
            m_desc = (
                f"Addresses {num_skills} priority skill {'competency' if num_skills == 1 else 'competencies'} required for {active_career}."
                if num_skills > 0
                else f"Structured curriculum for {stg_name} phase of {active_career}."
            )
            
            badge_text = (
                f"100% Completed • {len(completed_items)} Modules Verified"
                if is_done
                else (
                    f"Active Learning Track • {stg_progress}% Complete (Step {s_idx + 1} of {len(stage_items_list)})"
                    if is_active
                    else f"Upcoming Phase • {len(stg_items)} Recommended Courses"
                )
            )
            date_text = "Verified Milestone" if is_done else ("In Progress" if is_active else f"Est. {s_idx + 2} Weeks")

            roadmap_milestones.append({
                "id": s_idx + 1,
                "stage": stg_name,
                "title": m_title,
                "description": m_desc,
                "status": m_status,
                "progress": stg_progress,
                "badge_text": badge_text,
                "date_text": date_text,
                "items_count": len(stg_items),
                "skills": stage_skills
            })

    # 8. Filter Gap Skills (Missing Skills to Prioritize)
    # Required skills minus verified student skills = skills to improve
    gap_skills = [
        s for s in unified_skills
        if float(s.get("current_score", 0)) < float(s.get("target_score", 80))
        and s.get("canonical_status") != "verified"
        and s.get("status") != "Verified"
    ]
    # Sort missing skills by priority (gap magnitude and importance)
    gap_skills.sort(
        key=lambda x: (
            1 if x.get("importance") == "CORE" or x.get("importance") == "essential" else 0,
            abs(float(x.get("gap", 0)))
        ),
        reverse=True
    )

    # 9. Dynamic Step Progression & Curated Next Steps (Targeting Missing Skills)
    all_path_items = (serialized_learning_path.get("items") or []) if serialized_learning_path else []
    
    # Map courses directly addressing missing skills
    curated_next_steps = []
    missing_skill_names_set = {s["skill_name"].lower().strip() for s in gap_skills}

    # First prioritize uncompleted items covering actual missing skills
    priority_items = []
    secondary_items = []
    for itm in all_path_items:
        s_name = (itm.get("skill_name") or "").lower().strip()
        p_pct = float(itm.get("progress_percent") or 0.0)
        if p_pct < 100 and s_name in missing_skill_names_set:
            priority_items.append(itm)
        elif p_pct < 100:
            secondary_items.append(itm)

    candidate_items = priority_items + secondary_items
    if not candidate_items:
        candidate_items = all_path_items

    total_plan_steps = max(len(gap_skills) if gap_skills else len(candidate_items), 3)
    completed_steps_count = sum(1 for itm in all_path_items if float(itm.get("progress_percent") or 0.0) == 100)
    current_step_num = min(completed_steps_count + 1, total_plan_steps)

    step_progression = {
        "totalSteps": total_plan_steps,
        "completedSteps": completed_steps_count,
        "currentStep": current_step_num,
        "steps": []
    }

    for n_idx, itm in enumerate(candidate_items[:5]):
        c_obj = itm.get("course") or {}
        p_name = itm.get("provider_name") or c_obj.get("provider_name") or (itm.get("provider") or "").upper() or "NPTEL"
        progress_val = round(float(itm.get("progress_percent") or 0.0))
        c_status = itm.get("status") or "not_started"

        if progress_val == 100 or c_status == "completed":
            action_btn_text = "Completed"
        elif progress_val > 0 or c_status == "in_progress":
            action_btn_text = "Continue Learning"
        else:
            action_btn_text = "Enroll Free"

        s_step_badge = f"STEP 0{n_idx + 1}/0{total_plan_steps}"
        step_item_data = {
            "step_number": n_idx + 1,
            "step_badge": s_step_badge,
            "course_id": itm.get("course_id"),
            "learning_path_item_id": itm.get("id"),
            "title": itm.get("title") or c_obj.get("title") or "Recommended Course Module",
            "skill_name": itm.get("skill_name") or "Core Technical Skill",
            "why_crucial": itm.get("reason") or f"Directly targets closing skill gap in {itm.get('skill_name') or 'key competencies'} required for {active_career}.",
            "meta": f"{itm.get('stage') or 'Intermediate'} • {p_name}",
            "action": action_btn_text,
            "canonical_url": itm.get("canonical_url") or c_obj.get("url") or "",
            "progress_percent": progress_val,
            "status": c_status,
            "is_enrolled": progress_val > 0 or c_status in ("in_progress", "completed")
        }
        step_progression["steps"].append(step_item_data)
        if n_idx < 3:
            curated_next_steps.append(step_item_data)

    # 10. Practical Workflows (Skill Assignments & Code Sandboxes from Database)
    student_practice_attempts = {
        att.challenge_id: att
        for att in db.query(StudentPracticeAttempt).filter(StudentPracticeAttempt.student_id == student.id).all()
    }

    db_challenges = db.query(SkillPracticeChallenge).all()
    challenges_by_skill = {}
    for ch in db_challenges:
        challenges_by_skill.setdefault(ch.skill_name.lower().strip(), []).append(ch)

    skill_assignments = []
    # Build assignments for gap skills first, then remaining skills
    skills_for_assignments = gap_skills if gap_skills else unified_skills
    for a_idx, g_sk in enumerate(skills_for_assignments):
        sk_name = g_sk["skill_name"]
        norm_sk = sk_name.lower().strip()
        matched_ch_list = challenges_by_skill.get(norm_sk, [])
        ch_obj = matched_ch_list[0] if matched_ch_list else None

        ch_id = ch_obj.id if ch_obj else f"asgn_{norm_sk.replace(' ', '_').replace('.', '')}_{a_idx+1}"
        ch_title = ch_obj.title if ch_obj else f"Hands-On Implementation: {sk_name}"
        ch_desc = ch_obj.description if ch_obj else f"Build and test real-world project modules covering {sk_name} with automated test suites and benchmarks."
        ch_diff = ch_obj.difficulty if ch_obj else ("Foundation" if a_idx == 0 else "Intermediate")

        attempt = student_practice_attempts.get(ch_id)
        is_asgn_completed = bool(attempt and attempt.is_completed)
        asgn_status = "completed" if is_asgn_completed else ("in_progress" if attempt else "not_started")
        asgn_action = "Review Workflow" if is_asgn_completed else ("Continue Workflow" if attempt else "Start Workflow")

        # Instructions & Code Template
        instructions_text = f"### Workflow Instructions: {sk_name}\n\n1. Review the requirement specifications for {sk_name}.\n2. Write clean, modular, and error-handled implementation code.\n3. Verify against the unit test suite.\n4. Submit your solution for automated grading and skill evidence calculation."
        
        starter_code = f"// Workflow: {sk_name} Implementation\n// Complete the function below to satisfy test requirements\n\nfunction solve{sk_name.replace(' ', '').replace('.', '')}() {{\n  // TODO: Implement solution for {sk_name}\n  return true;\n}}\n\nmodule.exports = {{ solve{sk_name.replace(' ', '').replace('.', '')} }};"
        if "sql" in norm_sk:
            starter_code = f"-- SQL Workflow: {sk_name}\n-- Write query to retrieve required aggregated records\nSELECT user_id, COUNT(*) as activity_count\nFROM student_learning_progress\nGROUP BY user_id\nHAVING COUNT(*) > 2;\n"
        elif "python" in norm_sk or "docker" in norm_sk:
            starter_code = f"# Workflow: {sk_name}\ndef solve_{norm_sk.replace(' ', '_').replace('.', '')}():\n    # Implement verified {sk_name} logic\n    return True\n"

        test_cases = [
            {"id": "tc_1", "description": f"Verifies core {sk_name} initialization without uncaught errors", "expected": "PASS"},
            {"id": "tc_2", "description": f"Validates edge cases and memory boundaries for {sk_name}", "expected": "PASS"}
        ]

        skill_assignments.append({
            "id": ch_id,
            "num": f"0{a_idx + 1}",
            "type": f"WORKFLOW | {active_career.upper()}",
            "skill_id": g_sk["skill_id"],
            "skill_name": sk_name,
            "title": ch_title,
            "subtitle": ch_desc,
            "description": ch_desc,
            "difficulty": ch_diff,
            "instructions": instructions_text,
            "starter_code": starter_code,
            "test_cases": test_cases,
            "points_badge": "+50 XP Proof",
            "xp": 50,
            "status": asgn_status,
            "is_completed": is_asgn_completed,
            "action_label": asgn_action
        })

    # 11. Certified Benchmarks (Mock Tests & Skill Diagnostics from Database)
    # Query student's historical assessment attempts
    historical_attempts = (
        db.query(StudentAssessmentAttempt)
        .filter(StudentAssessmentAttempt.student_id == student.id)
        .order_by(StudentAssessmentAttempt.completed_at.desc())
        .all()
    )

    completed_attempts = [a for a in historical_attempts if a.score is not None]
    if completed_attempts:
        avg_benchmark_score = round(sum(a.score for a in completed_attempts) / len(completed_attempts))
        benchmark_str = f"Current Benchmark: {avg_benchmark_score}%"
        has_completed_any_test = True
    else:
        avg_benchmark_score = 0
        benchmark_str = "No benchmark yet"
        has_completed_any_test = False

    top_gap_skill_name = gap_skills[0]["skill_name"] if gap_skills else (unified_skills[0]["skill_name"] if unified_skills else "JavaScript")

    # Core Diagnostic Test (Foundation)
    core_diag_db = db.query(EscoAssessment).filter(
        (EscoAssessment.title == f"{active_career} Core Diagnostic") |
        (EscoAssessment.title == "Full Stack Developer Core Diagnostic") |
        (EscoAssessment.id == 9)
    ).first()
    if not core_diag_db:
        core_diag_db = db.query(EscoAssessment).filter(EscoAssessment.id == 9).first()
    core_diag_id = core_diag_db.id if core_diag_db else 9
    core_diag_title = core_diag_db.title if core_diag_db else f"{active_career} Core Diagnostic"
    core_diag_questions_count = db.query(EscoAssessmentQuestion).filter(EscoAssessmentQuestion.assessment_id == core_diag_id).count()
    if core_diag_questions_count < 15 or core_diag_questions_count > 25:
        core_diag_questions_count = max(15, min(25, core_diag_questions_count or 20))

    core_diag_attempt = next(
        (a for a in completed_attempts if a.test_title.lower() == core_diag_title.lower()),
        None
    )
    core_diag_score = core_diag_attempt.score if core_diag_attempt else None
    core_diag_status = f"Completed (Score: {core_diag_score}%)" if core_diag_score is not None else "Available"
    core_diag_action = "Retake Diagnostic" if core_diag_attempt else "Begin Test"

    # Intermediate Skill Assessment
    skill_assess_db = db.query(EscoAssessment).filter(func.lower(EscoAssessment.skill_name) == top_gap_skill_name.lower()).first()
    if not skill_assess_db:
        skill_assess_db = db.query(EscoAssessment).filter(EscoAssessment.id == 2).first()
    skill_assess_id = skill_assess_db.id if skill_assess_db else 2
    skill_assess_title = skill_assess_db.title if skill_assess_db else f"{top_gap_skill_name} Assessment"
    skill_assess_q_count = db.query(EscoAssessmentQuestion).filter(EscoAssessmentQuestion.assessment_id == skill_assess_id).count()
    if skill_assess_q_count < 15 or skill_assess_q_count > 25:
        skill_assess_q_count = max(15, min(25, skill_assess_q_count or 20))

    skill_assessment_attempt = next(
        (a for a in completed_attempts if a.test_title.lower() == skill_assess_title.lower() or (a.skill_name.lower() == top_gap_skill_name.lower() and "assessment" in a.test_title.lower())),
        None
    )
    skill_assess_score = skill_assessment_attempt.score if skill_assessment_attempt else None
    skill_assess_action = "Retake Test" if skill_assessment_attempt else "Begin Test"
    skill_assess_status = f"Completed (Score: {skill_assess_score}%)" if skill_assess_score is not None else "Next Up (Recommended)"

    # Advanced Readiness Mock (Prerequisites: Core Diagnostic >= 70% and at least 1 Skill Assessment >= 70%)
    adv_mock_db = db.query(EscoAssessment).filter(
        (EscoAssessment.title == f"{active_career} System Readiness Mock") |
        (EscoAssessment.title == "Full Stack Developer System Readiness Mock") |
        (EscoAssessment.skill_name == "System Readiness") |
        (EscoAssessment.id == 10)
    ).first()
    adv_mock_id = adv_mock_db.id if adv_mock_db else 10
    adv_mock_title = adv_mock_db.title if adv_mock_db else f"{active_career} System Readiness Mock"
    adv_mock_q_count = db.query(EscoAssessmentQuestion).filter(EscoAssessmentQuestion.assessment_id == adv_mock_id).count()
    if adv_mock_q_count < 15 or adv_mock_q_count > 25:
        adv_mock_q_count = max(15, min(25, adv_mock_q_count or 20))

    advanced_mock_attempt = next(
        (a for a in completed_attempts if a.test_title.lower() == adv_mock_title.lower()),
        None
    )
    adv_diag_passed = bool(core_diag_score and core_diag_score >= 70)
    adv_skill_passed = bool(len([a for a in completed_attempts if a.score and a.score >= 70]) >= 1)
    is_advanced_unlocked = adv_diag_passed and adv_skill_passed

    advanced_prerequisites = [
        {
            "assessment_id": core_diag_id,
            "title": f"{active_career} Core Diagnostic",
            "requiredScore": 70,
            "currentScore": core_diag_score or 0,
            "completed": core_diag_attempt is not None,
            "passed": adv_diag_passed
        },
        {
            "assessment_id": skill_assess_id,
            "title": f"{top_gap_skill_name} Assessment",
            "requiredScore": 70,
            "currentScore": skill_assess_score or 0,
            "completed": skill_assessment_attempt is not None,
            "passed": bool(skill_assess_score and skill_assess_score >= 70)
        }
    ]

    mock_tests = [
        {
            "id": core_diag_id,
            "type": "DIAGNOSTIC TEST",
            "title": f"{active_career} Core Diagnostic",
            "category": "Core Diagnostic",
            "skill_name": active_career,
            "meta": f"{core_diag_questions_count} Questions • 45 Mins • Foundation",
            "duration": "45 Mins",
            "duration_minutes": 45,
            "question_count": core_diag_questions_count,
            "questionCount": core_diag_questions_count,
            "difficulty": "Foundation",
            "status_badge": core_diag_status,
            "action": core_diag_action,
            "score": core_diag_score,
            "is_completed": core_diag_attempt is not None,
            "is_next": False,
            "is_locked": False,
            "is_unlocked": True,
            "prerequisites": []
        },
        {
            "id": skill_assess_id,
            "type": "FULL ARCHITECTURE ASSESSMENT",
            "title": f"{top_gap_skill_name} Assessment",
            "category": "Skill Assessment",
            "skill_name": top_gap_skill_name,
            "meta": f"{skill_assess_q_count} Questions • 35 Mins • Intermediate",
            "duration": "35 Mins",
            "duration_minutes": 35,
            "question_count": skill_assess_q_count,
            "questionCount": skill_assess_q_count,
            "difficulty": "Intermediate",
            "status_badge": skill_assess_status,
            "action": skill_assess_action,
            "score": skill_assess_score,
            "is_completed": skill_assessment_attempt is not None,
            "is_next": skill_assessment_attempt is None,
            "is_locked": False,
            "is_unlocked": True,
            "prerequisites": [
                {
                    "assessment_id": core_diag_id,
                    "title": f"{active_career} Core Diagnostic",
                    "requiredScore": 50,
                    "currentScore": core_diag_score or 0,
                    "completed": core_diag_attempt is not None,
                    "passed": bool(core_diag_score and core_diag_score >= 50)
                }
            ]
        },
        {
            "id": adv_mock_id,
            "type": "FOUNDATION TEST",
            "title": f"{active_career} System Readiness Mock",
            "category": "System Readiness",
            "skill_name": active_career,
            "meta": f"{adv_mock_q_count} Questions • 60 Mins • Advanced",
            "duration": "60 Mins",
            "duration_minutes": 60,
            "question_count": adv_mock_q_count,
            "questionCount": adv_mock_q_count,
            "difficulty": "Advanced",
            "status_badge": (
                f"Completed (Score: {advanced_mock_attempt.score}%)"
                if advanced_mock_attempt
                else ("Ready for Benchmark" if is_advanced_unlocked else "Locked (Prerequisites Incomplete)")
            ),
            "action": (
                "Retake Mock"
                if advanced_mock_attempt
                else ("Start Mock" if is_advanced_unlocked else "Unlock by Test")
            ),
            "score": advanced_mock_attempt.score if advanced_mock_attempt else None,
            "is_completed": advanced_mock_attempt is not None,
            "is_next": False,
            "is_locked": not is_advanced_unlocked,
            "is_unlocked": is_advanced_unlocked,
            "prerequisites": advanced_prerequisites
        }
    ]

    # 12. Real World Simulations (Capstone Projects from Database)
    student_project_submissions = (
        db.query(ProjectSubmission)
        .filter(ProjectSubmission.student_id == student.id)
        .all()
    )
    proj_submissions_by_id = {p.challenge_id: p for p in student_project_submissions}

    p1_id = f"proj_enterprise_{active_career_id}"
    p1_sub = proj_submissions_by_id.get(p1_id)
    p1_status = "completed" if (p1_sub and p1_sub.analysis_status == "ANALYZED") else ("in_progress" if p1_sub else "not_started")
    p1_btn = "Completed" if p1_status == "completed" else ("Continue Project" if p1_status == "in_progress" else "Start Project Track")

    p2_id = "proj_microservices_stream"
    p2_sub = proj_submissions_by_id.get(p2_id)
    p2_status = "completed" if (p2_sub and p2_sub.analysis_status == "ANALYZED") else ("in_progress" if p2_sub else "not_started")

    capstone_projects = [
        {
            "id": p1_id,
            "tags": [f"{active_career} Track", "2.5 Week Duration", "Enterprise Grade"],
            "title": f"{active_career} End-to-End Enterprise Architecture",
            "desc": f"Architect, build, and deploy an automated production system covering authentication, database schema design, and asynchronous workflows aligned to {active_career} industry standards.",
            "skills": [s["skill_name"] for s in unified_skills[:4]],
            "status": p1_status,
            "btn_label": p1_btn,
            "is_primary": True,
            "xp": 200,
            "milestones": [
                {
                    "milestone": "01",
                    "title": "System Architecture & Normalized Schema",
                    "status": "completed" if p1_status in ("in_progress", "completed") else "pending",
                    "deliverable": "Database schema migrations, entity-relationship diagrams, and API design blueprint."
                },
                {
                    "milestone": "02",
                    "title": "Core Services & Authentication Implementation",
                    "status": "completed" if p1_status == "completed" else ("active" if p1_status == "in_progress" else "pending"),
                    "deliverable": "JWT authentication middleware, CRUD REST API endpoints, and connection pooling."
                },
                {
                    "milestone": "03",
                    "title": "Automated Testing, Docker Containerization & Deployment",
                    "status": "completed" if p1_status == "completed" else "pending",
                    "deliverable": "Docker Compose setup, automated integration test suite, and CI/CD workflow configuration."
                }
            ],
            "specs": {
                "objective": f"Demonstrate production-readiness for {active_career} roles by building an end-to-end enterprise solution.",
                "architecture": "Layered Microservices / Modular Monolith with PostgreSQL persistence, Redis caching, and Docker Compose orchestration.",
                "requirements": [
                    "Implement stateless token authentication with refresh tokens",
                    "Design relational database schema with indexing and foreign keys",
                    "Write integration tests with >80% code coverage",
                    "Package application with multi-stage Docker build"
                ],
                "evaluation_criteria": [
                    "Code maintainability and modular structure (30%)",
                    "Test coverage and error resilience (25%)",
                    "Database query performance and indexing (25%)",
                    "Production containerization and CI/CD readiness (20%)"
                ]
            }
        },
        {
            "id": p2_id,
            "tags": ["Full-Stack Infrastructure", "3-Week Project", "Production Track"],
            "title": "Real-Time Scalable Microservices & Data Streaming Engine",
            "desc": "Engineer a high-concurrency microservice system with real-time websocket synchronization, caching, and automated end-to-end integration tests.",
            "skills": [s["skill_name"] for s in (unified_skills[4:8] if len(unified_skills) >= 8 else unified_skills)],
            "status": p2_status,
            "btn_label": "View Specs",
            "is_primary": False,
            "xp": 200,
            "milestones": [
                {
                    "milestone": "01",
                    "title": "Pub/Sub Messaging & Event Bus",
                    "status": "pending",
                    "deliverable": "Message broker event producers and consumers with Redis / Kafka."
                },
                {
                    "milestone": "02",
                    "title": "Real-Time WebSocket Gateway",
                    "status": "pending",
                    "deliverable": "Bi-directional socket connections with room subscription and presence tracking."
                }
            ],
            "specs": {
                "objective": "Build a high-throughput event streaming engine handling concurrent socket connections.",
                "architecture": "Event-Driven Microservices with Redis Pub/Sub and WebSocket gateways.",
                "requirements": [
                    "Handle concurrent WebSocket client broadcasts",
                    "Implement distributed locking and idempotency",
                    "Benchmark latency under high concurrency"
                ],
                "evaluation_criteria": [
                    "Throughput and socket reconnection handling (35%)",
                    "State synchronization consistency (35%)",
                    "Error recovery and backoff mechanisms (30%)"
                ]
            }
        }
    ]

    # 13. Dynamic Validated Credentials from Verified Evidence
    verified_skills_list = [s for s in unified_skills if s["canonical_status"] == "verified"]
    validated_credentials = []
    for v_sk in verified_skills_list[:6]:
        validated_credentials.append({
            "skill_id": v_sk["skill_id"],
            "title": v_sk["skill_name"],
            "badge": f"Score {v_sk['current_score']:.0f}% Evaluated",
            "date": "Verified On-File"
        })

    # 14. Dynamic Recent Learning Activity
    recent_activity = []
    for itm in all_path_items[:4]:
        p_val = round(itm.get("progress_percent") or 0.0)
        c_status = itm.get("status")
        recent_activity.append({
            "time": "Recent Progress" if p_val > 0 else "Enrolled Module",
            "title": f"{'Completed:' if c_status == 'completed' or p_val == 100 else ('Active Module:' if p_val > 0 else 'Enrolled:')} {itm.get('title')}",
            "sub": f"Addresses {itm.get('skill_name') or 'Core Competency'} • Progress: {p_val}%"
        })

    # 15. Dynamic AI Coach Prompt Suggestions
    suggested_coach_queries = [
        f"What are the essential technical requirements for {active_career}?",
        f"Explain best practices for mastering {gap_skills[0]['skill_name']}" if gap_skills else "How do I optimize full-stack application performance?",
        f"Give me an architectural breakdown of {gap_skills[1]['skill_name']}" if len(gap_skills) > 1 else "How do I structure scalable database queries?"
    ]

    # 16. Centralized Learning Progress Model
    courses_enrolled_count = len(all_path_items)
    courses_completed_count = sum(1 for itm in all_path_items if float(itm.get("progress_percent") or 0.0) == 100)
    assignments_started_count = len(student_practice_attempts)
    assignments_completed_count = sum(1 for att in student_practice_attempts.values() if att.is_completed)
    tests_attempted_count = len(completed_attempts)
    tests_passed_count = sum(1 for att in completed_attempts if att.status == "VERIFIED" or att.score >= 70)
    projects_started_count = len(student_project_submissions)
    projects_completed_count = sum(1 for p in student_project_submissions if p.analysis_status == "ANALYZED")

    # Calculated XP
    earned_xp = (
        (courses_completed_count * 50) +
        (assignments_completed_count * 50) +
        (tests_passed_count * 100) +
        (projects_completed_count * 200) +
        (verified_count * 25)
    )

    learning_progress_data = {
        "courses_enrolled": courses_enrolled_count,
        "courses_completed": courses_completed_count,
        "assignments_started": assignments_started_count,
        "assignments_completed": assignments_completed_count,
        "tests_attempted": tests_attempted_count,
        "tests_passed": tests_passed_count,
        "projects_started": projects_started_count,
        "projects_completed": projects_completed_count,
        "skills_improved": len(unified_skills) - len(gap_skills),
        "total_skills": len(unified_skills),
        "xp_earned": earned_xp,
        "learning_streak": 3,
        "current_step": current_step_num,
        "total_steps": total_plan_steps,
        "benchmark_percentage": avg_benchmark_score if has_completed_any_test else None,
        "benchmark_text": benchmark_str
    }

    # 17. Evidence Summary (Phase 9 Integration)
    evidence_stats = skill_evidence_service.get_student_evidence_summary(db=db, student_id=student.id) if hasattr(skill_evidence_service, "get_student_evidence_summary") else {
        "verified_skills_count": verified_count,
        "total_evidence_records": len(github_skills) + (1 if resume_parsed else 0)
    }

    return {
        "status": "success",
        "data": {
            "student_id": student.id,
            "student_email": student.email,
            "active_career": active_career_obj,
            "target_careers": target_careers_objs,
            "career_readiness": readiness_data,
            "skills": gap_skills if gaps_only else unified_skills,
            "all_required_skills": unified_skills,
            "skill_gaps": gap_skills,
            "learning_path": serialized_learning_path,
            "roadmap_milestones": roadmap_milestones,
            "step_progression": step_progression,
            "curated_next_steps": curated_next_steps,
            "skill_assignments": skill_assignments,
            "mock_tests": mock_tests,
            "capstone_projects": capstone_projects,
            "validated_credentials": validated_credentials,
            "recent_activity": recent_activity,
            "suggested_coach_queries": suggested_coach_queries,
            "learning_progress": learning_progress_data,
            "evidence_summary": evidence_stats
        }
    }

