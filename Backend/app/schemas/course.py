from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ---------------------------------------------------------------------------
# Provider Schemas
# ---------------------------------------------------------------------------
class ProviderBase(BaseModel):
    name: str = Field(..., description="Provider display name (e.g., 'NPTEL')")
    slug: str = Field(..., description="Unique provider slug (e.g., 'nptel')")
    type: Optional[str] = Field(None, description="Provider type (e.g., 'mooc', 'video_platform')")
    base_url: Optional[str] = Field(None, description="Provider base website/API URL")
    is_active: bool = Field(True, description="Whether the provider is active")


class ProviderCreate(ProviderBase):
    pass


class ProviderResponse(ProviderBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Skill & Career Mapping Schemas
# ---------------------------------------------------------------------------
class CourseSkillBase(BaseModel):
    skill_name: str
    esco_skill_id: Optional[int] = None
    confidence: float = Field(1.0, ge=0.0, le=1.0)
    source: str = "provider"


class CourseSkillCreate(CourseSkillBase):
    pass


class CourseSkillResponse(CourseSkillBase):
    id: int
    course_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CourseCareerBase(BaseModel):
    career_id: str
    relevance_score: float = Field(1.0, ge=0.0, le=1.0)


class CourseCareerCreate(CourseCareerBase):
    pass


class CourseCareerResponse(CourseCareerBase):
    id: int
    course_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Normalized Ingestion Schema (Provider-Independent)
# ---------------------------------------------------------------------------
class NormalizedCourse(BaseModel):
    """
    Common normalized course model used across all providers
    (NPTEL, Coursera, Udemy, YouTube, etc.)
    """
    provider_slug: str = Field(..., description="Slug of the course provider (e.g., 'nptel', 'coursera')")
    external_id: str = Field(..., description="Provider's native unique identifier for the course")
    title: str = Field(..., description="Course title")
    description: Optional[str] = Field(None, description="Course summary or syllabus")
    url: str = Field(..., description="Direct link to course page")
    instructor: Optional[str] = Field(None, description="Instructor name(s)")
    institution: Optional[str] = Field(None, description="Offering university/institution")
    language: Optional[str] = Field("English", description="Language of instruction")
    level: Optional[str] = Field(None, description="Difficulty level (e.g., Beginner, Intermediate, Advanced)")
    duration: Optional[float] = Field(None, description="Numerical duration value")
    duration_unit: Optional[str] = Field(None, description="Unit for duration (e.g., hours, weeks, minutes)")
    price: Optional[Decimal] = Field(None, description="Course price")
    currency: Optional[str] = Field(None, description="Price currency code (e.g., INR, USD)")
    certificate_available: bool = Field(False, description="Whether a verified certificate is offered")
    start_date: Optional[datetime] = Field(None, description="Course enrollment or start timestamp")
    end_date: Optional[datetime] = Field(None, description="Course completion or end timestamp")
    rating: Optional[float] = Field(None, ge=0.0, le=5.0, description="Average course rating (0.0 - 5.0)")
    review_count: Optional[int] = Field(None, ge=0, description="Total number of ratings/reviews")
    thumbnail_url: Optional[str] = Field(None, description="Cover or banner image URL")
    content_hash: Optional[str] = Field(None, description="Hash of raw content for change detection")
    is_active: bool = Field(True, description="Whether this course is actively published")
    skills: List[CourseSkillCreate] = Field(default_factory=list, description="Associated skills")
    careers: List[CourseCareerCreate] = Field(default_factory=list, description="Associated careers")


# ---------------------------------------------------------------------------
# Course CRUD & API Schemas
# ---------------------------------------------------------------------------
class CourseCreate(BaseModel):
    provider_id: int
    external_id: str
    title: str
    description: Optional[str] = None
    url: str
    instructor: Optional[str] = None
    institution: Optional[str] = None
    language: Optional[str] = "English"
    level: Optional[str] = None
    duration: Optional[float] = None
    duration_unit: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    certificate_available: bool = False
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    thumbnail_url: Optional[str] = None
    content_hash: Optional[str] = None
    is_active: bool = True


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    instructor: Optional[str] = None
    institution: Optional[str] = None
    language: Optional[str] = None
    level: Optional[str] = None
    duration: Optional[float] = None
    duration_unit: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    certificate_available: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    thumbnail_url: Optional[str] = None
    content_hash: Optional[str] = None
    is_active: Optional[bool] = None


class CourseResponse(BaseModel):
    id: int
    provider_id: int
    external_id: str
    title: str
    description: Optional[str] = None
    url: str
    instructor: Optional[str] = None
    institution: Optional[str] = None
    language: Optional[str] = None
    level: Optional[str] = None
    duration: Optional[float] = None
    duration_unit: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    certificate_available: bool = False
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    thumbnail_url: Optional[str] = None
    content_hash: Optional[str] = None
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    provider: Optional[ProviderResponse] = None
    skills: List[CourseSkillResponse] = Field(default_factory=list)
    careers: List[CourseCareerResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CoursePaginationResponse(BaseModel):
    status: str = "success"
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[CourseResponse]


# ---------------------------------------------------------------------------
# Sync Log Schemas
# ---------------------------------------------------------------------------
class CourseSyncLogResponse(BaseModel):
    id: int
    provider_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    courses_found: int = 0
    courses_created: int = 0
    courses_updated: int = 0
    courses_deactivated: int = 0
    courses_failed: int = 0
    status: str
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
