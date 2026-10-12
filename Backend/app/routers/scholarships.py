import time
import logging
from typing import Optional, List, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.opportunities import (
    ScholarshipEligibleResponse,
    ScholarshipListItem,
    ScholarshipDashboardMetrics,
    ApplicationActionResponse,
    SaveActionResponse,
    ApplyActionRequest,
    SaveActionRequest,
    EligibilitySimulationRequest
)
from app.services.scholarship_eligibility_service import ScholarshipEligibilityService
from app.services.live_opportunities.live_engine import LiveOpportunityEngine
from app.services.session_cache_service import SessionCacheService

logger = logging.getLogger("skillsetu_scholarships_api")
router = APIRouter()


def get_current_student(
    email: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> models.StudentUser:
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
    if x_session_id and x_session_id.strip():
        return x_session_id.strip()
    if session_id and session_id.strip():
        return session_id.strip()
    if student and student.id:
        return f"user_{student.id}"
    return "guest_session"


@router.get("/source-status")
def get_scholarships_source_status(
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    student: models.StudentUser = Depends(get_current_student)
):
    """
    Diagnostic status endpoint returning live scheme counts and performance metrics from NSP, AICTE, and foundations.
    """
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)
    return LiveOpportunityEngine.get_scholarship_source_status(session_id=eff_session_id)


@router.post("/cache/clear")
def clear_scholarships_cache(
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    student: models.StudentUser = Depends(get_current_student)
):
    """
    Destroys session-scoped scholarship cache (e.g. on logout).
    """
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)
    deleted_session = SessionCacheService.clear_session_cache(eff_session_id)
    deleted_student = SessionCacheService.clear_all_for_student(student.email if student else "")
    return {
        "status": "success",
        "message": "Scholarship session cache deleted.",
        "session_id": eff_session_id,
        "deleted_entries": deleted_session + deleted_student
    }


@router.get("", response_model=ScholarshipEligibleResponse)
def get_scholarships(
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None),
    force_refresh: bool = Query(False),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    email: Optional[str] = Query(None),
    student: models.StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Fetches live verified scholarship schemes without storing them in PostgreSQL.
    Strictly completes within 2 seconds using parallel loading and session caching.
    """
    eff_limit = page_size if page_size is not None else (limit if limit is not None else 50)
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)

    req_start = time.perf_counter()
    result = ScholarshipEligibilityService.get_eligible_scholarships_for_student(
        student=student,
        db=db,
        limit=eff_limit,
        page=page,
        type_filter=type,
        category_filter=category,
        state_filter=state,
        search_query=search,
        session_id=eff_session_id,
        force_refresh=force_refresh
    )
    total_time_ms = round((time.perf_counter() - req_start) * 1000, 2)

    raw_items = result.get("data") or result.get("items") or []
    catalog_items = [ScholarshipListItem(**c) for c in raw_items]
    radar_items = [ScholarshipListItem(**r) for r in result.get("deadline_radar", [])]
    metrics_obj = ScholarshipDashboardMetrics(**result.get("metrics", {}))

    telemetry = LiveOpportunityEngine.get_performance_telemetry()
    telemetry["api_response_time_ms"] = total_time_ms

    return ScholarshipEligibleResponse(
        status="success",
        count=len(catalog_items),
        total_results=result.get("total_count", len(catalog_items)),
        data=catalog_items,
        items=catalog_items,
        metrics=metrics_obj.model_dump() if hasattr(metrics_obj, "model_dump") else metrics_obj.dict(),
        performance=telemetry,
        deadline_radar=[r.model_dump() if hasattr(r, "model_dump") else r.dict() for r in radar_items]
    )


@router.get("/eligible", response_model=ScholarshipEligibleResponse)
def get_eligible_scholarships(
    email: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None),
    force_refresh: bool = Query(False),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    student: models.StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Evaluates deterministic eligibility for student across live scholarships in memory.
    Returns summary metric counts, deadline radar, and catalog.
    """
    eff_limit = page_size if page_size is not None else (limit if limit is not None else 50)
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)

    req_start = time.perf_counter()
    result = ScholarshipEligibilityService.get_eligible_scholarships_for_student(
        student=student,
        db=db,
        limit=eff_limit,
        page=page,
        type_filter=type,
        category_filter=category,
        state_filter=state,
        search_query=search,
        session_id=eff_session_id,
        force_refresh=force_refresh
    )
    total_time_ms = round((time.perf_counter() - req_start) * 1000, 2)

    raw_items = result.get("data") or result.get("items") or []
    catalog_items = [ScholarshipListItem(**c) for c in raw_items]
    radar_items = [ScholarshipListItem(**r) for r in result.get("deadline_radar", [])]
    metrics_obj = ScholarshipDashboardMetrics(**result.get("metrics", {}))

    telemetry = LiveOpportunityEngine.get_performance_telemetry()
    telemetry["api_response_time_ms"] = total_time_ms

    return ScholarshipEligibleResponse(
        status="success",
        count=len(catalog_items),
        total_results=result.get("total_count", len(catalog_items)),
        data=catalog_items,
        items=catalog_items,
        metrics=metrics_obj.model_dump() if hasattr(metrics_obj, "model_dump") else metrics_obj.dict(),
        performance=telemetry,
        deadline_radar=[r.model_dump() if hasattr(r, "model_dump") else r.dict() for r in radar_items]
    )


