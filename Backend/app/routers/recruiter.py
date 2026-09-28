from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import RecruiterUser
from app.security import hash_password, verify_password, create_access_token, get_current_recruiter

router = APIRouter()

class RecruiterRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str = ""
    company_name: str
    company_website: str = ""
    industry: str = ""
    company_size: str = ""
    designation: str = ""

class RecruiterLoginRequest(BaseModel):
    email: EmailStr
    password: str

class RecruiterProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    designation: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None

@router.get("/profile")
def get_recruiter_profile(current_user: RecruiterUser = Depends(get_current_recruiter)):
    return {
        "status": "success",
        "profile": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone or "",
            "company_name": current_user.company_name,
            "company_website": current_user.company_website or "",
            "designation": current_user.designation or "",
            "company_size": current_user.company_size or "",
            "industry": current_user.industry or "",
            "status": current_user.status,
            "is_verified": current_user.is_verified,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        }
    }

@router.put("/profile")
def update_recruiter_profile(
    payload: RecruiterProfileUpdateRequest,
    current_user: RecruiterUser = Depends(get_current_recruiter),
    db: Session = Depends(get_db)
):
    if payload.name is not None:
        current_user.name = payload.name.strip()
    if payload.phone is not None:
        current_user.phone = payload.phone.strip()
    if payload.company_name is not None:
        current_user.company_name = payload.company_name.strip()
    if payload.company_website is not None:
        current_user.company_website = payload.company_website.strip()
    if payload.designation is not None:
        current_user.designation = payload.designation.strip()
    if payload.company_size is not None:
        current_user.company_size = payload.company_size.strip()
    if payload.industry is not None:
        current_user.industry = payload.industry.strip()

    db.commit()
    db.refresh(current_user)

    return {
        "status": "success",
        "message": "Recruiter profile updated successfully.",
        "profile": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone or "",
            "company_name": current_user.company_name,
            "company_website": current_user.company_website or "",
            "designation": current_user.designation or "",
            "company_size": current_user.company_size or "",
            "industry": current_user.industry or "",
            "status": current_user.status,
            "is_verified": current_user.is_verified,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        }
    }


@router.post("/register")
def register_recruiter(payload: RecruiterRegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing_user = db.query(RecruiterUser).filter(RecruiterUser.email == email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recruiter already registered with this email.")

    hashed = hash_password(payload.password)
    new_recruiter = RecruiterUser(
        name=payload.name,
        email=email,
        password_hash=hashed,
        phone=payload.phone,
        company_name=payload.company_name,
        company_website=payload.company_website,
        industry=payload.industry,
        company_size=payload.company_size,
        designation=payload.designation,
        is_verified=False,
        status="PENDING"
    )
    db.add(new_recruiter)
    db.commit()
    db.refresh(new_recruiter)

    return {
        "status": "pending_approval",
        "message": "Registration submitted successfully! Your recruiter account is awaiting admin verification.",
        "user": {
            "id": new_recruiter.id,
            "name": new_recruiter.name,
            "email": new_recruiter.email,
            "company_name": new_recruiter.company_name,
            "designation": new_recruiter.designation,
            "status": new_recruiter.status,
            "role": "recruiter"
        }
    }

@router.post("/login")
def login_recruiter(payload: RecruiterLoginRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    recruiter = db.query(RecruiterUser).filter(RecruiterUser.email == email).first()
    if not recruiter:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials. Recruiter not found.")

    if not verify_password(payload.password, recruiter.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")

    if recruiter.status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is awaiting admin verification."
        )

    if recruiter.status == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your recruiter registration was rejected."
        )

    if recruiter.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not approved to access recruiter services."
        )

    access_token = create_access_token(data={"sub": recruiter.email, "role": "recruiter"})

    return {
        "status": "success",
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": recruiter.id,
            "name": recruiter.name,
            "email": recruiter.email,
            "company_name": recruiter.company_name,
            "status": recruiter.status,
            "role": "recruiter"
        }
    }

@router.get("/dashboard")
def get_recruiter_dashboard(current_user: RecruiterUser = Depends(get_current_recruiter)):
    return {
        "status": "success",
        "data": {
            "recruiter": {"name": current_user.name, "company": current_user.company_name},
            "stats": {
                "active_jobs": 5,
                "total_applicants": 48,
                "interviews_scheduled": 12
            },
            "recent_applications": [
                {"id": 201, "candidate": "Alex Johnson", "role": "Junior Backend Engineer", "status": "Under Review"},
                {"id": 202, "candidate": "Maria Garcia", "role": "Frontend Developer", "status": "Interview Scheduled"}
            ]
        }
    }

@router.get("/jobs")
def get_job_postings(current_user: RecruiterUser = Depends(get_current_recruiter)):
    return {
        "status": "success",
        "jobs": [
            {"id": 1, "title": "Junior Backend Engineer (Python/FastAPI)", "location": "Remote", "type": "Full-time"},
            {"id": 2, "title": "Mobile App Developer (React Native)", "location": "Hybrid", "type": "Full-time"}
        ]
    }
