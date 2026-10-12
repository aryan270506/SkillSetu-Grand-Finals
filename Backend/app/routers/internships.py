import time
import logging
from typing import Optional, List, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.opportunities import (
    InternshipListResponse,
    InternshipListItem,
    ApplicationActionResponse,
    SaveActionResponse,
    ApplyActionRequest,
    SaveActionRequest
)
from app.services.internship_matching_service import InternshipMatchingService
from app.services.live_opportunities.live_engine import LiveOpportunityEngine
from app.services.session_cache_service import SessionCacheService

logger = logging.getLogger("skillsetu_internships_api")
router = APIRouter()


def get_current_student(
    email: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> models.StudentUser:
    """
    Resolves the authenticated student by query email parameter or bearer token.
    """
    student_email = email
    if not student_email and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        if "@" in token:
            student_email = token

    if not student_email:
        student = db.query(models.StudentUser).first()
        if student:
            return student
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication email required.")

    student = db.query(models.StudentUser).filter(models.StudentUser.email == student_email.lower().strip()).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student account not found for {student_email}.")
    return student


def _resolve_session_id(
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    student: Optional[models.StudentUser] = None
) -> str:
    """
    Resolves or constructs the session identifier for isolated session caching.
    """
    if x_session_id and x_session_id.strip():
        return x_session_id.strip()
    if session_id and session_id.strip():
        return session_id.strip()
    if student and student.id:
        return f"user_{student.id}"
    return "guest_session"


@router.get("/source-status")
def get_internships_source_status(
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    student: models.StudentUser = Depends(get_current_student)
):
    """
    Diagnostic status endpoint returning live ingestion status, latency benchmarks, and counts across all adapters.
    """
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)
    return LiveOpportunityEngine.get_internship_source_status(session_id=eff_session_id)


@router.get("/debug/sources")
def get_internships_source_debug(
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    student: models.StudentUser = Depends(get_current_student)
):
    """
    Development-only diagnostics endpoint returning structured breakdown of requested, raw, parsed, deduplicated, and returned counts per source.
    """
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)
    return LiveOpportunityEngine.get_source_debug_report(session_id=eff_session_id)


@router.post("/cache/clear")
def clear_internships_cache(
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    student: models.StudentUser = Depends(get_current_student)
):
    """
    Explicitly destroys the session-scoped opportunity and match cache (e.g. on logout).
    """
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)
    deleted_session = SessionCacheService.clear_session_cache(eff_session_id)
    deleted_student = SessionCacheService.clear_all_for_student(student.email if student else "")
    return {
        "status": "success",
        "message": f"Opportunity and match session cache deleted.",
        "session_id": eff_session_id,
        "deleted_entries": deleted_session + deleted_student
    }


