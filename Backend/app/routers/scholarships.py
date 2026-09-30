import logging
from typing import Optional, List, Dict, Any
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
    EligibilitySimulationRequest
)
from app.services.scholarship_eligibility_service import ScholarshipEligibilityService

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


@router.get("/eligible", response_model=ScholarshipEligibleResponse)
def get_eligible_scholarships(
    email: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    student: models.StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Evaluates deterministic eligibility for authenticated student across all active scholarships.
    Returns summary metric counts, deadline radar, and catalog.
    """
    result = ScholarshipEligibilityService.get_eligible_scholarships_for_student(
        student=student,
        db=db,
        limit=limit,
        type_filter=type,
        search_query=search
    )

    saved_ids = {s.scholarship_id for s in db.query(models.SavedScholarship).filter(models.SavedScholarship.student_id == student.id).all()}
    applied_ids = {a.scholarship_id for a in db.query(models.ScholarshipApplication).filter(models.ScholarshipApplication.student_id == student.id).all()}

    raw_items = result.get("data") or result.get("items") or result.get("catalog") or []

    def to_item(data: Dict[str, Any]) -> ScholarshipListItem:
        item = ScholarshipListItem(**data)
        sid = item.id or item.scholarship_id
        item.is_saved = sid in saved_ids
        item.has_applied = sid in applied_ids
        return item

    catalog_items = [to_item(c) for c in raw_items]
    radar_items = [to_item(r) for r in result.get("deadline_radar", [])]
    metrics_obj = ScholarshipDashboardMetrics(**result.get("metrics", {}))

    return ScholarshipEligibleResponse(
        status="success",
        count=len(catalog_items),
        data=catalog_items,
        items=catalog_items,
        metrics=metrics_obj.model_dump() if hasattr(metrics_obj, "model_dump") else metrics_obj.dict(),
        deadline_radar=[r.model_dump() if hasattr(r, "model_dump") else r.dict() for r in radar_items]
    )


@router.post("/simulate")
def simulate_scholarship_eligibility(
    req: EligibilitySimulationRequest,
    email: Optional[str] = Query(None),
    student: models.StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Simulates eligibility in real-time when student modifies CGPA or family income sliders.
    Uses the exact same backend deterministic rule engine.
    """
    overrides = {
        "cgpa": req.cgpa,
        "annual_family_income": req.annual_family_income,
        "social_category": req.social_category,
        "domicile_state": req.domicile_state,
        "gender": req.gender,
        "degree": req.degree,
        "is_pwd": req.is_pwd
    }

    scholarships = db.query(models.Scholarship).filter(models.Scholarship.is_active == True).all()
    evaluations = [
        ScholarshipEligibilityService.evaluate_student_scholarship_eligibility(student, s, simulated_overrides=overrides)
        for s in scholarships
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
    scholarship_id: int,
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns full details, rules, and eligibility evaluation for a specific scholarship.
    """
    sch = db.query(models.Scholarship).filter(models.Scholarship.id == scholarship_id).first()
    if not sch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scholarship not found.")

    student = None
    if email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == email.lower().strip()).first()

    if student:
        eval_res = ScholarshipEligibilityService.evaluate_student_scholarship_eligibility(student, sch)
        is_saved = db.query(models.SavedScholarship).filter(
            models.SavedScholarship.student_id == student.id,
            models.SavedScholarship.scholarship_id == sch.id
        ).first() is not None
        has_applied = db.query(models.ScholarshipApplication).filter(
            models.ScholarshipApplication.student_id == student.id,
            models.ScholarshipApplication.scholarship_id == sch.id
        ).first() is not None
        eval_res["is_saved"] = is_saved
        eval_res["has_applied"] = has_applied
        return {"status": "success", "data": eval_res}

    return {
        "status": "success",
        "data": {
            "scholarship_id": sch.id,
            "name": sch.name,
            "provider": sch.provider,
            "description": sch.description,
            "academic_year": sch.academic_year,
            "scholarship_type": sch.scholarship_type,
            "award_amount": float(sch.award_amount) if sch.award_amount else None,
            "award_frequency": sch.award_frequency,
            "award_description": sch.award_description,
            "application_url": sch.application_url,
            "application_deadline": sch.application_deadline.isoformat() if sch.application_deadline else None,
            "source": sch.source,
            "source_url": sch.source_url
        }
    }


@router.post("/{scholarship_id}/apply", response_model=ApplicationActionResponse)
def apply_scholarship(
    scholarship_id: int,
    payload: Optional[ApplyActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Registers a scholarship application tracking record for the student.
    """
    target_email = payload.email if payload and payload.email else email
    student = None
    if target_email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == target_email.lower().strip()).first()
    if not student:
        student = db.query(models.StudentUser).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    sch = db.query(models.Scholarship).filter(models.Scholarship.id == scholarship_id).first()
    if not sch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scholarship not found.")

    existing = db.query(models.ScholarshipApplication).filter(
        models.ScholarshipApplication.student_id == student.id,
        models.ScholarshipApplication.scholarship_id == sch.id
    ).first()

    if existing:
        return ApplicationActionResponse(
            status="success",
            message="Scholarship application already tracked.",
            data={"application_id": existing.id, "status": existing.status}
        )

    app_entry = models.ScholarshipApplication(
        student_id=student.id,
        scholarship_id=sch.id,
        status="APPLIED",
        notes=f"Redirected to {sch.provider} application portal."
    )
    db.add(app_entry)
    db.commit()
    db.refresh(app_entry)

    return ApplicationActionResponse(
        status="success",
        message="Scholarship application registered in tracking dossier!",
        data={"application_id": app_entry.id, "status": "APPLIED"}
    )


@router.post("/{scholarship_id}/save", response_model=SaveActionResponse)
def toggle_save_scholarship(
    scholarship_id: int,
    payload: Optional[SaveActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Toggles saving / bookmarking a scholarship for the student.
    """
    target_email = payload.email if payload and payload.email else email
    student = None
    if target_email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == target_email.lower().strip()).first()
    if not student:
        student = db.query(models.StudentUser).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    sch = db.query(models.Scholarship).filter(models.Scholarship.id == scholarship_id).first()
    if not sch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scholarship not found.")

    saved = db.query(models.SavedScholarship).filter(
        models.SavedScholarship.student_id == student.id,
        models.SavedScholarship.scholarship_id == sch.id
    ).first()

    if saved:
        db.delete(saved)
        db.commit()
        return SaveActionResponse(status="success", is_saved=False, message="Scholarship removed from bookmarks.")
    else:
        new_save = models.SavedScholarship(student_id=student.id, scholarship_id=sch.id)
        db.add(new_save)
        db.commit()
        return SaveActionResponse(status="success", is_saved=True, message="Scholarship bookmarked successfully.")
