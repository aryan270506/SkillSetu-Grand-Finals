import json
import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app import models

logger = logging.getLogger("skillsetu_scholarship_eligibility")


def _get_prop(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class ScholarshipEligibilityService:
    """
    Deterministic Multi-Dimensional Scholarship Eligibility Engine.
    Operates on live in-memory scholarship records without persisting scraped data to PostgreSQL.
    Zero LLM hallucinations - 100% deterministic rule verification.
    """

    @classmethod
    def evaluate_student_eligibility(
        cls,
        student: models.StudentUser,
        scholarship: Any,
        rule: Optional[Any] = None,
        simulated_overrides: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if rule is not None:
            if hasattr(scholarship, "eligibility_rules"):
                scholarship.eligibility_rules = rule
            elif isinstance(scholarship, dict):
                scholarship["rules"] = rule
            else:
                try:
                    setattr(scholarship, "eligibility_rules", rule)
                except Exception:
                    pass
        return cls.evaluate_student_scholarship_eligibility(student, scholarship, simulated_overrides=simulated_overrides)

    @classmethod
    def evaluate_student_scholarship_eligibility(
        cls,
        student: models.StudentUser,
        scholarship: Any,
        simulated_overrides: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a student profile against structured scholarship rules.
        Supports both model objects and live dictionary structures.
        """
        rules = _get_prop(scholarship, "eligibility_rules") or _get_prop(scholarship, "rules") or scholarship
        checkpoints = []
        hard_failures = []
        missing_info = []

        overrides = simulated_overrides or {}

        # 1. CGPA / Percentage
        student_cgpa_str = overrides.get("cgpa") or _get_prop(student, "cgpa_or_percentage") or _get_prop(student, "cgpa")
        student_cgpa = None
        if student_cgpa_str:
            try:
                cleaned = str(student_cgpa_str).replace("%", "").strip()
                val = float(cleaned)
                student_cgpa = val / 10.0 if val > 10.0 else val
            except Exception:
                student_cgpa = None

        min_cgpa = _get_prop(rules, "min_cgpa")
        if min_cgpa is not None and float(min_cgpa) > 0.0:
            min_cgpa_val = float(min_cgpa)
            if student_cgpa is not None:
                passed = student_cgpa >= min_cgpa_val
                checkpoints.append({
                    "criterion": "Academic CGPA",
                    "required": f"≥ {min_cgpa_val:.1f}",
                    "student_value": f"{student_cgpa:.1f}",
                    "passed": passed,
                    "status": "PASSED" if passed else "FAILED",
                    "reason": "Meets CGPA cutoff" if passed else f"Below minimum cutoff of {min_cgpa_val:.1f}"
                })
                if not passed:
                    hard_failures.append(f"CGPA ({student_cgpa:.1f}) is below minimum requirement of {min_cgpa_val:.1f}")
            else:
                missing_info.append("cgpa_or_percentage")
                checkpoints.append({
                    "criterion": "Academic CGPA",
                    "required": f"≥ {min_cgpa_val:.1f}",
                    "student_value": "Not provided",
                    "passed": None,
                    "status": "UNKNOWN",
                    "reason": "Please provide your current CGPA in your profile."
                })

        # 2. Annual Family Household Income
        student_income = overrides.get("annual_family_income") if "annual_family_income" in overrides else _get_prop(student, "annual_family_income")
        max_income = _get_prop(rules, "max_annual_family_income")
        if max_income is not None and float(max_income) > 0.0:
            max_inc_val = float(max_income)
            if student_income is not None:
                try:
                    inc_val = float(student_income)
                    passed = inc_val <= max_inc_val
                    checkpoints.append({
                        "criterion": "Annual Family Income",
                        "required": f"≤ ₹{max_inc_val:,.0f}",
                        "student_value": f"₹{inc_val:,.0f}",
                        "passed": passed,
                        "status": "PASSED" if passed else "FAILED",
                        "reason": "Income is within eligible ceiling" if passed else f"Income exceeds maximum limit of ₹{max_inc_val:,.0f}"
                    })
                    if not passed:
                        hard_failures.append(f"Annual household income (₹{inc_val:,.0f}) exceeds ceiling of ₹{max_inc_val:,.0f}")
                except Exception:
                    missing_info.append("annual_family_income")
            else:
                missing_info.append("annual_family_income")
                checkpoints.append({
                    "criterion": "Annual Family Income",
                    "required": f"≤ ₹{max_inc_val:,.0f}",
                    "student_value": "Not declared",
                    "passed": None,
                    "status": "UNKNOWN",
                    "reason": "Provide annual family income to verify need-based eligibility."
                })

        # 3. Social Category / Reservation Quota
        student_cat = overrides.get("social_category") or _get_prop(student, "social_category")
        eligible_cats = _get_prop(rules, "eligible_categories")
        if eligible_cats:
            try:
                allowed_cats = json.loads(eligible_cats) if isinstance(eligible_cats, str) else eligible_cats
            except Exception:
                allowed_cats = ["All"]

            if "All" not in allowed_cats and "ANY" not in [str(c).upper() for c in allowed_cats]:
                if student_cat:
                    passed = any(str(student_cat).lower() == str(ac).lower() for ac in allowed_cats)
                    checkpoints.append({
                        "criterion": "Social Category",
                        "required": f"Reserved for {', '.join(allowed_cats)}",
                        "student_value": str(student_cat),
                        "passed": passed,
                        "status": "PASSED" if passed else "FAILED",
                        "reason": f"Eligible category ({student_cat})" if passed else f"Category {student_cat} not in quota"
                    })
                    if not passed:
                        hard_failures.append(f"Scholarship reserved for {', '.join(allowed_cats)} candidates")
                else:
                    missing_info.append("social_category")
                    checkpoints.append({
                        "criterion": "Social Category",
                        "required": f"Reserved for {', '.join(allowed_cats)}",
                        "student_value": "Not specified",
                        "passed": None,
                        "status": "UNKNOWN",
                        "reason": "Specify your social category in profile."
                    })

        # 4. Gender
        student_gender = overrides.get("gender") or _get_prop(student, "gender")
        eligible_genders = _get_prop(rules, "eligible_genders")
        if eligible_genders:
            try:
                allowed_genders = json.loads(eligible_genders) if isinstance(eligible_genders, str) else eligible_genders
            except Exception:
                allowed_genders = ["All"]

            if "All" not in allowed_genders and "ANY" not in [str(g).upper() for g in allowed_genders]:
                if student_gender:
                    passed = any(str(student_gender).lower() == str(g).lower() for g in allowed_genders)
                    checkpoints.append({
                        "criterion": "Eligible Gender",
                        "required": f"Reserved for {', '.join(allowed_genders).title()} candidates",
                        "student_value": str(student_gender).title(),
                        "passed": passed,
                        "status": "PASSED" if passed else "FAILED",
                        "reason": "Gender criteria matched" if passed else "Scheme criteria gender restriction"
                    })
                    if not passed:
                        hard_failures.append(f"Scheme is exclusively for {', '.join(allowed_genders)} candidates")
                else:
                    missing_info.append("gender")
                    checkpoints.append({
                        "criterion": "Eligible Gender",
                        "required": f"Reserved for {', '.join(allowed_genders).title()}",
                        "student_value": "Not specified",
                        "passed": None,
                        "status": "UNKNOWN",
                        "reason": "Specify gender in profile."
                    })

        # 5. Domicile State
        student_state = overrides.get("domicile_state") or _get_prop(student, "domicile_state")
        eligible_states = _get_prop(rules, "eligible_states")
        if eligible_states:
            try:
                allowed_states = json.loads(eligible_states) if isinstance(eligible_states, str) else eligible_states
            except Exception:
                allowed_states = ["All"]

            if "All" not in allowed_states and "ANY" not in [str(s).upper() for s in allowed_states]:
                if student_state:
                    passed = any(str(student_state).lower() == str(st).lower() for st in allowed_states)
                    checkpoints.append({
                        "criterion": "Domicile State",
                        "required": f"Residents of {', '.join(allowed_states)}",
                        "student_value": str(student_state),
                        "passed": passed,
                        "status": "PASSED" if passed else "FAILED",
                        "reason": "Domicile criteria verified" if passed else f"State ({student_state}) not eligible"
                    })
                    if not passed:
                        hard_failures.append(f"Restricted to residents of {', '.join(allowed_states)}")
                else:
                    missing_info.append("domicile_state")
                    checkpoints.append({
                        "criterion": "Domicile State",
                        "required": f"Residents of {', '.join(allowed_states)}",
                        "student_value": "Not declared",
                        "passed": None,
                        "status": "UNKNOWN",
                        "reason": "Declare your home domicile state in profile."
                    })

        # 6. PwD
        req_pwd = _get_prop(rules, "requires_pwd", False)
        if req_pwd:
            student_pwd = overrides.get("is_pwd") if "is_pwd" in overrides else _get_prop(student, "is_pwd", False)
            passed = bool(student_pwd)
            checkpoints.append({
                "criterion": "Specially-Abled (PwD) Quota",
                "required": "Requires verified PwD status (≥ 40% disability)",
                "student_value": "Yes" if student_pwd else "No",
                "passed": passed,
                "status": "PASSED" if passed else "FAILED",
                "reason": "PwD scheme criteria satisfied" if passed else "Scheme exclusive to specially-abled candidates"
            })
            if not passed:
                hard_failures.append("Scheme exclusively reserved for specially-abled students")

        # Determine Overall Status
        if hard_failures:
            overall_status = "NOT_ELIGIBLE"
            match_pct = 0.0
        elif missing_info:
            overall_status = "POSSIBLY_ELIGIBLE"
            match_pct = 50.0
        else:
            overall_status = "ELIGIBLE"
            match_pct = 100.0

        # Calculate days remaining
        deadline_obj = _get_prop(scholarship, "application_deadline")
        days_rem = None
        if deadline_obj:
            try:
                if isinstance(deadline_obj, str):
                    d_parsed = datetime.fromisoformat(deadline_obj.replace("Z", "+00:00"))
                else:
                    d_parsed = deadline_obj
                now_utc = datetime.now(timezone.utc)
                if d_parsed.tzinfo is None:
                    d_parsed = d_parsed.replace(tzinfo=timezone.utc)
                delta = d_parsed - now_utc
                days_rem = max(0, delta.days)
            except Exception:
                days_rem = None

        award_val = _get_prop(scholarship, "award_amount")
        award_num = float(award_val) if award_val else None

        award_desc = _get_prop(scholarship, "award_description")
        if not award_desc and award_num:
            award_desc = f"₹{int(award_num):,} {_get_prop(scholarship, 'award_frequency', 'per year')}"

        sch_id = _get_prop(scholarship, "id") or _get_prop(scholarship, "scholarship_id")
        source = _get_prop(scholarship, "source", "nsp")
        source_id = str(_get_prop(scholarship, "source_id", sch_id or ""))

        deadline_str = deadline_obj.isoformat() if hasattr(deadline_obj, "isoformat") else (str(deadline_obj) if deadline_obj else None)

        return {
            "scholarship_id": sch_id,
            "id": sch_id,
            "source": source,
            "source_id": source_id,
            "name": _get_prop(scholarship, "name", ""),
            "provider": _get_prop(scholarship, "provider", ""),
            "description": _get_prop(scholarship, "description", ""),
            "academic_year": _get_prop(scholarship, "academic_year", "2026-27"),
            "scholarship_type": _get_prop(scholarship, "scholarship_type", "Merit & Need-based"),
            "award_amount": award_num,
            "award_frequency": _get_prop(scholarship, "award_frequency", "per year"),
            "award_description": award_desc,
            "application_url": _get_prop(scholarship, "application_url") or _get_prop(scholarship, "source_url"),
            "application_deadline": deadline_str,
            "days_remaining": days_rem,
            "eligibility_status": overall_status,
            "match_percentage": match_pct,
            "missing_profile_fields": missing_info,
            "missing_info": missing_info,
            "evaluation_checkpoints": checkpoints,
            "checkpoints": checkpoints,
            "hard_failures": hard_failures,
            "source_url": _get_prop(scholarship, "source_url")
        }

    @classmethod
    def get_eligible_scholarships_for_student(
        cls,
        student: models.StudentUser,
        db: Session,
        limit: int = 50,
        page: int = 1,
        type_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        state_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        session_id: Optional[str] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Fetches live scholarships in-memory within a 2-second budget, evaluates deterministic eligibility,
        and returns catalog and dashboard metrics without persisting to PostgreSQL.
        """
        from app.services.live_opportunities.live_engine import LiveOpportunityEngine
        raw_scholarships = LiveOpportunityEngine.get_live_scholarships(session_id=session_id, force_refresh=force_refresh, limit=None)


        saved_tuples: Set[tuple] = set()
        saved_ids: Set[str] = set()
        applied_tuples: Set[tuple] = set()
        applied_ids: Set[str] = set()

        if student and student.id:
            saved_recs = db.query(models.SavedScholarship).filter(models.SavedScholarship.student_id == student.id).all()
            for s in saved_recs:
                if s.source and s.source_id:
                    saved_tuples.add((s.source, str(s.source_id)))
                    saved_ids.add(str(s.source_id))
                if s.scholarship_id:
                    saved_tuples.add(("legacy", str(s.scholarship_id)))
                    saved_ids.add(str(s.scholarship_id))

            app_recs = db.query(models.ScholarshipApplication).filter(models.ScholarshipApplication.student_id == student.id).all()
            for a in app_recs:
                if a.source and a.source_id:
                    applied_tuples.add((a.source, str(a.source_id)))
                    applied_ids.add(str(a.source_id))
                if a.scholarship_id:
                    applied_tuples.add(("legacy", str(a.scholarship_id)))
                    applied_ids.add(str(a.scholarship_id))

        evaluations = []
        for s in raw_scholarships:
            name = _get_prop(s, "name", "")
            provider = _get_prop(s, "provider", "")
            desc = _get_prop(s, "description", "")
            sch_type = _get_prop(s, "scholarship_type", "")
            rules = _get_prop(s, "rules") or {}

            if type_filter and type_filter != "All" and type_filter != "all":
                if type_filter.lower() not in sch_type.lower():
                    continue
            if category_filter and category_filter != "All" and category_filter != "all":
                allowed_cats = rules.get("eligible_categories", ["All"])
                if "All" not in allowed_cats and not any(category_filter.lower() in str(c).lower() for c in allowed_cats):
                    continue
            if state_filter and state_filter != "All" and state_filter != "all":
                allowed_states = rules.get("eligible_states", ["All"])
                if "All" not in allowed_states and not any(state_filter.lower() in str(st).lower() for st in allowed_states):
                    continue
            if search_query:
                sq = search_query.lower().strip()
                if sq not in name.lower() and sq not in provider.lower() and sq not in desc.lower():
                    continue

            eval_res = cls.evaluate_student_scholarship_eligibility(student, s)
            src = _get_prop(s, "source", "nsp")
            src_id = str(_get_prop(s, "source_id", ""))
            full_id = str(_get_prop(s, "id", ""))
            
            is_saved = (
                (src, src_id) in saved_tuples or
                (src, full_id) in saved_tuples or
                src_id in saved_ids or
                full_id in saved_ids or
                ("legacy", src_id) in saved_tuples or
                ("legacy", full_id) in saved_tuples
            )
            has_applied = (
                (src, src_id) in applied_tuples or
                (src, full_id) in applied_tuples or
                src_id in applied_ids or
                full_id in applied_ids or
                ("legacy", src_id) in applied_tuples or
                ("legacy", full_id) in applied_tuples
            )
            eval_res["is_saved"] = is_saved
            eval_res["has_applied"] = has_applied

            evaluations.append(eval_res)

        saved_count = len(saved_tuples)
        applied_count = len(applied_tuples)
        eligible_count = sum(1 for e in evaluations if e["eligibility_status"] == "ELIGIBLE")
        possibly_eligible_count = sum(1 for e in evaluations if e["eligibility_status"] == "POSSIBLY_ELIGIBLE")
        open_intake_count = sum(1 for e in evaluations if e.get("days_remaining", 0) is not None and e["days_remaining"] > 0)
        recommended_count = sum(1 for e in evaluations if e["eligibility_status"] in ["ELIGIBLE", "POSSIBLY_ELIGIBLE"])

        radar_items = [
            e for e in evaluations
            if e.get("days_remaining") is not None and e["days_remaining"] <= 45 and e["days_remaining"] > 0
        ]
        radar_items.sort(key=lambda x: x["days_remaining"])

        # Pagination
        start_idx = (page - 1) * limit if page > 0 else 0
        end_idx = start_idx + limit
        paginated_items = evaluations[start_idx:end_idx]

        return {
            "status": "success",
            "total_count": len(evaluations),
            "count": len(paginated_items),
            "data": paginated_items,
            "items": paginated_items,
            "metrics": {
                "recommended": recommended_count,
                "eligible": eligible_count,
                "possibly_eligible": possibly_eligible_count,
                "possiblyEligible": possibly_eligible_count,
                "open_intake": open_intake_count,
                "openIntake": open_intake_count,
                "saved": saved_count,
                "applied": applied_count
            },
            "deadline_radar": radar_items[:4]
        }
