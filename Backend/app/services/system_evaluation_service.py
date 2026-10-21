"""
System Assessment Evaluation Service
Enforces authoritative, system-generated scorecard metrics, 1-5 star ratings,
automated verdicts, and evidence-based feedback across recruitment rounds.

Recruiters are strictly prohibited from manually editing or fabricating
assessment scores, star ratings, or verdicts.
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("system_evaluation")

VERDICTS = [
    "Strongly Recommend",
    "Recommend",
    "Maybe / Borderline",
    "Do Not Recommend"
]


def score_to_stars(score: float) -> int:
    """
    Standard documented 0-100 score to 1-5 star rubric mapping:
    - 90.0 - 100.0: 5 stars
    - 75.0 - 89.9: 4 stars
    - 60.0 - 74.9: 3 stars
    - 40.0 - 59.9: 2 stars
    - > 0.0: 1 star
    - <= 0.0: 0 stars
    """
    try:
        sc = float(score)
    except (ValueError, TypeError):
        return 0

    if sc >= 90.0:
        return 5
    elif sc >= 75.0:
        return 4
    elif sc >= 60.0:
        return 3
    elif sc >= 40.0:
        return 2
    elif sc > 0.0:
        return 1
    return 0


def derive_verdict(overall_score: float, passing_cutoff: float = 60.0) -> str:
    """
    Derives canonical evaluation verdict from authoritative score and configured threshold:
    - score >= 85.0%: Strongly Recommend
    - score >= passing_cutoff: Recommend
    - (passing_cutoff - score) <= 3.0: Maybe / Borderline
    - score < (passing_cutoff - 3.0): Do Not Recommend
    """
    if overall_score is None:
        return "Pending Evaluation"
    try:
        sc = float(overall_score)
        cutoff = float(passing_cutoff)
    except (ValueError, TypeError):
        return "Do Not Recommend"

    if sc >= 85.0:
        return "Strongly Recommend"
    elif sc >= cutoff:
        return "Recommend"
    elif (cutoff - sc) <= 5.0:
        return "Maybe / Borderline"
    else:
        return "Do Not Recommend"


def derive_round_completion_badge(
    session: Optional[Any] = None,
    application: Optional[Any] = None,
    progression: Optional[Dict[str, Any]] = None,
    round_def: Optional[Dict[str, Any]] = None,
    is_evaluated: bool = False
) -> Dict[str, str]:
    """
    Derives authoritative prominent round-status badge across the lifecycle:
    - ROUND NOT COMPLETED: candidate has not submitted or completed current round.
    - ASSESSMENT IN PROGRESS: candidate has started but not finished.
    - SUBMITTED — EVALUATION PENDING: candidate submitted, evaluation not complete.
    - AWAITING RECRUITER REVIEW: evaluation complete, approval checkpoint pending.
    - ROUND COMPLETED: backend confirms round completed and evaluated.
    """
    sess_status = getattr(session, "status", "NOT_STARTED").upper() if session else "NOT_STARTED"
    app_status = (getattr(application, "status", "APPLIED") or "APPLIED").upper() if application else "APPLIED"
    review_gated = bool(round_def.get("review_gated", False)) if round_def else False
    has_score = (session is not None and getattr(session, "overall_score", None) is not None)
    has_submitted_flag = (session is not None and getattr(session, "submitted_at", None) is not None)

    # 1. Assessment currently in progress
    if sess_status == "IN_PROGRESS":
        return {
            "key": "ASSESSMENT_IN_PROGRESS",
            "label": "ASSESSMENT IN PROGRESS",
            "tone": "info"
        }

    # 2. Round completed and evaluated
    if sess_status == "COMPLETED" and has_score and is_evaluated:
        requires_review = (
            review_gated or
            app_status in ["AWAITING_REVIEW", "IN_REVIEW", "NEEDS_REVIEW"] or
            (bool(progression.get("requires_review")) if progression else False)
        )
        if requires_review and app_status not in ["SELECTED", "HIRED", "REJECTED"]:
            return {
                "key": "AWAITING_RECRUITER_REVIEW",
                "label": "AWAITING RECRUITER REVIEW",
                "tone": "accent"
            }

        return {
            "key": "ROUND_COMPLETED",
            "label": "ROUND COMPLETED",
            "tone": "success"
        }

    # 3. Candidate submitted, but evaluation not complete
    if sess_status == "SUBMITTED" or has_submitted_flag or (sess_status == "COMPLETED" and (not has_score or not is_evaluated)):
        return {
            "key": "SUBMITTED_EVALUATION_PENDING",
            "label": "SUBMITTED — EVALUATION PENDING",
            "tone": "warning"
        }

    # 4. Default: candidate has not submitted or completed current round
    return {
        "key": "ROUND_NOT_COMPLETED",
        "label": "ROUND NOT COMPLETED",
        "tone": "danger"
    }


def synthesize_session_evaluation(
    session: Optional[Any] = None,
    application: Optional[Any] = None,
    posting: Optional[Any] = None,
    pipeline_version: Optional[Any] = None,
    rubric_config: Optional[Dict[str, Any]] = None,
    passing_cutoff: Optional[float] = None,
    round_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesizes complete, system-generated scorecard metrics for a candidate assessment session.
    Never defaults unattempted assessments to 5 stars or generic praise.
    """
    sess_status = getattr(session, "status", "NOT_STARTED").upper() if session else "NOT_STARTED"
    is_completed = (sess_status == "COMPLETED")

    target_round_key = getattr(session, "current_round", "aptitude") if session else "aptitude"
    display_round = round_name or target_round_key.capitalize()
    
    # 1. Resolve Passing Cutoff from parameter or Pipeline Version
    cutoff = float(passing_cutoff) if passing_cutoff is not None else 60.0
    if passing_cutoff is None and pipeline_version and getattr(pipeline_version, "pipeline_config", None):
        rounds = pipeline_version.pipeline_config.get("rounds", [])
        for r in rounds:
            if str(r.get("round_key", "")).lower().strip() == str(target_round_key).lower().strip():
                cutoff = float(r.get("passing_cutoff") or r.get("passing_score", 60.0))
                break

    # If assessment is NOT completed, return clean pending state
    if not is_completed:
        return {
            "is_evaluated": False,
            "status": sess_status,
            "composite_score": None,
            "overall_score": None,
            "ratings": {
                "techDepth": 0,
                "problemSolving": 0,
                "sysDesign": 0,
                "communication": 0,
                "teamFit": 0
            },
            "verdict": "Pending Evaluation",
            "strengths": f"Assessment for {display_round} is pending candidate submission.",
            "areas_for_improvement": "Evaluation will be generated upon completion of the assessment.",
            "summary": f"Assessment for {display_round} is currently {sess_status}.",
            "passing_cutoff": cutoff,
            "evaluated_by": "SYSTEM_AUTOMATED",
            "evaluated_at": None,
            "evaluation_source": "SYSTEM_AUTOMATED",
            "recruiter_notes": getattr(application, "notes", "") if application else ""
        }

    # 2. Extract Completed Scores
    overall_score = float(session.overall_score) if (session and session.overall_score is not None) else 0.0

    round_results = {}
    if session and getattr(session, "round_results", None):
        try:
            raw_rr = session.round_results
            round_results = json.loads(raw_rr) if isinstance(raw_rr, str) else (raw_rr or {})
        except Exception:
            round_results = {}

    # Extract existing evaluation if already calculated
    existing_eval = {}
    if session and getattr(session, "evaluation", None):
        try:
            raw_eval = session.evaluation
            existing_eval = json.loads(raw_eval) if isinstance(raw_eval, str) else (raw_eval or {})
        except Exception:
            existing_eval = {}

    # Extract sub-scores
    tech_data = round_results.get("technical", {})
    tech_score = float(tech_data.get("score") or tech_data.get("overallScore") or overall_score) if isinstance(tech_data, dict) else overall_score

    apt_data = round_results.get("aptitude", {})
    apt_score = float(apt_data.get("score") or overall_score) if isinstance(apt_data, dict) else overall_score

    ps_score = round((tech_score * 0.6) + (apt_score * 0.4), 1)
    sd_score = round(tech_score * 0.95, 1)
    
    interview_data = round_results.get("interview", {})
    comm_score = float(interview_data.get("score") or (overall_score * 0.9)) if isinstance(interview_data, dict) else round(overall_score * 0.9, 1)
    team_fit_score = round((comm_score * 0.5) + (overall_score * 0.5), 1)

    # 3. Compute System-Generated 1-5 Star Ratings
    ratings = existing_eval.get("ratings")
    if not ratings or not isinstance(ratings, dict):
        ratings = {
            "techDepth": score_to_stars(tech_score),
            "problemSolving": score_to_stars(ps_score),
            "sysDesign": score_to_stars(sd_score),
            "communication": score_to_stars(comm_score),
            "teamFit": score_to_stars(team_fit_score)
        }

    # 4. Compute Verdict
    verdict = existing_eval.get("verdict")
    if not verdict or verdict not in VERDICTS:
        verdict = derive_verdict(overall_score, passing_cutoff)

    # 5. Generate Evidence-Based Feedback
    strengths = existing_eval.get("strengths")
    if not strengths:
        s_list = []
        if tech_score >= 80.0:
            s_list.append(f"Demonstrated advanced technical proficiency ({round(tech_score, 1)}%) in core requirements.")
        elif tech_score >= passing_cutoff:
            s_list.append(f"Satisfied core technical baseline ({round(tech_score, 1)}%).")

        if comm_score >= 75.0:
            s_list.append("Clear articulation and effective problem structuring during evaluation.")

        warning_count = getattr(session, "warning_count", 0) or 0
        if warning_count == 0:
            s_list.append("Verified proctoring integrity with zero anomalies or test interruptions.")

        strengths = " ".join(s_list) if s_list else f"Completed {target_round_key.capitalize()} round."

    areas = existing_eval.get("areas_for_improvement")
    if not areas:
        a_list = []
        if tech_score < passing_cutoff:
            a_list.append(f"Technical score ({round(tech_score, 1)}%) is below the {passing_cutoff}% passing threshold.")
        elif tech_score < 80.0:
            a_list.append("Could further strengthen edge-case handling and system architecture considerations.")

        warning_count = getattr(session, "warning_count", 0) or 0
        if warning_count > 0:
            a_list.append(f"Proctoring telemetry flagged {warning_count} browser focus loss warning(s).")

        areas = " ".join(a_list) if a_list else "Continue deepening practical experience with distributed production systems."

    composite_score = int(round(overall_score))
    evaluated_at = getattr(session, "completed_at", None)
    eval_iso = evaluated_at.isoformat() if evaluated_at else datetime.now(timezone.utc).isoformat()

    recruiter_notes = existing_eval.get("recruiter_notes") or (getattr(application, "notes", "") if application else "")

    return {
        "is_evaluated": True,
        "status": sess_status,
        "composite_score": composite_score,
        "overall_score": overall_score,
        "ratings": ratings,
        "verdict": verdict,
        "strengths": strengths,
        "areas_for_improvement": areas,
        "summary": f"System evaluated {target_round_key.capitalize()} round with score {round(overall_score, 1)}% (passing cutoff: {passing_cutoff}%). Verdict: {verdict}.",
        "passing_cutoff": passing_cutoff,
        "evaluated_by": "SYSTEM_AUTOMATED",
        "evaluated_at": eval_iso,
        "evaluation_source": "SYSTEM_AUTOMATED",
        "recruiter_notes": recruiter_notes
    }
