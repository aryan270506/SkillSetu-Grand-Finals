"""
Pydantic Schemas for Recruitment Automation, Job Queue, Pipeline Versions, and Overrides
"""
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# ==========================================
# 1. Pipeline Version & Round Configuration Schemas
# ==========================================

class RoundConfigSchema(BaseModel):
    round_key: str = Field(..., description="Unique key for round: aptitude, technical, interview, gd")
    round_name: str = Field(..., description="Human-readable title")
    enabled: bool = True
    order: int = Field(1, description="Sequence order starting at 1")
    duration_minutes: int = Field(30, ge=5, le=180)
    passing_cutoff: float = Field(60.0, ge=0.0, le=100.0)
    review_gated: bool = Field(False, description="If True, advancing to next round requires recruiter 1-click confirmation")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Round-specific params: coding languages, question counts, etc.")


class PipelineConfigSchema(BaseModel):
    rounds: List[RoundConfigSchema] = Field(default_factory=list)
    proctoring: Dict[str, Any] = Field(default_factory=lambda: {
        "camera_required": True,
        "mic_required": True,
        "screen_share_required": False,
        "max_warnings": 3,
        "auto_quarantine_on_breach": True
    })


class EvaluationRubricsSchema(BaseModel):
    rubrics_by_round: Dict[str, Any] = Field(default_factory=dict, description="Rubrics for aptitude, technical, interview, gd")
    general_guidelines: Optional[str] = None


class EligibilityRulesSchema(BaseModel):
    min_cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    allowed_degrees: List[str] = Field(default_factory=list)
    allowed_branches: List[str] = Field(default_factory=list)
    allowed_graduation_years: List[int] = Field(default_factory=list)
    mandatory_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    work_modes_accepted: List[str] = Field(default_factory=lambda: ["Remote", "Hybrid", "On-site"])


class ScoringWeightsSchema(BaseModel):
    weights_by_round: Dict[str, float] = Field(default_factory=lambda: {
        "aptitude": 20.0,
        "technical": 40.0,
        "interview": 20.0,
        "gd": 20.0
    })
    overall_passing_threshold: float = Field(70.0, ge=0.0, le=100.0)
    tie_breaker_order: List[str] = Field(default_factory=lambda: [
        "technical_score",
        "verified_evidence_score",
        "warning_count_asc",
        "application_timestamp_asc"
    ])


class AutomationPolicySchema(BaseModel):
    mode: str = Field("REVIEW_GATED", description="FULL_AUTOMATION, REVIEW_GATED, MANUAL_ONLY")
    auto_screen: bool = True
    shortlist_mode: str = Field("IMMEDIATE", description="IMMEDIATE or BATCH_DEADLINE")
    auto_progress_rounds: bool = True
    auto_final_selection: bool = False
    selection_deadline: Optional[datetime] = None
    batch_shortlist_threshold: Optional[float] = None
    quarantine_borderline_percentage: float = Field(3.0, ge=0.0, le=10.0, description="Score delta triggering manual review")

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        valid_modes = {"FULL_AUTOMATION", "REVIEW_GATED", "MANUAL_ONLY"}
        if v not in valid_modes:
            raise ValueError(f"mode must be one of {valid_modes}")
        return v


# ==========================================
# 2. Recruiter Decision Override Schemas
# ==========================================

class RecruiterOverrideCreate(BaseModel):
    override_type: str = Field(..., description="FORCE_ADVANCE_ROUND, REVERT_ROUND, MANUAL_SHORTLIST, MANUAL_REJECT, MANUAL_SCORE_REVISE, MANUAL_FINAL_SELECT, PUT_ON_HOLD")
    target_status: Optional[str] = None
    target_round_key: Optional[str] = None
    revised_score: Optional[float] = None
    reason_code: str = Field(..., description="Machine-readable reason code")
    justification: str = Field(..., min_length=15, description="Mandatory detailed reason for audit trail")

    @field_validator("override_type")
    @classmethod
    def validate_override_type(cls, v: str) -> str:
        v_upper = v.upper().strip()
        alias_map = {
            "FORCE_PASS": "FORCE_ADVANCE_ROUND",
            "MANUAL_ADVANCE": "FORCE_ADVANCE_ROUND",
            "FORCE_FAIL": "MANUAL_REJECT",
            "EXCUSE_TECHNICAL_ISSUE": "PUT_ON_HOLD",
            "REVOKE_SELECTION": "REVERT_ROUND",
        }
        effective = alias_map.get(v_upper, v_upper)
        valid_types = {
            "FORCE_ADVANCE_ROUND", "REVERT_ROUND", "MANUAL_SHORTLIST", 
            "MANUAL_REJECT", "MANUAL_SCORE_REVISE", "MANUAL_FINAL_SELECT", "PUT_ON_HOLD"
        }
        if effective not in valid_types:
            raise ValueError(f"override_type must be one of {valid_types}")
        return effective


class RecruiterOverrideRevoke(BaseModel):
    rerun_automation: bool = Field(True, description="If True, application is immediately re-evaluated against pinned pipeline")
    reason: Optional[str] = None


# ==========================================
# 3. Durable Job Queue Schemas
# ==========================================

class JobPayloadSchema(BaseModel):
    job_type: str
    payload: Dict[str, Any]
    priority: int = 0
    idempotency_key: Optional[str] = None
    run_after_seconds: Optional[int] = None


class JobStatusResponse(BaseModel):
    id: int
    job_type: str
    status: str
    priority: int
    idempotency_key: Optional[str]
    retry_count: int
    max_retries: int
    next_run_at: datetime
    locked_by: Optional[str]
    locked_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    error_log: Optional[str] = None


# ==========================================
# 4. Assessment Webhook Payload Schema
# ==========================================

class AssessmentCallbackPayload(BaseModel):
    idempotencyKey: Optional[str] = Field(None, description="Idempotency key for callback deduplication")
    assessmentId: str = Field(..., description="UUID of CandidateAssessmentSession")
    studentId: int
    applicationId: Optional[int] = None
    internshipId: int
    roundKey: Optional[str] = "aptitude"
    status: str = Field(..., description="completed, in_progress, terminated, flagged")
    overallScore: Optional[float] = None
    roundResults: Optional[Dict[str, Any]] = None
    evaluation: Optional[Dict[str, Any]] = None
    integrityStatus: Optional[str] = "VERIFIED"
    warningCount: Optional[int] = 0
    clientTelemetry: Optional[Dict[str, Any]] = None

    @field_validator("idempotencyKey")
    @classmethod
    def validate_idempotency_key(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) >= 4:
            return v.strip()
        return None
