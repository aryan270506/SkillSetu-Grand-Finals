from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime


class InternshipListItem(BaseModel):
    id: Optional[Union[int, str]] = None
    internship_id: Optional[Union[int, str]] = None
    source: Optional[str] = "external"
    source_type: Optional[str] = "external_aggregator"
    verification_status: Optional[str] = "UNVERIFIED"
    source_id: Optional[str] = None
    title: str
    company_name: str
    company: Optional[str] = None
    company_logo: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = "Remote"
    location_name: Optional[str] = None
    work_preference: Optional[str] = "Remote"
    work_mode: Optional[str] = None
    stipend: Optional[str] = None
    stipend_min: Optional[float] = None
    stipend_max: Optional[float] = None
    duration: Optional[str] = None
    openings: Optional[int] = 1
    company_id: Optional[int] = None
    is_verified: Optional[bool] = False
    verified: Optional[bool] = False
    department: Optional[str] = None
    responsibilities: Optional[str] = None
    required_skill_levels: Optional[Dict[str, Any]] = None
    academic_requirements: Optional[Dict[str, Any]] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    minimum_cgpa: Optional[float] = None
    graduation_year: Optional[int] = None
    match_score: float
    target_score: float = 80.0
    application_threshold: Optional[int] = 80
    minimum_match_threshold: Optional[int] = 80
    readiness_status: str = "READY_TO_APPLY"
    readiness: Optional[str] = None
    hard_eligible: bool = True
    eligibility_status: Optional[str] = "ELIGIBLE"
    matched_skills: List[str] = []
    developing_skills: List[str] = []
    missing_skills: List[str] = []
    skills: List[str] = []
    required_skills: Optional[List[Any]] = []
    preparation_skills: Optional[List[Dict[str, Any]]] = []
    skill_gaps: List[Dict[str, Any]] = []
    recommended_courses: List[Dict[str, Any]] = []
    recommended_tests: List[Dict[str, Any]] = []
    recommended_projects: List[Dict[str, Any]] = []
    career_alignment_score: Optional[float] = None
    skill_match_score: Optional[float] = None
    reasons: List[str] = []
    match_reasons: Optional[List[str]] = []
    why_this_matches: Optional[str] = None
    apply_url: Optional[str] = None
    application_url: Optional[str] = None
    application_deadline: Optional[str] = None
    deadline: Optional[str] = None
    source_url: Optional[str] = None
    fetched_at: Optional[str] = None
    is_saved: Optional[bool] = False
    has_applied: Optional[bool] = False
    application_status: Optional[str] = None

    def __init__(self, **data: Any):
        if "id" not in data and "internship_id" in data:
            data["id"] = data["internship_id"]
        elif "internship_id" not in data and "id" in data:
            data["internship_id"] = data["id"]
        if "source_id" not in data and "id" in data:
            data["source_id"] = str(data["id"])
        if "company" not in data and "company_name" in data:
            data["company"] = data["company_name"]
        if "company_name" not in data and "company" in data:
            data["company_name"] = data["company"]
        if "work_mode" not in data and "work_preference" in data:
            data["work_mode"] = data["work_preference"]
        if "location_name" not in data and "location" in data:
            data["location_name"] = data["location"]
        if "application_url" not in data and "apply_url" in data:
            data["application_url"] = data["apply_url"]
        if "match_reasons" not in data and "reasons" in data:
            data["match_reasons"] = data["reasons"]
        if "deadline" not in data and "application_deadline" in data:
            data["deadline"] = data["application_deadline"]
        elif "application_deadline" not in data and "deadline" in data:
            data["application_deadline"] = data["deadline"]
        if "readiness" not in data and "readiness_status" in data:
            data["readiness"] = data["readiness_status"]
        elif "readiness_status" not in data and "readiness" in data:
            data["readiness_status"] = data["readiness"]
        if "is_verified" not in data and "verified" in data:
            data["is_verified"] = bool(data["verified"])
        elif "verified" not in data and "is_verified" in data:
            data["verified"] = bool(data["is_verified"])
        if "application_threshold" in data and data["application_threshold"] is not None:
            data["minimum_match_threshold"] = int(data["application_threshold"])
            data["target_score"] = float(data["application_threshold"])
        elif "minimum_match_threshold" in data and data["minimum_match_threshold"] is not None:
            data["application_threshold"] = int(data["minimum_match_threshold"])
            data["target_score"] = float(data["minimum_match_threshold"])
        super().__init__(**data)


