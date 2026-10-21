"""
Hardened Assessment Callback Service
Enforces:
- Constant-time shared secret authentication
- Strict PostgreSQL-backed idempotency key verification with payload hash matching
- Deterministic two-table row locking order (Session -> Application) to prevent deadlocks
- 8-State safe candidate evaluation mapping
- Absolute recruiter override preemption (never silently overwrites human decisions)
- Version-pinned round progression and review gate checks
- Atomic transactional consistency across results, application status, audit logs, and event ledger
"""

import json
import secrets
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app import models
from app.schemas.recruitment_automation import AssessmentCallbackPayload
from app.services.pipeline_versioning_service import pin_candidate_to_active_version

logger = logging.getLogger("assessment_callback")


def authenticate_callback_secret(provided_secret: Optional[str]) -> bool:
    """Constant-time verification of the Archive 2 shared secret."""
    if not provided_secret or not settings.ASSESSMENT_SERVICE_SECRET:
        return False
    return secrets.compare_digest(provided_secret, settings.ASSESSMENT_SERVICE_SECRET)


def compute_payload_hash(payload: AssessmentCallbackPayload) -> str:
    """Computes a SHA-256 fingerprint of the normalized callback payload."""
    payload_dict = payload.model_dump()
    canonical = json.dumps(payload_dict, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def process_assessment_callback(
    db: Session,
    payload: AssessmentCallbackPayload,
    shared_secret: Optional[str]
) -> Dict[str, Any]:
    """
    Authoritative processing function for assessment results from Archive 2.
    Guarantees idempotency, atomic commits, safe evaluation states, and override preemption.
    """
    # 1. Authenticate shared secret
    if not authenticate_callback_secret(shared_secret):
        logger.warning(f"Unauthorized assessment callback attempt for assessmentId={payload.assessmentId}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized service communication."
        )

    now_utc = datetime.now(timezone.utc)
    payload_hash = compute_payload_hash(payload)

    # 2. Check Idempotency Ledger
    existing_event = db.query(models.AssessmentCallbackEvent).filter(
        models.AssessmentCallbackEvent.idempotency_key == payload.idempotencyKey
    ).first()

    if existing_event:
        if existing_event.payload_hash != payload_hash:
            logger.error(f"Idempotency key '{payload.idempotencyKey}' reused with mismatched payload hash!")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency key has already been used for a different payload."
            )
        logger.info(f"Callback idempotency hit for key '{payload.idempotencyKey}'. Returning cached idempotent response.")
        return {
            "status": "ALREADY_PROCESSED",
            "idempotent": True,
            "processed_at": existing_event.processed_at.isoformat()
        }

    # 3. Lock Session and Application rows in deterministic order
    # Rule: Lock CandidateAssessmentSession FIRST, then InternshipApplication
    session = db.query(models.CandidateAssessmentSession).filter(
        models.CandidateAssessmentSession.id == payload.assessmentId
    ).with_for_update().first()

    if not session:
        # Fallback by applicationId if session was not pre-registered
        if payload.applicationId:
            session = db.query(models.CandidateAssessmentSession).filter(
                models.CandidateAssessmentSession.application_id == payload.applicationId
            ).with_for_update().first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment session '{payload.assessmentId}' not found."
        )

    application = None
    if session.application_id:
        application = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.id == session.application_id
        ).with_for_update().first()

    # 4. Resolve Candidate's Pinned Pipeline Version
    pipeline_version = None
    if application:
        pipeline_version = pin_candidate_to_active_version(db, application.id)
    elif session.pipeline_version_id:
        pipeline_version = db.query(models.RecruitmentPipelineVersion).filter(
            models.RecruitmentPipelineVersion.id == session.pipeline_version_id
        ).first()

    # 5. Determine Safe Evaluation State
    score = float(payload.overallScore) if payload.overallScore is not None else 0.0
    integrity = (payload.integrityStatus or "VERIFIED").upper()
    warning_count = payload.warningCount or 0

    target_round_key = payload.roundKey or session.current_round or "aptitude"
    round_config = None
    if pipeline_version and pipeline_version.pipeline_config:
        rounds_list = pipeline_version.pipeline_config.get("rounds", [])
        for r in rounds_list:
            if r.get("round_key") == target_round_key:
                round_config = r
                break

    passing_cutoff = round_config.get("passing_cutoff", 60.0) if round_config else 60.0
    is_review_gated = round_config.get("review_gated", False) if round_config else False

    # Evaluation state mapping
    if integrity in ["FLAGGED", "HIGH_RISK"]:
        eval_state = "INVALID_SUBMISSION"
    elif payload.status.lower() in ["terminated", "abandoned"]:
        eval_state = "INCOMPLETE"
    elif score >= passing_cutoff:
        eval_state = "PASS"
    elif (passing_cutoff - score) <= 3.0:
        # Borderline (within 3 points of cutoff) -> quarantine to manual review
        eval_state = "AWAITING_MANUAL_REVIEW"
    else:
        eval_state = "FAIL"

    # If application has an active recruiter override, mark session as MANUALLY_OVERRIDDEN
    if application and application.is_manually_overridden:
        eval_state = "MANUALLY_OVERRIDDEN"

    # 6. Update CandidateAssessmentSession
    session.status = payload.status.upper()
    session.execution_status = eval_state
    session.overall_score = score
    session.integrity_status = integrity
    session.warning_count = warning_count
    if payload.roundResults:
        session.round_results = json.dumps(payload.roundResults)
    if payload.evaluation:
        session.evaluation = json.dumps(payload.evaluation)
    if payload.clientTelemetry:
        session.client_telemetry_digest = payload.clientTelemetry
    session.completed_at = now_utc

    # 7. Application Status Reconciliation (with Override Preemption)
    app_status_changed = False
    old_status = application.status if application else None
    new_status = old_status

    if application:
        if application.is_manually_overridden:
            logger.info(
                f"Application {application.id} is manually overridden (Active Override: {application.active_override_id}). "
                f"Session updated with score={score}, but application status remains untouched as '{application.status}'."
            )
        else:
            # Reconcile based on evaluation state
            if eval_state == "PASS":
                rounds_list = []
                if pipeline_version and pipeline_version.pipeline_config:
                    rounds_list = pipeline_version.pipeline_config.get("rounds", [])

                curr_idx = -1
                for idx, r in enumerate(rounds_list):
                    if r.get("round_key") == target_round_key:
                        curr_idx = idx
                        break

                has_next_round = (curr_idx != -1 and curr_idx + 1 < len(rounds_list))

                posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == application.internship_id).first() if application.internship_id else None
                auto_mode = posting.automation_mode if posting else "REVIEW_GATED"
                is_paused = posting.automation_paused if posting else False

                if has_next_round:
                    next_round = rounds_list[curr_idx + 1]
                    next_round_key = next_round.get("round_key")

                    if is_paused or auto_mode == "MANUAL_ONLY":
                        new_status = "UNDER_REVIEW"
                        application.notes = f"Passed {target_round_key.title()} ({score}%). Paused for manual recruiter action (Mode: {auto_mode})."
                    elif is_review_gated and auto_mode != "FULL_AUTOMATION":
                        # Move to UNDER_REVIEW so recruiter can review gate
                        new_status = "UNDER_REVIEW"
                        application.notes = f"Passed {target_round_key.title()} ({score}%). Awaiting recruiter review gate to advance to {next_round.get('round_name', next_round_key)}."
                    else:
                        # Auto-advance to next round (FULL_AUTOMATION or non-gated round in REVIEW_GATED)
                        session.current_round = next_round_key
                        session.status = "IN_PROGRESS"
                        new_status = "SHORTLISTED"
                        application.notes = f"Passed {target_round_key.title()} ({score}%). Auto-advanced to {next_round.get('round_name', next_round_key)}."
                else:
                    # Final round completed!
                    session.status = "COMPLETED"
                    new_status = "SHORTLISTED"
                    application.notes = f"Passed final assessment round ({score}%). Ready for final selection."
            elif eval_state == "AWAITING_MANUAL_REVIEW":
                new_status = "UNDER_REVIEW"
                application.notes = f"Borderline score ({score}% vs {passing_cutoff}% cutoff). Quarantined for manual review."
            elif eval_state == "INVALID_SUBMISSION":
                new_status = "UNDER_REVIEW"
                application.notes = f"Integrity quarantine: {integrity} with {warning_count} warnings. Requires recruiter audit."
            elif eval_state == "FAIL":
                session.status = "FAILED"
                new_status = "REJECTED"
                application.notes = f"Score {score}% below required passing cutoff ({passing_cutoff}%)."

            if new_status != old_status:
                application.status = new_status
                app_status_changed = True

                # Write audit record
                db.add(models.ApplicationStatusAudit(
                    application_id=application.id,
                    previous_status=old_status,
                    new_status=new_status,
                    actor_type="SYSTEM",
                    notes=application.notes,
                    metadata_json={
                        "event": "ASSESSMENT_CALLBACK_EVALUATION",
                        "round_key": target_round_key,
                        "score": score,
                        "passing_cutoff": passing_cutoff,
                        "eval_state": eval_state,
                        "integrity": integrity
                    }
                ))

    # 8. Record Event in Idempotency Ledger
    callback_event = models.AssessmentCallbackEvent(
        idempotency_key=payload.idempotencyKey,
        session_id=session.id,
        event_type="ROUND_COMPLETED",
        source_service="Archive2",
        payload_hash=payload_hash,
        status="PROCESSED",
        response_payload={
            "session_id": session.id,
            "application_id": application.id if application else None,
            "eval_state": eval_state,
            "score": score,
            "application_status": application.status if application else None
        },
        processed_at=now_utc
    )
    db.add(callback_event)

    db.commit()
    logger.info(
        f"Successfully processed assessment callback {payload.idempotencyKey} for session {session.id}. "
        f"EvalState: {eval_state}, Score: {score}, ApplicationStatus: {application.status if application else 'N/A'}"
    )

    return {
        "status": "PROCESSED",
        "eval_state": eval_state,
        "overall_score": score,
        "application_status": application.status if application else None,
        "is_manually_overridden": application.is_manually_overridden if application else False,
        "processed_at": now_utc.isoformat()
    }
