import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app import models

logger = logging.getLogger("recruiter_profile_service")

# Canonical required sections
SECTION_COMPANY_IDENTITY = "Company Identity"
SECTION_COMPANY_DETAILS = "Company Details & Locations"
SECTION_COMPANY_ABOUT = "Company Description & Story"
SECTION_CULTURE_BENEFITS = "Culture & Benefits"
SECTION_HIRING_PREFERENCES = "Internship Preferences"
SECTION_HIRING_PROCESS = "Hiring Process"
SECTION_VERIFICATION = "Company Trust & Verification"


def parse_json_safely(val: Optional[str], default: Any) -> Any:
    """Safely parse JSON or return default fallback."""
    if not val:
        return default
    if isinstance(val, (list, dict)):
        return val
    try:
        return json.loads(val)
    except Exception:
        # Fallback for comma-separated string
        if isinstance(default, list) and isinstance(val, str):
            return [x.strip() for x in val.split(",") if x.strip()]
        return default


def serialize_json_safely(val: Any) -> str:
    """Safely serialize data to JSON string."""
    if val is None:
        return ""
    if isinstance(val, str):
        return val
    return json.dumps(val)


def get_canonical_skill_names(db: Session, skill_queries: List[str]) -> List[str]:
    """
    Validates and maps input skill strings to canonical SkillSetu skills where possible.
    Preserves input names if canonical skill match is found.
    """
    if not skill_queries:
        return []
    
    cleaned = [s.strip() for s in skill_queries if s and s.strip()]
    if not cleaned:
        return []
    
    # Try looking up in SkillSetuSkill or SkillSetuSkillAlias
    try:
        canonical_skills = db.query(models.SkillSetuSkill.name).all()
        canonical_set = {s[0].lower(): s[0] for s in canonical_skills}
        
        resolved = []
        for sk in cleaned:
            sk_lower = sk.lower()
            if sk_lower in canonical_set:
                resolved.append(canonical_set[sk_lower])
            else:
                resolved.append(sk)
        return resolved
    except Exception as e:
        logger.warning(f"Error querying canonical skills: {e}")
        return cleaned