class InternshipListResponse(BaseModel):
    status: str = "success"
    count: int
    total: Optional[int] = None
    total_results: Optional[int] = None
    page: Optional[int] = 1
    page_size: Optional[int] = 50
    has_more: Optional[bool] = False
    metrics: Optional[Dict[str, Any]] = None
    performance: Optional[Dict[str, Any]] = None
    source_counts: Optional[Dict[str, int]] = None
    source_breakdown: Optional[Dict[str, Any]] = None
    data: List[InternshipListItem]
    items: Optional[List[InternshipListItem]] = None

    def __init__(self, **data: Any):
        if "data" in data and "items" not in data:
            data["items"] = data["data"]
        if "items" in data and "data" not in data:
            data["data"] = data["items"]
        if "total" in data and "total_results" not in data:
            data["total_results"] = data["total"]
        elif "total_results" in data and "total" not in data:
            data["total"] = data["total_results"]
        elif "total" not in data and "count" in data:
            data["total"] = data["count"]
            data["total_results"] = data["count"]
        super().__init__(**data)


class ScholarshipListItem(BaseModel):
    id: Optional[Union[int, str]] = None
    scholarship_id: Optional[Union[int, str]] = None
    source: Optional[str] = "nsp"
    source_id: Optional[str] = None
    name: str
    provider: str
    description: Optional[str] = None
    academic_year: str = "2026-27"
    scholarship_type: str = "Merit & Need-based"
    award_amount: Optional[float] = None
    award_frequency: Optional[str] = "per year"
    award_description: Optional[str] = None
    application_url: Optional[str] = None
    application_deadline: Optional[str] = None
    days_remaining: Optional[int] = None
    eligibility_status: str
    match_percentage: float = 100.0
    checkpoints: List[Dict[str, Any]] = []
    evaluation_checkpoints: List[Dict[str, Any]] = []
    missing_info: List[str] = []
    missing_profile_fields: List[str] = []
    hard_failures: List[str] = []
    source_url: Optional[str] = None
    is_saved: Optional[bool] = False
    has_applied: Optional[bool] = False

    def __init__(self, **data: Any):
        if "id" not in data and "scholarship_id" in data:
            data["id"] = data["scholarship_id"]
        elif "scholarship_id" not in data and "id" in data:
            data["scholarship_id"] = data["id"]
        if "source_id" not in data and "id" in data:
            data["source_id"] = str(data["id"])
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
    total_results: Optional[int] = None
    data: List[ScholarshipListItem]
    items: Optional[List[ScholarshipListItem]] = None
    metrics: Optional[Dict[str, Any]] = None
    performance: Optional[Dict[str, Any]] = None
    deadline_radar: Optional[List[Dict[str, Any]]] = None
    source_counts: Optional[Dict[str, int]] = None


    def __init__(self, **data: Any):
        if "data" in data and "items" not in data:
            data["items"] = data["data"]
        if "total_results" not in data and "count" in data:
            data["total_results"] = data["count"]
        super().__init__(**data)


class SaveActionRequest(BaseModel):
    email: Optional[str] = None
    save: Optional[bool] = None
    source: Optional[str] = None
    source_id: Optional[str] = None
    title_snapshot: Optional[str] = None
    organization_snapshot: Optional[str] = None
    source_url: Optional[str] = None
    application_url: Optional[str] = None


class ApplyActionRequest(BaseModel):
    email: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    source_id: Optional[str] = None
    title_snapshot: Optional[str] = None
    company_snapshot: Optional[str] = None
    source_url_snapshot: Optional[str] = None
    application_url_snapshot: Optional[str] = None


class ScholarshipDashboardMetrics(BaseModel):
    recommended: int = 0
    eligible: int = 0
    open_intake: int = 0
    openIntake: Optional[int] = None
    possibly_eligible: int = 0
    possiblyEligible: Optional[int] = None
    saved: int = 0
    applied: int = 0

    def __init__(self, **data: Any):
        if "openIntake" not in data and "open_intake" in data:
            data["openIntake"] = data["open_intake"]
        if "possiblyEligible" not in data and "possibly_eligible" in data:
            data["possiblyEligible"] = data["possibly_eligible"]
        super().__init__(**data)


class ScholarshipEligibleResponse(ScholarshipListResponse):
    pass


class EligibilitySimulationRequest(BaseModel):
    cgpa: Optional[float] = None
    annual_family_income: Optional[float] = None
    social_category: Optional[str] = None
    domicile_state: Optional[str] = None
    gender: Optional[str] = None
    degree: Optional[str] = None
    is_pwd: Optional[bool] = None


class SaveActionResponse(BaseModel):
    status: str = "success"
    is_saved: bool
    message: str


class ApplicationActionResponse(BaseModel):
    status: str = "success"
    message: str
    allowed: bool = True
    reason: Optional[str] = None
    code: Optional[str] = None
    current_match: Optional[float] = None
    required_match: Optional[float] = 80.0
    application_threshold: Optional[int] = 80
    remaining_gap: Optional[float] = None
    application_id: Optional[int] = None
    tracking_status: Optional[str] = "APPLIED"
    roadmap: Optional[Dict[str, Any]] = None
    hard_failures: Optional[List[str]] = None
    data: Optional[Dict[str, Any]] = None

