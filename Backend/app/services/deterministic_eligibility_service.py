"""
Deterministic Eligibility Screening Engine
Enforces:
- Objective, deterministic qualification evaluation against recruiter-approved pipeline rules
- Strict Protected Characteristic Firewall: Demographic fields (gender, caste, state, family income, disability)
  are completely firewalled and excluded from the screening pipeline
- Explainable point-by-point score and verdict breakdown
- Safe quarantine of borderline candidates to AWAITING_MANUAL_REVIEW
"""

import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field

from sqlalchemy.orm import Session
from app import models

logger = logging.getLogger("deterministic_screening")


class CandidateScreeningDTO(BaseModel):
    """
    Architectural Firewall Schema:
    Strictly permits only job-relevant qualifications.
    All protected characteristics (gender, category, income, disability, domicile)
    are omitted and forbidden.
    """
    student_id: int
    name: str
    cgpa_raw: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year_raw: Optional[str] = None
    work_mode_preference: Optional[str] = "Remote"
    skills: List[str] = Field(default_factory=list)
    has_marksheet: bool = False


def extract_normalized_cgpa(cgpa_str: Optional[str]) -> Optional[float]:
    """
    Normalizes candidate CGPA or percentage into a standardized 10.0 scale.
    Examples:
    - '8.45' -> 8.45
    - '85%' -> 8.5
    - '85.0 / 100' -> 8.5
    - '7.8/10' -> 7.8
    """
    if not cgpa_str or not cgpa_str.strip():
        return None

    cleaned = cgpa_str.strip().replace("%", "")
    # Check for X/10 or X/100 format
    if "/" in cleaned:
        parts = cleaned.split("/")
        try:
            val = float(parts[0].strip())
            total = float(parts[1].strip())
            if total == 100.0:
                return round(val / 10.0, 2)
            elif total == 10.0:
                return round(val, 2)
            elif total > 0:
                return round((val / total) * 10.0, 2)
        except (ValueError, IndexError):
            pass

    # Extract first float found
    match = re.search(r"(\d+(\.\d+)?)", cleaned)
    if match:
        try:
            num = float(match.group(1))
            if num > 10.0 and num <= 100.0:
                # Percentage scale: convert to 10.0 scale
                return round(num / 10.0, 2)
            elif num <= 10.0:
                return round(num, 2)
        except ValueError:
            pass

    return None


def extract_normalized_grad_year(year_str: Optional[str]) -> Optional[int]:
    """Extracts a 4-digit graduation year."""
    if not year_str:
        return None
    match = re.search(r"\b(20\d{2})\b", str(year_str))
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass
    return None


def build_candidate_screening_dto(
    student: models.StudentUser
) -> CandidateScreeningDTO:
    """
    Constructs the firewalled CandidateScreeningDTO from StudentUser.
    Guarantees demographic fields are never accessed or forwarded.
    """
    # Extract student skill tags
    skills = []
    if student.skill_ids:
        try:
            skills = json.loads(student.skill_ids) if student.skill_ids.startswith("[") else [s.strip() for s in student.skill_ids.split(",") if s.strip()]
        except Exception:
            skills = [s.strip() for s in student.skill_ids.split(",") if s.strip()]

    return CandidateScreeningDTO(
        student_id=student.id,
        name=student.name,
        cgpa_raw=student.cgpa_or_percentage,
        degree=student.degree,
        branch=student.branch,
        graduation_year_raw=student.graduation_year,
        work_mode_preference=student.work_preferences or "Remote",
        skills=skills,
        has_marksheet=bool(student.marksheet_url)
    )


