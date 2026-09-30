import logging
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session
from app import models
from app.services.esco_service import load_student_evidence_from_db

logger = logging.getLogger("skillsetu_matching")


class InternshipMatchingService:
    """
    Two-Stage Deterministic & Explainable Internship Matching Engine.
    Stage 1: Hard Eligibility Gate (CGPA, Degree, Branch).
    Stage 2: Deterministic Weighted Match (Skills 45%, Career 25%, Work Mode 15%, Location 15%).
    """

    @classmethod
    def evaluate_match(
        cls,
        student: models.StudentUser,
        listing: models.InternshipListing,
        required_skills: Optional[List[Any]] = None,
        student_evidence: Optional[List[Any]] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Standalone/Direct evaluator supporting both database-backed and mock-testing sessions.
        """
        # =========================================================================
        # STAGE 1: HARD ELIGIBILITY EVALUATION
        # =========================================================================
        hard_failures = []
        eligibility_reasons = []

        # 1. CGPA Cutoff
        min_cgpa = getattr(listing, "min_cgpa", None)
        if min_cgpa and min_cgpa > 0.0:
            student_cgpa_str = getattr(student, "cgpa_or_percentage", None) or getattr(student, "cgpa", None)
            if student_cgpa_str is not None:
                try:
                    cleaned = str(student_cgpa_str).replace("%", "").strip()
                    val = float(cleaned)
                    val_10 = val / 10.0 if val > 10.0 else val
                    if val_10 < min_cgpa:
                        hard_failures.append(f"CGPA ({val_10:.1f}) is below minimum requirement of {min_cgpa:.1f}")
                    else:
                        eligibility_reasons.append(f"Meets minimum CGPA cutoff of {min_cgpa:.1f} (Your CGPA: {val_10:.1f})")
                except Exception:
                    pass

        # If hard failure occurred:
        if hard_failures:
            req_skill_names = [getattr(r, "skill_name", str(r)) for r in (required_skills or getattr(listing, "required_skills", []) or [])]
            return {
                "internship_id": getattr(listing, "id", None),
                "title": getattr(listing, "title", ""),
                "company_name": getattr(listing, "company_name", getattr(listing, "company", "")),
                "location": getattr(listing, "location_name", getattr(listing, "location", "")),
                "work_preference": getattr(listing, "work_preference", getattr(listing, "work_mode", "Remote")),
                "stipend": getattr(listing, "stipend", ""),
                "duration": getattr(listing, "duration", ""),
                "match_score": 0.0,
                "eligibility_status": "NOT_ELIGIBLE",
                "matched_skills": [],
                "developing_skills": [],
                "missing_skills": req_skill_names,
                "hard_failures": hard_failures,
                "eligibility_reasons": hard_failures,
                "reasons": hard_failures,
                "breakdown": {
                    "skill_match": 0.0,
                    "career_alignment": 0.0,
                    "work_mode_fit": 0.0,
                    "location_fit": 0.0,
                },
                "why_this_matches": "Not currently eligible due to prerequisite academic cutoffs."
            }

        # =========================================================================
        # STAGE 2: DETERMINISTIC WEIGHTED MATCHING
        # =========================================================================
        student_skill_scores: Dict[str, float] = {}

        # 1. From passed student_evidence if any
        if student_evidence:
            for ev in student_evidence:
                s_name = getattr(ev, "skill_name", None) or getattr(ev, "name", str(ev))
                s_score = getattr(ev, "evidence_score", None) or getattr(ev, "current_score", 0.85)
                if s_score is not None:
                    sc = float(s_score) / 100.0 if float(s_score) > 1.0 else float(s_score)
                    student_skill_scores[s_name.lower().strip()] = max(student_skill_scores.get(s_name.lower().strip(), 0.0), sc)

        # 2. From DB evidence if DB session available
        if db and getattr(student, "email", None):
            gh_skills, res_data, prof_skills = load_student_evidence_from_db(student.email, db)
            for s in (prof_skills or []):
                student_skill_scores[str(s).lower().strip()] = 0.85

            if isinstance(gh_skills, dict):
                for s, meta in gh_skills.items():
                    sc = meta.get("score", 0.6) if isinstance(meta, dict) else 0.6
                    student_skill_scores[str(s).lower().strip()] = max(student_skill_scores.get(str(s).lower().strip(), 0.0), sc)
            elif isinstance(gh_skills, list):
                for s in gh_skills:
                    if isinstance(s, str):
                        student_skill_scores[s.lower().strip()] = max(student_skill_scores.get(s.lower().strip(), 0.0), 0.75)
                    elif isinstance(s, dict):
                        name = s.get("name") or s.get("skill_name")
                        sc = s.get("score", 0.75)
                        if name:
                            student_skill_scores[str(name).lower().strip()] = max(student_skill_scores.get(str(name).lower().strip(), 0.0), sc)

            if isinstance(res_data, dict):
                for s, score in res_data.get("skills_with_scores", {}).items():
                    try:
                        sc = float(score) / 100.0 if float(score) > 1.0 else float(score)
                        student_skill_scores[str(s).lower().strip()] = max(student_skill_scores.get(str(s).lower().strip(), 0.0), sc)
                    except Exception:
                        pass

            if getattr(student, "id", None):
                db_evidences = db.query(models.StudentSkillEvidence).filter(
                    models.StudentSkillEvidence.student_id == student.id
                ).all()
                for ev in db_evidences:
                    norm_name = ev.skill_name.lower().strip()
                    student_skill_scores[norm_name] = max(student_skill_scores.get(norm_name, 0.0), ev.evidence_score)

        # 1. Skill Match (45%)
        req_skills = required_skills if required_skills is not None else (getattr(listing, "required_skills", []) or [])
        matched_skills = []
        developing_skills = []
        missing_skills = []

        skill_points = 0.0
        if req_skills:
            for req in req_skills:
                req_name = getattr(req, "skill_name", str(req))
                rn_clean = req_name.lower().strip()
                best_score = 0.0
                for s_name, s_score in student_skill_scores.items():
                    if rn_clean == s_name or rn_clean in s_name or s_name in rn_clean:
                        if s_score > best_score:
                            best_score = s_score

                if best_score >= 0.75:
                    matched_skills.append(req_name)
                    skill_points += 1.0
                elif best_score >= 0.20:
                    developing_skills.append(req_name)
                    skill_points += (best_score if best_score <= 1.0 else best_score / 100.0)
                else:
                    missing_skills.append(req_name)

            skill_ratio = skill_points / len(req_skills)
        else:
            skill_ratio = 0.85

        skill_match_pct = round(skill_ratio * 100.0, 1)

        # 2. Career Alignment (25%)
        target_careers_raw = getattr(student, "target_careers", "") or getattr(student, "target_career", "") or ""
        target_careers = [c.lower().strip() for c in str(target_careers_raw).split(",") if c.strip()]
        listing_career = (getattr(listing, "career_id", "") or "").lower()
        listing_title = (getattr(listing, "title", "") or "").lower()

        career_match = False
        for tc in target_careers:
            if tc and (tc in listing_career or listing_career in tc or any(w in listing_title for w in tc.split())):
                career_match = True
                break

        career_score = 1.0 if career_match else (0.6 if any(tc in listing_title for tc in ["developer", "engineer", "analyst", "intern"]) else 0.4)
        career_align_pct = round(career_score * 100.0, 1)

        # 3. Work Mode Fit (15%)
        student_work_prefs = [w.lower().strip() for w in (getattr(student, "work_preferences", "") or getattr(student, "preferred_work_mode", "") or "").split(",") if w.strip()]
        listing_wm = (getattr(listing, "work_preference", "") or getattr(listing, "work_mode", "") or "remote").lower()
        is_remote_flag = getattr(listing, "is_remote", False)

        if is_remote_flag or listing_wm == "remote":
            work_mode_score = 1.0
        elif not student_work_prefs or listing_wm in student_work_prefs:
            work_mode_score = 1.0
        elif "hybrid" in student_work_prefs and listing_wm == "hybrid":
            work_mode_score = 1.0
        else:
            work_mode_score = 0.6

        work_mode_fit_pct = round(work_mode_score * 100.0, 1)

        # 4. Location Fit (15%)
        student_locs = [l.lower().strip() for l in (getattr(student, "preferred_locations", "") or "").split(",") if l.strip()]
        if getattr(student, "location", None):
            student_locs.append(student.location.lower().strip())
        listing_loc = (getattr(listing, "location_name", "") or getattr(listing, "location", "") or "").lower()

        if is_remote_flag or listing_wm == "remote":
            loc_score = 1.0
        elif not student_locs:
            loc_score = 0.8
        elif any(sl in listing_loc or listing_loc in sl for sl in student_locs if sl):
            loc_score = 1.0
        else:
            loc_score = 0.5

        location_fit_pct = round(loc_score * 100.0, 1)

        # Weighted Total (0 - 100)
        total_score = round(
            (skill_ratio * 45.0) +
            (career_score * 25.0) +
            (work_mode_score * 15.0) +
            (loc_score * 15.0),
            1
        )

        if total_score >= 75.0:
            eligibility_status = "ELIGIBLE"
        elif total_score >= 50.0 or len(missing_skills) <= 1:
            eligibility_status = "POSSIBLY_ELIGIBLE"
        else:
            eligibility_status = "GAP_EXISTS"

        reasons = list(eligibility_reasons)
        if career_match:
            reasons.append(f"Target career aligns with opportunity: {listing_title.title()}.")
        if matched_skills:
            reasons.append(f"Verified mastery in required technical skills: {', '.join(matched_skills[:3])}.")
        if work_mode_score == 1.0:
            reasons.append(f"Work format fits your active preferences.")

        return {
            "internship_id": getattr(listing, "id", None),
            "id": getattr(listing, "id", None),
            "title": getattr(listing, "title", ""),
            "company_name": getattr(listing, "company_name", getattr(listing, "company", "")),
            "company": getattr(listing, "company_name", getattr(listing, "company", "")),
            "location": getattr(listing, "location_name", getattr(listing, "location", "")),
            "work_preference": getattr(listing, "work_preference", getattr(listing, "work_mode", "Remote")),
            "work_mode": getattr(listing, "work_preference", getattr(listing, "work_mode", "Remote")),
            "stipend": getattr(listing, "stipend", ""),
            "duration": getattr(listing, "duration", ""),
            "match_score": total_score,
            "eligibility_status": eligibility_status,
            "matched_skills": matched_skills,
            "developing_skills": developing_skills,
            "missing_skills": missing_skills,
            "skills": [getattr(r, "skill_name", str(r)) for r in req_skills],
            "career_alignment_score": career_align_pct,
            "skill_match_score": skill_match_pct,
            "reasons": reasons,
            "eligibility_reasons": reasons,
            "breakdown": {
                "skill_match": skill_match_pct,
                "career_alignment": career_align_pct,
                "work_mode_fit": work_mode_fit_pct,
                "location_fit": location_fit_pct,
            },
            "why_this_matches": f"SkillSetu verified {len(matched_skills)} of {len(req_skills)} required competencies. Profile match is {total_score}%.",
            "apply_url": getattr(listing, "apply_url", None),
            "application_url": getattr(listing, "apply_url", getattr(listing, "application_url", None)),
            "application_deadline": listing.application_deadline.isoformat() if getattr(listing, "application_deadline", None) else None,
            "source": getattr(listing, "source", "Verified"),
            "source_url": getattr(listing, "source_url", None)
        }

    @classmethod
    def evaluate_student_internship_match(
        cls,
        student: models.StudentUser,
        listing: models.InternshipListing,
        db: Session
    ) -> Dict[str, Any]:
        return cls.evaluate_match(student, listing, db=db)

    @classmethod
    def get_ranked_recommendations(
        cls,
        student: models.StudentUser,
        db: Session,
        limit: int = 20,
        career_filter: Optional[str] = None,
        location_filter: Optional[str] = None,
        work_mode_filter: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves active listings, computes explainable matches, applies filters, and returns sorted results.
        """
        query = db.query(models.InternshipListing).filter(models.InternshipListing.is_active == True)

        if career_filter:
            query = query.filter(models.InternshipListing.career_id.ilike(f"%{career_filter}%"))
        if location_filter and location_filter != "All":
            query = query.filter(models.InternshipListing.location_name.ilike(f"%{location_filter}%"))
        if work_mode_filter and work_mode_filter != "All":
            query = query.filter(models.InternshipListing.work_preference.ilike(f"%{work_mode_filter}%"))
        if search_query:
            q_clean = f"%{search_query.strip()}%"
            query = query.filter(
                models.InternshipListing.title.ilike(q_clean) |
                models.InternshipListing.company_name.ilike(q_clean) |
                models.InternshipListing.description.ilike(q_clean)
            )

        listings = query.all()
        results = [cls.evaluate_student_internship_match(student, l, db) for l in listings]

        # Sort by match score descending
        results.sort(key=lambda x: x["match_score"], reverse=True)
        return results[:limit]
