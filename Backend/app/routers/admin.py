from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AdminUser, RecruiterUser
from app.security import verify_password, hash_password, create_access_token, get_current_admin

router = APIRouter()

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class RejectRecruiterRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/login")
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    admin = db.query(AdminUser).filter(AdminUser.email == email).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials."
        )

    if not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password."
        )

    if admin.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive."
        )

    access_token = create_access_token(data={"sub": admin.email, "role": "admin", "admin_id": admin.id})

    return {
        "status": "success",
        "message": "Admin login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "admin": {
            "id": admin.id,
            "name": admin.name,
            "email": admin.email,
            "role": admin.role
        }
    }


@router.get("/recruiters/pending")
def get_pending_recruiters(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    pending_recruiters = db.query(RecruiterUser).filter(RecruiterUser.status == "PENDING").order_by(RecruiterUser.created_at.desc()).all()
    
    result = []
    for r in pending_recruiters:
        result.append({
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "phone": r.phone,
            "company_name": r.company_name,
            "company_website": r.company_website,
            "designation": r.designation,
            "company_size": r.company_size,
            "industry": r.industry,
            "is_verified": r.is_verified,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    
    return {
        "status": "success",
        "count": len(result),
        "recruiters": result
    }


@router.get("/recruiters/{recruiter_id}")
def get_recruiter_details(
    recruiter_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    recruiter = db.query(RecruiterUser).filter(RecruiterUser.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recruiter with ID {recruiter_id} not found."
        )

    return {
        "status": "success",
        "recruiter": {
            "id": recruiter.id,
            "name": recruiter.name,
            "email": recruiter.email,
            "phone": recruiter.phone,
            "company_name": recruiter.company_name,
            "company_website": recruiter.company_website,
            "designation": recruiter.designation,
            "company_size": recruiter.company_size,
            "industry": recruiter.industry,
            "is_verified": recruiter.is_verified,
            "status": recruiter.status,
            "approved_at": recruiter.approved_at.isoformat() if recruiter.approved_at else None,
            "approved_by": recruiter.approved_by,
            "rejected_at": recruiter.rejected_at.isoformat() if recruiter.rejected_at else None,
            "rejected_by": recruiter.rejected_by,
            "rejection_reason": recruiter.rejection_reason,
            "created_at": recruiter.created_at.isoformat() if recruiter.created_at else None
        }
    }


@router.put("/recruiters/{recruiter_id}/approve")
def approve_recruiter(
    recruiter_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    recruiter = db.query(RecruiterUser).filter(RecruiterUser.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recruiter with ID {recruiter_id} not found."
        )

    recruiter.status = "APPROVED"
    recruiter.is_verified = True
    recruiter.approved_at = datetime.utcnow()
    recruiter.approved_by = current_admin.id
    recruiter.rejected_at = None
    recruiter.rejected_by = None
    recruiter.rejection_reason = None

    db.commit()
    db.refresh(recruiter)

    return {
        "status": "success",
        "message": f"Recruiter '{recruiter.name}' has been successfully approved.",
        "recruiter": {
            "id": recruiter.id,
            "name": recruiter.name,
            "email": recruiter.email,
            "company_name": recruiter.company_name,
            "status": recruiter.status,
            "approved_at": recruiter.approved_at.isoformat() if recruiter.approved_at else None,
            "approved_by": recruiter.approved_by
        }
    }


@router.put("/recruiters/{recruiter_id}/reject")
def reject_recruiter(
    recruiter_id: int,
    payload: Optional[RejectRecruiterRequest] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    recruiter = db.query(RecruiterUser).filter(RecruiterUser.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recruiter with ID {recruiter_id} not found."
        )

    reason = payload.reason if payload else None

    recruiter.status = "REJECTED"
    recruiter.rejected_at = datetime.utcnow()
    recruiter.rejected_by = current_admin.id
    recruiter.rejection_reason = reason

    db.commit()
    db.refresh(recruiter)

    return {
        "status": "success",
        "message": f"Recruiter '{recruiter.name}' registration has been rejected.",
        "recruiter": {
            "id": recruiter.id,
            "name": recruiter.name,
            "email": recruiter.email,
            "company_name": recruiter.company_name,
            "status": recruiter.status,
            "rejected_at": recruiter.rejected_at.isoformat() if recruiter.rejected_at else None,
            "rejected_by": recruiter.rejected_by,
            "rejection_reason": recruiter.rejection_reason
        }
    }


@router.get("/dashboard/stats")
def get_admin_dashboard_stats(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_recruiters = db.query(RecruiterUser).count()
    pending_recruiters = db.query(RecruiterUser).filter(RecruiterUser.status == "PENDING").count()
    approved_recruiters = db.query(RecruiterUser).filter(RecruiterUser.status == "APPROVED").count()
    rejected_recruiters = db.query(RecruiterUser).filter(RecruiterUser.status == "REJECTED").count()

    return {
        "status": "success",
        "stats": {
            "total_recruiters": total_recruiters,
            "pending_recruiters": pending_recruiters,
            "approved_recruiters": approved_recruiters,
            "rejected_recruiters": rejected_recruiters
        }
    }