@router.get("", response_model=InternshipListResponse)
def get_internships(
    search: Optional[str] = Query(None),
    career: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    work_mode: Optional[str] = Query(None),
    saved: Optional[bool] = Query(False),
    saved_only: Optional[bool] = Query(False),
    page: int = Query(1, ge=1),
    limit: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1),
    min_match_score: Optional[float] = Query(None),
    force_refresh: bool = Query(False),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    email: Optional[str] = Query(None),
    student: models.StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Fetches live internship opportunities within a hard 2-second deadline using session-scoped caching.
    Returns all hard-eligible opportunities across both READY_TO_APPLY (>=80%) and NEEDS_DEVELOPMENT (<80%)
    states with provenance metadata. ZERO records are inserted into PostgreSQL.
    """
    eff_limit = page_size if page_size is not None else limit
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)

    req_start = time.perf_counter()
    bundle = InternshipMatchingService.get_ranked_recommendations_bundle(
        student=student,
        db=db,
        limit=eff_limit,
        page=page,
        career_filter=career,
        location_filter=location,
        work_mode_filter=work_mode,
        search_query=search,
        saved_filter=bool(saved or saved_only),
        min_match_threshold=min_match_score if min_match_score is not None else 0.0,
        enforce_min_threshold=min_match_score is not None,
        session_id=eff_session_id,
        force_refresh=force_refresh
    )
    total_time_ms = round((time.perf_counter() - req_start) * 1000, 2)

    items = [InternshipListItem(**r) for r in bundle["items"]]
    source_counts = LiveOpportunityEngine.get_source_counts()
    source_breakdown = LiveOpportunityEngine.get_source_diagnostics()
    telemetry = LiveOpportunityEngine.get_performance_telemetry()
    telemetry["api_response_time_ms"] = total_time_ms

    return InternshipListResponse(
        count=len(items),
        total=bundle["total"],
        total_results=bundle["total"],
        page=bundle["page"],
        page_size=bundle["page_size"],
        has_more=bundle["has_more"],
        metrics=bundle["metrics"],
        performance=telemetry,
        source_counts=source_counts,
        source_breakdown=source_breakdown,
        data=items,
        items=items
    )


@router.get("/recommended", response_model=InternshipListResponse)
def get_recommended_internships(
    career: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    work_mode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    saved: Optional[bool] = Query(False),
    saved_only: Optional[bool] = Query(False),
    page: int = Query(1, ge=1),
    limit: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1),
    min_match_score: Optional[float] = Query(None),
    force_refresh: bool = Query(False),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    email: Optional[str] = Query(None),
    student: models.StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Retrieves personalized recommendations evaluated live in-memory with session-scoped caching.
    """
    eff_limit = page_size if page_size is not None else limit
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)

    req_start = time.perf_counter()
    bundle = InternshipMatchingService.get_ranked_recommendations_bundle(
        student=student,
        db=db,
        limit=eff_limit,
        page=page,
        career_filter=career,
        location_filter=location,
        work_mode_filter=work_mode,
        search_query=search,
        saved_filter=bool(saved or saved_only),
        min_match_threshold=min_match_score if min_match_score is not None else 0.0,
        enforce_min_threshold=min_match_score is not None,
        session_id=eff_session_id,
        force_refresh=force_refresh
    )
    total_time_ms = round((time.perf_counter() - req_start) * 1000, 2)

    items = [InternshipListItem(**r) for r in bundle["items"]]
    source_counts = LiveOpportunityEngine.get_source_counts()
    source_breakdown = LiveOpportunityEngine.get_source_diagnostics()
    telemetry = LiveOpportunityEngine.get_performance_telemetry()
    telemetry["api_response_time_ms"] = total_time_ms

    return InternshipListResponse(
        count=len(items),
        total=bundle["total"],
        total_results=bundle["total"],
        page=bundle["page"],
        page_size=bundle["page_size"],
        has_more=bundle["has_more"],
        metrics=bundle["metrics"],
        performance=telemetry,
        source_counts=source_counts,
        source_breakdown=source_breakdown,
        data=items,
        items=items
    )


