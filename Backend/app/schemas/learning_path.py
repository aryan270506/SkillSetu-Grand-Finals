from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class LearningPathCreateRequest(BaseModel):
    email: str = Field(..., description="Student email identifier")
    target_careers: Optional[List[str]] = Field(None, description="Optional target careers override")
    name: Optional[str] = Field(None, description="Custom name for the learning path")


class LearningPathItemUpdateRequest(BaseModel):
    email: Optional[str] = Field(None, description="Student email for ownership verification")
    progress_percent: Optional[float] = Field(None, ge=0.0, le=100.0, description="Course completion percentage (0-100)")
    status: Optional[str] = Field(None, description="Explicit status override ('not_started', 'in_progress', 'completed', 'skipped')")


class CourseSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    provider: str
    provider_name: str
    external_id: Optional[str] = None
    url: Optional[str] = None
    instructor: Optional[str] = None
    institution: Optional[str] = None
    level: Optional[str] = None
    language: Optional[str] = None
    duration: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = "INR"
    certificate_available: Optional[bool] = False


class LearningPathItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    learning_path_id: int
    course_id: int
    skill_id: Optional[int] = None
    skill_name: str
    stage: str
    sequence_order: int
    status: str
    progress_percent: float
    reason: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    course: Optional[CourseSummaryResponse] = None


class LearningPathSkillsSummary(BaseModel):
    total: int = 0
    addressed: int = 0
    remaining: int = 0


class LearningPathResponse(BaseModel):
    id: int
    student_id: int
    student_email: Optional[str] = None
    name: str
    target_careers: List[str]
    status: str
    progress_percent: float
    skills_summary: LearningPathSkillsSummary
    stages: Dict[str, List[LearningPathItemResponse]]
    items: List[LearningPathItemResponse]
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None


class LearningPathAnalyticsResponse(BaseModel):
    path_id: int
    name: str
    status: str
    progress_percent: float
    courses_total: int
    courses_completed: int
    courses_in_progress: int
    courses_not_started: int
    courses_skipped: int
    skills_addressed: int
    skills_remaining: int
    skills_total: int
    career_coverage: Dict[str, float]
