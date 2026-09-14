import json
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form
from pydantic import BaseModel, EmailStr

from sqlalchemy.orm import Session
from app.database import get_db
from app.models import StudentUser, PendingOTP, StudentGithubConnection
from app.security import hash_password, verify_password
from app.services.email_service import generate_otp, send_otp_email
from app.services.document_service import extract_marksheet_data, extract_resume_data
from app.services.resume_service import (
    normalize_skill,
    normalize_career,
    normalize_location,
    calculate_resume_score,
    derive_skill_domains
)


router = APIRouter()

class SendOtpRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class StudentRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str = ""

class UpdatePersonalInfoRequest(BaseModel):
    email: EmailStr
    profile_image: str = ""
    headline: str = ""
    location: str = ""
    years_of_experience: str = ""
    bio: str = ""

class UpdateEducationRequest(BaseModel):
    email: EmailStr
    degree: str = ""
    branch: str = ""
    university: str = ""
    start_year: str = ""
    graduation_year: str = ""
    cgpa_or_percentage: str = ""
    marksheet_url: str = ""

class StudentLoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/send-otp")
def send_signup_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    """
    Generate and send a 6-digit OTP verification email for student sign up.
    Sent from: abhoge5@gmail.com
    """
    email = payload.email.lower()
    
    # Check if student already exists
    existing_user = db.query(StudentUser).filter(StudentUser.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in instead."
        )

    otp = generate_otp()
    
    # Store or update OTP in PostgreSQL database
    pending_record = db.query(PendingOTP).filter(PendingOTP.email == email).first()
    if pending_record:
        pending_record.otp = otp
        pending_record.is_verified = False
    else:
        pending_record = PendingOTP(email=email, otp=otp, is_verified=False)
        db.add(pending_record)
    
    db.commit()
    
    # Send email
    success = send_otp_email(to_email=email, otp=otp)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP email. Please verify SMTP credentials."
        )
        
    return {
        "status": "success",
        "message": f"Verification OTP sent to {email} from abhoge5@gmail.com",
        "email": email
    }

@router.post("/verify-otp")
def verify_signup_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    """
    Verify the 6-digit OTP stored in database.
    """
    email = payload.email.lower()
    pending_record = db.query(PendingOTP).filter(PendingOTP.email == email).first()
    
    if not pending_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending OTP request found for this email. Please click Send OTP first."
        )
        
    if pending_record.otp != payload.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please try again."
        )

    # Mark email OTP as verified in DB
    pending_record.is_verified = True
    db.commit()
        
    return {
        "status": "success",
        "message": "OTP verified successfully! You can now complete registration.",
        "email": email
    }

def get_student_dict(student: StudentUser) -> dict:
    return {
        "id": student.id,
        "name": student.name,
        "email": student.email,
        "phone": student.phone or "",
        "profile_image": student.profile_image or "",
        "headline": student.headline or "",
        "location": student.location or "",
        "years_of_experience": student.years_of_experience or "",
        "bio": student.bio or "",
        "degree": student.degree or "",
        "branch": student.branch or "",
        "university": student.university or "",
        "start_year": student.start_year or "",
        "graduation_year": student.graduation_year or "",
        "cgpa_or_percentage": student.cgpa_or_percentage or "",
        "marksheet_url": student.marksheet_url or "",
        "resume_url": student.resume_url or "",
        "resume_data": student.resume_data or "",
        "resume_score": student.resume_score or 0,
        "linkedin_url": student.linkedin_url or "",
        "portfolio_url": student.portfolio_url or "",
        "github_user_id": student.github_user_id or "",
        "role": "student"
    }

