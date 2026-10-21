"""
Pipeline Versioning Service
Enforces:
- Immutable published pipeline snapshots with SHA-256 content fingerprints
- Candidate version pinning (candidates remain bound to the version active when they applied)
- Safe drafting and publication workflows
- Explicit audited candidate version migration (only for unstarted applicants)
- Safe legacy application fallback
"""

import json
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple

from sqlalchemy.orm import Session
from app import models
from app.schemas.recruitment_automation import (
    PipelineConfigSchema,
    EvaluationRubricsSchema,
    EligibilityRulesSchema,
    ScoringWeightsSchema,
    AutomationPolicySchema,
)

logger = logging.getLogger("pipeline_versioning")


def compute_pipeline_content_hash(
    pipeline_config: Dict[str, Any],
    evaluation_rubrics: Dict[str, Any],
    eligibility_rules: Dict[str, Any],
    scoring_weights: Dict[str, Any],
    automation_policy: Dict[str, Any]
) -> str:
    """
    Computes a deterministic SHA-256 cryptographic hash of canonicalized configuration dictionaries.
    """
    normalized_dict = {
        "pipeline_config": pipeline_config,
        "evaluation_rubrics": evaluation_rubrics,
        "eligibility_rules": eligibility_rules,
        "scoring_weights": scoring_weights,
        "automation_policy": automation_policy
    }
    canonical_json = json.dumps(normalized_dict, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


def create_or_update_pipeline_draft(
    db: Session,
    internship_id: int,
    recruiter_id: int,
    pipeline_config: Dict[str, Any],
    evaluation_rubrics: Dict[str, Any],
    eligibility_rules: Dict[str, Any],
    scoring_weights: Dict[str, Any],
    automation_policy: Dict[str, Any]
) -> models.RecruitmentPipelineVersion:
    """
    Creates or updates the DRAFT pipeline version for an internship posting.
    Validates all inputs against Pydantic schemas.
    """
    # 1. Validate against Pydantic schemas
    PipelineConfigSchema.model_validate(pipeline_config)
    EvaluationRubricsSchema.model_validate(evaluation_rubrics)
    EligibilityRulesSchema.model_validate(eligibility_rules)
    ScoringWeightsSchema.model_validate(scoring_weights)
    AutomationPolicySchema.model_validate(automation_policy)

    posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == internship_id).first()
    if not posting:
        raise ValueError(f"Internship posting {internship_id} not found.")

    # Compute content hash
    content_hash = compute_pipeline_content_hash(
        pipeline_config=pipeline_config,
        evaluation_rubrics=evaluation_rubrics,
        eligibility_rules=eligibility_rules,
        scoring_weights=scoring_weights,
        automation_policy=automation_policy
    )

    # Check if a DRAFT version already exists
    draft_version = None
    if posting.draft_pipeline_version_id:
        draft_version = db.query(models.RecruitmentPipelineVersion).filter(
            models.RecruitmentPipelineVersion.id == posting.draft_pipeline_version_id,
            models.RecruitmentPipelineVersion.status == "DRAFT"
        ).first()

    if draft_version:
        draft_version.pipeline_config = pipeline_config
        draft_version.evaluation_rubrics = evaluation_rubrics
        draft_version.eligibility_rules = eligibility_rules
        draft_version.scoring_weights = scoring_weights
        draft_version.automation_policy = automation_policy
        draft_version.content_hash = content_hash
        draft_version.updated_at = datetime.now(timezone.utc)
    else:
        # Determine next version number
        latest_version = db.query(models.RecruitmentPipelineVersion).filter(
            models.RecruitmentPipelineVersion.internship_id == internship_id
        ).order_by(models.RecruitmentPipelineVersion.version_number.desc()).first()

        next_version_num = (latest_version.version_number + 1) if latest_version else 1

        draft_version = models.RecruitmentPipelineVersion(
            internship_id=internship_id,
            version_number=next_version_num,
            status="DRAFT",
            content_hash=content_hash,
            pipeline_config=pipeline_config,
            evaluation_rubrics=evaluation_rubrics,
            eligibility_rules=eligibility_rules,
            scoring_weights=scoring_weights,
            automation_policy=automation_policy,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(draft_version)
        db.flush()
        posting.draft_pipeline_version_id = draft_version.id

    db.commit()
    db.refresh(draft_version)
    return draft_version


def publish_pipeline_version(
    db: Session,
    internship_id: int,
    recruiter_id: int,
    migrate_unstarted_applicants: bool = False
) -> Tuple[models.RecruitmentPipelineVersion, int]:
    """
    Publishes the current DRAFT pipeline version:
    1. Marks draft as PUBLISHED, updates timestamps and publisher.
    2. Updates posting.active_pipeline_version_id to this version.
    3. Clears posting.draft_pipeline_version_id.
    4. If migrate_unstarted_applicants is True:
       - Migrates applicants who have NOT started any assessment session.
       - Ongoing assessments remain strictly untouched.
    Returns (published_version, migrated_candidates_count).
    """
    posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == internship_id).first()
    if not posting:
        raise ValueError(f"Internship posting {internship_id} not found.")

    if not posting.draft_pipeline_version_id:
        raise ValueError(f"Internship posting {internship_id} has no draft pipeline version to publish.")

    draft_version = db.query(models.RecruitmentPipelineVersion).filter(
        models.RecruitmentPipelineVersion.id == posting.draft_pipeline_version_id,
        models.RecruitmentPipelineVersion.status == "DRAFT"
    ).first()

    if not draft_version:
        raise ValueError(f"Draft pipeline version {posting.draft_pipeline_version_id} not found or not in DRAFT state.")

    now_utc = datetime.now(timezone.utc)
    prior_active_version_id = posting.active_pipeline_version_id

    # If a prior active version exists, mark it SUPERSEDED
    if prior_active_version_id:
        prior_version = db.query(models.RecruitmentPipelineVersion).filter(
            models.RecruitmentPipelineVersion.id == prior_active_version_id
        ).first()
        if prior_version:
            prior_version.status = "SUPERSEDED"

    # Promote draft to PUBLISHED
    draft_version.status = "PUBLISHED"
    draft_version.published_by_id = recruiter_id
    draft_version.published_at = now_utc
    draft_version.updated_at = now_utc

    posting.active_pipeline_version_id = draft_version.id
    posting.draft_pipeline_version_id = None

    # Handle unstarted candidate migration if requested
    migrated_count = 0
    if migrate_unstarted_applicants and prior_active_version_id:
        # Candidates in 'APPLIED' status who have NO CandidateAssessmentSession record
        unstarted_apps = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.internship_id == internship_id,
            models.InternshipApplication.pipeline_version_id == prior_active_version_id,
            models.InternshipApplication.status.in_(["APPLIED", "UNDER_REVIEW"])
        ).all()

        for app in unstarted_apps:
            # Confirm no active assessment session exists
            has_session = db.query(models.CandidateAssessmentSession).filter(
                models.CandidateAssessmentSession.application_id == app.id
            ).first()

            if not has_session:
                app.pipeline_version_id = draft_version.id
                migrated_count += 1

                # Record migration audit entry
                db.add(models.ApplicationStatusAudit(
                    application_id=app.id,
                    previous_status=app.status,
                    new_status=app.status,
                    changed_by_recruiter_id=recruiter_id,
                    actor_type="RECRUITER",
                    notes=f"Migrated from Pipeline Version {prior_active_version_id} to Version {draft_version.version_number} prior to assessment start.",
                    metadata_json={
                        "event": "PIPELINE_VERSION_MIGRATION",
                        "old_version_id": prior_active_version_id,
                        "new_version_id": draft_version.id,
                        "new_version_number": draft_version.version_number
                    }
                ))

    db.commit()
    db.refresh(draft_version)
    logger.info(
        f"Published Pipeline Version {draft_version.version_number} (ID: {draft_version.id}) "
        f"for Internship {internship_id}. Migrated {migrated_count} unstarted applicants."
    )
    return draft_version, migrated_count


