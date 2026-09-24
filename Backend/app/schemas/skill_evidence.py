from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class SkillEvidenceSourceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: str = Field(..., description="Evidence source type (github, resume, profile, course_completion, learning_progress)")
    source_id: Optional[str] = None
    score: float = Field(..., ge=0.0, le=1.0, description="Source raw evidence score [0.0, 1.0]")
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="Source confidence weighting [0.0, 1.0]")
    details: Optional[Dict[str, Any]] = None
    recorded_at: Optional[str] = None


class SkillEvidenceTimelineItem(BaseModel):
    date: str
    source_type: str
    title: str
    description: str
    score_contribution: float


class SkillEvidenceSummaryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    skill_id: Optional[int] = None
    skill_name: str
    score: float = Field(..., ge=0.0, le=1.0, description="Unified aggregated evidence score [0.0, 1.0]")
    status: str = Field(..., description="Classification status: missing, developing, evidenced, verified")
    required_by_careers: List[str] = []
    sources: List[SkillEvidenceSourceItem] = []
    last_updated: Optional[str] = None


class SkillEvidenceSummaryResponse(BaseModel):
    status: str = "success"
    student_email: str
    total_skills: int
    verified_skills_count: int
    evidenced_skills_count: int
    developing_skills_count: int
    skills: List[SkillEvidenceSummaryItem]


class SkillEvidenceDetailResponse(BaseModel):
    status: str = "success"
    skill_id: Optional[int] = None
    skill_name: str
    score: float = Field(..., ge=0.0, le=1.0)
    status_label: str
    required_by_careers: List[str] = []
    sources: List[SkillEvidenceSourceItem] = []
    timeline: List[SkillEvidenceTimelineItem] = []
    related_courses: List[Dict[str, Any]] = []
    explanation: List[str] = []


class SkillEvidenceSyncRequest(BaseModel):
    email: str = Field(..., description="Student email identifier")


class SkillEvidenceSyncResponse(BaseModel):
    status: str = "success"
    email: str
    records_created_or_updated: int
    message: str