@router.post("/register")
def register_student(payload: StudentRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new student user in PostgreSQL database.
    Checks if email already exists, verifies OTP, hashes password, saves record.
    """
    email = payload.email.lower()
    
    existing_user = db.query(StudentUser).filter(StudentUser.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered with this email."
        )

    # Enforce OTP verification before allowing registration
    pending_record = db.query(PendingOTP).filter(PendingOTP.email == email).first()
    if not pending_record or not pending_record.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your email address using OTP before completing registration."
        )

    # Save to PostgreSQL DB
    hashed = hash_password(payload.password)
    new_student = StudentUser(
        name=payload.name,
        email=email,
        password_hash=hashed,
        phone=payload.phone,
        is_verified=True
    )
    
    db.add(new_student)
    
    # Clear pending OTP
    db.query(PendingOTP).filter(PendingOTP.email == email).delete()
    
    db.commit()
    db.refresh(new_student)
    
    return {
        "status": "success",
        "message": "Student registered successfully in database!",
        "user": get_student_dict(new_student)
    }

@router.post("/login")
def login_student(payload: StudentLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates registered student strictly from PostgreSQL database.
    No demo accounts permitted.
    """
    email = payload.email.lower()
    student = db.query(StudentUser).filter(StudentUser.email == email).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Student not found in database. Please sign up."
        )

    if not verify_password(payload.password, student.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )
        
    return {
        "status": "success",
        "message": "Login successful!",
        "user": get_student_dict(student)
    }

@router.post("/update-personal-info")
def update_personal_info(payload: UpdatePersonalInfoRequest, db: Session = Depends(get_db)):
    """
    Save/Update student's personal profile information into the DB user record.
    """
    email = payload.email.lower()
    student = db.query(StudentUser).filter(StudentUser.email == email).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student user record not found in database."
        )
        
    student.profile_image = payload.profile_image
    student.headline = payload.headline
    student.location = payload.location
    student.years_of_experience = payload.years_of_experience
    student.bio = payload.bio
    
    db.commit()
    db.refresh(student)
    
    return {
        "status": "success",
        "message": "Personal information updated successfully in database!",
        "user": get_student_dict(student)
    }

@router.post("/upload-marksheet")
async def upload_marksheet(file: UploadFile = File(...), email: str = Form(...), db: Session = Depends(get_db)):
    """
    Step 2: Upload marksheet, extract academic details via Sarvam/Groq/PyMuPDF in memory,
    save file to uploads directory and save marksheet_url in database.
    """
    # 1. File Type Validation
    allowed_extensions = ('.pdf', '.jpg', '.jpeg', '.png')
    filename = file.filename or 'marksheet.pdf'
    if not filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a PDF, JPG, or PNG document."
        )

    file_bytes = await file.read()
    
    # 2. File Size Validation (Max 5MB)
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 5MB. Please upload a smaller file."
        )

    # 3. Process via Document AI Service
    try:
        extracted = await extract_marksheet_data(file_bytes, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not process marksheet document: {str(e)}"
        )

    # Check if document is a valid marksheet
    if not extracted.get("is_marksheet", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded document does not appear to be an academic marksheet or transcript. Please upload a valid document."
        )

    # 4. Save Marksheet File to Storage & Update Database
    import os
    os.makedirs("uploads/marksheets", exist_ok=True)
    clean_email = email.lower().replace('@', '_').replace('.', '_')
    file_path = f"uploads/marksheets/{clean_email}_{filename}"
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    student = db.query(StudentUser).filter(StudentUser.email == email.lower()).first()
    if student:
        student.marksheet_url = file_path
        db.commit()
        db.refresh(student)

    return {
        "status": "success",
        "message": "Marksheet uploaded, saved to database, and processed successfully!",
        "filename": filename,
        "marksheet_url": file_path,
        "extraction": extracted
    }

@router.post("/update-education")
def update_education_info(payload: UpdateEducationRequest, db: Session = Depends(get_db)):
    """
    Save/Update student's verified education details into the DB user record.
    Saves the user-edited values (not raw extracted) into the database.
    """
    email = payload.email.lower()
    student = db.query(StudentUser).filter(StudentUser.email == email).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student user record not found in database."
        )
        
    student.degree = payload.degree
    student.branch = payload.branch
    student.university = payload.university
    student.start_year = payload.start_year
    student.graduation_year = payload.graduation_year
    student.cgpa_or_percentage = payload.cgpa_or_percentage
    if payload.marksheet_url:
        student.marksheet_url = payload.marksheet_url
    
    db.commit()
    db.refresh(student)
    
    return {
        "status": "success",
        "message": "Education details updated successfully in database!",
        "user": get_student_dict(student)
    }