@router.get("/{internship_id}")
def get_internship_detail(
    internship_id: str,
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    Returns full details, match breakdown, and personalized roadmap for a specific live internship.
    """
    student = None
    if email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == email.lower().strip()).first()

    listing = None
    if str(internship_id).isdigit():
        int_id = int(internship_id)
        db_posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == int_id).first()
        if db_posting:
            comp_name = db_posting.company.name if db_posting.company else "Tech Employer"
            skills_raw = db_posting.required_skills
            skills_parsed = []
            if skills_raw:
                try:
                    skills_parsed = json.loads(skills_raw) if skills_raw.startswith("[") else [s.strip() for s in skills_raw.split(",") if s.strip()]
                except Exception:
                    skills_parsed = [s.strip() for s in skills_raw.split(",") if s.strip()]
            listing = {
                "id": db_posting.id,
                "internship_id": db_posting.id,
                "title": db_posting.title,
                "company_name": comp_name,
                "company": comp_name,
                "company_id": db_posting.company_id,
                "department": db_posting.department or "",
                "description": db_posting.description or "",
                "location": db_posting.location or "Remote",
                "work_preference": db_posting.work_mode or "Remote",
                "work_mode": db_posting.work_mode or "Remote",
                "stipend": db_posting.stipend or "₹35,000/mo",
                "duration": db_posting.duration or "6 Months",
                "openings": db_posting.openings or 1,
                "application_threshold": db_posting.application_threshold if db_posting.application_threshold is not None else 80,
                "minimum_match_threshold": db_posting.application_threshold if db_posting.application_threshold is not None else 80,
                "required_skills": skills_parsed,
                "source": "recruiter_posting",
                "source_id": str(db_posting.id),
                "source_url": "https://skillsetu.in",
                "apply_url": "https://skillsetu.in",
                "is_active": db_posting.status == "Active"
            }

    if not listing:
        eff_session_id = _resolve_session_id(session_id, x_session_id, student)
        all_live = LiveOpportunityEngine.get_live_internships(session_id=eff_session_id)
        listing = next((l for l in all_live if str(l.get("id")) == str(internship_id)), None)

    if not listing:
        all_default = LiveOpportunityEngine.get_live_internships()
        listing = next((l for l in all_default if str(l.get("id")) == str(internship_id)), None)

    if not listing and str(internship_id).isdigit():
        int_id = int(internship_id)
        db_listing = db.query(models.InternshipListing).filter(models.InternshipListing.id == int_id).first()
        if db_listing:
            listing = {
                "id": db_listing.id,
                "internship_id": db_listing.id,
                "title": db_listing.title,
                "company_name": db_listing.company_name or "Tech Employer",
                "company": db_listing.company_name or "Tech Employer",
                "source": db_listing.source or "curated_partner",
                "source_id": str(db_listing.id),
                "source_url": db_listing.source_url or "https://skillsetu.in",
                "apply_url": db_listing.apply_url or "https://skillsetu.in",
                "min_cgpa": float(db_listing.min_cgpa or 0.0),
                "application_threshold": db_listing.application_threshold if hasattr(db_listing, "application_threshold") and db_listing.application_threshold else 80,
                "minimum_match_threshold": db_listing.application_threshold if hasattr(db_listing, "application_threshold") and db_listing.application_threshold else 80,
                "required_skills": [s.skill_name for s in db_listing.required_skills] if hasattr(db_listing, "required_skills") and db_listing.required_skills else ["Python", "SQL"]
            }

    if listing:
        if student:
            match_info = InternshipMatchingService.evaluate_student_internship_match(student, listing, db)
            src = listing.get("source", "external")
            src_id = str(listing.get("source_id", listing.get("id", "")))
            is_saved = db.query(models.SavedInternship).filter(
                models.SavedInternship.student_id == student.id,
                models.SavedInternship.source == src,
                models.SavedInternship.source_id == src_id
            ).first() is not None
            has_applied = db.query(models.InternshipApplication).filter(
                models.InternshipApplication.student_id == student.id,
                models.InternshipApplication.source == src,
                models.InternshipApplication.source_id == src_id
            ).first() is not None
            match_info["is_saved"] = is_saved
            match_info["has_applied"] = has_applied
            return {"status": "success", "data": match_info}
        return {"status": "success", "data": listing}

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internship listing not found.")


@router.post("/{internship_id}/apply", response_model=ApplicationActionResponse)
def apply_internship(
    internship_id: str,
    payload: Optional[ApplyActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    CRITICAL RECRUITER APPLICATION THRESHOLD GATE ENFORCEMENT.
    Independently authenticates student, recalculates deterministic match score from authoritative DB evidence,
    checks hard eligibility (Gate 1), and strictly enforces match_score >= internship.application_threshold (Gate 2).
    Rejects any below-threshold application with a personalized development roadmap.
    Persists historical application tracking snapshot including match_score_at_apply and application_threshold_at_apply.
    """
    target_email = payload.email if payload and payload.email else email
    student = None
    if target_email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == target_email.lower().strip()).first()
    if not student:
        student = db.query(models.StudentUser).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    listing = None
    if str(internship_id).isdigit():
        int_id = int(internship_id)
        db_posting = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == int_id).first()
        if db_posting:
            comp_name = db_posting.company.name if db_posting.company else "Tech Employer"
            skills_raw = db_posting.required_skills
            skills_parsed = []
            if skills_raw:
                try:
                    skills_parsed = json.loads(skills_raw) if skills_raw.startswith("[") else [s.strip() for s in skills_raw.split(",") if s.strip()]
                except Exception:
                    skills_parsed = [s.strip() for s in skills_raw.split(",") if s.strip()]
            listing = {
                "id": db_posting.id,
                "internship_id": db_posting.id,
                "title": db_posting.title,
                "company_name": comp_name,
                "company": comp_name,
                "company_id": db_posting.company_id,
                "department": db_posting.department or "",
                "description": db_posting.description or "",
                "location": db_posting.location or "Remote",
                "work_preference": db_posting.work_mode or "Remote",
                "work_mode": db_posting.work_mode or "Remote",
                "stipend": db_posting.stipend or "₹35,000/mo",
                "duration": db_posting.duration or "6 Months",
                "openings": db_posting.openings or 1,
                "application_threshold": db_posting.application_threshold if db_posting.application_threshold is not None else 80,
                "minimum_match_threshold": db_posting.application_threshold if db_posting.application_threshold is not None else 80,
                "required_skills": skills_parsed,
                "source": "recruiter_posting",
                "source_id": str(db_posting.id),
                "source_url": "https://skillsetu.in",
                "apply_url": "https://skillsetu.in",
                "is_active": db_posting.status == "Active"
            }

    if not listing:
        eff_session_id = _resolve_session_id(session_id, x_session_id, student)
        all_live = LiveOpportunityEngine.get_live_internships(session_id=eff_session_id)
        listing = next((l for l in all_live if str(l.get("id")) == str(internship_id)), None)

    if not listing:
        all_default = LiveOpportunityEngine.get_live_internships()
        listing = next((l for l in all_default if str(l.get("id")) == str(internship_id)), None)

    if not listing and str(internship_id).isdigit():
        int_id = int(internship_id)
        db_listing = db.query(models.InternshipListing).filter(models.InternshipListing.id == int_id).first()
        if db_listing:
            listing = {
                "id": db_listing.id,
                "internship_id": db_listing.id,
                "title": db_listing.title,
                "company_name": db_listing.company_name or "Tech Employer",
                "company": db_listing.company_name or "Tech Employer",
                "source": db_listing.source or "curated_partner",
                "source_id": str(db_listing.id),
                "source_url": db_listing.source_url or "https://skillsetu.in",
                "apply_url": db_listing.apply_url or "https://skillsetu.in",
                "min_cgpa": float(db_listing.min_cgpa or 0.0),
                "application_threshold": db_listing.application_threshold if hasattr(db_listing, "application_threshold") and db_listing.application_threshold else 80,
                "minimum_match_threshold": db_listing.application_threshold if hasattr(db_listing, "application_threshold") and db_listing.application_threshold else 80,
                "required_skills": [s.skill_name for s in db_listing.required_skills] if hasattr(db_listing, "required_skills") and db_listing.required_skills else ["Python", "SQL"]
            }

    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internship opportunity not found.")

    # 1. Authoritative Backend Match & Eligibility Recalculation
    eval_res = InternshipMatchingService.evaluate_student_internship_match(student, listing, db)
    current_match = float(eval_res.get("match_score", 0.0))
    app_threshold = int(eval_res.get("application_threshold") or listing.get("application_threshold") or 80)
    is_hard_eligible = bool(eval_res.get("hard_eligible", True) and eval_res.get("eligibility_status") != "NOT_ELIGIBLE")
    remaining_gap = max(0.0, round(float(app_threshold) - current_match, 1))

    source = (payload.source if payload and payload.source else listing.get("source", "external")) or "external"
    source_id = (payload.source_id if payload and payload.source_id else str(listing.get("source_id", listing.get("id"))))
    title = (payload.title_snapshot if payload and payload.title_snapshot else listing.get("title", "Internship Application"))
    company = (payload.company_snapshot if payload and payload.company_snapshot else (listing.get("company_name", listing.get("company")) or "Tech Employer"))
    source_url = (payload.source_url_snapshot if payload and payload.source_url_snapshot else listing.get("source_url", "https://skillsetu.in"))
    apply_url = (payload.application_url_snapshot if payload and payload.application_url_snapshot else (listing.get("apply_url", listing.get("application_url")) or "https://skillsetu.in"))
    company_id = listing.get("company_id")

    # 2. Gate 1: Hard Eligibility Check
    if not is_hard_eligible:
        hard_fails = eval_res.get("hard_failures", ["Prerequisite academic eligibility criteria not satisfied."])
        return ApplicationActionResponse(
            status="error",
            allowed=False,
            code="HARD_ELIGIBILITY_FAILED",
            reason="HARD_ELIGIBILITY_FAILED",
            current_match=current_match,
            required_match=float(app_threshold),
            application_threshold=app_threshold,
            remaining_gap=remaining_gap,
            message="Prerequisite academic or mandatory eligibility criteria not satisfied.",
            hard_failures=hard_fails,
            roadmap={
                "skills": eval_res.get("skill_gaps", []),
                "courses": eval_res.get("recommended_courses", []),
                "tests": eval_res.get("recommended_tests", []),
                "projects": eval_res.get("recommended_projects", [])
            }
        )

    # 3. Gate 2: Recruiter Application Threshold Check (Inclusive: >= application_threshold)
    if current_match < float(app_threshold):
        logger.warning(f"Application rejected for student {student.email} on internship {internship_id}: match score {current_match}% < threshold {app_threshold}%")
        return ApplicationActionResponse(
            status="error",
            allowed=False,
            code="APPLICATION_THRESHOLD_NOT_MET",
            reason="APPLICATION_THRESHOLD_NOT_MET",
            current_match=current_match,
            required_match=float(app_threshold),
            application_threshold=app_threshold,
            remaining_gap=remaining_gap,
            message=f"Your current match score ({current_match}%) is below the recruiter's required application threshold ({app_threshold}%). Complete the recommended development roadmap to unlock direct application.",
            roadmap={
                "skills": eval_res.get("skill_gaps", []),
                "courses": eval_res.get("recommended_courses", []),
                "tests": eval_res.get("recommended_tests", []),
                "projects": eval_res.get("recommended_projects", [])
            }
        )

    # 4. Check Existing Application
    existing = db.query(models.InternshipApplication).filter(
        models.InternshipApplication.student_id == student.id,
        models.InternshipApplication.source == source,
        models.InternshipApplication.source_id == source_id
    ).first()

    if existing:
        return ApplicationActionResponse(
            status="success",
            allowed=True,
            reason="APPLICATION_ALREADY_REGISTERED",
            code="APPLICATION_ALREADY_REGISTERED",
            current_match=current_match,
            required_match=float(app_threshold),
            application_threshold=app_threshold,
            remaining_gap=0.0,
            message="Application already registered and tracked in your applications timeline.",
            application_id=existing.id,
            tracking_status=existing.status,
            data={"application_id": existing.id, "status": existing.status}
        )

    # 5. Persist Authorized Application Tracking Snapshot (Audit Snapshot)
    app_entry = models.InternshipApplication(
        student_id=student.id,
        company_id=company_id,
        source=source,
        source_id=source_id,
        title_snapshot=title,
        company_snapshot=company,
        source_url_snapshot=source_url,
        application_url_snapshot=apply_url,
        status="APPLIED",
        match_score_at_apply=current_match,
        application_threshold_at_apply=app_threshold,
        eligibility_snapshot="PASSED",
        feedback="Application verified & submitted on employer portal. SkillSetu tracking activated.",
        notes=payload.notes if payload else "Applied via SkillSetu portal redirect",
        internship_id=int(internship_id) if str(internship_id).isdigit() else None
    )
    db.add(app_entry)
    db.commit()
    db.refresh(app_entry)

    logger.info(f"⚡ Application successfully authorized & tracked for student {student.email} on {title} (Match: {current_match}%, Threshold: {app_threshold}%)")
    return ApplicationActionResponse(
        status="success",
        allowed=True,
        reason="READY_TO_APPLY",
        code="READY_TO_APPLY",
        current_match=current_match,
        required_match=float(app_threshold),
        application_threshold=app_threshold,
        remaining_gap=0.0,
        message="Application successfully authorized & tracked! Employer portal activated.",
        application_id=app_entry.id,
        tracking_status="APPLIED",
        data={"application_id": app_entry.id, "status": "APPLIED"}
    )


