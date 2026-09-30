import logging
from typing import Optional, List, Dict, Any
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
        # In this platform, tokens or decoded emails are used
        if "@" in token:
            student_email = token

    if not student_email:
        # Fallback to first active student or raise 401
        student = db.query(models.StudentUser).first()
        if student:
            return student
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication email required.")

    student = db.query(models.StudentUser).filter(models.StudentUser.email == student_email.lower().strip()).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student account not found for {student_email}.")
    return student


@router.get("", response_model=InternshipListResponse)
def list_internships(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    work_mode: Optional[str] = Query(None),
    career_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Public catalog of verified real-world internships.
    """
    query = db.query(models.InternshipListing).filter(models.InternshipListing.is_active == True)

    if search:
        q = f"%{search.strip()}%"
        query = query.filter(
            models.InternshipListing.title.ilike(q) |
            models.InternshipListing.company_name.ilike(q) |
            models.InternshipListing.description.ilike(q)
        )
    if location and location != "All":
        query = query.filter(models.InternshipListing.location_name.ilike(f"%{location}%"))
    if work_mode and work_mode != "All":
        query = query.filter(models.InternshipListing.work_preference.ilike(f"%{work_mode}%"))
    if career_id and career_id != "All":
        query = query.filter(models.InternshipListing.career_id == career_id)

    total = query.count()
    items = query.order_by(models.InternshipListing.posted_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    data = []
    for l in items:
        data.append(InternshipListItem(
            internship_id=l.id,
            title=l.title,
            company_name=l.company_name,
            company_logo=l.company_logo,
            description=l.description,
            location=l.location_name,
            work_preference=l.work_preference,
            stipend=l.stipend,
            duration=l.duration,
            match_score=0.0,
            eligibility_status="AVAILABLE",
            matched_skills=[],
            developing_skills=[],
            missing_skills=[r.skill_name for r in l.required_skills],
            reasons=[],
            why_this_matches=None,
            apply_url=l.apply_url,
            application_deadline=l.application_deadline.isoformat() if l.application_deadline else None,
            source=l.source,
            source_url=l.source_url
        ))

    return InternshipListResponse(count=total, data=data)


@router.get("/recommended", response_model=InternshipListResponse)
def get_recommended_internships(
    email: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    work_mode: Optional[str] = Query(None),
    career: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    student: models.StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Retrieves deterministic personalized recommendations for the authenticated student.
    """
    ranked = InternshipMatchingService.get_ranked_recommendations(
        student=student,
        db=db,
        limit=limit,
        career_filter=career,
        location_filter=location,
        work_mode_filter=work_mode,
        search_query=search
    )

    # Fetch student's saved and applied internship IDs
    saved_ids = {s.internship_id for s in db.query(models.SavedInternship).filter(models.SavedInternship.student_id == student.id).all()}
    applied_ids = {a.internship_id for a in db.query(models.InternshipApplication).filter(models.InternshipApplication.student_id == student.id).all()}

    output = []
    for r in ranked:
        item = InternshipListItem(**r)
        item.is_saved = item.internship_id in saved_ids
        item.has_applied = item.internship_id in applied_ids
        output.append(item)

    return InternshipListResponse(count=len(output), data=output)


@router.get("/{internship_id}")
def get_internship_detail(
    internship_id: int,
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns full details and match breakdown for a specific internship.
    """
    listing = db.query(models.InternshipListing).filter(models.InternshipListing.id == internship_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internship listing not found.")

    student = None
    if email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == email.lower().strip()).first()

    if student:
        match_info = InternshipMatchingService.evaluate_student_internship_match(student, listing, db)
        is_saved = db.query(models.SavedInternship).filter(
            models.SavedInternship.student_id == student.id,
            models.SavedInternship.internship_id == listing.id
        ).first() is not None
        has_applied = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.student_id == student.id,
            models.InternshipApplication.internship_id == listing.id
        ).first() is not None
        match_info["is_saved"] = is_saved
        match_info["has_applied"] = has_applied
        return {"status": "success", "data": match_info}

    return {
        "status": "success",
        "data": {
            "internship_id": listing.id,
            "title": listing.title,
            "company_name": listing.company_name,
            "company_logo": listing.company_logo,
            "description": listing.description,
            "location": listing.location_name,
            "work_preference": listing.work_preference,
            "stipend": listing.stipend,
            "duration": listing.duration,
            "min_cgpa": listing.min_cgpa,
            "required_skills": [r.skill_name for r in listing.required_skills],
            "apply_url": listing.apply_url,
            "application_deadline": listing.application_deadline.isoformat() if listing.application_deadline else None,
            "source": listing.source,
            "source_url": listing.source_url
        }
    }


@router.post("/{internship_id}/apply", response_model=ApplicationActionResponse)
def apply_internship(
    internship_id: int,
    payload: Optional[ApplyActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Registers an internship application tracking record for the student.
    """
    target_email = (payload.email if payload and payload.email else email)
    student = None
    if target_email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == target_email.lower().strip()).first()
    if not student:
        student = db.query(models.StudentUser).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    listing = db.query(models.InternshipListing).filter(models.InternshipListing.id == internship_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internship listing not found.")

    existing = db.query(models.InternshipApplication).filter(
        models.InternshipApplication.student_id == student.id,
        models.InternshipApplication.internship_id == listing.id
    ).first()

    if existing:
        return ApplicationActionResponse(
            status="success",
            message="Application already registered and tracked in your applications timeline.",
            data={"application_id": existing.id, "status": existing.status}
        )

    # Evaluate match score at apply
    eval_res = InternshipMatchingService.evaluate_student_internship_match(student, listing, db)
    app_entry = models.InternshipApplication(
        student_id=student.id,
        internship_id=listing.id,
        status="APPLIED",
        match_score_at_apply=eval_res.get("match_score", 0.0),
        feedback="Application submitted on employer portal. SkillSetu tracking activated."
    )
    db.add(app_entry)
    db.commit()
    db.refresh(app_entry)

    return ApplicationActionResponse(
        status="success",
        message="Application successfully tracked! Timeline updated.",
        data={"application_id": app_entry.id, "status": "APPLIED"}
    )


@router.post("/{internship_id}/save", response_model=SaveActionResponse)
def toggle_save_internship(
    internship_id: int,
    payload: Optional[SaveActionRequest] = Body(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Toggles saving / bookmarking an internship for the authenticated student.
    """
    target_email = (payload.email if payload and payload.email else email)
    student = None
    if target_email:
        student = db.query(models.StudentUser).filter(models.StudentUser.email == target_email.lower().strip()).first()
    if not student:
        student = db.query(models.StudentUser).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    listing = db.query(models.InternshipListing).filter(models.InternshipListing.id == internship_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internship listing not found.")

    should_save = payload.save if payload and payload.save is not None else True

    saved = db.query(models.SavedInternship).filter(
        models.SavedInternship.student_id == student.id,
        models.SavedInternship.internship_id == listing.id
    ).first()

    if saved and not should_save:
        db.delete(saved)
        db.commit()
        return SaveActionResponse(status="success", is_saved=False, message="Internship removed from saved bookmarks.")
    elif not saved and should_save:
        new_save = models.SavedInternship(student_id=student.id, internship_id=listing.id)
        db.add(new_save)
        db.commit()
        return SaveActionResponse(status="success", is_saved=True, message="Internship bookmarked successfully.")
    else:
        return SaveActionResponse(status="success", is_saved=bool(saved), message="Bookmark state unchanged.")