@router.get("/dashboard")
def get_student_dashboard():
    return {
        "status": "success",
        "data": {
            "user": {"name": "Alex Johnson", "role": "Student", "points": 1420},
            "recent_activity": [
                {"id": 1, "title": "Completed React Native Mock Interview", "score": "92%"},
                {"id": 2, "title": "Finished Module: Advanced Data Structures", "score": "100%"}
            ],
            "recommended_courses": [
                {"id": 101, "title": "System Design Fundamentals", "level": "Intermediate"},
                {"id": 102, "title": "Python FastAPI Masterclass", "level": "Beginner"}
            ]
        }
    }

@router.get("/profile")
def get_student_profile(email: str = "", db: Session = Depends(get_db)):
    if email:
        clean_email = email.lower().strip()
        student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
        if student:
            return {
                "status": "success",
                "user": get_student_dict(student)
            }
    return {
        "status": "success",
        "profile": {
            "name": "Alex Johnson",
            "email": "alex.johnson@example.com",
            "skills": ["React Native", "Python", "FastAPI", "JavaScript", "SQL"],
            "bio": "Passionate software engineering student looking for full-stack opportunities."
        }
    }

@router.get("/resume-data")
def get_student_resume_data(email: str, db: Session = Depends(get_db)):
    """
    Fetches stored resume file, ATS score, and structured analysis data for a student from DB.
    """
    clean_email = email.lower().strip()
    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student user record not found in database."
        )

    resume_data_parsed = None
    if student.resume_data:
        try:
            resume_data_parsed = json.loads(student.resume_data)
        except Exception:
            pass

    return {
        "status": "success",
        "has_resume": bool(student.resume_url),
        "resume_url": student.resume_url or "",
        "resume_score": student.resume_score or 0,
        "resume_data": resume_data_parsed
    }


class UpdateResumeDataRequest(BaseModel):
    email: EmailStr
    projects: list[str] = []
    core_technologies: list[str] = []
    skill_ids: list[str] = []
    experience: list[dict] = []
    education: list[dict] = []
    certifications: list[dict] = []
    achievements: list[dict] = []
    links: dict = {}
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None