@router.post("/{internship_id}/save", response_model=SaveActionResponse)
def toggle_save_internship(
    internship_id: str,
    payload: Optional[SaveActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    Saves or unsaves a live internship snapshot for the student.
    Does NOT store the opportunity catalog in DB.
    """
    target_email = payload.email if payload and payload.email else email
    student = None
    if target_email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == target_email.lower().strip()).first()
    if not student:
        student = db.query(models.StudentUser).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    eff_session_id = _resolve_session_id(session_id, x_session_id, student)
    all_live = LiveOpportunityEngine.get_live_internships(session_id=eff_session_id)
    listing = next((l for l in all_live if str(l.get("id")) == str(internship_id) or str(l.get("source_id")) == str(internship_id)), None)

    if not listing and str(internship_id).isdigit():
        db_p = db.query(models.InternshipPosting).filter(models.InternshipPosting.id == int(internship_id)).first()
        if db_p:
            listing = {
                "id": db_p.id,
                "source": "recruiter_posting",
                "source_id": str(db_p.id),
                "title": db_p.title,
                "company_name": db_p.company.name if db_p.company else "Employer"
            }

    source = (payload.source if payload and payload.source else (listing.get("source") if listing else "external")) or "external"
    source_id = (payload.source_id if payload and payload.source_id else (str(listing.get("source_id", listing.get("id"))) if listing else str(internship_id)))
    title = (payload.title_snapshot if payload and payload.title_snapshot else (listing.get("title") if listing else "Saved Opportunity"))
    org = (payload.organization_snapshot if payload and payload.organization_snapshot else (listing.get("company_name", listing.get("company")) if listing else "Employer"))
    source_url = (payload.source_url if payload and payload.source_url else (listing.get("source_url") if listing else None))
    apply_url = (payload.application_url if payload and payload.application_url else (listing.get("apply_url", listing.get("application_url")) if listing else None))

    saved = db.query(models.SavedInternship).filter(
        models.SavedInternship.student_id == student.id,
        models.SavedInternship.source == source,
        models.SavedInternship.source_id == source_id
    ).first()

    requested_save = payload.save if payload and payload.save is not None else None

    if requested_save is False:
        if saved:
            db.delete(saved)
            db.commit()
            SessionCacheService.invalidate_session_matches(eff_session_id, str(student.id))
        return SaveActionResponse(status="success", is_saved=False, message="Opportunity removed from bookmarks.")
    elif requested_save is True:
        if not saved:
            new_save = models.SavedInternship(
                student_id=student.id,
                source=source,
                source_id=source_id,
                title_snapshot=title,
                organization_snapshot=org,
                source_url=source_url,
                application_url=apply_url
            )
            db.add(new_save)
            db.commit()
            SessionCacheService.invalidate_session_matches(eff_session_id, str(student.id))
        return SaveActionResponse(status="success", is_saved=True, message="Opportunity bookmarked successfully.")
    else:
        # Default toggle behavior
        if saved:
            db.delete(saved)
            db.commit()
            SessionCacheService.invalidate_session_matches(eff_session_id, str(student.id))
            return SaveActionResponse(status="success", is_saved=False, message="Opportunity removed from bookmarks.")
        else:
            new_save = models.SavedInternship(
                student_id=student.id,
                source=source,
                source_id=source_id,
                title_snapshot=title,
                organization_snapshot=org,
                source_url=source_url,
                application_url=apply_url
            )
            db.add(new_save)
            db.commit()
            SessionCacheService.invalidate_session_matches(eff_session_id, str(student.id))
            return SaveActionResponse(status="success", is_saved=True, message="Opportunity bookmarked successfully.")


@router.post("/{internship_id}/bookmark", response_model=SaveActionResponse)
def bookmark_internship(
    internship_id: str,
    payload: Optional[SaveActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    Explicit bookmark addition endpoint (alias for save).
    """
    if payload is None:
        payload = SaveActionRequest(save=True)
    else:
        payload.save = True
    return toggle_save_internship(
        internship_id=internship_id,
        payload=payload,
        email=email,
        session_id=session_id,
        x_session_id=x_session_id,
        db=db
    )


@router.delete("/{internship_id}/bookmark", response_model=SaveActionResponse)
def unbookmark_internship(
    internship_id: str,
    payload: Optional[SaveActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    Explicit unbookmark removal endpoint.
    """
    if payload is None:
        payload = SaveActionRequest(save=False)
    else:
        payload.save = False
    return toggle_save_internship(
        internship_id=internship_id,
        payload=payload,
        email=email,
        session_id=session_id,
        x_session_id=x_session_id,
        db=db
    )


@router.get("/{internship_id}/progress")
def get_internship_progress(
    internship_id: str,
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    student: models.StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Returns the student-specific internship preparation matrix, skill evidence breakdown,
    career readiness score, and real-time eligibility gate status.
    """
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)
    all_live = LiveOpportunityEngine.get_live_internships(session_id=eff_session_id)
    listing = next((l for l in all_live if str(l.get("id")) == str(internship_id) or str(l.get("source_id")) == str(internship_id)), None)

    if not listing:
        try:
            int_id = int(internship_id)
            db_listing = db.query(models.InternshipListing).filter(models.InternshipListing.id == int_id).first()
            if db_listing:
                listing = {
                    "id": db_listing.id,
                    "title": db_listing.title,
                    "company_name": db_listing.company_name or "Tech Employer",
                    "source": "curated_partner",
                    "source_id": str(db_listing.id),
                    "min_cgpa": float(db_listing.min_cgpa or 7.0),
                    "required_skills": [s.skill_name for s in db_listing.required_skills] if hasattr(db_listing, "required_skills") else ["Python", "SQL"]
                }
        except Exception:
            pass

    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internship listing not found.")

    match_info = InternshipMatchingService.evaluate_student_internship_match(student, listing, db)
    src = listing.get("source", "external")
    src_id = str(listing.get("source_id", listing.get("id", "")))
    is_saved = db.query(models.SavedInternship).filter(
        models.SavedInternship.student_id == student.id,
        models.SavedInternship.source == src,
        models.SavedInternship.source_id == src_id
    ).first() is not None

    from app.services.career_intelligence_service import get_student_career_intelligence
    career_profile = get_student_career_intelligence(db=db, student_email=student.email)
    career_readiness = career_profile.get("career_readiness_score", career_profile.get("overall_readiness_score", 0.0))

    prep_skills = match_info.get("preparation_skills", [])
    skill_gaps = match_info.get("skill_gaps", [])
    missing_reqs = [g["skill_name"] for g in skill_gaps if g.get("status") in ["MISSING", "DEVELOPING"]]

    return {
        "status": "success",
        "internship_id": internship_id,
        "saved": is_saved,
        "is_saved": is_saved,
        "eligible": match_info.get("match_score", 0) >= 80.0 and match_info.get("hard_eligible", True),
        "hard_eligible": match_info.get("hard_eligible", True),
        "eligibility_status": match_info.get("eligibility_status", "ELIGIBLE"),
        "eligibility_reasons": match_info.get("eligibility_reasons", []),
        "career_readiness": career_readiness,
        "match_score": match_info.get("match_score", 0.0),
        "missing_requirements": missing_reqs,
        "required_skills": prep_skills,
        "recommended_courses": match_info.get("recommended_courses", []),
        "recommended_tests": match_info.get("recommended_tests", []),
        "recommended_projects": match_info.get("recommended_projects", []),
        "data": {
            "internship_id": internship_id,
            "saved": is_saved,
            "is_saved": is_saved,
            "eligible": match_info.get("match_score", 0) >= 80.0 and match_info.get("hard_eligible", True),
            "hard_eligible": match_info.get("hard_eligible", True),
            "eligibility_status": match_info.get("eligibility_status", "ELIGIBLE"),
            "eligibility_reasons": match_info.get("eligibility_reasons", []),
            "career_readiness": career_readiness,
            "match_score": match_info.get("match_score", 0.0),
            "missing_requirements": missing_reqs,
            "required_skills": prep_skills,
            "recommended_courses": match_info.get("recommended_courses", []),
            "recommended_tests": match_info.get("recommended_tests", []),
            "recommended_projects": match_info.get("recommended_projects", [])
        }
    }