@router.post("/simulate")
def simulate_scholarship_eligibility(
    req: EligibilitySimulationRequest,
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    student: models.StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Simulates eligibility in real-time using live scholarship feed and deterministic rules.
    """
    eff_session_id = _resolve_session_id(session_id, x_session_id, student)
    overrides = {
        "cgpa": req.cgpa,
        "annual_family_income": req.annual_family_income,
        "social_category": req.social_category,
        "domicile_state": req.domicile_state,
        "gender": req.gender,
        "degree": req.degree,
        "is_pwd": req.is_pwd
    }

    live_scholarships = LiveOpportunityEngine.get_live_scholarships(session_id=eff_session_id)
    evaluations = [
        ScholarshipEligibilityService.evaluate_student_scholarship_eligibility(student, s, simulated_overrides=overrides)
        for s in live_scholarships
    ]

    eligible_count = sum(1 for e in evaluations if e["eligibility_status"] == "ELIGIBLE")
    possibly_eligible_count = sum(1 for e in evaluations if e["eligibility_status"] == "POSSIBLY_ELIGIBLE")
    total_count = len(evaluations)
    overall_rating = int(round((eligible_count / total_count) * 100)) if total_count > 0 else 0

    return {
        "status": "success",
        "data": {
            "overall_eligibility_percent": max(overall_rating, 60 if eligible_count > 0 else 20),
            "eligible_count": eligible_count,
            "possibly_eligible_count": possibly_eligible_count,
            "tier_label": "Highly Qualified" if overall_rating >= 60 else ("Moderately Qualified" if overall_rating >= 30 else "Needs Prerequisites"),
            "evaluations": evaluations,
            "evaluated_scholarships": evaluations
        }
    }


@router.get("/{scholarship_id}")
def get_scholarship_detail(
    scholarship_id: str,
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    Returns full details, rules, and eligibility evaluation for a specific live scholarship.
    """
    eff_session_id = _resolve_session_id(session_id, x_session_id)
    live_scholarships = LiveOpportunityEngine.get_live_scholarships(session_id=eff_session_id)
    sch = next((s for s in live_scholarships if str(s.get("id")) == str(scholarship_id) or str(s.get("source_id")) == str(scholarship_id)), None)

    student = None
    if email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == email.lower().strip()).first()

    if sch:
        if student:
            eval_res = ScholarshipEligibilityService.evaluate_student_scholarship_eligibility(student, sch)
            src = sch.get("source", "nsp")
            src_id = str(sch.get("source_id", sch.get("id", "")))
            is_saved = db.query(models.SavedScholarship).filter(
                models.SavedScholarship.student_id == student.id,
                models.SavedScholarship.source == src,
                models.SavedScholarship.source_id == src_id
            ).first() is not None
            has_applied = db.query(models.ScholarshipApplication).filter(
                models.ScholarshipApplication.student_id == student.id,
                models.ScholarshipApplication.source == src,
                models.ScholarshipApplication.source_id == src_id
            ).first() is not None
            eval_res["is_saved"] = is_saved
            eval_res["has_applied"] = has_applied
            return {"status": "success", "data": eval_res}
        return {"status": "success", "data": sch}

    # Legacy fallback
    try:
        sch_int = int(scholarship_id)
        db_sch = db.query(models.Scholarship).filter(models.Scholarship.id == sch_int).first()
        if db_sch:
            if student:
                eval_res = ScholarshipEligibilityService.evaluate_student_scholarship_eligibility(student, db_sch)
                return {"status": "success", "data": eval_res}
            return {"status": "success", "data": {"id": db_sch.id, "name": db_sch.name}}
    except Exception:
        pass

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scholarship not found.")