@router.post("/upload-resume")
async def upload_student_resume(
    file: UploadFile = File(...),
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Step 4: Securely uploads resume, queries Sarvam AI Vision for extraction,
    normalizes extracted skills/careers against SkillSetu taxonomy,
    calculates deterministic score, and returns structured analysis to frontend.
    """
    clean_email = email.strip().lower()
    
    # 1. File Format & Size Validation
    allowed_exts = ('.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp')
    filename = file.filename or "resume.pdf"
    if not filename.lower().endswith(allowed_exts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a PDF, DOCX, or image file (PNG/JPG)."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded resume file is empty."
        )

    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume file size exceeds maximum limit of 10MB."
        )

    # 2. Extract structured data via Sarvam AI
    try:
        raw_extraction = await extract_resume_data(file_bytes, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sarvam AI resume extraction failed: {str(e)}"
        )

    # 3. Skill & Career & Location Normalization
    raw_skills = raw_extraction.get("skills") or []
    normalized_skills = []
    for r_sk in raw_skills:
        if isinstance(r_sk, str) and r_sk.strip():
            norm = normalize_skill(db, r_sk)
            if norm:
                normalized_skills.append(norm)

    # Experience titles normalization
    raw_exps = raw_extraction.get("experience") or []
    normalized_exps = []
    for exp in raw_exps:
        job_title = exp.get("job_title") or ""
        norm_car = normalize_career(db, job_title) if job_title else None
        normalized_exps.append({
            "title": job_title,
            "company": exp.get("company") or "",
            "period": f"{exp.get('start_date') or ''} - {exp.get('end_date') or 'Present'}".strip(" -"),
            "career_mapping": norm_car,
            "description": exp.get("description") or "",
            "technologies_used": exp.get("technologies_used") or []
        })

    # Location normalization
    raw_loc = raw_extraction.get("location") or ""
    norm_loc = normalize_location(db, raw_loc) if raw_loc else None

    # Projects
    raw_projects = raw_extraction.get("projects") or []
    project_names = []
    for proj in raw_projects:
        p_name = proj.get("project_name") or proj.get("description") or "Project"
        project_names.append(p_name)

    # Core technologies string list
    core_techs = [s["name"] for s in normalized_skills if s.get("name")]

    # 4. Calculate Deterministic Score & Skill Domains
    score_result = calculate_resume_score(raw_extraction, normalized_skills)
    skill_domains = derive_skill_domains(normalized_skills, raw_exps, raw_projects)

    # 5. Save uploaded file to disk & update student record directly in database
    import os
    os.makedirs("uploads/resumes", exist_ok=True)
    safe_email = clean_email.replace('@', '_').replace('.', '_')
    file_path = f"uploads/resumes/{safe_email}_{filename}"

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
    if student:
        student.resume_url = file_path
        student.resume_score = score_result["overall_score"]
        
        # Save canonical skill IDs directly to student.skill_ids column in DB
        extracted_skill_ids = [s["skill_id"] for s in normalized_skills if s.get("skill_id")]
        existing_skills = []
        if student.skill_ids:
            try:
                existing_skills = json.loads(student.skill_ids) if student.skill_ids.startswith('[') else student.skill_ids.split(',')
            except Exception:
                existing_skills = [student.skill_ids]

        merged_skills = list(set(existing_skills + extracted_skill_ids))
        student.skill_ids = json.dumps(merged_skills)
        
        # Save structured resume analysis JSON to student.resume_data column in DB
        analysis_data = {
            "resume_file": filename,
            "parse_time": "Parsed just now",
            "score": score_result["overall_score"],
            "score_text": score_result["score_text"],
            "score_breakdown": score_result["breakdown"],
            "extracted_data": {
                "full_name": raw_extraction.get("full_name"),
                "email": raw_extraction.get("email"),
                "phone": raw_extraction.get("phone"),
                "location": norm_loc,
                "projects": project_names,
                "raw_projects": raw_projects,
                "experience": normalized_exps,
                "coreTechnologies": core_techs[:8],
                "normalized_skills": normalized_skills,
                "identifiedSkillDomains": skill_domains,
                "education": raw_extraction.get("education") or [],
                "certifications": raw_extraction.get("certifications") or [],
                "achievements": raw_extraction.get("achievements") or [],
                "links": raw_extraction.get("links") or {}
            }
        }
        student.resume_data = json.dumps(analysis_data)
        
        db.commit()
        db.refresh(student)
    clean_email = email.lower().strip()
    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student user record not found."
        )

    # Save uploaded file
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    unique_filename = f"resume_{student.id}_{int(datetime.now().timestamp())}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # Extract text content from file
    extracted_text = extract_text_from_file(file_path)

    # Perform Sarvam AI extraction
    raw_extraction = parse_resume_with_sarvam_ai(extracted_text, filename=file.filename or "")

    # Calculate overall resume score (0-100)
    score_breakdown = calculate_resume_score(raw_extraction)
    overall_score = score_breakdown.get("total_score", 65)

    # Build structured resume_data json
    parsed_resume_data = {
        "resume_file": file.filename,
        "parse_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "score": overall_score,
        "score_text": f"SkillSetu AI Resume Analysis Score: {overall_score}/100",
        "score_breakdown": score_breakdown,
        "extracted_data": raw_extraction
    }

    # Save to database
    student.resume_url = file_path
    student.resume_data = json.dumps(parsed_resume_data)
    student.resume_score = overall_score
    db.commit()
    db.refresh(student)

    # Build response format
    result_payload = {
        "status": "success",
        "message": f"Resume '{file.filename}' processed successfully!",
        "resume_file": file.filename,
        "parse_time": parsed_resume_data["parse_time"],
        "score": overall_score,
        "score_text": parsed_resume_data["score_text"],
        "score_breakdown": score_breakdown,
        "extracted_data": {
            "projects": raw_extraction.get("projects") or [],
            "raw_projects": raw_extraction.get("raw_projects") or [],
            "experience": raw_extraction.get("experience") or [],
            "coreTechnologies": raw_extraction.get("core_technologies") or [],
            "normalized_skills": raw_extraction.get("normalized_skills") or [],
            "identifiedSkillDomains": raw_extraction.get("identified_skill_domains") or [],
            "education": raw_extraction.get("education") or [],
            "certifications": raw_extraction.get("certifications") or [],
            "achievements": raw_extraction.get("achievements") or [],
            "links": raw_extraction.get("links") or {}
        }
    }
    return result_payload


@router.post("/update-resume-data")
def update_resume_data(payload: UpdateResumeDataRequest, db: Session = Depends(get_db)):
    """
    Persists student verified resume data into PostgreSQL `students` table.
    Appends confirmed canonical skill IDs to `student.skill_ids` for matching engine.
    Also links student's LinkedIn, portfolio, and GitHub connection.
    """
    clean_email = payload.email.lower().strip()
    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student user record not found."
        )

    # 1. Update skill_ids with canonical IDs from confirmed skills
    existing_skills = []
    if student.skill_ids:
        try:
            existing_skills = json.loads(student.skill_ids) if student.skill_ids.startswith('[') else student.skill_ids.split(',')
        except Exception:
            existing_skills = [student.skill_ids]

    all_skill_ids = list(set(existing_skills + payload.skill_ids))
    student.skill_ids = json.dumps(all_skill_ids)

    # 2. Update Professional Links (LinkedIn, Portfolio)
    if payload.linkedin_url is not None:
        student.linkedin_url = payload.linkedin_url.strip()
    elif payload.links.get("linkedin"):
        student.linkedin_url = payload.links.get("linkedin").strip()

    if payload.portfolio_url is not None:
        student.portfolio_url = payload.portfolio_url.strip()
    elif payload.links.get("portfolio"):
        student.portfolio_url = payload.links.get("portfolio").strip()

    # 3. Associate GitHub connection ID if active connection exists for student
    gh_conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == clean_email).first()
    if gh_conn and gh_conn.connection_status == "CONNECTED":
        student.github_user_id = gh_conn.github_user_id or gh_conn.github_username

    # Save updated verified resume details into student.resume_data
    current_data = {}
    if student.resume_data:
        try:
            current_data = json.loads(student.resume_data)
        except Exception:
            pass

    ext_data = current_data.get("extracted_data") or {}
    ext_data["projects"] = payload.projects
    ext_data["coreTechnologies"] = payload.core_technologies
    ext_data["experience"] = payload.experience
    ext_data["education"] = payload.education
    ext_data["certifications"] = payload.certifications
    ext_data["achievements"] = payload.achievements
    ext_data["links"] = payload.links
    if student.linkedin_url:
        ext_data["links"]["linkedin"] = student.linkedin_url
    if student.portfolio_url:
        ext_data["links"]["portfolio"] = student.portfolio_url

    current_data["extracted_data"] = ext_data
    student.resume_data = json.dumps(current_data)

    db.commit()
    db.refresh(student)

    return {
        "status": "success",
        "message": f"Confirmed profile, skills, social links, and GitHub ID (@{student.github_user_id or 'none'}) saved successfully!",
        "saved_skill_ids": all_skill_ids,
        "student_id": student.id,
        "student_name": student.name,
        "linkedin_url": student.linkedin_url,
        "portfolio_url": student.portfolio_url,
        "github_user_id": student.github_user_id
    }


@router.delete("/delete-resume")
def delete_student_resume(email: str, db: Session = Depends(get_db)):
    """
    Removes uploaded resume file and resets resume metadata in student DB record.
    """
    clean_email = email.lower().strip()
    student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()

    if student:
        if student.resume_url:
            import os
            if os.path.exists(student.resume_url):
                try:
                    os.remove(student.resume_url)
                except Exception:
                    pass
        student.resume_url = None
        student.resume_data = None
        student.resume_score = None
        db.commit()

    return {
        "status": "success",
        "message": "Uploaded resume removed successfully from student record."
    }