def evaluate_candidate_eligibility(
    candidate: CandidateScreeningDTO,
    eligibility_rules: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Deterministically evaluates a candidate against the version's eligibility rules.
    Returns:
    {
      "is_eligible": bool,
      "eligibility_status": "ELIGIBLE" | "INELIGIBLE" | "AWAITING_MANUAL_REVIEW",
      "overall_match_score": float (0-100),
      "criteria_breakdown": { ... },
      "failure_reasons": List[str],
      "requires_manual_review": bool
    }
    """
    min_cgpa = eligibility_rules.get("min_cgpa")
    allowed_degrees = [d.lower() for d in eligibility_rules.get("allowed_degrees", [])]
    allowed_branches = [b.lower() for b in eligibility_rules.get("allowed_branches", [])]
    allowed_years = eligibility_rules.get("allowed_graduation_years", [])
    mandatory_skills = [s.lower() for s in eligibility_rules.get("mandatory_skills", [])]
    work_modes_accepted = [m.lower() for m in eligibility_rules.get("work_modes_accepted", ["remote", "hybrid", "on-site"])]

    criteria = {}
    failure_reasons = []
    total_score = 0.0
    is_borderline = False

    # 1. CGPA Evaluation (Max 30 pts)
    candidate_cgpa = extract_normalized_cgpa(candidate.cgpa_raw)
    if min_cgpa is not None:
        if candidate_cgpa is None:
            criteria["cgpa"] = {
                "required": min_cgpa,
                "actual": "Missing/Unparseable",
                "passed": False,
                "score": 0.0,
                "note": "CGPA could not be parsed from profile."
            }
            failure_reasons.append(f"Missing CGPA (required: {min_cgpa})")
            is_borderline = True  # Can be manually verified by recruiter
        else:
            cgpa_passed = candidate_cgpa >= float(min_cgpa)
            # Borderline: within 0.3 grade points (3%) of minimum
            if not cgpa_passed and (float(min_cgpa) - candidate_cgpa) <= 0.3:
                is_borderline = True

            # Score proportional to CGPA
            cgpa_score = min(30.0, max(0.0, (candidate_cgpa / 10.0) * 30.0)) if cgpa_passed else 0.0
            total_score += cgpa_score

            criteria["cgpa"] = {
                "required": min_cgpa,
                "actual": candidate_cgpa,
                "passed": cgpa_passed,
                "score": round(cgpa_score, 1)
            }
            if not cgpa_passed:
                failure_reasons.append(f"CGPA {candidate_cgpa} below minimum {min_cgpa}")
    else:
        total_score += 30.0
        criteria["cgpa"] = {"required": None, "actual": candidate_cgpa, "passed": True, "score": 30.0}

    # 2. Degree & Branch Evaluation (Max 30 pts)
    def _matches_degree(allowed: str, cand: str) -> bool:
        a = allowed.lower().strip()
        c = cand.lower().strip()
        if a == c or a in c or c in a:
            return True
        tech_degrees = {"b.tech", "btech", "b.e", "be", "bachelor of technology", "bachelor of engineering", "engineering"}
        if any(t in a for t in tech_degrees) and any(t in c for t in tech_degrees):
            return True
        return False

    def _matches_branch(allowed: str, cand: str) -> bool:
        a = allowed.lower().strip()
        c = cand.lower().strip()
        if a in ["all", "any"] or a == c or a in c or c in a:
            return True
        cs_branches = {"computer science", "cse", "cs", "computer engineering", "information technology", "it", "software"}
        if any(b in a for b in cs_branches) and any(b in c for b in cs_branches):
            return True
        return False

    degree_passed = True
    if allowed_degrees and "all" not in allowed_degrees:
        cand_degree = (candidate.degree or "").lower().strip()
        degree_passed = any(_matches_degree(d, cand_degree) for d in allowed_degrees)
        if not degree_passed:
            failure_reasons.append(f"Degree '{candidate.degree}' not in approved list: {eligibility_rules.get('allowed_degrees')}")

    branch_passed = True
    if allowed_branches and "all" not in allowed_branches:
        cand_branch = (candidate.branch or "").lower().strip()
        branch_passed = any(_matches_branch(b, cand_branch) for b in allowed_branches)
        if not branch_passed:
            failure_reasons.append(f"Branch '{candidate.branch}' not in approved list: {eligibility_rules.get('allowed_branches')}")

    education_passed = degree_passed and branch_passed
    edu_score = 30.0 if education_passed else 0.0
    total_score += edu_score

    criteria["education"] = {
        "degree_passed": degree_passed,
        "branch_passed": branch_passed,
        "actual_degree": candidate.degree,
        "actual_branch": candidate.branch,
        "passed": education_passed,
        "score": edu_score
    }

    # 3. Graduation Year Evaluation (Max 15 pts)
    year_passed = True
    cand_year = extract_normalized_grad_year(candidate.graduation_year_raw)
    if allowed_years:
        if cand_year is None:
            is_borderline = True
            year_passed = False
            failure_reasons.append("Graduation year unparseable")
        else:
            year_passed = cand_year in allowed_years
            if not year_passed:
                failure_reasons.append(f"Graduation year {cand_year} not in approved cohorts: {allowed_years}")

    year_score = 15.0 if year_passed else 0.0
    total_score += year_score
    criteria["graduation_year"] = {
        "required": allowed_years,
        "actual": cand_year,
        "passed": year_passed,
        "score": year_score
    }

    # 4. Mandatory Skills Evaluation (Max 25 pts)
    candidate_skills_lower = [s.lower().strip() for s in candidate.skills]
    missing_mandatory = []
    matched_mandatory = []

    if mandatory_skills:
        for ms in mandatory_skills:
            if any(ms in cs or cs in ms for cs in candidate_skills_lower):
                matched_mandatory.append(ms)
            else:
                missing_mandatory.append(ms)

        skills_passed = len(missing_mandatory) == 0
        skill_score = (len(matched_mandatory) / len(mandatory_skills)) * 25.0
        total_score += skill_score

        if not skills_passed:
            failure_reasons.append(f"Missing mandatory skills: {missing_mandatory}")
            # If candidate matched at least 60% of mandatory skills, flag as borderline for manual review
            if len(matched_mandatory) / len(mandatory_skills) >= 0.6:
                is_borderline = True

        criteria["skills"] = {
            "mandatory_required": eligibility_rules.get("mandatory_skills", []),
            "matched": matched_mandatory,
            "missing": missing_mandatory,
            "passed": skills_passed,
            "score": round(skill_score, 1)
        }
    else:
        total_score += 25.0
        criteria["skills"] = {"passed": True, "score": 25.0, "matched": candidate.skills}

    # Final verdict determination
    is_fully_eligible = len(failure_reasons) == 0

    if is_fully_eligible:
        status = "ELIGIBLE"
    elif is_borderline:
        status = "AWAITING_MANUAL_REVIEW"
    else:
        status = "INELIGIBLE"

    return {
        "is_eligible": is_fully_eligible,
        "eligibility_status": status,
        "overall_match_score": round(total_score, 1),
        "criteria_breakdown": criteria,
        "failure_reasons": failure_reasons,
        "requires_manual_review": (status == "AWAITING_MANUAL_REVIEW")
    }
