import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app import models

logger = logging.getLogger("skillsetu_scholarships")


class ScholarshipEligibilityService:
    """
    Deterministic & Explainable Scholarship Eligibility Evaluation Engine.
    Evaluates multi-dimensional criteria (CGPA, Income, Category, State, Gender, PwD, Degree, Branch).
    Outcomes: 'ELIGIBLE', 'POSSIBLY_ELIGIBLE', 'NOT_ELIGIBLE'.
    """

    @classmethod
    def evaluate_student_eligibility(
        cls,
        student: models.StudentUser,
        scholarship: models.Scholarship,
        rule: Optional[models.ScholarshipEligibilityRule] = None,
        simulated_overrides: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Wrapper supporting explicit rule injection for standalone and test evaluations.
        """
        if rule is not None:
            scholarship.eligibility_rules = rule
        return cls.evaluate_student_scholarship_eligibility(student, scholarship, simulated_overrides=simulated_overrides)

    @classmethod
    def evaluate_student_scholarship_eligibility(
        cls,
        student: models.StudentUser,
        scholarship: models.Scholarship,
        simulated_overrides: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates deterministic eligibility of student against a scholarship's rules.
        Supports in-memory simulation overrides (e.g. from UI simulator).
        """
        rules: Optional[models.ScholarshipEligibilityRule] = getattr(scholarship, "eligibility_rules", None)

        checkpoints: List[Dict[str, Any]] = []
        missing_info: List[str] = []
        hard_failures: List[str] = []

        overrides = simulated_overrides or {}

        # 1. CGPA / Percentage
        student_cgpa_str = overrides.get("cgpa") or getattr(student, "cgpa_or_percentage", None) or getattr(student, "cgpa", None)
        student_cgpa = None
        if student_cgpa_str:
            try:
                cleaned = str(student_cgpa_str).replace("%", "").strip()
                val = float(cleaned)
                student_cgpa = val / 10.0 if val > 10.0 else val
            except Exception:
                student_cgpa = None

        if rules and getattr(rules, "min_cgpa", None):
            min_cgpa = float(rules.min_cgpa)
            if student_cgpa is not None:
                passed = student_cgpa >= min_cgpa
                checkpoints.append({
                    "criterion": "Academic CGPA",
                    "required": f"≥ {min_cgpa:.1f}",
                    "student_value": f"{student_cgpa:.1f}",
                    "passed": passed,
                    "status": "PASSED" if passed else "FAILED",
                    "reason": "Meets CGPA cutoff" if passed else f"Below minimum cutoff of {min_cgpa:.1f}"
                })
                if not passed:
                    hard_failures.append(f"CGPA ({student_cgpa:.1f}) is below minimum requirement of {min_cgpa:.1f}")
            else:
                missing_info.append("cgpa_or_percentage")
                checkpoints.append({
                    "criterion": "Academic CGPA",
                    "required": f"≥ {min_cgpa:.1f}",
                    "student_value": "Not provided",
                    "passed": None,
                    "status": "UNKNOWN",
                    "reason": "Please provide your current CGPA in your profile."
                })

        # 2. Annual Family Household Income
        student_income = overrides.get("annual_family_income") if "annual_family_income" in overrides else getattr(student, "annual_family_income", None)
        if rules and getattr(rules, "max_annual_family_income", None):
            max_inc = float(rules.max_annual_family_income)
            if student_income is not None:
                try:
                    inc_val = float(student_income)
                    passed = inc_val <= max_inc
                    checkpoints.append({
                        "criterion": "Annual Family Income",
                        "required": f"≤ ₹{max_inc:,.0f}",
                        "student_value": f"₹{inc_val:,.0f}",
                        "passed": passed,
                        "status": "PASSED" if passed else "FAILED",
                        "reason": "Income is within eligible ceiling" if passed else f"Income exceeds maximum limit of ₹{max_inc:,.0f}"
                    })
                    if not passed:
                        hard_failures.append(f"Annual household income (₹{inc_val:,.0f}) exceeds the ceiling of ₹{max_inc:,.0f}")
                except Exception:
                    missing_info.append("annual_family_income")
            else:
                missing_info.append("annual_family_income")
                checkpoints.append({
                    "criterion": "Annual Family Income",
                    "required": f"≤ ₹{max_inc:,.0f}",
                    "student_value": "Not declared",
                    "passed": None,
                    "status": "UNKNOWN",
                    "reason": "Provide annual family income to verify need-based eligibility."
                })

        # 3. Social Category / Reservation Quota
        student_cat = overrides.get("social_category") or getattr(student, "social_category", None)
        if rules and getattr(rules, "eligible_categories", None):
            try:
                allowed_cats = json.loads(rules.eligible_categories) if isinstance(rules.eligible_categories, str) else rules.eligible_categories
            except Exception:
                allowed_cats = ["All"]

            if "All" not in allowed_cats and "ANY" not in [str(c).upper() for c in allowed_cats]:
                if student_cat:
                    passed = any(str(student_cat).lower() == str(ac).lower() for ac in allowed_cats)
                    checkpoints.append({
                        "criterion": "Social Category",
                        "required": f"Reserved for {', '.join(allowed_cats)}",
                        "student_value": student_cat,
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
        student_gender = overrides.get("gender") or getattr(student, "gender", None)
        if rules and getattr(rules, "eligible_genders", None):
            try:
                allowed_genders = json.loads(rules.eligible_genders) if isinstance(rules.eligible_genders, str) else rules.eligible_genders
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
        student_state = overrides.get("domicile_state") or getattr(student, "domicile_state", None) or getattr(student, "location", None)
        if rules and getattr(rules, "eligible_states", None):
            try:
                allowed_states = json.loads(rules.eligible_states) if isinstance(rules.eligible_states, str) else rules.eligible_states
            except Exception:
                allowed_states = ["All"]

            if "All" not in allowed_states and "PAN-INDIA" not in [str(s).upper() for s in allowed_states]:
                if student_state:
                    passed = any(str(student_state).lower() in str(st).lower() or str(st).lower() in str(student_state).lower() for st in allowed_states)
                    checkpoints.append({
                        "criterion": "Domicile State",
                        "required": f"Resident of {', '.join(allowed_states)}",
                        "student_value": student_state,
                        "passed": passed,
                        "status": "PASSED" if passed else "FAILED",
                        "reason": f"Resident of eligible state ({student_state})" if passed else f"State {student_state} not eligible"
                    })
                    if not passed:
                        hard_failures.append(f"Scheme restricted to residents of {', '.join(allowed_states)}")
                else:
                    missing_info.append("domicile_state")
                    checkpoints.append({
                        "criterion": "Domicile State",
                        "required": f"Resident of {', '.join(allowed_states)}",
                        "student_value": "Not declared",
                        "passed": None,
                        "status": "UNKNOWN",
                        "reason": "Specify domicile state in profile."
                    })

        # 6. PwD
        student_pwd = overrides.get("is_pwd") if "is_pwd" in overrides else getattr(student, "is_pwd", False)
        if rules and getattr(rules, "requires_pwd", False):
            passed = bool(student_pwd)
            checkpoints.append({
                "criterion": "PwD Category",
                "required": "Persons with Disabilities (PwD) quota",
                "student_value": "Yes" if student_pwd else "No",
                "passed": passed,
                "status": "PASSED" if passed else "FAILED",
                "reason": "PwD status verified" if passed else "Scheme reserved for PwD candidates"
            })
            if not passed:
                hard_failures.append("Scheme reserved for specially-abled students with valid medical certificate")

        # Determine overall eligibility status
        if hard_failures:
            overall_status = "NOT_ELIGIBLE"
            match_percentage = 0.0
        elif missing_info:
            overall_status = "POSSIBLY_ELIGIBLE"
            passed_count = sum(1 for c in checkpoints if c.get("passed") is True)
            total_checks = len(checkpoints)
            match_percentage = round((passed_count / total_checks) * 100, 1) if total_checks > 0 else 70.0
        else:
            overall_status = "ELIGIBLE"
            match_percentage = 100.0

        days_remaining = None
        is_closing_soon = False
        if getattr(scholarship, "application_deadline", None):
            now = datetime.now(timezone.utc)
            deadline = scholarship.application_deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            delta = deadline - now
            days_remaining = max(0, delta.days)
            is_closing_soon = 0 <= days_remaining <= 7

        return {
            "scholarship_id": getattr(scholarship, "id", None),
            "id": getattr(scholarship, "id", None),
            "name": getattr(scholarship, "name", ""),
            "provider": getattr(scholarship, "provider", ""),
            "description": getattr(scholarship, "description", ""),
            "academic_year": getattr(scholarship, "academic_year", "2026-27"),
            "scholarship_type": getattr(scholarship, "scholarship_type", "Merit & Need-based"),
            "award_amount": str(getattr(scholarship, "award_amount", "")),
            "award_frequency": getattr(scholarship, "award_frequency", "per year"),
            "award_description": getattr(scholarship, "award_description", ""),
            "application_url": getattr(scholarship, "application_url", ""),
            "application_deadline": scholarship.application_deadline.isoformat() if getattr(scholarship, "application_deadline", None) else None,
            "days_remaining": days_remaining,
            "is_closing_soon": is_closing_soon,
            "match_percentage": match_percentage,
            "eligibility_status": overall_status,
            "missing_profile_fields": missing_info,
            "evaluation_checkpoints": checkpoints,
            "checkpoints": checkpoints,
            "hard_failures": hard_failures,
            "source": getattr(scholarship, "source", "Official Portal"),
            "source_url": getattr(scholarship, "source_url", None)
        }

    @classmethod
    def get_eligible_scholarships_for_student(
        cls,
        student: models.StudentUser,
        db: Session,
        limit: int = 20,
        type_filter: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Returns all active scholarships evaluated against the student profile,
        along with summary dashboard metric counts and deadline radar.
        """
        query = db.query(models.Scholarship).filter(models.Scholarship.is_active == True)
        if type_filter and type_filter != "All":
            query = query.filter(models.Scholarship.scholarship_type.ilike(f"%{type_filter}%"))
        if search_query:
            q_clean = f"%{search_query.strip()}%"
            query = query.filter(
                models.Scholarship.name.ilike(q_clean) |
                models.Scholarship.provider.ilike(q_clean) |
                models.Scholarship.description.ilike(q_clean)
            )

        scholarships = query.order_by(models.Scholarship.application_deadline.asc().nullslast()).all()
        evaluations = [cls.evaluate_student_scholarship_eligibility(student, s) for s in scholarships]

        saved_ids = {s.scholarship_id for s in db.query(models.SavedScholarship).filter(models.SavedScholarship.student_id == student.id).all()} if student and student.id else set()
        applied_ids = {a.scholarship_id for a in db.query(models.ScholarshipApplication).filter(models.ScholarshipApplication.student_id == student.id).all()} if student and student.id else set()

        for e in evaluations:
            sid = e.get("scholarship_id") or e.get("id")
            e["is_saved"] = sid in saved_ids
            e["has_applied"] = sid in applied_ids

        saved_count = len(saved_ids)
        applied_count = len(applied_ids)
        eligible_count = sum(1 for e in evaluations if e["eligibility_status"] == "ELIGIBLE")
        open_intake_count = sum(1 for e in evaluations if e.get("days_remaining", 0) and e["days_remaining"] > 0)
        recommended_count = sum(1 for e in evaluations if e["eligibility_status"] in ["ELIGIBLE", "POSSIBLY_ELIGIBLE"])

        radar_items = [
            e for e in evaluations
            if e.get("days_remaining") is not None and e["days_remaining"] <= 30
        ]
        radar_items.sort(key=lambda x: x["days_remaining"])

        return {
            "status": "success",
            "count": len(evaluations[:limit]),
            "data": evaluations[:limit],
            "items": evaluations[:limit],
            "metrics": {
                "recommended": recommended_count,
                "eligible": eligible_count,
                "open_intake": open_intake_count,
                "saved": saved_count,
                "applied": applied_count
            },
            "deadline_radar": radar_items[:4]
        }