def pin_candidate_to_active_version(
    db: Session,
    application_id: int
) -> models.RecruitmentPipelineVersion:
    """
    Binds an applicant to the currently published pipeline version.
    If no published version exists, creates a default baseline Version 1 snapshot.
    """
    app = db.query(models.InternshipApplication).filter(models.InternshipApplication.id == application_id).first()
    if not app:
        raise ValueError(f"Application {application_id} not found.")

    if app.pipeline_version_id:
        pinned = db.query(models.RecruitmentPipelineVersion).filter(
            models.RecruitmentPipelineVersion.id == app.pipeline_version_id
        ).first()
        if pinned:
            return pinned

    posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == app.internship_id).first()
    if not posting:
        raise ValueError(f"Internship {app.internship_id} for application {application_id} not found.")

    if posting.active_pipeline_version_id:
        active_ver = db.query(models.RecruitmentPipelineVersion).filter(
            models.RecruitmentPipelineVersion.id == posting.active_pipeline_version_id
        ).first()
        if active_ver:
            app.pipeline_version_id = active_ver.id
            db.commit()
            return active_ver

    # Safe fallback: create a default baseline published version 1 for legacy postings
    baseline_ver = _create_default_baseline_version(db, posting)
    app.pipeline_version_id = baseline_ver.id
    db.commit()
    return baseline_ver


