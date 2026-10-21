"""
Recruiter Override Service
Enforces:
- Absolute precedence of recruiter manual decisions over automated state transitions
- Mandatory machine-readable reason codes and detailed justification
- Audit trail recording previous state, new state, actor, and applicable version
- Non-blocking reversal / revocation of overrides with optional automated re-evaluation
"""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

from sqlalchemy.orm import Session
from app import models
from app.schemas.recruitment_automation import RecruiterOverrideCreate, RecruiterOverrideRevoke

logger = logging.getLogger("recruiter_override")


def apply_recruiter_override(
    db: Session,
    recruiter_id: int,
    application_id: int,
    override_data: RecruiterOverrideCreate
) -> Tuple[models.RecruiterDecisionOverride, models.InternshipApplication]:
    """
    Applies an auditable manual override to an application:
    1. Validates recruiter authorization for the company.
    2. Supersedes any currently active override.
    3. Records previous and new state snapshots.
    4. Updates application status and sets is_manually_overridden = True.
    5. Inserts an immutable ApplicationStatusAudit entry.
    """
    app = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == application_id).first()
    if not app:
        raise ValueError(f"Application {application_id} not found.")

    recruiter = db.query(models.RecruiterUser).filter(models.RecruiterUser.id == recruiter_id).first()
    if not recruiter:
        raise ValueError(f"Recruiter {recruiter_id} not found.")

    # Validate company-level tenant isolation
    if app.company_id and recruiter.company_id and app.company_id != recruiter.company_id:
        raise PermissionError(f"Recruiter {recruiter_id} from Company {recruiter.company_id} cannot override application {application_id} belonging to Company {app.company_id}.")

    now_utc = datetime.now(timezone.utc)

    # 1. Supersede any existing active override
    active_existing = db.query(models.RecruiterDecisionOverride).filter(
        models.RecruiterDecisionOverride.application_id == application_id,
        models.RecruiterDecisionOverride.status == "ACTIVE"
    ).all()
    for o in active_existing:
        o.status = "SUPERSEDED"

    previous_state = {
        "status": app.status,
        "is_manually_overridden": app.is_manually_overridden,
        "active_override_id": app.active_override_id,
        "notes": app.notes,
        "timestamp": now_utc.isoformat()
    }

    # 2. Determine target status from override type
    target_status = override_data.target_status
    if not target_status:
        if override_data.override_type in ["FORCE_ADVANCE_ROUND", "MANUAL_SHORTLIST"]:
            target_status = "SHORTLISTED"
        elif override_data.override_type == "MANUAL_REJECT":
            target_status = "REJECTED"
        elif override_data.override_type == "PUT_ON_HOLD":
            target_status = "ON_HOLD"
        elif override_data.override_type == "MANUAL_FINAL_SELECT":
            target_status = "SELECTED"
        elif override_data.override_type == "REVERT_ROUND":
            target_status = "UNDER_REVIEW"
        else:
            target_status = app.status

    new_state = {
        "status": target_status,
        "target_round_key": override_data.target_round_key,
        "revised_score": override_data.revised_score,
        "override_type": override_data.override_type,
        "reason_code": override_data.reason_code,
        "justification": override_data.justification,
        "timestamp": now_utc.isoformat()
    }

    # 3. Create the override record
    override_record = models.RecruiterDecisionOverride(
        application_id=application_id,
        recruiter_id=recruiter_id,
        override_type=override_data.override_type,
        status="ACTIVE",
        previous_state=previous_state,
        new_state=new_state,
        reason_code=override_data.reason_code,
        justification=override_data.justification,
        created_at=now_utc
    )
    db.add(override_record)
    db.flush()

    # 4. Mutate application
    app.status = target_status
    app.is_manually_overridden = True
    app.active_override_id = override_record.id
    app.notes = f"Recruiter Override [{override_data.override_type}]: {override_data.reason_code} - {override_data.justification}"

    # 5. Insert immutable audit entry
    audit_entry = models.ApplicationStatusAudit(
        application_id=application_id,
        previous_status=previous_state["status"],
        new_status=target_status,
        changed_by_recruiter_id=recruiter_id,
        actor_type="RECRUITER",
        override_id=override_record.id,
        notes=f"Recruiter override applied: {override_data.override_type} ({override_data.reason_code})",
        metadata_json={
            "override_id": override_record.id,
            "override_type": override_data.override_type,
            "reason_code": override_data.reason_code,
            "justification": override_data.justification,
            "enacted_at": now_utc.isoformat()
        }
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(override_record)
    db.refresh(app)
    logger.info(f"Recruiter {recruiter_id} successfully applied override {override_record.id} to Application {application_id} (Status: {target_status})")
    return override_record, app


def revoke_recruiter_override(
    db: Session,
    recruiter_id: int,
    application_id: int,
    revoke_params: RecruiterOverrideRevoke
) -> models.InternshipApplication:
    """
    Revokes the active manual override on an application.
    Marks override as REVOKED, clears application is_manually_overridden flag,
    and optionally enqueues automated re-evaluation.
    """
    app = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == application_id).first()
    if not app:
        raise ValueError(f"Application {application_id} not found.")

    recruiter = db.query(models.RecruiterUser).filter(models.RecruiterUser.id == recruiter_id).first()
    if not recruiter:
        raise ValueError(f"Recruiter {recruiter_id} not found.")

    if app.company_id and recruiter.company_id and app.company_id != recruiter.company_id:
        raise PermissionError(f"Recruiter {recruiter_id} cannot revoke override for company {app.company_id}.")

    now_utc = datetime.now(timezone.utc)

    active_override = db.query(models.RecruiterDecisionOverride).filter(
        models.RecruiterDecisionOverride.application_id == application_id,
        models.RecruiterDecisionOverride.status == "ACTIVE"
    ).first()

    if active_override:
        active_override.status = "REVOKED"
        active_override.revoked_at = now_utc
        active_override.revoked_by_id = recruiter_id

    app.is_manually_overridden = False
    app.active_override_id = None

    # Record audit log
    audit_entry = models.ApplicationStatusAudit(
        application_id=application_id,
        previous_status=app.status,
        new_status=app.status,
        changed_by_recruiter_id=recruiter_id,
        actor_type="RECRUITER",
        notes=f"Recruiter override revoked. Rerun automation: {revoke_params.rerun_automation}",
        metadata_json={
            "event": "OVERRIDE_REVOCATION",
            "revoked_override_id": active_override.id if active_override else None,
            "rerun_automation": revoke_params.rerun_automation,
            "reason": revoke_params.reason
        }
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(app)

    logger.info(f"Recruiter {recruiter_id} revoked override on Application {application_id}")
    return app
