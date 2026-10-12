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
    StudentSkillEvidence,
    StudentGithubConnection
)

from app.services import (
    esco_service,
    course_recommendation_service,
    learning_path_service,
    skill_evidence_service
)

logger = logging.getLogger("career_intelligence_service")

# Provider-specific authoritative evidence rules
PROVIDER_EVIDENCE_RULES: Dict[str, List[str]] = {
    "nptel": ["certificate", "assessment"],
    "freecodecamp": ["certificate", "assessment"],
    "swayam": ["certificate", "assessment"],
    "youtube": ["assessment"],
}

def get_provider_evidence_requirements(prov_slug: Optional[str], cert_available: bool = False) -> List[str]:
    """Authoritative provider evidence requirements resolver."""
    p = (prov_slug or "").lower().strip()
    if p in PROVIDER_EVIDENCE_RULES:
        return list(PROVIDER_EVIDENCE_RULES[p])
    if "nptel" in p or "swayam" in p:
        return ["certificate", "assessment"]
    if "freecodecamp" in p or "free code camp" in p or "fcc" in p:
        return ["certificate", "assessment"]
    if "youtube" in p:
        return ["assessment"]
    if cert_available:
        return ["certificate", "assessment"]
    return ["assessment"]


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

    # 3. Retrieve or Generate Active Learning Path strictly scoped to active_career
    learning_path = (
        db.query(LearningPath)
        .options(
            joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.provider),
            joinedload(LearningPath.items).joinedload(LearningPathItem.course).joinedload(Course.skills)
        )
        .filter(
            LearningPath.student_id == student.id,
            (LearningPath.target_careers.ilike(f"%{active_career}%") | LearningPath.name.ilike(f"%{active_career}%"))
        )
        .order_by(LearningPath.created_at.desc())
        .first()
    )

    # If no career-specific path exists, generate one automatically for this exact career
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

    # 4. Build Canonical Skill Intelligence Matrix with 3-Way Component Tracking (Course, Test, Assignment) + GitHub Evidence
    all_required_skills = gap_analysis.get("all_skills", [])
    if not all_required_skills:
        all_required_skills = gap_analysis.get("skill_gaps", [])

    # Fetch all authoritative student artifacts from PostgreSQL for fast evaluation
    student_evidence_records = db.query(StudentSkillEvidence).filter(StudentSkillEvidence.student_id == student.id).all()
    student_assessment_attempts = db.query(StudentAssessmentAttempt).filter(
        StudentAssessmentAttempt.student_id == student.id,
        StudentAssessmentAttempt.score >= 70
    ).all()
    student_project_submissions = db.query(ProjectSubmission).filter(
        ProjectSubmission.student_id == student.id,
        ProjectSubmission.analysis_status == "ANALYZED"
    ).all()
    student_practice_attempts = db.query(StudentPracticeAttempt).filter(
        StudentPracticeAttempt.student_id == student.id,
        StudentPracticeAttempt.is_completed == True
    ).all()
    student_learning_progresses = db.query(StudentLearningProgress).filter(
        StudentLearningProgress.student_id == student.id,
        StudentLearningProgress.status == "COMPLETED"
    ).all()
    gh_connection = db.query(StudentGithubConnection).filter(
        func.lower(StudentGithubConnection.student_email) == clean_email
    ).first()

    gh_parsed_skills: Dict[str, float] = {}
    if gh_connection and gh_connection.skills_json:
        try:
            gh_raw = json.loads(gh_connection.skills_json)
            if isinstance(gh_raw, dict):
                gh_parsed_skills = {k.lower().strip(): float(v) for k, v in gh_raw.items() if v}
            elif isinstance(gh_raw, list):
                for item in gh_raw:
                    name = (item.get("name") or item.get("skill") or "").lower().strip()
                    if name:
                        gh_parsed_skills[name] = float(item.get("score") or item.get("percentage") or 70.0)
        except Exception:
            gh_parsed_skills = {}

    def _matches_skill(target_s: str, cand_s: str) -> bool:
        if not target_s or not cand_s:
            return False
        t = target_s.lower().strip()
        c = cand_s.lower().strip()
        if t == c:
            return True
        import re
        t_clean = re.sub(r'[^a-z0-9]', '', t)
        c_clean = re.sub(r'[^a-z0-9]', '', c)
        if t_clean and c_clean and t_clean == c_clean:
            return True
        if (len(t) >= 3 and len(c) >= 3) and (t in c or c in t):
            return True
        # Check token sets
        t_tokens = set(re.findall(r'[a-z0-9+#.]+', t))
        c_tokens = set(re.findall(r'[a-z0-9+#.]+', c))
        return bool(t_tokens & c_tokens)


    unified_skills = []
    verified_count = 0

    for sk in all_required_skills:
        s_name = sk.get("skill_name") or sk.get("skill") or ""
        if not s_name:
            continue

        s_norm = s_name.lower().strip()
        sk_id = sk.get("skill_id") or get_canonical_skill_id(db, s_name) or abs(hash(s_norm)) % 100000

        # --- 1. Course Consumption / Learning Activity (Tracked separately, NOT skill verification) ---
        course_completed = False
        course_activity_percent = 0.0
        for ev in student_evidence_records:
            if ev.source_type in ("course_completion", "learning_progress") and _matches_skill(s_name, ev.skill_name):
                course_activity_percent = max(course_activity_percent, float((ev.evidence_score or 0) * 100.0))
                if (ev.evidence_score or 0) >= 0.35 or ev.source_type == "course_completion":
                    course_completed = True

        if learning_path and learning_path.items:
            for l_item in learning_path.items:
                if _matches_skill(s_name, l_item.skill_name or ""):
                    p_pct = float(l_item.progress_percent or 0.0)
                    course_activity_percent = max(course_activity_percent, p_pct)
                    if l_item.status == "completed" or p_pct >= 100.0:
                        course_completed = True
                elif l_item.course and l_item.course.skills:
                    if any(_matches_skill(s_name, cs.skill_name) for cs in l_item.course.skills):
                        p_pct = float(l_item.progress_percent or 0.0)
                        course_activity_percent = max(course_activity_percent, p_pct)
                        if l_item.status == "completed" or p_pct >= 100.0:
                            course_completed = True

        if not course_completed and student_learning_progresses:
            for lp in student_learning_progresses:
                if _matches_skill(s_name, lp.skill_name):
                    course_completed = True
                    course_activity_percent = max(course_activity_percent, 100.0)
                    break

        # --- 2. Certificate Evidence (Cryptographic / Uploaded) ---
        certificate_verified = False
        for ev in student_evidence_records:
            if ev.source_type in ("certificate_verification", "certificate") and _matches_skill(s_name, ev.skill_name):
                if (ev.evidence_score or 0) >= 0.50:
                    certificate_verified = True
                    break

        # --- 3. Test / Assessment Evidence (Passed diagnostic/assessment threshold >= 70%) ---
        test_passed = False
        test_failed = False
        for ev in student_evidence_records:
            if ev.source_type in ("verified_assessment", "assessment", "test_pass", "test") and _matches_skill(s_name, ev.skill_name):
                if (ev.evidence_score or 0) >= 0.70:
                    test_passed = True
                    break

        if not test_passed and student_assessment_attempts:
            for att in student_assessment_attempts:
                if (hasattr(att, 'skill_name') and att.skill_name and _matches_skill(s_name, att.skill_name)) or \
                   (hasattr(att, 'test_title') and att.test_title and _matches_skill(s_name, att.test_title)):
                    if (att.score or 0) >= 70:
                        test_passed = True
                        break
                    else:
                        test_failed = True

        # --- 4. Assignment / Practical Project Evidence ---
        assignment_completed = False
        for ev in student_evidence_records:
            if ev.source_type in ("verified_project", "project_submission", "assignment_completion") and _matches_skill(s_name, ev.skill_name):
                if (ev.evidence_score or 0) >= 0.50:
                    assignment_completed = True
                    break

        if not assignment_completed and student_project_submissions:
            for p_sub in student_project_submissions:
                if _matches_skill(s_name, p_sub.skill_name or ""):
                    assignment_completed = True
                    break
                if p_sub.analysis_result:
                    try:
                        res_json = json.loads(p_sub.analysis_result)
                        v_skills = res_json.get("verified_skills", []) or []
                        if any(_matches_skill(s_name, vs if isinstance(vs, str) else vs.get("name", "")) for vs in v_skills):
                            assignment_completed = True
                            break
                    except Exception:
                        pass

        if not assignment_completed and student_practice_attempts:
            for pr in student_practice_attempts:
                if _matches_skill(s_name, pr.skill_name or ""):
                    assignment_completed = True
                    break

        # --- 5. GitHub Evidence ---
        github_evidence = False
        for ev in student_evidence_records:
            if ev.source_type in ("github", "github_analyzer") and _matches_skill(s_name, ev.skill_name):
                github_evidence = True
                break

        if not github_evidence and gh_parsed_skills:
            for gh_sk, gh_sc in gh_parsed_skills.items():
                if _matches_skill(s_name, gh_sk) and gh_sc > 0:
                    github_evidence = True
                    break

        # --- 6. Associated Course / Recommended Courses ---
        linked_path_items = path_items_by_skill_name.get(s_norm, [])
        recommended_courses_for_skill = []
        seen_course_ids = set()

        primary_prov_slug = "youtube"
        primary_prov_name = "YouTube"
        primary_cert_avail = False

        for p_item in linked_path_items:
            c = p_item.course
            if not c or c.id in seen_course_ids:
                continue
            seen_course_ids.add(c.id)

            prov_slug = c.provider.slug if c.provider else "nptel"
            prov_name = c.provider.name if c.provider else "NPTEL"
            if len(recommended_courses_for_skill) == 0:
                primary_prov_slug = prov_slug
                primary_prov_name = prov_name
                primary_cert_avail = bool(c.certificate_available)

            recommended_courses_for_skill.append({
                "course_id": c.id,
                "learning_path_item_id": p_item.id,
                "title": c.title,
                "provider": prov_slug,
                "provider_name": prov_name,
                "canonical_url": c.url,
                "progress_percent": round(p_item.progress_percent or 0.0, 1),
                "status": p_item.status or "not_started",
                "stage": p_item.stage,
                "gap_closure_type": "Closes Gap" if p_item.skill_name and p_item.skill_name.lower().strip() == s_norm else "Supports Skill",
                "instructor": c.instructor,
                "institution": c.institution,
                "duration": f"{c.duration} {c.duration_unit or 'weeks'}" if c.duration else "Self-paced",
                "price": float(c.price or 0.0),
                "certificate_available": bool(c.certificate_available)
            })

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
                if len(recommended_courses_for_skill) == 0:
                    primary_prov_slug = prov_slug
                    primary_prov_name = prov_name
                    primary_cert_avail = bool(mc.certificate_available)

                recommended_courses_for_skill.append({
                    "course_id": mc.id,
                    "learning_path_item_id": None,
                    "title": mc.title,
                    "provider": prov_slug,
                    "provider_name": prov_name,
                    "canonical_url": mc.url,
                    "progress_percent": round(course_activity_percent, 1),
                    "status": "completed" if course_completed else "not_started",
                    "stage": mc.level or "Intermediate",
                    "gap_closure_type": "Closes Gap",
                    "instructor": mc.instructor,
                    "institution": mc.institution,
                    "duration": f"{mc.duration} {mc.duration_unit or 'weeks'}" if mc.duration else "Self-paced",
                    "price": float(mc.price or 0.0),
                    "certificate_available": bool(mc.certificate_available)
                })

        # --- 7. Authoritative Provider-Specific Evidence Verification ---
        req_types = get_provider_evidence_requirements(primary_prov_slug, primary_cert_avail)
        evidence_requirements_list = []
        all_reqs_satisfied = True

        if "certificate" in req_types:
            is_sat = bool(certificate_verified)
            evidence_requirements_list.append({
                "type": "certificate",
                "label": "Certificate",
                "status": "verified" if is_sat else "missing",
                "status_label": "Certificate Verified" if is_sat else "Certificate Required",
                "is_satisfied": is_sat,
                "is_required": True
            })
            if not is_sat:
                all_reqs_satisfied = False

        if "assessment" in req_types:
            is_sat = bool(test_passed)
            evidence_requirements_list.append({
                "type": "assessment",
                "label": "Skill Assessment",
                "status": "passed" if test_passed else ("failed" if test_failed else "not_passed"),
                "status_label": "Assessment Passed" if test_passed else ("Assessment Failed" if test_failed else "Assessment Required"),
                "is_satisfied": is_sat,
                "is_required": True
            })
            if not is_sat:
                all_reqs_satisfied = False

        # --- Genuine Evidence Score Extraction (Assessment, Project, GitHub, Certificate) ---
        max_genuine_evidence_score = 0.0
        for ev in student_evidence_records:
            if ev.source_type in ("verified_assessment", "assessment", "test_pass", "test", "verified_project", "project_submission", "certificate_verification", "certificate", "github") and _matches_skill(s_name, ev.skill_name):
                raw_s = float(ev.evidence_score or 0.0)
                score_pct = raw_s * 100.0 if raw_s <= 1.0 else raw_s
                max_genuine_evidence_score = max(max_genuine_evidence_score, score_pct)

        if student_assessment_attempts:
            for att in student_assessment_attempts:
                if (hasattr(att, 'skill_name') and att.skill_name and _matches_skill(s_name, att.skill_name)) or \
                   (hasattr(att, 'test_title') and att.test_title and _matches_skill(s_name, att.test_title)):
                    max_genuine_evidence_score = max(max_genuine_evidence_score, float(att.score or 0.0))

        if gh_parsed_skills:
            for gh_sk, gh_sc in gh_parsed_skills.items():
                if _matches_skill(s_name, gh_sk):
                    max_genuine_evidence_score = max(max_genuine_evidence_score, float(gh_sc))

        # --- Authoritative Canonical Skill Score from Skills System ---
        canonical_curr_score = max(
            float(sk.get("current_level") if sk.get("current_level") is not None else (sk.get("current_score") or 0.0)),
            max_genuine_evidence_score
        )
        req_level = float(sk.get("required_level") or sk.get("target_level") or 80.0)

        # Skill is verified when provider evidence requirements are satisfied OR student has direct project/github/assessment evidence
        has_direct_evidence = bool(sk.get("is_verified") or sk.get("status") in ("VERIFIED", "verified") or assignment_completed or github_evidence or (test_passed and ("certificate" not in req_types)))
        is_verified = bool(all_reqs_satisfied or has_direct_evidence)
        
        # Course progress must NOT automatically verify or artificially inflate skill score
        curr_level = canonical_curr_score
        if is_verified:
            if curr_level < req_level and not has_direct_evidence:
                curr_level = req_level
            status_label = "VERIFIED"
            canonical_status = "verified"
            verified_count += 1
            gap_val = round(max(0.0, req_level - curr_level), 1)
        else:
            # If not fully verified by all provider criteria, clamp only if no genuine assessment/project/github evidence exists
            if curr_level >= req_level and not (test_passed or github_evidence or assignment_completed):
                curr_level = max(0.0, req_level - 20.0)
            gap_val = round(max(0.0, req_level - curr_level), 1)

            if "certificate" in req_types and not certificate_verified and test_passed:
                status_label = "CERTIFICATE REQUIRED"
                canonical_status = "certificate_required"
            elif not test_passed:
                if test_failed:
                    status_label = "FAILED ASSESSMENT"
                    canonical_status = "failed_assessment"
                else:
                    status_label = "ASSESSMENT REQUIRED"
                    canonical_status = "assessment_required"
            else:
                status_label = "EVIDENCE REQUIRED"
                canonical_status = "evidence_required"

        # Evidence component checklist for UI
        completed_components_count = (1 if certificate_verified else 0) + (1 if test_passed else 0) + (1 if assignment_completed else 0)
        progress_percent = round((completed_components_count / 3.0) * 100.0, 1)

        unified_skills.append({
            "skill_id": sk_id,
            "esco_id": sk_id,
            "skill_name": s_name,
            "category": sk.get("category", "Core Development"),
            "current_score": round(curr_level, 1),
            "target_score": round(req_level, 1),
            "gap": gap_val,
            "status": status_label,
            "canonical_status": canonical_status,
            "importance": sk.get("importance", "CORE"),
            "career_importance": "Core Skill" if sk.get("importance") == "CORE" else "Supporting Skill",
            "gap_explanation": sk.get("reason") or f"Target requirement for {active_career}. Current score: {curr_level:.0f}%, Target: {req_level:.0f}%.",
            "recommended_courses": recommended_courses_for_skill,
            
            # Explicit evidence tracking
            "provider": primary_prov_slug,
            "provider_name": primary_prov_name,
            "evidence_requirements": evidence_requirements_list,
            "certificate_verified": certificate_verified,
            "test_passed": test_passed,
            "test_failed": test_failed,
            "course_completed": course_completed,
            "course_activity_percent": round(course_activity_percent, 1),
            "assignment_completed": assignment_completed,
            "github_evidence": github_evidence,
            "is_verified": is_verified,
            "progress_percent": progress_percent,
            "components": {
                "course": {
                    "completed": course_completed,
                    "label": "Completed" if course_completed else "In Progress",
                    "icon": "✅" if course_completed else "○"
                },
                "certificate": {
                    "completed": certificate_verified,
                    "label": "Verified" if certificate_verified else "Missing",
                    "icon": "✅" if certificate_verified else "○"
                },
                "test": {
                    "completed": test_passed,
                    "label": "Passed" if test_passed else ("Failed" if test_failed else "Required"),
                    "icon": "✅" if test_passed else ("❌" if test_failed else "○")
                },
                "assignment": {
                    "completed": assignment_completed,
                    "label": "Completed" if assignment_completed else "Pending",
                    "icon": "✅" if assignment_completed else "○"
                },
                "github": {
                    "completed": github_evidence,
                    "label": "Evidence Found" if github_evidence else "No Evidence",
                    "icon": "✅" if github_evidence else "○"
                }
            }
        })

    # 5. Career Readiness Calculation (Authoritative Canonical: from Skills gap engine)
    total_skills_count = max(len(unified_skills), 1)
    canonical_match_score = (
        gap_analysis.get("career_match", {}).get("score")
        if isinstance(gap_analysis.get("career_match"), dict)
        else gap_analysis.get("career_match_score")
    )
    if canonical_match_score is None and isinstance(gap_analysis.get("career_readiness"), dict):
        canonical_match_score = gap_analysis.get("career_readiness", {}).get("score")
    
    if canonical_match_score is not None:
        readiness_score = float(canonical_match_score)
    else:
        tot_req = sum(float(sk.get("target_score", 80.0)) for sk in unified_skills) or 1.0
        tot_ach = sum(min(float(sk.get("current_score", 0.0)), float(sk.get("target_score", 80.0))) for sk in unified_skills)
        readiness_score = round((tot_ach / tot_req) * 100.0, 1)

    readiness_data = {
        "score": readiness_score,
        "verified_count": verified_count,
        "gap_count": max(0, total_skills_count - verified_count),
        "total_skills": total_skills_count,
        "status": "Ready" if readiness_score >= 80 else ("Developing" if readiness_score >= 40 else "Needs Attention"),
        "target_fit_score": readiness_score
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

                c_score = matched_sk.get("current_score", 0.0) if matched_sk else 0.0
                t_score = matched_sk.get("target_score", 85.0) if matched_sk else 85.0
                g_val = matched_sk.get("gap", max(0.0, t_score - c_score)) if matched_sk else max(0.0, t_score - c_score)
                priority_label = (
                    "High Priority" if g_val > 40 else ("Medium Priority" if g_val > 0 else "Satisfied")
                )
                status_label = matched_sk.get("status", "ASSESSMENT REQUIRED") if matched_sk else "ASSESSMENT REQUIRED"
                canonical_st = matched_sk.get("canonical_status", "assessment_required") if matched_sk else "assessment_required"
                is_sk_verified = matched_sk.get("is_verified", False) if matched_sk else False
                ev_reqs = matched_sk.get("evidence_requirements", []) if matched_sk else []

                stage_skills.append({
                    "skill_id": sk_id or (matched_sk.get("skill_id") if matched_sk else f"sk_{sk_name.lower().replace(' ', '_')}"),
                    "skill_name": sk_name or (matched_sk.get("skill_name") if matched_sk else "Core Competency"),
                    "current_score": round(float(c_score), 1),
                    "target_score": round(float(t_score), 1),
                    "gap": round(float(g_val), 1),
                    "priority": priority_label,
                    "status": status_label,
                    "canonical_status": canonical_st,
                    "is_verified": is_sk_verified,
                    "evidence_requirements": ev_reqs,
                    "certificate_verified": matched_sk.get("certificate_verified", False) if matched_sk else False,
                    "test_passed": matched_sk.get("test_passed", False) if matched_sk else False,
                    "test_failed": matched_sk.get("test_failed", False) if matched_sk else False,
                    "learning_path_item_id": item.get("id"),
                    "course_progress_percent": round(float(item.get("progress_percent") or 0.0), 1),
                    "item_status": item.get("status", "not_started"),
                    "course": item.get("course")
                })

            # Milestone progress calculated from verified competencies
            verified_stage_skills = [sk for sk in stage_skills if sk.get("is_verified")]
            stg_competency_progress = round((len(verified_stage_skills) / max(len(stage_skills), 1)) * 100.0)
            
            is_done = (len(verified_stage_skills) == len(stage_skills)) and len(stage_skills) > 0
            is_active = not is_done and (stg_competency_progress > 0 or s_idx == 0)
            m_status = "completed" if is_done else ("active" if is_active else "upcoming")

            m_title = stg_name
            num_skills = len(stage_skills)
            m_desc = (
                f"Addresses {num_skills} priority skill {'competency' if num_skills == 1 else 'competencies'} required for {active_career}."
                if num_skills > 0
                else f"Structured curriculum for {stg_name} phase of {active_career}."
            )
            
            badge_text = (
                f"Milestone Completed • {len(verified_stage_skills)}/{len(stage_skills)} Competencies Verified"
                if is_done
                else (
                    f"Active Competency Track • {stg_competency_progress}% Verified ({len(verified_stage_skills)}/{len(stage_skills)} Skills)"
                    if is_active
                    else f"Upcoming Phase • {len(stage_skills)} Target Competencies"
                )
            )
            date_text = "Verified Milestone" if is_done else ("In Progress" if is_active else f"Est. {s_idx + 2} Weeks")

            roadmap_milestones.append({
                "id": s_idx + 1,
                "stage": stg_name,
                "title": m_title,
                "description": m_desc,
                "status": m_status,
                "progress": stg_competency_progress,
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

    # Core Diagnostic Test (Foundation) - strictly scoped to active_career or its primary skill
    core_diag_db = db.query(EscoAssessment).filter(
        EscoAssessment.title.ilike(f"%{active_career}%Core Diagnostic%")
    ).first()
    if not core_diag_db:
        core_diag_db = db.query(EscoAssessment).filter(
            EscoAssessment.skill_name.ilike(f"%{active_career}%")
        ).first()
    if not core_diag_db and unified_skills:
        primary_skill = unified_skills[0]["skill_name"]
        core_diag_db = db.query(EscoAssessment).filter(
            func.lower(EscoAssessment.skill_name) == primary_skill.lower()
        ).first()
    if not core_diag_db:
        core_diag_db = db.query(EscoAssessment).filter(EscoAssessment.id == 9).first()

    core_diag_id = core_diag_db.id if core_diag_db else 9
    core_diag_title = core_diag_db.title if core_diag_db else f"{active_career} Core Diagnostic"
    core_diag_questions_count = db.query(EscoAssessmentQuestion).filter(EscoAssessmentQuestion.assessment_id == core_diag_id).count()
    if core_diag_questions_count < 15 or core_diag_questions_count > 25:
        core_diag_questions_count = max(15, min(25, core_diag_questions_count or 20))

    core_diag_attempt = next(
        (a for a in completed_attempts if a.test_title.lower() == core_diag_title.lower() or (a.skill_name.lower() == active_career.lower() and "diagnostic" in a.test_title.lower())),
        None
    )
    core_diag_score = core_diag_attempt.score if core_diag_attempt else None
    core_diag_status = f"Completed (Score: {core_diag_score}%)" if core_diag_score is not None else "Available"
    core_diag_action = "Retake Diagnostic" if core_diag_attempt else "Begin Test"

    # Intermediate Skill Assessment - dynamically mapped to highest gap skill
    skill_assess_db = db.query(EscoAssessment).filter(
        func.lower(EscoAssessment.skill_name) == top_gap_skill_name.lower()
    ).first()
    if not skill_assess_db:
        skill_assess_db = db.query(EscoAssessment).filter(
            EscoAssessment.title.ilike(f"%{top_gap_skill_name}%")
        ).first()
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
        EscoAssessment.title.ilike(f"%{active_career}%Readiness Mock%")
    ).first()
    if not adv_mock_db:
        adv_mock_db = db.query(EscoAssessment).filter(
            EscoAssessment.title.ilike(f"%{active_career}%Mock%")
        ).first()
    if not adv_mock_db:
        adv_mock_db = db.query(EscoAssessment).filter(EscoAssessment.id == 10).first()

    adv_mock_id = adv_mock_db.id if adv_mock_db else 10
    adv_mock_title = adv_mock_db.title if adv_mock_db else f"{active_career} System Readiness Mock"
    adv_mock_q_count = db.query(EscoAssessmentQuestion).filter(EscoAssessmentQuestion.assessment_id == adv_mock_id).count()
    if adv_mock_q_count < 15 or adv_mock_q_count > 25:
        adv_mock_q_count = max(15, min(25, adv_mock_q_count or 20))

    advanced_mock_attempt = next(
        (a for a in completed_attempts if a.test_title.lower() == adv_mock_title.lower() or (a.skill_name.lower() == active_career.lower() and "readiness" in a.test_title.lower())),
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

    is_mobile = "mobile" in active_career.lower() or "mobile" in active_career_id.lower()
    
    if is_mobile:
        p2_id = "proj_mobile_offline_sync"
        p2_sub = proj_submissions_by_id.get(p2_id)
        p2_status = "completed" if (p2_sub and p2_sub.analysis_status == "ANALYZED") else ("in_progress" if p2_sub else "not_started")

        capstone_projects = [
            {
                "id": p1_id,
                "tags": [f"{active_career} Track", "2.5 Week Duration", "Enterprise Grade"],
                "title": f"{active_career} End-to-End Enterprise Architecture",
                "desc": f"Architect, build, and deploy an automated production cross-platform mobile application covering React Native, navigation, offline state management, and RESTful API integration aligned to {active_career} industry standards.",
                "skills": [s["skill_name"] for s in unified_skills[:4]],
                "status": p1_status,
                "btn_label": p1_btn,
                "is_primary": True,
                "xp": 200,
                "milestones": [
                    {
                        "milestone": "01",
                        "title": "Mobile Navigation & UI Component System",
                        "status": "completed" if p1_status in ("in_progress", "completed") else "pending",
                        "deliverable": "Design atomic UI components, tab & stack navigation hierarchy, and theme tokens."
                    },
                    {
                        "milestone": "02",
                        "title": "State Management & RESTful API Integration",
                        "status": "completed" if p1_status == "completed" else ("active" if p1_status == "in_progress" else "pending"),
                        "deliverable": "Implement persistent client state store, async token auth, and cached API requests."
                    },
                    {
                        "milestone": "03",
                        "title": "Offline Persistence & App Store Build Packaging",
                        "status": "completed" if p1_status == "completed" else "pending",
                        "deliverable": "Configure SQLite / AsyncStorage persistence, automated mobile unit tests, and production APK / IPA bundle build."
                    }
                ],
                "specs": {
                    "objective": f"Demonstrate production-readiness for {active_career} roles by building an end-to-end mobile solution.",
                    "architecture": "Cross-Platform Mobile Architecture with React Navigation, React Native Async/SQLite persistence, and RESTful API gateway.",
                    "requirements": [
                        "Implement secure biometrics or token authentication",
                        "Design fluid gesture-driven UI with responsive layouts",
                        "Implement offline-first caching and sync queue",
                        "Bundle release build with Hermes optimization"
                    ],
                    "evaluation_criteria": [
                        "Code maintainability and component modularity (30%)",
                        "Test coverage and offline error resilience (25%)",
                        "Smooth 60fps UI rendering and memory efficiency (25%)",
                        "Mobile production bundle packaging (20%)"
                    ]
                }
            },
            {
                "id": p2_id,
                "tags": ["Mobile Infrastructure", "3-Week Project", "Production Track"],
                "title": "Mobile Offline-First Architecture & Bi-Directional Cloud Sync",
                "desc": "Engineer an offline-first mobile app with local SQLite persistence, background sync workers, push notifications, and resilient network state handling.",
                "skills": [s["skill_name"] for s in (unified_skills[2:6] if len(unified_skills) >= 6 else unified_skills)],
                "status": p2_status,
                "btn_label": "View Specs",
                "is_primary": False,
                "xp": 200,
                "milestones": [
                    {
                        "milestone": "01",
                        "title": "Local Storage & Change Tracking Engine",
                        "status": "pending",
                        "deliverable": "Local SQLite database tables with mutation queue and change log tracking."
                    },
                    {
                        "milestone": "02",
                        "title": "Background Worker & Cloud Sync Gateway",
                        "status": "pending",
                        "deliverable": "Bi-directional reconciliation service with conflict resolution strategies."
                    }
                ],
                "specs": {
                    "objective": "Build a resilient offline-first mobile synchronization engine.",
                    "architecture": "Offline-First Mobile Architecture with SQLite local database and REST sync worker.",
                    "requirements": [
                        "Queue mutations during offline network states",
                        "Resolve conflicting edits using Last-Write-Wins and CRDT logic",
                        "Send background sync notifications upon reconnection"
                    ],
                    "evaluation_criteria": [
                        "Offline data consistency and recovery (35%)",
                        "Background battery and network efficiency (35%)",
                        "Error recovery and edge case handling (30%)"
                    ]
                }
            }
        ]
    else:
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