def calculate_company_profile_completion(company: models.Company, db: Session) -> Dict[str, Any]:
    """
    Authoritative backend calculation of company profile completion percentage and status.
    
    Weighted Completion Breakdown:
    - Company Identity (25%): name, email, website, industry, company_type, company_size, founded_year
    - Description & Story (15%): description (>= 20 chars), mission, vision
    - Details & Locations (15%): headquarters, locations count (>= 1)
    - Culture & Benefits (10%): culture_tags (>= 1), perks (>= 1)
    - Internship Preferences (15%): preferred_domains (>= 1), preferred_skills (>= 1), preferred_work_mode, preferred_duration
    - Hiring Process (10%): hiring_stages count (>= 1)
    - Verification (10%): is_email_verified, is_website_verified, is_business_verified, is_recruiter_verified
    Total = 100%
    """
    if not company:
        return {
            "percentage": 0,
            "is_complete": False,
            "missing_required_sections": [
                SECTION_COMPANY_IDENTITY,
                SECTION_COMPANY_DETAILS,
                SECTION_COMPANY_ABOUT,
                SECTION_HIRING_PREFERENCES,
                SECTION_HIRING_PROCESS,
                SECTION_VERIFICATION
            ],
            "breakdown": {}
        }

    score = 0.0
    missing_sections = []
    breakdown = {}

    # 1. Company Identity (25 points)
    identity_score = 0.0
    if company.name and len(company.name.strip()) >= 2:
        identity_score += 4.0
    if company.email and "@" in company.email:
        identity_score += 4.0
    if company.website and len(company.website.strip()) >= 3:
        identity_score += 4.0
    if company.industry and len(company.industry.strip()) >= 2:
        identity_score += 4.0
    if company.company_type and len(company.company_type.strip()) >= 2:
        identity_score += 3.0
    if company.company_size and len(company.company_size.strip()) >= 1:
        identity_score += 3.0
    if company.founded_year and len(company.founded_year.strip()) >= 4:
        identity_score += 3.0

    score += identity_score
    breakdown["identity"] = int(identity_score)
    if identity_score < 18.0:
        missing_sections.append(SECTION_COMPANY_IDENTITY)

    # 2. Description & Story (15 points)
    about_score = 0.0
    desc = company.description or ""
    if len(desc.strip()) >= 20:
        about_score += 8.0
    if company.mission and len(company.mission.strip()) >= 5:
        about_score += 4.0
    if company.vision and len(company.vision.strip()) >= 5:
        about_score += 3.0

    score += about_score
    breakdown["about"] = int(about_score)
    if about_score < 8.0:
        missing_sections.append(SECTION_COMPANY_ABOUT)

    # 3. Details & Locations (15 points)
    details_score = 0.0
    if company.headquarters and len(company.headquarters.strip()) >= 2:
        details_score += 8.0
    
    locations_count = db.query(models.CompanyLocation).filter(models.CompanyLocation.company_id == company.id).count()
    if locations_count >= 1:
        details_score += 7.0

    score += details_score
    breakdown["details_locations"] = int(details_score)
    if details_score < 8.0 or locations_count == 0:
        missing_sections.append(SECTION_COMPANY_DETAILS)

    # 4. Culture & Benefits (10 points)
    culture_score = 0.0
    tags = parse_json_safely(company.culture_tags, [])
    perks = parse_json_safely(company.perks, [])
    if len(tags) >= 1:
        culture_score += 5.0
    if len(perks) >= 1:
        culture_score += 5.0

    score += culture_score
    breakdown["culture_benefits"] = int(culture_score)
    if culture_score < 5.0:
        missing_sections.append(SECTION_CULTURE_BENEFITS)

    # 5. Internship Preferences (15 points)
    pref_score = 0.0
    domains = parse_json_safely(company.preferred_domains, [])
    skills = parse_json_safely(company.preferred_skills, [])
    if len(domains) >= 1:
        pref_score += 4.0
    if len(skills) >= 1:
        pref_score += 5.0
    if company.preferred_work_mode and len(company.preferred_work_mode.strip()) >= 2:
        pref_score += 3.0
    if company.preferred_duration and len(company.preferred_duration.strip()) >= 2:
        pref_score += 3.0

    score += pref_score
    breakdown["preferences"] = int(pref_score)
    if pref_score < 12.0 or len(skills) == 0 or len(domains) == 0:
        missing_sections.append(SECTION_HIRING_PREFERENCES)

    # 6. Hiring Process (10 points)
    stages_count = db.query(models.CompanyHiringStage).filter(
        models.CompanyHiringStage.company_id == company.id,
        models.CompanyHiringStage.is_active == True
    ).count()
    process_score = 10.0 if stages_count >= 1 else 0.0
    score += process_score
    breakdown["hiring_process"] = int(process_score)
    if stages_count == 0:
        missing_sections.append(SECTION_HIRING_PROCESS)

    # 7. Trust & Verification (10 points)
    verif_score = 0.0
    if company.is_email_verified:
        verif_score += 2.5
    if company.is_website_verified:
        verif_score += 2.5
    if company.is_business_verified:
        verif_score += 2.5
    if company.is_recruiter_verified:
        verif_score += 2.5

    score += verif_score
    breakdown["verification"] = int(verif_score)
    if not company.is_email_verified:
        missing_sections.append(SECTION_VERIFICATION)

    final_percentage = min(100, int(round(score)))
    
    # Required threshold check:
    # A profile is complete only if missing_sections is empty and percentage >= 80
    is_complete = (len(missing_sections) == 0 and final_percentage >= 80)

    # Sync back to company record
    if company.completion_percentage != final_percentage or company.profile_completed != is_complete:
        company.completion_percentage = final_percentage
        company.profile_completed = is_complete
        db.add(company)
        db.commit()
        db.refresh(company)

    return {
        "percentage": final_percentage,
        "is_complete": is_complete,
        "missing_required_sections": missing_sections,
        "breakdown": breakdown
    }


