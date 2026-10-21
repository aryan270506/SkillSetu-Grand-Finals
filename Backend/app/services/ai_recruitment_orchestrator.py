"""
AI Recruitment Orchestrator
Registers job handlers and coordinates the end-to-end automated lifecycle:
1. SCREEN_APPLICANT: Deterministic screening & shortlisting
2. PROGRESS_ROUND: Advancing candidate to next round
3. FINAL_SELECTION_SWEEP: Vacancy-aware ranking & selection
4. SEND_RECRUITMENT_EMAIL: Asynchronous notification dispatch
"""

import json
import logging
from typing import Dict, Any

from sqlalchemy.orm import Session
from app import models
from app.services.job_queue_service import register_job_handler, enqueue_job
from app.services.deterministic_eligibility_service import build_candidate_screening_dto, evaluate_candidate_eligibility
from app.services.pipeline_versioning_service import pin_candidate_to_active_version
from app.services.final_selection_service import rank_and_select_candidates

logger = logging.getLogger("recruitment_orchestrator")


def handle_screen_applicant(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes deterministic qualification screening for an applicant.
    """
    app_id = payload.get("application_id")
    app = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == app_id).first()
    if not app:
        raise ValueError(f"Application {app_id} not found.")

    student = db.query(models.StudentUser).filter(models.StudentUser.id == app.student_id).first()
    if not student:
        raise ValueError(f"Student {app.student_id} not found.")

    version = pin_candidate_to_active_version(db, app.id)
    rules = version.eligibility_rules or {}

    dto = build_candidate_screening_dto(student)
    result = evaluate_candidate_eligibility(dto, rules)

    app.eligibility_status = result["eligibility_status"]
    app.eligibility_breakdown = result
    app.match_score_at_apply = result["overall_match_score"]

    if result["is_eligible"]:
        posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == app.internship_id).first()
        is_paused = posting.automation_paused if posting else False
        auto_mode = posting.automation_mode if posting else "REVIEW_GATED"
        policy = version.automation_policy or {}

        if not is_paused and auto_mode != "MANUAL_ONLY" and policy.get("shortlist_mode") == "IMMEDIATE" and policy.get("auto_screen", True):
            app.status = "SHORTLISTED"
            app.notes = f"Deterministic screening passed ({result['overall_match_score']}%). Shortlisted for Round 1."

            # Automatically initialize CandidateAssessmentSession pinned to version for Round 1
            rounds = (version.pipeline_config or {}).get("rounds", [])
            round1_key = rounds[0].get("round_key", "aptitude") if rounds else "aptitude"

            session = db.query(models.CandidateAssessmentSession).filter(
                models.CandidateAssessmentSession.application_id == app.id
            ).first()
            if not session:
                import uuid
                session_id = uuid.uuid4().hex[:16]
                session = models.CandidateAssessmentSession(
                    id=session_id,
                    student_id=app.student_id,
                    application_id=app.id,
                    internship_id=app.internship_id,
                    company_id=app.company_id,
                    status="CREATED",
                    current_round=round1_key,
                    pipeline_version_id=version.id
                )
                db.add(session)

            # Enqueue asynchronous candidate notification
            enqueue_job(
                db=db,
                job_type="SEND_NOTIFICATION",
                payload={
                    "application_id": app.id,
                    "student_id": student.id,
                    "email_type": "SCREENING_PASSED",
                    "recipient_email": student.email,
                    "subject": f"SkillSetu Screening Passed: Shortlisted for Round 1 ({round1_key.capitalize()})"
                },
                idempotency_key=f"notify_screen_{app.id}"
            )
        else:
            app.status = "UNDER_REVIEW"
            if is_paused:
                app.notes = f"Deterministic screening passed ({result['overall_match_score']}%). Held: automation paused."
            elif auto_mode == "MANUAL_ONLY":
                app.notes = f"Deterministic screening passed ({result['overall_match_score']}%). Held for manual recruiter shortlisting (MANUAL_ONLY mode)."
            else:
                app.notes = f"Deterministic screening passed ({result['overall_match_score']}%). Held for batch review."
    elif result["requires_manual_review"]:
        app.status = "UNDER_REVIEW"
        app.notes = f"Borderline screening result ({result['overall_match_score']}%). Quarantined for manual review."
    else:
        app.status = "REJECTED"
        app.notes = f"Did not meet minimum qualifications: {', '.join(result['failure_reasons'])}"

    db.add(models.ApplicationStatusAudit(
        application_id=app.id,
        previous_status="APPLIED",
        new_status=app.status,
        actor_type="SYSTEM",
        notes=app.notes,
        metadata_json={
            "event": "DETERMINISTIC_SCREENING",
            "score": result["overall_match_score"],
            "status": result["eligibility_status"]
        }
    ))

    db.commit()
    return {"application_id": app.id, "status": app.status, "eligibility": result["eligibility_status"]}


def handle_progress_round(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Advances an eligible candidate to their next scheduled assessment round.
    """
    app_id = payload.get("application_id")
    target_round = payload.get("target_round")

    app = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == app_id).first()
    if not app:
        raise ValueError(f"Application {app_id} not found.")

    old_status = app.status
    app.status = "SHORTLISTED"
    app.notes = f"Advanced to round: {target_round}"

    session = db.query(models.CandidateAssessmentSession).filter(
        models.CandidateAssessmentSession.application_id == app.id
    ).first()
    if session:
        session.current_round = target_round
        session.status = "IN_PROGRESS"

    db.add(models.ApplicationStatusAudit(
        application_id=app.id,
        previous_status=old_status,
        new_status=app.status,
        actor_type="SYSTEM",
        notes=app.notes,
        metadata_json={"event": "ROUND_ADVANCEMENT", "target_round": target_round}
    ))
    db.commit()
    return {"application_id": app.id, "target_round": target_round}


def handle_final_selection_sweep(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes vacancy-aware final selection sweep for an opening.
    """
    internship_id = payload.get("internship_id")
    auto_select = payload.get("auto_select", False)
    return rank_and_select_candidates(db, internship_id, auto_select=auto_select)


def handle_send_notification(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transactional email & in-app notification logging handler.
    """
    app_id = payload.get("application_id")
    student_id = payload.get("student_id")
    email_type = payload.get("email_type", "ROUND_UPDATE")
    recipient = payload.get("recipient_email", "student@example.com")
    subject = payload.get("subject", "SkillSetu Application Update")

    log_entry = models.ApplicationEmailLog(
        application_id=app_id,
        student_id=student_id,
        email_type=email_type,
        recipient_email=recipient,
        sender_email="noreply@skillsetu.com",
        subject=subject,
        status="SENT"
    )
    db.add(log_entry)
    db.commit()
    return {"log_id": log_entry.id, "status": "SENT"}


# Register all authoritative business handlers with durable job queue
register_job_handler("SCREEN_APPLICANT", handle_screen_applicant)
register_job_handler("PROGRESS_ROUND", handle_progress_round)
register_job_handler("FINAL_SELECTION_SWEEP", handle_final_selection_sweep)
register_job_handler("SEND_NOTIFICATION", handle_send_notification)
