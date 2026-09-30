from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class InternshipListItem(BaseModel):
    id: Optional[int] = None
    internship_id: int
    title: str
    company_name: str
    company: Optional[str] = None
    company_logo: Optional[str] = None
    description: Optional[str] = None
    location: str
    location_name: Optional[str] = None
    work_preference: str
    work_mode: Optional[str] = None
    stipend: str
    duration: str
    match_score: float
    eligibility_status: str
    matched_skills: List[str] = []
    developing_skills: List[str] = []
    missing_skills: List[str] = []
    skills: List[str] = []
    career_alignment_score: Optional[float] = None
    skill_match_score: Optional[float] = None
    reasons: List[str] = []
    why_this_matches: Optional[str] = None
    apply_url: Optional[str] = None
    application_url: Optional[str] = None
    application_deadline: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    is_saved: Optional[bool] = False
    has_applied: Optional[bool] = False

    def __init__(self, **data: Any):
        if "id" not in data and "internship_id" in data:
            data["id"] = data["internship_id"]
        if "company" not in data and "company_name" in data:
            data["company"] = data["company_name"]
        if "work_mode" not in data and "work_preference" in data:
            data["work_mode"] = data["work_preference"]
        if "location_name" not in data and "location" in data:
            data["location_name"] = data["location"]
        if "application_url" not in data and "apply_url" in data:
            data["application_url"] = data["apply_url"]
        super().__init__(**data)


class InternshipListResponse(BaseModel):
    status: str = "success"
    count: int
    data: List[InternshipListItem]
    items: Optional[List[InternshipListItem]] = None

    def __init__(self, **data: Any):
        if "data" in data and "items" not in data:
            data["items"] = data["data"]
        super().__init__(**data)


class ScholarshipListItem(BaseModel):
    id: Optional[int] = None
    scholarship_id: int
    name: str
    provider: str
    description: Optional[str] = None
    academic_year: str
    scholarship_type: str
    award_amount: Optional[Any] = None
    award_frequency: str = "per year"
    award_description: Optional[str] = None
    application_url: Optional[str] = None
    application_deadline: Optional[str] = None
    days_remaining: Optional[int] = None
    is_closing_soon: bool = False
    eligibility_status: str
    match_percentage: float = 100.0
    checkpoints: List[Dict[str, Any]] = []
    evaluation_checkpoints: List[Dict[str, Any]] = []
    missing_info: List[str] = []
    missing_profile_fields: List[str] = []
    hard_failures: List[str] = []
    source: Optional[str] = None
    source_url: Optional[str] = None
    is_saved: Optional[bool] = False
    has_applied: Optional[bool] = False

    def __init__(self, **data: Any):
        if "id" not in data and "scholarship_id" in data:
            data["id"] = data["scholarship_id"]
        if "evaluation_checkpoints" not in data and "checkpoints" in data:
            data["evaluation_checkpoints"] = data["checkpoints"]
        elif "checkpoints" not in data and "evaluation_checkpoints" in data:
            data["checkpoints"] = data["evaluation_checkpoints"]
        if "missing_profile_fields" not in data and "missing_info" in data:
            data["missing_profile_fields"] = data["missing_info"]
        elif "missing_info" not in data and "missing_profile_fields" in data:
            data["missing_info"] = data["missing_profile_fields"]
        super().__init__(**data)


class ScholarshipListResponse(BaseModel):
    status: str = "success"
    count: int
    data: List[ScholarshipListItem]
    items: Optional[List[ScholarshipListItem]] = None
    metrics: Optional[Dict[str, Any]] = None
    deadline_radar: Optional[List[Dict[str, Any]]] = None

    def __init__(self, **data: Any):
        if "data" in data and "items" not in data:
            data["items"] = data["data"]
        super().__init__(**data)


class SaveActionRequest(BaseModel):
    email: Optional[str] = None
    save: bool = True


class ApplyActionRequest(BaseModel):
    email: Optional[str] = None
    notes: Optional[str] = None


class ScholarshipDashboardMetrics(BaseModel):
    recommended: int = 0
    eligible: int = 0
    open_intake: int = 0
    saved: int = 0
    applied: int = 0


class ScholarshipEligibleResponse(ScholarshipListResponse):
    pass


class EligibilitySimulationRequest(BaseModel):
    email: Optional[str] = None
    cgpa: Optional[float] = None
    percentage_12th: Optional[float] = None
    annual_family_income: Optional[float] = None
    social_category: Optional[str] = None
    domicile_state: Optional[str] = None
    gender: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    is_pwd: Optional[bool] = None
    is_minority: Optional[bool] = None
    scholarship_id: Optional[int] = None


class SaveActionResponse(BaseModel):
    status: str = "success"
    message: str
    is_saved: bool
    data: Optional[Dict[str, Any]] = None


class ApplicationActionResponse(BaseModel):
    status: str = "success"
    message: str
    data: Optional[Dict[str, Any]] = None