def get_or_create_company_for_recruiter(recruiter: models.RecruiterUser, db: Session) -> models.Company:
    """
    Finds or creates a unified Company record for the given recruiter.
    Ensures multi-recruiter accounts for the same company share one authoritative Company entity.
    """
    company = None
    if recruiter.company_id:
        company = db.query(models.Company).filter(models.Company.id == recruiter.company_id).first()

    if not company and recruiter.company_name:
        company = db.query(models.Company).filter(
            models.Company.name.ilike(recruiter.company_name.strip())
        ).first()

    if not company:
        # Create fresh company record with initial recruiter info
        company_name = (recruiter.company_name or "My Company").strip()
        company = models.Company(
            name=company_name,
            website=recruiter.company_website or "",
            email=recruiter.email or "",
            industry=recruiter.industry or "Information Technology & Software",
            company_type="Private Ltd",
            company_size=recruiter.company_size or "500-1,000 employees",
            founded_year="2015",
            headquarters="Pune, Maharashtra",
            description="",
            mission="",
            vision="",
            culture_tags=json.dumps([]),
            perks=json.dumps([]),
            preferred_domains=json.dumps([]),
            preferred_skills=json.dumps([]),
            preferred_work_mode="Hybrid",
            preferred_duration="3-6 Months",
            social_links=json.dumps({
                "website": recruiter.company_website or "",
                "linkedin": "",
                "github": "",
                "instagram": "",
                "twitter": ""
            }),
            is_email_verified=True,
            is_website_verified=True,
            is_business_verified=True,
            is_recruiter_verified=True,
            profile_completed=False,
            completion_percentage=0
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    if recruiter.company_id != company.id:
        recruiter.company_id = company.id
        db.add(recruiter)
        db.commit()
        db.refresh(recruiter)

    return company


def get_full_recruiter_profile_data(recruiter: models.RecruiterUser, db: Session) -> Dict[str, Any]:
    """
    Constructs the consolidated company and recruiter profile payload.
    """
    company = get_or_create_company_for_recruiter(recruiter, db)
    completion = calculate_company_profile_completion(company, db)

    # Locations
    locations_rows = db.query(models.CompanyLocation).filter(
        models.CompanyLocation.company_id == company.id
    ).order_by(models.CompanyLocation.is_primary.desc(), models.CompanyLocation.id.asc()).all()
    
    locations = [
        {
            "id": loc.id,
            "title": loc.title,
            "sub": loc.sub or "",
            "badge": loc.badge or "Branch",
            "is_primary": loc.is_primary
        }
        for loc in locations_rows
    ]

    # Hiring Stages
    stages_rows = db.query(models.CompanyHiringStage).filter(
        models.CompanyHiringStage.company_id == company.id
    ).order_by(models.CompanyHiringStage.order.asc()).all()

    hiring_process = [
        {
            "id": st.stage_id or f"{st.order:02d}",
            "db_id": st.id,
            "order": st.order,
            "title": st.title,
            "desc": st.desc or "",
            "type": st.stage_type or "interview",
            "is_active": st.is_active
        }
        for st in stages_rows
    ]

    # Hiring Team (Recruiters belonging to same company)
    team_members = db.query(models.RecruiterUser).filter(
        models.RecruiterUser.company_id == company.id
    ).all()

    hiring_team = []
    for member in team_members:
        initials = "".join([part[0].upper() for part in member.name.split()[:2]]) if member.name else "R"
        hiring_team.append({
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "phone": member.phone or "",
            "role": member.designation or "Talent Lead",
            "tag": "You" if member.id == recruiter.id else ("Active" if member.status == "APPROVED" else member.status),
            "avatar": initials
        })

    # Active Postings Count
    active_postings_count = db.query(models.InternshipPosting).filter(
        models.InternshipPosting.company_id == company.id,
        models.InternshipPosting.status == "Active"
    ).count()

    return {
        "status": "success",
        "recruiter": {
            "id": recruiter.id,
            "name": recruiter.name,
            "email": recruiter.email,
            "phone": recruiter.phone or "",
            "designation": recruiter.designation or "Talent Lead",
            "status": recruiter.status,
            "is_verified": recruiter.is_verified
        },
        "company": {
            "id": company.id,
            "name": company.name,
            "logo_url": company.logo_url or "",
            "industry": company.industry or "",
            "company_type": company.company_type or "Private Ltd",
            "company_size": company.company_size or "500-1,000 employees",
            "founded": company.founded_year or "2015",
            "website": company.website or "",
            "email": company.email or "",
            "headquarters": company.headquarters or "Pune, Maharashtra",
            "location": company.headquarters or "Pune, Maharashtra",
            "employees": company.company_size or "500-1,000 employees",
            "work_locations": ", ".join([loc.title for loc in locations_rows]) if locations_rows else (company.headquarters or "Pune, Maharashtra")
        },
        "about": {
            "description": company.description or "",
            "mission": company.mission or "",
            "vision": company.vision or ""
        },
        "culture": {
            "culture_tags": parse_json_safely(company.culture_tags, []),
            "perks": parse_json_safely(company.perks, [])
        },
        "preferences": {
            "domains": parse_json_safely(company.preferred_domains, []),
            "skills": parse_json_safely(company.preferred_skills, []),
            "work_mode": company.preferred_work_mode or "Hybrid",
            "duration": company.preferred_duration or "3-6 Months"
        },
        "hiring_process": hiring_process,
        "locations": locations,
        "hiring_team": hiring_team,
        "social_links": parse_json_safely(company.social_links, {
            "website": company.website or "",
            "linkedin": "",
            "github": "",
            "instagram": "",
            "twitter": ""
        }),
        "verification": {
            "company_email_verified": company.is_email_verified,
            "website_verified": company.is_website_verified,
            "business_verified": company.is_business_verified,
            "recruiter_verified": company.is_recruiter_verified
        },
        "stats": {
            "active_internships": active_postings_count,
            "total_applications": 0,
            "shortlisted_students": 0,
            "interviews_scheduled": 0
        },
        "completion": completion
    }
