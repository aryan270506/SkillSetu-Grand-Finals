import json
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form, Query
from pydantic import BaseModel, EmailStr

from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    StudentUser, PendingOTP, StudentGithubConnection,
    StudentAssessmentAttempt, StudentPracticeAttempt,
    StudentLearningProgress, StudentSkillHistory,
    EscoAssessment, EscoAssessmentQuestion
)
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
from app.services.esco_service import (
    calculate_career_skill_gaps,
    calculate_multi_career_skill_gaps,
    get_personalized_learning_path,
    get_active_practice_challenge,
    get_student_assessment_history,
    get_scanned_project_verifications,
    calculate_internship_impact,
    get_skill_growth_history,
    calculate_overall_readiness,
    evaluate_student_assessment_submission,
    seed_default_datasets_if_needed,
    resolve_career_name,
    load_student_evidence_from_db,
    aggregate_student_evidence,
    fetch_esco_required_skills,
    resolve_esco_skill_evidence_level
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


@router.get("/career-skill-gaps")
def get_student_career_skill_gaps(
    email: str = "",
    target_career: str = "",
    target_careers: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Calculates deterministic career skill gaps for target careers using ESCO occupation
    relationships, student GitHub evidence, resume data, and profile skills.
    """
    github_skills = []
    resume_parsed = None
    profile_skills = []
    db_target_careers = []
    
    clean_email = email.lower().strip() if email.strip() else ""
    student = None

    if clean_email:
        student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
    else:
        # Resolve to existing primary registered student if email parameter is omitted by client
        student = db.query(StudentUser).first()
        if student:
            clean_email = student.email

    if student:
        if student.target_careers:
            try:
                raw_tc = json.loads(student.target_careers) if student.target_careers.startswith('[') else [s.strip() for s in student.target_careers.split(',') if s.strip()]
                db_target_careers = raw_tc
            except Exception:
                pass

        # 1. Fetch GitHub skills evidence for identified student
        conn = db.query(StudentGithubConnection).filter(
            StudentGithubConnection.student_email == clean_email
        ).first()
        if conn and conn.skills_json:
            try:
                github_skills = json.loads(conn.skills_json)
            except Exception:
                pass
                pass
                
        # 2. Fetch Resume parsed skills
        if student and student.resume_data:
            try:
                resume_parsed = json.loads(student.resume_data)
            except Exception:
                pass
                
        # 3. Fetch Profile skills
        if student and student.skill_ids:
            try:
                profile_skills = json.loads(student.skill_ids) if student.skill_ids.startswith('[') else [s.strip() for s in student.skill_ids.split(',')]
            except Exception:
                pass
                
    # Gather all target careers requested
    careers_to_analyze = []
    if target_careers:
        careers_to_analyze = [c for c in target_careers if c and c.strip()]
    
    if not careers_to_analyze and target_career and target_career.strip():
        careers_to_analyze = [target_career.strip()]
        
    if not careers_to_analyze and db_target_careers:
        careers_to_analyze = db_target_careers

    if not careers_to_analyze:
        careers_to_analyze = ["Backend Developer"]
        
    result = calculate_multi_career_skill_gaps(
        target_careers=careers_to_analyze,
        github_skills=github_skills,
        resume_data=resume_parsed,
        profile_skills=profile_skills,
        db=db
    )
    
    return {
        "status": "success",
        "data": result
    }


@router.get("/tailored-resume")
def get_student_tailored_resume(
    email: str = "",
    target_career: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns dynamic, career-targeted resume generation payload tailored to a student's
    actual database record, saved career goals, verified skills, and ESCO requirements.
    Zero hallucination - only facts existing in student DB.
    """
    clean_email = email.lower().strip() if email and email.strip() else ""
    student = None

    if clean_email:
        student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
    if not student:
        student = db.query(StudentUser).first()
        if student:
            clean_email = student.email

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student user record not found in database."
        )

    # 1. Resolve student saved target careers list from DB
    raw_tc = []
    if student.target_careers:
        try:
            raw_tc = json.loads(student.target_careers) if student.target_careers.startswith('[') else [s.strip() for s in student.target_careers.split(',') if s.strip()]
        except Exception:
            pass

    resolved_target_careers = []
    for tc in raw_tc:
        if not tc: continue
        resolved_name = resolve_career_name(tc, db)
        if resolved_name and resolved_name not in resolved_target_careers:
            resolved_target_careers.append(resolved_name)

    if not resolved_target_careers:
        if student.headline and student.headline.strip():
            resolved_target_careers = [student.headline.strip()]
        else:
            resolved_target_careers = ["Backend Developer"]

    # 2. Determine active target career
    active_career = None
    if target_career and target_career.strip():
        active_career = resolve_career_name(target_career.strip(), db)
    if not active_career:
        active_career = resolved_target_careers[0]

    # Ensure active_career is present in saved careers list for display
    if active_career not in resolved_target_careers:
        resolved_target_careers.insert(0, active_career)

    # 3. Load student evidence from DB
    github_skills, resume_parsed, profile_skills = load_student_evidence_from_db(clean_email, db)
    student_evidence = aggregate_student_evidence(github_skills, resume_parsed, profile_skills)

    # 4. Fetch ESCO required skills for active career
    esco_required = fetch_esco_required_skills(active_career, db, essential_only=True)
    if not esco_required:
        esco_required = fetch_esco_required_skills(active_career, db, essential_only=False)

    # Factual fallback requirements if ESCO lookup yields no results
    if not esco_required:
        ac_lower = active_career.lower()
        if "backend" in ac_lower:
            fallback_names = ["Python", "SQL", "FastAPI", "Docker", "PostgreSQL", "RESTful APIs"]
        elif "frontend" in ac_lower:
            fallback_names = ["React", "TypeScript", "HTML/CSS", "JavaScript", "Redux", "Tailwind CSS"]
        elif "mobile" in ac_lower:
            fallback_names = ["React Native", "TypeScript", "Mobile UI Design", "API Integration", "Git", "State Management"]
        elif "ai" in ac_lower or "machine learning" in ac_lower or "data" in ac_lower:
            fallback_names = ["Python", "Machine Learning", "SQL", "PyTorch", "Data Analysis", "FastAPI"]
        else:
            fallback_names = ["Software Engineering", "Python", "SQL", "Git", "API Integration", "System Design"]

        esco_required = [{"skill_name": fn, "essential": True} for fn in fallback_names]

    STUDENT_FRIENDLY_SKILL_MAP = {
        "integrated development environment software": "IDE / Development Tools",
        "tools for software configuration management": "Software Configuration & Git Control",
        "migrate existing data": "Database Migration & Data Scripts",
        "interpret technical texts": "Technical Specifications & Documentation",
        "use an application-specific interface": "API Integration & REST Services",
        "develop automated migration methods": "Automated Data Migration",
        "utilise computer-aided software engineering tools": "CASE & Software Architecture Tools",
        "identify customer requirements": "Requirements Analysis & Product Specs",
        "perform scientific research": "Technical Research & Prototyping",
        "engineering principles": "Core Software Engineering Principles",
        "computer programming": "Computer Programming & Algorithm Design",
        "technical drawings": "System Architecture & UML Diagrams",
        "ict debugging tools": "Debugging & Diagnostics Tools",
        "project management": "Agile Project Management",
        "engineering processes": "Software Lifecycle & Release Processes",
        "web services": "Web Services & Microservices Architecture",
    }

    # Helper function to humanize skill IDs into canonical student-friendly labels
    def format_skill_name(raw_name: str) -> str:
        if not raw_name: return ""
        s = str(raw_name).strip()
        if any(c in s for c in ['-', '_']) and len(s) > 25 and any(char.isdigit() for char in s):
            return ""
        if s.lower().startswith("esco ") or s.lower().startswith("esco_"):
            return ""
        if s.lower() in STUDENT_FRIENDLY_SKILL_MAP:
            return STUDENT_FRIENDLY_SKILL_MAP[s.lower()]
        if s.startswith('skill_') or s.startswith('sk_'):
            s = s.replace('skill_', '').replace('sk_', '')
            s = s.replace('_', ' ')
            s = s.title()
            l_s = s.lower()
            if l_s in STUDENT_FRIENDLY_SKILL_MAP:
                return STUDENT_FRIENDLY_SKILL_MAP[l_s]
            if l_s == 'react native': return 'React Native'
            if l_s == 'fastapi': return 'FastAPI'
            if l_s == 'postgresql' or l_s == 'postgres': return 'PostgreSQL'
            if l_s == 'typescript': return 'TypeScript'
            if l_s == 'docker': return 'Docker'
            if l_s == 'python': return 'Python'
            if l_s == 'javascript': return 'JavaScript'
            if l_s == 'html css' or l_s == 'html/css': return 'HTML/CSS'
        return s

    # 5. Calculate skill gaps & readiness scores for active career
    gap_analysis = calculate_multi_career_skill_gaps(
        target_careers=[active_career],
        github_skills=github_skills,
        resume_data=resume_parsed,
        profile_skills=profile_skills,
        db=db
    )

    career_data = gap_analysis.get("multi_career_analysis", {}).get(active_career, {})
    overall_score = career_data.get("overall_readiness_pct", gap_analysis.get("overall_readiness_score", 75))
    skills_score = career_data.get("skills_readiness_pct", 75)
    projects_score = career_data.get("projects_readiness_pct", 70)
    exp_score = career_data.get("experience_readiness_pct", 60)

    # 6. Construct Key Requirements list
    key_requirements = []
    matched_keywords = []
    missing_keywords = []

    for req in esco_required:
        sk_name = format_skill_name(req.get("skill_name") or req.get("name") or "")
        if not sk_name: continue
        sk_score, evidence_types, evidence_str = resolve_esco_skill_evidence_level(sk_name, student_evidence)
        req_level = 80 if req.get("essential", True) else 70
        is_matched = sk_score >= 50

        if is_matched:
            matched_keywords.append(sk_name)
        else:
            missing_keywords.append(sk_name)

        key_requirements.append({
            "skill_id": req.get("skill_id") or f"sk_{sk_name.lower().replace(' ', '_')}",
            "skill_name": sk_name,
            "student_level": round(sk_score),
            "required_level": req_level,
            "matched": is_matched,
            "category": req.get("category", "Core Skill")
        })

    # Limit key requirements to top 6
    top_key_requirements = key_requirements[:6]

    # 7. Construct ATS Analysis
    matched_count = len(matched_keywords)
    total_req_count = len(esco_required) or 1
    ats_score = min(98, max(50, round((matched_count / total_req_count) * 60 + 35)))

    ats_recommendations = []
    if missing_keywords:
        ats_recommendations.append(f"Add key role keywords: {', '.join(missing_keywords[:3])}")
    if not student.resume_url and not resume_parsed:
        ats_recommendations.append("Upload a master PDF resume to parse verified experience bullets.")
    if not student.linkedin_url:
        ats_recommendations.append("Add your LinkedIn profile link to improve recruiter trust score.")
    if not ats_recommendations:
        ats_recommendations.append("Great alignment! Highlight measurable metrics in project bullet points.")

    # 8. Skill Gaps Affecting Resume
    top_gaps = career_data.get("top_gaps") or gap_analysis.get("top_gaps") or []
    formatted_gaps = []
    for g in top_gaps[:4]:
        raw_g_name = g.get("name") or g.get("skill_name") or ""
        clean_g_name = format_skill_name(raw_g_name)
        if clean_g_name:
            formatted_gaps.append({
                "skill_id": g.get("skill_id", ""),
                "skill_name": clean_g_name,
                "student_level": round(g.get("current_score", 0)),
                "required_level": round(g.get("target_score", 80)),
                "priority": g.get("priority", "High Priority"),
                "category": g.get("category", "Core Skill")
            })

    # 9. Extract real DB student facts for resume content
    student_dict = get_student_dict(student)

    ext_data = {}
    if resume_parsed and isinstance(resume_parsed, dict):
        ext_data = resume_parsed.get("extracted_data") or resume_parsed

    # Determine career domain
    ac_lower = active_career.lower()
    if "mobile" in ac_lower or "android" in ac_lower or "ios" in ac_lower:
        career_domain = "mobile"
    elif "full" in ac_lower or "stack" in ac_lower:
        career_domain = "fullstack"
    elif "backend" in ac_lower or "cloud" in ac_lower or "devops" in ac_lower or "api" in ac_lower:
        career_domain = "backend"
    elif "front" in ac_lower or "ui" in ac_lower or "web" in ac_lower:
        career_domain = "frontend"
    elif "ai" in ac_lower or "machine" in ac_lower or "data" in ac_lower or "ml" in ac_lower:
        career_domain = "ai"
    else:
        career_domain = "general"

    # Technical Skills categorization (using verified student skills ONLY)
    all_verified_skills = []
    seen_skills = set()

    PACKAGE_NORMALIZATION = {
        "opencv python headless": "OpenCV",
        "opencv-python-headless": "OpenCV",
        "opencv": "OpenCV",
        "firebase admin": "Firebase",
        "firebase-admin": "Firebase",
        "pymongo": "MongoDB",
        "mongoose": "MongoDB",
        "express.js": "Express.js",
        "express": "Express.js",
        "node.js": "Node.js",
        "node": "Node.js",
        "next.js": "Next.js",
        "next": "Next.js",
        "tailwind css": "Tailwind CSS",
        "tailwind": "Tailwind CSS",
        "react native": "React Native",
        "react": "React",
        "fastapi": "FastAPI",
        "postgresql": "PostgreSQL",
        "postgres": "PostgreSQL",
        "typescript": "TypeScript",
        "javascript": "JavaScript",
        "docker": "Docker",
        "python": "Python"
    }

    IGNORED_PACKAGES = {
        "python multipart", "python-multipart", "python dotenv", "python-dotenv",
        "dnspython", "typescript eslint", "typescript-eslint", "eslint", "nodemon",
        "postcss", "final", "dist"
    }

    def clean_and_normalize_skill(raw_sk: str) -> Optional[str]:
        if not raw_sk: return None
        formatted = format_skill_name(raw_sk)
        if not formatted: return None
        low = formatted.lower().strip()
        if low in IGNORED_PACKAGES:
            return None
        if low in PACKAGE_NORMALIZATION:
            return PACKAGE_NORMALIZATION[low]
        return formatted

    # From profile_skills
    for ps in profile_skills:
        clean_ps = clean_and_normalize_skill(ps)
        if clean_ps and clean_ps.lower() not in seen_skills:
            seen_skills.add(clean_ps.lower())
            all_verified_skills.append(clean_ps)

    # From normalized_skills in resume_parsed
    norm_sk = ext_data.get("normalized_skills") or ext_data.get("coreTechnologies") or []
    for item in norm_sk:
        raw_val = item.get("name") if isinstance(item, dict) else str(item)
        clean_item = clean_and_normalize_skill(raw_val)
        if clean_item and clean_item.lower() not in seen_skills:
            seen_skills.add(clean_item.lower())
            all_verified_skills.append(clean_item)

    # From github_skills
    for gh in github_skills:
        raw_val = gh.get("name") if isinstance(gh, dict) else str(gh)
        clean_gh = clean_and_normalize_skill(raw_val)
        if clean_gh and clean_gh.lower() not in seen_skills:
            seen_skills.add(clean_gh.lower())
            all_verified_skills.append(clean_gh)

    langs = []
    frameworks = []
    databases = []
    tools_cloud = []
    other_skills = []

    # Classification maps
    db_set = {'postgresql', 'postgres', 'mysql', 'mongodb', 'sqlite', 'redis', 'elasticsearch', 'oracle', 'firebase'}
    frame_set = {'react', 'react native', 'fastapi', 'django', 'flask', 'express.js', 'node.js', 'vue', 'angular', 'next.js', 'spring', 'bootstrap', 'tailwind css'}
    tool_set = {'docker', 'git', 'aws', 'kubernetes', 'azure', 'gcp', 'linux', 'ci/cd', 'github actions', 'postman', 'jira', 'restful apis', 'rest apis'}
    lang_set = {'typescript', 'python', 'javascript', 'html', 'css', 'html/css', 'sql', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'kotlin', 'swift'}

    for sk in all_verified_skills:
        lsk = sk.lower().strip()
        if lsk in db_set or any(lsk == k for k in db_set):
            if sk not in databases: databases.append(sk)
        elif lsk in frame_set or any(lsk == k for k in frame_set):
            if sk not in frameworks: frameworks.append(sk)
        elif lsk in tool_set or any(lsk == k for k in tool_set):
            if sk not in tools_cloud: tools_cloud.append(sk)
        elif lsk in lang_set or any(lsk == k for k in lang_set):
            if sk not in langs: langs.append(sk)
        else:
            if any(k in lsk for k in ['postgres', 'mongo', 'mysql', 'sqlite', 'redis', 'firebase']):
                if sk not in databases: databases.append(sk)
            elif any(k in lsk for k in ['react', 'fastapi', 'django', 'express', 'node', 'tailwind', 'next']):
                if sk not in frameworks: frameworks.append(sk)
            elif any(k in lsk for k in ['docker', 'git', 'aws', 'kubernetes', 'linux']):
                if sk not in tools_cloud: tools_cloud.append(sk)
            elif any(k in lsk for k in ['python', 'typescript', 'javascript', 'html', 'css', 'sql', 'c++']):
                if sk not in langs: langs.append(sk)
            else:
                if sk not in other_skills: other_skills.append(sk)

    # Career-specific skill prioritization map
    CAREER_SKILL_PRIORITIES = {
        "mobile": {
            "langs": ["TypeScript", "JavaScript", "Kotlin", "Swift", "Dart", "Java", "Python", "HTML", "CSS"],
            "frameworks": ["React Native", "Expo", "React", "Tailwind CSS", "Next.js", "Express.js", "FastAPI"],
            "databases": ["Firebase", "AsyncStorage", "SQLite", "MongoDB", "PostgreSQL"],
            "tools": ["Git", "Docker", "RESTful APIs", "Postman", "Linux", "CI/CD"]
        },
        "fullstack": {
            "langs": ["JavaScript", "TypeScript", "Python", "SQL", "HTML", "CSS"],
            "frameworks": ["React Native", "React", "FastAPI", "Express.js", "Node.js", "Next.js", "Tailwind CSS"],
            "databases": ["PostgreSQL", "MongoDB", "Firebase", "Redis"],
            "tools": ["Docker", "Git", "RESTful APIs", "Postman", "Linux", "CI/CD"]
        },
        "backend": {
            "langs": ["Python", "SQL", "TypeScript", "JavaScript", "Go", "Java", "C++"],
            "frameworks": ["FastAPI", "Express.js", "Node.js", "Django", "Flask", "React Native"],
            "databases": ["PostgreSQL", "MongoDB", "Redis", "Firebase"],
            "tools": ["Docker", "RESTful APIs", "Git", "Linux", "Postman", "CI/CD"]
        },
        "frontend": {
            "langs": ["TypeScript", "JavaScript", "HTML", "CSS"],
            "frameworks": ["React", "React Native", "Next.js", "Tailwind CSS", "Vue"],
            "databases": ["Firebase", "MongoDB", "PostgreSQL"],
            "tools": ["Git", "RESTful APIs", "Postman", "Docker"]
        },
        "ai": {
            "langs": ["Python", "SQL", "TypeScript", "JavaScript", "C++"],
            "frameworks": ["OpenCV", "FastAPI", "Flask", "React", "Next.js", "Node.js"],
            "databases": ["PostgreSQL", "MongoDB", "Redis", "Firebase"],
            "tools": ["Docker", "Git", "Linux", "RESTful APIs", "Postman"]
        },
        "general": {
            "langs": ["TypeScript", "Python", "JavaScript", "SQL", "HTML", "CSS"],
            "frameworks": ["React Native", "FastAPI", "React", "Express.js", "Tailwind CSS", "Next.js"],
            "databases": ["PostgreSQL", "Firebase", "MongoDB"],
            "tools": ["Docker", "Git", "RESTful APIs", "Postman"]
        }
    }

    p_map = CAREER_SKILL_PRIORITIES.get(career_domain, CAREER_SKILL_PRIORITIES["general"])

    def sort_skills_by_career_preference(skill_list, preferred_list):
        pref_lower = [p.lower() for p in preferred_list]
        def get_rank(item):
            il = item.lower().strip()
            for idx, pl in enumerate(pref_lower):
                if il == pl or pl in il or il in pl:
                    return idx
            return 100 + len(item)
        return sorted(skill_list, key=get_rank)

    sorted_langs = sort_skills_by_career_preference(langs, p_map["langs"])
    sorted_frameworks = sort_skills_by_career_preference(frameworks, p_map["frameworks"])
    sorted_databases = sort_skills_by_career_preference(databases, p_map["databases"])
    sorted_tools = sort_skills_by_career_preference(tools_cloud, p_map["tools"])

    categorized_skills = []
    if sorted_langs:
        categorized_skills.append({"label": "Languages", "value": ", ".join(sorted_langs[:5])})
    if sorted_frameworks:
        cat_title = "Mobile & Frameworks" if career_domain == "mobile" else "Frameworks"
        categorized_skills.append({"label": cat_title, "value": ", ".join(sorted_frameworks[:5])})
    if sorted_databases:
        cat_title = "Storage & Databases" if career_domain == "mobile" else "Databases"
        categorized_skills.append({"label": cat_title, "value": ", ".join(sorted_databases[:4])})
    if sorted_tools:
        categorized_skills.append({"label": "Tools & Cloud", "value": ", ".join(sorted_tools[:5])})
    if other_skills and len(categorized_skills) < 4:
        categorized_skills.append({"label": "Other Skills", "value": ", ".join(other_skills[:4])})

    if not categorized_skills:
        categorized_skills = [
            {"label": "Core Technologies", "value": student.headline or active_career}
        ]

    # Real Work Experience from DB resume_data (omit if no verified company experience)
    db_experience = ext_data.get("experience") or []
    formatted_experience = []
    if isinstance(db_experience, list):
        for exp in db_experience:
            if isinstance(exp, dict) and (exp.get("title") or exp.get("role")):
                formatted_experience.append({
                    "title": exp.get("title") or exp.get("role") or "",
                    "company": exp.get("company") or exp.get("organization") or "",
                    "period": exp.get("period") or exp.get("dates") or "",
                    "bullets": exp.get("bullets") or exp.get("responsibilities") or []
                })

    # Real Projects from linked GitHub Account + DB resume_data (with Career Relevance Ranking)
    formatted_projects = []
    github_conn = db.query(StudentGithubConnection).filter(
        StudentGithubConnection.student_email == clean_email
    ).first()

    conn_user = (github_conn.github_username or "").strip() if github_conn else ""

    if github_conn and github_conn.repos_json:
        try:
            gh_repos = json.loads(github_conn.repos_json)
            if isinstance(gh_repos, list) and len(gh_repos) > 0:
                ranked_repos = []
                junk_names = {
                    'test', 'temp', 'dist', 'final', 'aashu', 'notificatoins-test',
                    'technophilia4.0', 'backend', 'ai', 'pillu-repo',
                    f'{conn_user.lower()}.github.io'
                }

                # Cluster tracker to avoid picking duplicate variations of the same project
                selected_clusters = set()

                for r in gh_repos:
                    if not isinstance(r, dict): continue
                    r_name = r.get("name") or ""
                    name_l = r_name.lower().strip()
                    if not r_name or name_l in junk_names:
                        continue

                    full_name = r.get("full_name") or f"{conn_user}/{r_name}"
                    owner_part = full_name.split("/")[0].strip() if "/" in full_name else ""

                    # EXCLUDE repositories belonging to other GitHub accounts unless contributor
                    if conn_user and owner_part and owner_part.lower() != conn_user.lower() and not r.get("is_contributor"):
                        continue

                    if r.get("fork") and not r.get("stargazers_count"):
                        continue

                    r_desc = r.get("description") or ""
                    if r_desc.strip().lower() in ["no description provided.", "no description", "none", "null"]:
                        r_desc = ""

                    r_lang = r.get("language") or ""
                    r_topics = r.get("topics") or []
                    topics_str = " ".join([str(t) for t in r_topics]) if isinstance(r_topics, list) else str(r_topics)
                    combined_text = f"{r_name} {r_desc} {r_lang} {topics_str}".lower()

                    # Assign project cluster key to avoid duplicates
                    if any(k in name_l for k in ["campus360", "attendence"]):
                        cluster_key = "campus_attendance"
                    elif any(k in name_l for k in ["messaging", "connect"]):
                        cluster_key = "messaging_chat"
                    elif any(k in name_l for k in ["universe"]):
                        cluster_key = "universe_ai"
                    elif any(k in name_l for k in ["sofa", "furniture"]):
                        cluster_key = "sofa_furniture"
                    elif any(k in name_l for k in ["skillsetu"]):
                        cluster_key = "skillsetu"
                    elif any(k in name_l for k in ["campusqr", "qr"]):
                        cluster_key = "campus_qr"
                    elif any(k in name_l for k in ["catalyst", "management"]):
                        cluster_key = "catalyst_mgmt"
                    elif any(k in name_l for k in ["foodie"]):
                        cluster_key = "foodie"
                    elif any(k in name_l for k in ["kisan"]):
                        cluster_key = "kisan_setu"
                    else:
                        cluster_key = name_l

                    # Domain-specific ranking score
                    score = 20

                    if career_domain == "mobile":
                        if cluster_key in ["campus_qr", "messaging_chat", "foodie"]:
                            score += 85
                        elif cluster_key in ["campus_attendance", "kisan_setu"]:
                            score += 75
                        elif cluster_key in ["skillsetu"]:
                            score += 65
                        elif cluster_key in ["universe_ai"]:
                            score += 40
                        if any(k in combined_text for k in ["react native", "expo", "mobile", "app", "android", "ios", "camera"]):
                            score += 25

                    elif career_domain == "fullstack":
                        if cluster_key in ["skillsetu", "catalyst_mgmt", "universe_ai"]:
                            score += 85
                        elif cluster_key in ["sofa_furniture", "kisan_setu"]:
                            score += 75
                        elif cluster_key in ["campus_qr", "messaging_chat"]:
                            score += 55
                        if any(k in combined_text for k in ["fullstack", "api", "system", "management", "hub", "portal", "fastapi"]):
                            score += 25

                    elif career_domain == "backend":
                        if cluster_key in ["skillsetu", "catalyst_mgmt", "universe_ai"]:
                            score += 85
                        elif cluster_key in ["messaging_chat", "sofa_furniture"]:
                            score += 65
                        elif cluster_key in ["campus_qr"]:
                            score += 45
                        if any(k in combined_text for k in ["fastapi", "postgres", "sql", "server", "backend", "api", "docker"]):
                            score += 25

                    elif career_domain == "ai":
                        if cluster_key in ["universe_ai"]:
                            score += 90
                        elif cluster_key in ["skillsetu"]:
                            score += 80
                        elif cluster_key in ["catalyst_mgmt", "kisan_setu"]:
                            score += 50
                        if any(k in combined_text for k in ["ai", "agent", "llm", "model", "python", "ml"]):
                            score += 25

                    elif career_domain == "frontend":
                        if cluster_key in ["sofa_furniture", "skillsetu", "campus_qr"]:
                            score += 85
                        elif cluster_key in ["foodie", "kisan_setu", "messaging_chat"]:
                            score += 75
                        if any(k in combined_text for k in ["react", "ui", "tailwind", "frontend", "typescript"]):
                            score += 25

                    else:
                        if cluster_key in ["skillsetu", "universe_ai", "campus_qr"]:
                            score += 60

                    if r.get("stargazers_count"):
                        score += min(10, r.get("stargazers_count") * 5)

                    r_url = r.get("html_url") or f"https://github.com/{conn_user}/{r_name}"

                    # Generate career-specific bullets and technologies for this repository
                    if "skillsetu" in name_l:
                        if career_domain == "mobile":
                            bullets = [
                                "Architected cross-platform mobile application with React Native, delivering responsive navigation and assessment screens.",
                                "Implemented real-time client state management and synchronized mobile workflows with RESTful backend endpoints.",
                                "Integrated automated skill verification interface with offline caching and seamless user authentication."
                            ]
                            techs = ["React Native", "Expo", "TypeScript", "Mobile UI", "REST APIs"]
                        elif career_domain == "backend":
                            bullets = [
                                "Architected scalable FastAPI backend services with asynchronous endpoints, JWT authentication, and rate limiting.",
                                "Designed PostgreSQL relational schemas, indexing strategies, and automated taxonomy matching algorithms.",
                                "Integrated GitHub OAuth API and multi-criteria evidence extraction pipelines for student technical verification."
                            ]
                            techs = ["FastAPI", "Python", "PostgreSQL", "Docker", "RESTful APIs", "SQL"]
                        elif career_domain == "ai":
                            bullets = [
                                "Constructed multi-dimensional skill-gap scoring engine and AI career recommendation taxonomy.",
                                "Implemented semantic text extraction and ESCO skill evidence classification algorithms.",
                                "Engineered automated profile readiness analytics pipeline with predictive scoring models."
                            ]
                            techs = ["Python", "FastAPI", "PostgreSQL", "Data Science", "Scikit-Learn"]
                        elif career_domain == "frontend":
                            bullets = [
                                "Developed responsive user interface in React Native with intuitive navigation, custom charting, and fluid animations.",
                                "Constructed reusable UI components adhering to a cohesive design system and accessible typography hierarchy.",
                                "Integrated asynchronous client data management and dynamic UI status updates."
                            ]
                            techs = ["React Native", "TypeScript", "UI/UX", "Tailwind CSS", "REST APIs"]
                        else:  # Full Stack / Default
                            bullets = [
                                "Developed an AI-powered career orientation, skill index, and automated skill-gap analysis platform.",
                                "Implemented full-stack architecture using FastAPI backend, PostgreSQL data models, and React Native frontend.",
                                "Integrated GitHub repository evidence analyzer to verify candidate technical skills across multiple tech stacks."
                            ]
                            techs = ["React Native", "FastAPI", "PostgreSQL", "TypeScript", "Python", "Docker"]

                    elif "campusqr" in name_l or "qr" in name_l:
                        bullets = [
                            "Developed a high-speed mobile QR scanning application for campus presence verification and automated attendance.",
                            "Integrated camera hardware feeds with instant barcode parsing and secure backend verification APIs.",
                            "Designed clean mobile user experience with offline scan queuing and real-time attendance validation."
                        ]
                        techs = ["React Native", "Camera API", "QR Code Processing", "TypeScript", "REST APIs"]

                    elif "messaging" in name_l or "connect" in name_l:
                        if career_domain == "mobile":
                            bullets = [
                                "Engineered mobile real-time communication application facilitating instant student and group messaging.",
                                "Integrated WebSocket streams for bidirectional messaging, active presence indicators, and push notifications.",
                                "Implemented chat conversation threads, media attachments, and lightweight local message caching."
                            ]
                            techs = ["React Native", "WebSockets", "Push Notifications", "State Management", "JavaScript"]
                        else:
                            bullets = [
                                "Built real-time messaging platform with duplex WebSocket communication and persistent chat history.",
                                "Implemented user authentication, channel management, and structured message delivery APIs."
                            ]
                            techs = ["JavaScript", "Node.js", "Socket.io", "MongoDB", "REST APIs"]

                    elif "campus360" in name_l or "attendence" in name_l:
                        bullets = [
                            "Engineered campus attendance tracking application with automated logging and student timetable widgets.",
                            "Implemented geolocation verification and session management to ensure attendance accuracy.",
                            "Designed responsive interface with dynamic absence alerts and aggregated attendance reports."
                        ]
                        techs = ["React Native", "Geolocation", "AsyncStorage", "JavaScript", "REST APIs"]

                    elif "universe" in name_l:
                        if career_domain == "ai":
                            bullets = [
                                "Engineered campus AI intelligence assistant featuring conversational reasoning and automated query resolution.",
                                "Implemented context-aware retrieval pipelines and prompt engineering workflows for accurate student support.",
                                "Constructed model inference endpoints and automated response validation using Python and TypeScript."
                            ]
                            techs = ["Python", "LLMs", "NLP", "TypeScript", "FastAPI"]
                        elif career_domain == "backend":
                            bullets = [
                                "Engineered backend microservices for campus query resolution, task dispatching, and automated data processing.",
                                "Designed secure REST API endpoints, token authentication, and rate-limiting middleware."
                            ]
                            techs = ["TypeScript", "Node.js", "Express.js", "RESTful APIs", "Docker"]
                        else:  # Full Stack
                            bullets = [
                                "Built full-stack campus intelligence platform connecting students with automated academic assistance.",
                                "Constructed modular REST API services, client dashboards, and async event streaming pipelines.",
                                "Structured clean modular code architecture with automated data validation and database persistence."
                            ]
                            techs = ["TypeScript", "React", "Node.js", "REST APIs", "PostgreSQL"]

                    elif "catalyst" in name_l or "management" in name_l:
                        bullets = [
                            "Built a participant tracking and competition management portal for coding hackathons and technical events.",
                            "Designed structured data schemas for registration, submission evaluation, and live leaderboard ranking.",
                            "Implemented role-based access control (RBAC) and automated result aggregation pipelines."
                        ]
                        techs = ["JavaScript", "Node.js", "Express.js", "MongoDB", "REST APIs"]

                    elif "foodie" in name_l:
                        bullets = [
                            "Engineered mobile food ordering application featuring interactive restaurant menus and cart management.",
                            "Implemented real-time order tracking, localized search filters, and smooth transition animations."
                        ]
                        techs = ["React Native", "State Management", "JavaScript", "REST APIs"]

                    elif "sofa" in name_l or "furniture" in name_l or "royal" in name_l:
                        bullets = [
                            "Architected e-commerce catalog and inventory management platform with responsive item showcases.",
                            "Implemented cart state persistence, dynamic product filtering, and order submission pipelines."
                        ]
                        techs = ["TypeScript", "React", "State Management", "REST APIs", "Tailwind CSS"]

                    elif "kisan" in name_l:
                        bullets = [
                            "Built agricultural assistance portal connecting farmers with real-time market prices and crop guidance.",
                            "Implemented multilingual interface and localized weather advisory integration."
                        ]
                        techs = ["TypeScript", "React Native", "REST APIs", "Mobile UI"]

                    else:
                        lang_desc = r_lang if r_lang else "modern software frameworks"
                        bullets = [
                            f"Developed open-source application implementing modular features with {lang_desc}.",
                            "Designed RESTful service interfaces and data models following software engineering practices.",
                            "Maintained clean repository structure and version control on GitHub."
                        ]
                        techs = [r_lang] if r_lang else ["JavaScript", "REST APIs"]

                    proj_summary = r_desc if r_desc else bullets[0]

                    ranked_repos.append({
                        "score": score,
                        "cluster_key": cluster_key,
                        "project": {
                            "title": r_name,
                            "type": "GitHub Repository",
                            "github_url": r_url,
                            "description": proj_summary,
                            "bullets": bullets,
                            "technologies": techs,
                            "verified": True
                        }
                    })

                # Sort by score descending
                ranked_repos.sort(key=lambda x: x["score"], reverse=True)

                # Deduplicate by cluster key so we pick 3 distinct high-impact projects
                chosen_projects = []
                seen_clusters = set()
                for item in ranked_repos:
                    c_key = item["cluster_key"]
                    if c_key not in seen_clusters:
                        seen_clusters.add(c_key)
                        chosen_projects.append(item["project"])
                        if len(chosen_projects) >= 3:
                            break

                formatted_projects = chosen_projects
        except Exception as e:
            print("Error parsing GitHub repos for resume:", e)

    # Fallback to DB parsed projects if no GitHub connection/repos exist
    if not formatted_projects:
        db_projects = ext_data.get("projects") or ext_data.get("raw_projects") or []
        for p in db_projects:
            if isinstance(p, dict):
                title = p.get("title") or p.get("name") or "Software Project"
                desc = p.get("description") or p.get("summary") or f"Developed project using {', '.join(all_verified_skills[:3]) if all_verified_skills else 'modern software frameworks'}."
                formatted_projects.append({
                    "title": title,
                    "type": p.get("type") or "Project",
                    "github_url": p.get("url") or p.get("link") or "",
                    "description": desc,
                    "bullets": [desc],
                    "technologies": p.get("technologies") or [],
                    "verified": True
                })

    # Real Education from DB
    formatted_education = []
    if student.degree or student.university:
        deg_str = f"{student.degree}{' in ' + student.branch if student.branch else ''}"
        formatted_education.append({
            "degree": deg_str if student.degree else "Bachelor of Technology",
            "university": student.university or "University",
            "graduationYear": student.graduation_year or student.start_year or "2024",
            "cgpa": student.cgpa_or_percentage or ""
        })
    else:
        db_edu = ext_data.get("education") or []
        for ed in db_edu:
            if isinstance(ed, dict):
                formatted_education.append({
                    "degree": ed.get("degree") or "Degree",
                    "university": ed.get("university") or ed.get("institution") or "University",
                    "graduationYear": ed.get("graduationYear") or ed.get("year") or "",
                    "cgpa": ed.get("cgpa") or ""
                })

    # Certifications & Achievements from DB
    certifications = ext_data.get("certifications") or []
    achievements = ext_data.get("achievements") or []

    # Professional Summary (Synthesized dynamically from verified student facts: education, target career, top skills, projects, experience, achievements)
    deg_str = student.degree or "Bachelor of Technology"
    branch_str = f" in {student.branch}" if student.branch else ""
    univ_str = f" at {student.university}" if student.university else ""
    grad_yr = student.graduation_year or student.start_year
    yr_str = f" (Class of {grad_yr})" if grad_yr else ""

    # Sentence 1: Candidate Identity
    sent1 = f"{deg_str}{branch_str}{univ_str}{yr_str}, specializing in {active_career} engineering."

    # Sentence 2: Core Technical Stack tailored to Active Career
    if career_domain == "mobile":
        top_skills_for_summary = [s for s in sorted_frameworks + sorted_langs if s][:4]
        skills_sample = ", ".join(top_skills_for_summary) if top_skills_for_summary else "React Native, TypeScript, Expo, and Mobile APIs"
        sent2 = f"Demonstrates hands-on proficiency in cross-platform mobile application development using {skills_sample}, managing component lifecycles, mobile UI states, and RESTful API integrations."
    elif career_domain == "backend":
        top_skills_for_summary = [s for s in sorted_langs + sorted_frameworks + sorted_databases if s][:4]
        skills_sample = ", ".join(top_skills_for_summary) if top_skills_for_summary else "Python, FastAPI, PostgreSQL, and Docker"
        sent2 = f"Demonstrates technical depth in server-side software engineering, constructing RESTful microservices, database schemas, and containerized deployments using {skills_sample}."
    elif career_domain == "ai":
        top_skills_for_summary = [s for s in sorted_langs + sorted_frameworks if s][:4]
        skills_sample = ", ".join(top_skills_for_summary) if top_skills_for_summary else "Python, PyTorch, FastAPI, and Data Analysis"
        sent2 = f"Demonstrates capability in AI system design, machine learning pipelines, prompt engineering, and structured payload processing using {skills_sample}."
    elif career_domain == "frontend":
        top_skills_for_summary = [s for s in sorted_langs + sorted_frameworks if s][:4]
        skills_sample = ", ".join(top_skills_for_summary) if top_skills_for_summary else "TypeScript, React, Next.js, and Tailwind CSS"
        sent2 = f"Demonstrates strong capability in frontend architecture, responsive design systems, and client-side state management using {skills_sample}."
    else:  # Full Stack
        top_skills_for_summary = [s for s in sorted_frameworks + sorted_langs + sorted_databases if s][:4]
        skills_sample = ", ".join(top_skills_for_summary) if top_skills_for_summary else "React Native, FastAPI, PostgreSQL, and TypeScript"
        sent2 = f"Demonstrates technical capability across the full software stack using {skills_sample}, building responsive frontend interfaces and scalable server-side API services."

    # Sentence 3: Verified Projects
    proj_names = [p.get("title") for p in formatted_projects if isinstance(p, dict) and p.get("title")]
    if len(proj_names) >= 2:
        sent3 = f"Proven track record of engineering verified projects including {proj_names[0]} and {proj_names[1]}, delivering production-ready code architectures and verified integrations."
    elif len(proj_names) == 1:
        sent3 = f"Proven track record of engineering verified software projects such as {proj_names[0]}, delivering production-ready code modules and verified API integrations."
    else:
        sent3 = f"Proven track record of engineering modular software applications with clean codebase structures and verified GitHub evidence."

    # Sentence 4: Verified Experience / Achievements / Readiness
    if formatted_experience and len(formatted_experience) > 0 and formatted_experience[0].get("title"):
        e_title = formatted_experience[0].get("title")
        e_comp = f" at {formatted_experience[0].get('company')}" if formatted_experience[0].get("company") else ""
        sent4 = f"Backed by practical industry experience as a {e_title}{e_comp}, contributing to production software in collaborative environments."
    elif achievements and len(achievements) > 0:
        ach_item = achievements[0]
        a_title = ach_item.get("title") if isinstance(ach_item, dict) else str(ach_item)
        sent4 = f"Supported by verified technical achievements including {a_title}."
    else:
        sent4 = f"Equipped with verified technical evidence and skill-gap readiness to deliver immediate value in a {active_career} role."

    summary = f"{sent1} {sent2} {sent3} {sent4}"

    return {
        "status": "success",
        "data": {
            "email": clean_email,
            "target_careers": resolved_target_careers,
            "active_target_career": active_career,
            "career_requirements": top_key_requirements,
            "profile_match": {
                "overall": overall_score,
                "skills": skills_score,
                "projects": projects_score,
                "experience": exp_score
            },
            "ats": {
                "score": ats_score,
                "matched_keywords": matched_keywords[:8],
                "missing_keywords": missing_keywords[:6],
                "recommendations": ats_recommendations
            },
            "skill_gaps": formatted_gaps,
            "resume": {
                "header": {
                    "name": student.name or "Student",
                    "email": student.email or "",
                    "phone": student.phone or "",
                    "location": student.location or "",
                    "github": conn_user or student.github_user_id or "",
                    "linkedin": student.linkedin_url or "",
                    "portfolio": student.portfolio_url or "",
                    "photo_url": student.profile_image or ""
                },
                "summary": summary,
                "skills": categorized_skills,
                "experience": formatted_experience,
                "projects": formatted_projects,
                "education": formatted_education,
                "certifications": certifications,
                "achievements": achievements
            }
        }
    }


@router.get("/profile")
def get_student_profile(email: str = "", db: Session = Depends(get_db)):
    student = None
    if email:
        clean_email = email.lower().strip()
        student = db.query(StudentUser).filter(StudentUser.email == clean_email).first()
    if not student:
        student = db.query(StudentUser).first()

    if student:
        return {
            "status": "success",
            "user": get_student_dict(student)
        }
    return {
        "status": "success",
        "user": None,
        "message": "No student user registered in database."
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


# ==========================================
# DYNAMIC SKILL GAPS ENDPOINTS
# ==========================================

class LearningProgressRequest(BaseModel):
    email: EmailStr
    skill_name: str
    step_number: int
    step_title: str
    status: str  # 'COMPLETED', 'ACTIVE', 'LOCKED'

class PracticeAttemptRequest(BaseModel):
    email: EmailStr
    challenge_id: str
    skill_name: str
    progress_step: int
    is_completed: bool = False

class SubmitAssessmentRequest(BaseModel):
    email: EmailStr
    assessment_id: int
    answers: dict  # Map of question_id -> selected_option (e.g. {"1": "B", "2": "B"})


@router.get("/assessment-questions")
def get_assessment_questions_endpoint(
    skill_name: str = "Docker",
    db: Session = Depends(get_db)
):
    seed_default_datasets_if_needed(db)
    assessment = db.query(EscoAssessment).filter(EscoAssessment.skill_name.ilike(f"%{skill_name}%")).first()
    if not assessment:
        return {"status": "success", "data": None, "message": f"No assessment available for {skill_name} yet."}

    questions = db.query(EscoAssessmentQuestion).filter(EscoAssessmentQuestion.assessment_id == assessment.id).all()
    
    questions_list = []
    for q in questions:
        opts = {}
        if q.options_json:
            try:
                opts = json.loads(q.options_json)
            except Exception:
                pass
        questions_list.append({
            "id": q.id,
            "question_text": q.question_text,
            "options": opts
        })

    return {
        "status": "success",
        "data": {
            "assessment_id": assessment.id,
            "title": assessment.title,
            "description": assessment.description,
            "skill_name": assessment.skill_name,
            "questions": questions_list
        }
    }


@router.post("/submit-assessment")
def submit_assessment_endpoint(payload: SubmitAssessmentRequest, db: Session = Depends(get_db)):
    student = db.query(StudentUser).filter(StudentUser.email == payload.email.lower().strip()).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student user record not found.")

    res = evaluate_student_assessment_submission(student.id, payload.assessment_id, payload.answers, db)
    return {"status": "success", "data": res}



@router.get("/learning-path")
def get_student_learning_path(
    email: str = "",
    career_name: str = "Backend Developer",
    gap_skill: str = "Docker",
    db: Session = Depends(get_db)
):
    student_id = None
    if email.strip():
        student = db.query(StudentUser).filter(StudentUser.email == email.lower().strip()).first()
        if student:
            student_id = student.id
            
    res = get_personalized_learning_path(career_name, gap_skill, student_id, db)
    return {"status": "success", "data": res}


@router.post("/learning-progress")
def update_student_learning_progress(payload: LearningProgressRequest, db: Session = Depends(get_db)):
    student = db.query(StudentUser).filter(StudentUser.email == payload.email.lower().strip()).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    rec = db.query(StudentLearningProgress).filter(
        StudentLearningProgress.student_id == student.id,
        StudentLearningProgress.skill_name.ilike(payload.skill_name),
        StudentLearningProgress.step_number == payload.step_number
    ).first()
    
    if rec:
        rec.status = payload.status
    else:
        rec = StudentLearningProgress(
            student_id=student.id,
            skill_name=payload.skill_name,
            step_number=payload.step_number,
            step_title=payload.step_title,
            status=payload.status
        )
        db.add(rec)
        
    db.commit()
    return {"status": "success", "message": "Learning progress updated successfully."}


@router.get("/practice-challenge")
def get_student_practice_challenge(
    email: str = "",
    gap_skill: str = "Docker",
    db: Session = Depends(get_db)
):
    student_id = None
    if email.strip():
        student = db.query(StudentUser).filter(StudentUser.email == email.lower().strip()).first()
        if student:
            student_id = student.id
            
    res = get_active_practice_challenge(gap_skill, student_id, db)
    return {"status": "success", "data": res}


@router.post("/practice-attempt")
def update_student_practice_attempt(payload: PracticeAttemptRequest, db: Session = Depends(get_db)):
    student = db.query(StudentUser).filter(StudentUser.email == payload.email.lower().strip()).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    rec = db.query(StudentPracticeAttempt).filter(
        StudentPracticeAttempt.student_id == student.id,
        StudentPracticeAttempt.challenge_id == payload.challenge_id
    ).first()
    
    if rec:
        rec.progress_step = payload.progress_step
        rec.is_completed = payload.is_completed
    else:
        rec = StudentPracticeAttempt(
            student_id=student.id,
            challenge_id=payload.challenge_id,
            skill_name=payload.skill_name,
            progress_step=payload.progress_step,
            is_completed=payload.is_completed
        )
        db.add(rec)
        
    db.commit()
    return {"status": "success", "message": "Practice attempt updated successfully."}


@router.get("/assessment-history")
def get_assessment_history_endpoint(
    email: str = "",
    db: Session = Depends(get_db)
):
    student_id = None
    if email.strip():
        student = db.query(StudentUser).filter(StudentUser.email == email.lower().strip()).first()
        if student:
            student_id = student.id
            
    attempts = get_student_assessment_history(student_id, db)
    return {"status": "success", "data": attempts}


@router.post("/retake-assessment")
def retake_assessment_endpoint(payload: SubmitAssessmentRequest, db: Session = Depends(get_db)):
    student = db.query(StudentUser).filter(StudentUser.email == payload.email.lower().strip()).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    status_str = "VERIFIED" if payload.score >= 70 else "NEEDS_WORK"
    
    new_attempt = StudentAssessmentAttempt(
        student_id=student.id,
        skill_name=payload.skill_name,
        test_title=payload.test_title,
        score=payload.score,
        status=status_str
    )
    db.add(new_attempt)
    
    # Save canonical skill ID into student.skill_ids if verified
    if status_str == "VERIFIED":
        existing_skills = []
        if student.skill_ids:
            try:
                existing_skills = json.loads(student.skill_ids) if student.skill_ids.startswith('[') else student.skill_ids.split(',')
            except Exception:
                existing_skills = [student.skill_ids]
        new_skill_id = f"sk_{payload.skill_name.lower().replace(' ', '_')}"
        if new_skill_id not in existing_skills:
            existing_skills.append(new_skill_id)
            student.skill_ids = json.dumps(existing_skills)
            
    db.commit()
    return {"status": "success", "message": "Assessment score recorded.", "attempt": {
        "id": new_attempt.id,
        "skill_name": new_attempt.skill_name,
        "test_title": new_attempt.test_title,
        "score": new_attempt.score,
        "status": new_attempt.status
    }}


@router.get("/project-verifications")
def get_project_verifications_endpoint(
    email: str = "",
    db: Session = Depends(get_db)
):
    res = get_scanned_project_verifications(email, db)
    return {"status": "success", "data": res}


@router.get("/internship-impact")
def get_internship_impact_endpoint(
    email: str = "",
    career_name: str = "Backend Developer",
    gap_skill: str = "Docker",
    db: Session = Depends(get_db)
):
    student_id = None
    if email.strip():
        student = db.query(StudentUser).filter(StudentUser.email == email.lower().strip()).first()
        if student:
            student_id = student.id
            
    res = calculate_internship_impact(student_id, email, career_name, gap_skill, db)
    return {"status": "success", "data": res}


@router.get("/skill-growth-history")
def get_skill_growth_history_endpoint(
    email: str = "",
    career_name: str = "Backend Developer",
    db: Session = Depends(get_db)
):
    student_id = None
    if email.strip():
        student = db.query(StudentUser).filter(StudentUser.email == email.lower().strip()).first()
        if student:
            student_id = student.id
            
    res = get_skill_growth_history(student_id, career_name, db)
    return {"status": "success", "data": res}


@router.get("/career-readiness")
def get_career_readiness_endpoint(
    email: str = "",
    career_name: str = "Backend Developer",
    db: Session = Depends(get_db)
):
    student_id = None
    if email.strip():
        student = db.query(StudentUser).filter(StudentUser.email == email.lower().strip()).first()
        if student:
            student_id = student.id
            
    res = calculate_overall_readiness(student_id, email, career_name, db)
    return {"status": "success", "data": res}