@router.post("/{scholarship_id}/apply", response_model=ApplicationActionResponse)
def apply_scholarship(
    scholarship_id: str,
    payload: Optional[ApplyActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    Registers a scholarship application tracking snapshot record for the student.
    Does NOT store the scholarship catalog in DB.
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
    live_scholarships = LiveOpportunityEngine.get_live_scholarships(session_id=eff_session_id)
    sch = next((s for s in live_scholarships if str(s.get("id")) == str(scholarship_id) or str(s.get("source_id")) == str(scholarship_id)), None)

    source = (payload.source if payload and payload.source else (sch.get("source") if sch else "nsp")) or "nsp"
    source_id = (payload.source_id if payload and payload.source_id else (str(sch.get("source_id", sch.get("id"))) if sch else str(scholarship_id)))
    name = (payload.title_snapshot if payload and payload.title_snapshot else (sch.get("name") if sch else "Scholarship Grant"))
    provider = (payload.company_snapshot if payload and payload.company_snapshot else (sch.get("provider") if sch else "Scheme Provider"))
    source_url = (payload.source_url_snapshot if payload and payload.source_url_snapshot else (sch.get("source_url") if sch else "https://scholarships.gov.in"))
    apply_url = (payload.application_url_snapshot if payload and payload.application_url_snapshot else (sch.get("application_url") if sch else "https://scholarships.gov.in"))

    existing = db.query(models.ScholarshipApplication).filter(
        models.ScholarshipApplication.student_id == student.id,
        models.ScholarshipApplication.source == source,
        models.ScholarshipApplication.source_id == source_id
    ).first()

    if existing:
        return ApplicationActionResponse(
            status="success",
            allowed=True,
            message="Scholarship application already tracked.",
            application_id=existing.id,
            tracking_status=existing.status,
            data={"application_id": existing.id, "status": existing.status}
        )

    elig_status = "ELIGIBLE"
    if sch:
        eval_res = ScholarshipEligibilityService.evaluate_student_scholarship_eligibility(student, sch)
        elig_status = eval_res.get("eligibility_status", "ELIGIBLE")

    app_entry = models.ScholarshipApplication(
        student_id=student.id,
        source=source,
        source_id=source_id,
        name_snapshot=name,
        provider_snapshot=provider,
        source_url_snapshot=source_url,
        application_url_snapshot=apply_url,
        eligibility_status_at_apply=elig_status,
        status="APPLIED",
        notes=payload.notes if payload else f"Redirected to {provider} portal."
    )
    db.add(app_entry)
    db.commit()
    db.refresh(app_entry)

    return ApplicationActionResponse(
        status="success",
        allowed=True,
        message="Scholarship application registered in tracking dossier!",
        application_id=app_entry.id,
        tracking_status="APPLIED",
        data={"application_id": app_entry.id, "status": "APPLIED"}
    )


@router.post("/{scholarship_id}/save", response_model=SaveActionResponse)
def toggle_save_scholarship(
    scholarship_id: str,
    payload: Optional[SaveActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    Saves or unsaves a live scholarship snapshot for the student.
    Does NOT store the scholarship catalog in DB.
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
    live_scholarships = LiveOpportunityEngine.get_live_scholarships(session_id=eff_session_id)
    sch = next((s for s in live_scholarships if str(s.get("id")) == str(scholarship_id) or str(s.get("source_id")) == str(scholarship_id)), None)

    source = (payload.source if payload and payload.source else (sch.get("source") if sch else "nsp")) or "nsp"
    source_id = (payload.source_id if payload and payload.source_id else (str(sch.get("source_id", sch.get("id"))) if sch else str(scholarship_id)))
    name = (payload.title_snapshot if payload and payload.title_snapshot else (sch.get("name") if sch else "Saved Scholarship"))
    provider = (payload.organization_snapshot if payload and payload.organization_snapshot else (sch.get("provider") if sch else "Provider"))
    source_url = (payload.source_url if payload and payload.source_url else (sch.get("source_url") if sch else None))
    apply_url = (payload.application_url if payload and payload.application_url else (sch.get("application_url") if sch else None))

    saved = db.query(models.SavedScholarship).filter(
        models.SavedScholarship.student_id == student.id,
        models.SavedScholarship.source == source,
        models.SavedScholarship.source_id == source_id
    ).first()

    requested_save = payload.save if payload and payload.save is not None else None

    if requested_save is False:
        if saved:
            db.delete(saved)
            db.commit()
        return SaveActionResponse(status="success", is_saved=False, message="Scholarship removed from bookmarks.")
    elif requested_save is True:
        if not saved:
            new_save = models.SavedScholarship(
                student_id=student.id,
                source=source,
                source_id=source_id,
                name_snapshot=name,
                provider_snapshot=provider,
                source_url=source_url,
                application_url=apply_url
            )
            db.add(new_save)
            db.commit()
        return SaveActionResponse(status="success", is_saved=True, message="Scholarship bookmarked successfully.")
    else:
        if saved:
            db.delete(saved)
            db.commit()
            return SaveActionResponse(status="success", is_saved=False, message="Scholarship removed from bookmarks.")
        else:
            new_save = models.SavedScholarship(
                student_id=student.id,
                source=source,
                source_id=source_id,
                name_snapshot=name,
                provider_snapshot=provider,
                source_url=source_url,
                application_url=apply_url
            )
            db.add(new_save)
            db.commit()
            return SaveActionResponse(status="success", is_saved=True, message="Scholarship bookmarked successfully.")
