"""
Final Ranking & Selection Service
Enforces:
- Version-pinned composite weighted score calculations
- Deterministic tie-breaking rules
- Vacancy count limit enforcement (never over-selects beyond opening vacancy count)
- Deduplication and concurrency protection via row locks
- Safe quarantine of unresolved errors from the finalist cohort
"""

import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app import models

logger = logging.getLogger("final_selection")


def calculate_composite_score(
    round_results: Dict[str, Any],
    scoring_weights: Dict[str, Any]
) -> float:
    """
    Computes weighted composite score:
    Sum of (Round Score * (Weight / Total Weights))
    """
    weights = scoring_weights.get("weights_by_round", {})
    total_weight = sum(weights.values()) if weights else 100.0
    if total_weight <= 0:
        total_weight = 100.0

    weighted_sum = 0.0
    for round_key, round_weight in weights.items():
        round_data = round_results.get(round_key, {})
        score = 0.0
        if isinstance(round_data, dict):
            score = float(round_data.get("score") or round_data.get("overallScore") or 0.0)
        elif isinstance(round_data, (int, float)):
            score = float(round_data)

        weighted_sum += score * (round_weight / total_weight)

    return round(weighted_sum, 2)


def rank_and_select_candidates(
    db: Session,
    internship_id: int,
    auto_select: bool = False
) -> Dict[str, Any]:
    """
    Executes vacancy-aware finalist ranking and optional final selection.
    Uses pessimistic row locking on InternshipPosting to prevent concurrent over-selection.
    """
    now_utc = datetime.now(timezone.utc)

    # 1. Pessimistic lock on opening
    posting = db.query(models.InternshipPosting).filter(
        models.InternshipPosting.id == internship_id
    ).with_for_update().first()

    if not posting:
        raise ValueError(f"Internship {internship_id} not found.")

    vacancies = max(1, posting.openings or 1)

    # Check already selected candidates (e.g. from prior selections or recruiter manual overrides)
    already_selected_apps = db.query(models.InternshipApplication).filter(
        models.InternshipApplication.internship_id == internship_id,
        models.InternshipApplication.status == "SELECTED"
    ).all()
    already_selected_ids = {a.id for a in already_selected_apps}
    available_vacancies = max(0, vacancies - len(already_selected_apps))

    # 2. Query all applications for this opening that are candidates for final selection
    # (Status = SHORTLISTED or UNDER_REVIEW where rounds completed)
    candidate_apps = db.query(models.InternshipApplication).filter(
        models.InternshipApplication.internship_id == internship_id,
        models.InternshipApplication.status.in_(["SHORTLISTED", "UNDER_REVIEW"])
    ).all()

    ranked_cohort = []

    for app in candidate_apps:
        if app.id in already_selected_ids:
            continue
        # Check active recruiter override
        if app.is_manually_overridden and app.status in ["REJECTED", "ON_HOLD"]:
            continue  # Excluded by recruiter manual authority

        # Fetch assessment session
        session = db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.application_id == app.id
        ).first()

        # Exclude candidates with unresolved evaluation errors or pending proctoring quarantine
        if session and session.execution_status in ["EVALUATION_ERROR", "INVALID_SUBMISSION", "INCOMPLETE"]:
            continue

        round_results = {}
        warning_count = 0
        tech_score = 0.0

        if session:
            if session.round_results:
                try:
                    round_results = json.loads(session.round_results)
                except Exception:
                    pass
            warning_count = session.warning_count or 0
            tech_data = round_results.get("technical", {})
            tech_score = float(tech_data.get("score", 0.0)) if isinstance(tech_data, dict) else 0.0

        # Pinned pipeline version weights
        weights = {"weights_by_round": {"technical": 100.0}}
        if app.pipeline_version and app.pipeline_version.scoring_weights:
            weights = app.pipeline_version.scoring_weights

        composite_score = calculate_composite_score(round_results, weights)
        if session and session.overall_score:
            composite_score = max(composite_score, float(session.overall_score))

        # Skill match score as secondary evidence
        verified_evidence_score = float(app.match_score_at_apply or 0.0)

        applied_ts = app.applied_at or now_utc

        ranked_cohort.append({
            "application_id": app.id,
            "student_id": app.student_id,
            "composite_score": composite_score,
            "tech_score": tech_score,
            "verified_evidence_score": verified_evidence_score,
            "warning_count": warning_count,
            "applied_ts": applied_ts,
            "app_instance": app
        })

    # 3. Deterministic Multi-Level Sorting:
    # Key 1: Composite Score (descending)
    # Key 2: Technical Score (descending)
    # Key 3: Verified Evidence Score (descending)
    # Key 4: Warning Count (ascending)
    # Key 5: Applied Timestamp (ascending)
    ranked_cohort.sort(
        key=lambda x: (
            -x["composite_score"],
            -x["tech_score"],
            -x["verified_evidence_score"],
            x["warning_count"],
            x["applied_ts"]
        )
    )

    selected_list = []
    waitlisted_list = []

    # 4. Enforce Vacancy Limit
    for rank_idx, item in enumerate(ranked_cohort, start=1):
        app = item["app_instance"]
        is_selected = rank_idx <= available_vacancies

        if is_selected:
            selected_list.append({
                "rank": rank_idx,
                "application_id": app.id,
                "student_id": app.student_id,
                "composite_score": item["composite_score"]
            })
            if auto_select and not app.is_manually_overridden:
                old_status = app.status
                app.status = "SELECTED"
                app.notes = f"Selected for opening (Rank #{rank_idx} of {len(ranked_cohort)} | Composite: {item['composite_score']}%)"
                db.add(models.ApplicationStatusAudit(
                    application_id=app.id,
                    previous_status=old_status,
                    new_status="SELECTED",
                    actor_type="SYSTEM",
                    notes=app.notes,
                    metadata_json={
                        "event": "AUTOMATED_FINAL_SELECTION",
                        "rank": rank_idx,
                        "composite_score": item["composite_score"],
                        "vacancies": vacancies
                    }
                ))

                # Asynchronously enqueue offer extended notification
                from app.services.job_queue_service import enqueue_job
                student = db.query(models.StudentUser).filter(models.StudentUser.id == app.student_id).first()
                if student:
                    enqueue_job(
                        db=db,
                        job_type="SEND_NOTIFICATION",
                        payload={
                            "application_id": app.id,
                            "student_id": student.id,
                            "email_type": "OFFER_EXTENDED",
                            "recipient_email": student.email,
                            "subject": f"Congratulations! Offer Extended for {posting.title}"
                        },
                        idempotency_key=f"notify_offer_{app.id}"
                    )
        else:
            waitlisted_list.append({
                "rank": rank_idx,
                "application_id": app.id,
                "student_id": app.student_id,
                "composite_score": item["composite_score"]
            })
            if auto_select and not app.is_manually_overridden and app.status != "SELECTED":
                app.status = "UNDER_REVIEW"
                app.notes = f"Finalist Waitlisted (Rank #{rank_idx} | Vacancies: {vacancies})"

    db.commit()
    logger.info(
        f"Final ranking for Internship {internship_id} complete: "
        f"{len(selected_list)} selected (vacancies: {vacancies}), {len(waitlisted_list)} waitlisted."
    )

    return {
        "internship_id": internship_id,
        "vacancies": vacancies,
        "total_finalists": len(ranked_cohort),
        "selected": selected_list,
        "waitlisted": waitlisted_list,
        "auto_selected_executed": auto_select
    }