def _create_default_baseline_version(
    db: Session,
    posting: models.InternshipPosting
) -> models.RecruitmentPipelineVersion:
    """Creates a canonical baseline published version for existing or unconfigured postings."""
    now_utc = datetime.now(timezone.utc)
    default_config = {
        "rounds": [
            {
                "round_key": "aptitude",
                "round_name": "Aptitude Assessment",
                "enabled": True,
                "order": 1,
                "duration_minutes": 30,
                "passing_cutoff": 60.0,
                "review_gated": False,
                "parameters": {"question_count": 15, "category": "general"}
            },
            {
                "round_key": "technical",
                "round_name": "Technical Assessment",
                "enabled": True,
                "order": 2,
                "duration_minutes": 45,
                "passing_cutoff": 60.0,
                "review_gated": False,
                "parameters": {"coding_problems": 2, "languages": ["python", "javascript"]}
            },
            {
                "round_key": "interview",
                "round_name": "AI Voice Interview",
                "enabled": True,
                "order": 3,
                "duration_minutes": 20,
                "passing_cutoff": 60.0,
                "review_gated": True,
                "parameters": {"question_count": 6}
            }
        ],
        "proctoring": {
            "camera_required": True,
            "mic_required": True,
            "max_warnings": 3
        }
    }
    default_rubrics = {
        "rubrics_by_round": {
            "aptitude": {"accuracy_weight": 1.0},
            "technical": {"correctness": 50, "time_complexity": 25, "code_quality": 25},
            "interview": {"technical_depth": 40, "communication": 30, "problem_solving": 30}
        }
    }
    default_eligibility = {
        "min_cgpa": 6.0,
        "allowed_degrees": ["B.Tech", "B.E.", "MCA", "B.Sc", "BCA"],
        "allowed_branches": ["All"],
        "allowed_graduation_years": [2025, 2026, 2027],
        "mandatory_skills": [],
        "preferred_skills": [],
        "work_modes_accepted": ["Remote", "Hybrid", "On-site"]
    }
    default_scoring = {
        "weights_by_round": {"aptitude": 25.0, "technical": 45.0, "interview": 30.0},
        "overall_passing_threshold": 65.0,
        "tie_breaker_order": ["technical_score", "verified_evidence_score", "application_timestamp_asc"]
    }
    default_policy = {
        "mode": "REVIEW_GATED",
        "auto_screen": True,
        "shortlist_mode": "IMMEDIATE",
        "auto_progress_rounds": True,
        "auto_final_selection": False
    }

    hash_val = compute_pipeline_content_hash(
        default_config, default_rubrics, default_eligibility, default_scoring, default_policy
    )

    baseline = models.RecruitmentPipelineVersion(
        internship_id=posting.id,
        version_number=1,
        status="PUBLISHED",
        content_hash=hash_val,
        pipeline_config=default_config,
        evaluation_rubrics=default_rubrics,
        eligibility_rules=default_eligibility,
        scoring_weights=default_scoring,
        automation_policy=default_policy,
        published_by_id=posting.recruiter_id,
        published_at=now_utc,
        created_at=now_utc,
        updated_at=now_utc
    )
    db.add(baseline)
    db.flush()

    posting.active_pipeline_version_id = baseline.id
    db.commit()
    db.refresh(baseline)
    logger.info(f"Created baseline Version 1 snapshot for Internship {posting.id}")
    return baseline
