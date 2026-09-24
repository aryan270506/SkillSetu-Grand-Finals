from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import json
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app import models

router = APIRouter()

# Pydantic Payloads
class UpdateCareerGoalsPayload(BaseModel):
    email: EmailStr
    target_career_id: Optional[str] = ""
    target_career_ids: List[str] = []
    skill_ids: List[str] = []
    preferred_location_ids: List[str] = []
    target_industry_id: Optional[str] = ""
    target_industry_ids: List[str] = []
    opportunity_types: List[str] = []
    work_preferences: List[str] = []
    timeline: Optional[str] = ""
    career_goal_text: Optional[str] = ""


# ----------------------------------------------------
# 1. Taxonomy Reference APIs
# ----------------------------------------------------
# ----------------------------------------------------
# 1. Taxonomy Reference APIs
# ----------------------------------------------------
@router.get("/careers")
def get_careers(
    q: str = Query("", description="Search term for career"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Search across 100% of available careers in database with intelligent ranking.
    """
    search_str = q.strip().lower()
    query = db.query(models.SkillSetuCareer).filter(models.SkillSetuCareer.is_visible == True)

    if not search_str:
        # Empty search: Return popular/curated careers first
        careers = query.order_by(models.SkillSetuCareer.popularity_score.desc(), models.SkillSetuCareer.name.asc()).limit(limit).all()
    else:
        # Search complete database
        search_pattern = f"%{search_str}%"
        matched_careers = query.filter(
            or_(
                func.lower(models.SkillSetuCareer.name).like(search_pattern),
                func.lower(models.SkillSetuCareer.category).like(search_pattern),
                func.lower(models.SkillSetuCareer.description).like(search_pattern)
            )
        ).all()

        # Score & Rank matches: Exact (100) > Prefix (80) > Substring (50) + Popularity
        def rank_career(c):
            nl = c.name.lower()
            if nl == search_str:
                score = 1000
            elif nl.startswith(search_str):
                score = 500
            else:
                score = 100
            return (score, c.popularity_score)

        matched_careers.sort(key=rank_career, reverse=True)
        careers = matched_careers[:limit]

    return {
        "status": "success",
        "count": len(careers),
        "data": [
            {
                "id": c.id,
                "name": c.name,
                "category": c.category,
                "description": c.description,
                "popularity_score": c.popularity_score
            }
            for c in careers
        ]
    }


@router.get("/skills")
def get_skills(
    q: str = Query("", description="Search term or alias for skill"),
    career_id: str = Query("", description="Filter recommended skills by target career ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Search across 100% of available ESCO skills (13,900+) in database with alias resolution and intelligent ranking.
    """
    recommended_skill_ids = set()
    if career_id.strip():
        rels = db.query(models.SkillSetuCareerSkill).filter(models.SkillSetuCareerSkill.career_id == career_id.strip()).all()
        recommended_skill_ids = {r.skill_id for r in rels}

    search_str = q.strip().lower()
    query = db.query(models.SkillSetuSkill).filter(models.SkillSetuSkill.is_visible == True)

    if not search_str:
        # Empty search: Return top popular tech skills first
        skills = query.order_by(models.SkillSetuSkill.popularity_score.desc(), models.SkillSetuSkill.name.asc()).limit(limit).all()
    else:
        # 1. Alias Resolution
        alias_matches = db.query(models.SkillSetuSkillAlias).filter(
            func.lower(models.SkillSetuSkillAlias.alias_name).like(f"%{search_str}%")
        ).all()
        alias_canonical_map = {a.canonical_skill_id: a.alias_name.lower() for a in alias_matches}

        search_pattern = f"%{search_str}%"
        all_matches = query.filter(
            or_(
                func.lower(models.SkillSetuSkill.name).like(search_pattern),
                func.lower(models.SkillSetuSkill.category).like(search_pattern),
                models.SkillSetuSkill.id.in_(list(alias_canonical_map.keys()))
            )
        ).all()

        # 2. Ranking Strategy: Exact Match > Prefix Match > Alias Match > Substring Match + Popularity
        def rank_skill(s):
            nl = s.name.lower()
            alias_hit = alias_canonical_map.get(s.id, "")
            
            if nl == search_str:
                score = 1000
            elif alias_hit == search_str:
                score = 900
            elif nl.startswith(search_str):
                score = 500
            elif alias_hit.startswith(search_str):
                score = 400
            else:
                score = 100
            return (score, s.popularity_score)

        all_matches.sort(key=rank_skill, reverse=True)
        skills = all_matches[:limit]

    return {
        "status": "success",
        "count": len(skills),
        "recommended_skill_ids": list(recommended_skill_ids),
        "data": [
            {
                "id": s.id,
                "name": s.name,
                "category": s.category,
                "skill_type": s.skill_type,
                "popularity_score": s.popularity_score,
                "is_recommended": s.id in recommended_skill_ids
            }
            for s in skills
        ]
    }


@router.get("/industries")
def get_industries(db: Session = Depends(get_db)):
    """
    Get controlled industry taxonomy.
    """
    industries = db.query(models.SkillSetuIndustry).filter(models.SkillSetuIndustry.is_visible == True).all()
    return {
        "status": "success",
        "count": len(industries),
        "data": [
            {
                "id": ind.id,
                "name": ind.name,
                "parent_category": ind.parent_category
            }
            for ind in industries
        ]
    }


@router.get("/locations")
def get_locations(
    q: str = Query("", description="Search term for location"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Search across 100% of global and Indian locations in database with intelligent ranking.
    """
    search_str = q.strip().lower()
    query = db.query(models.SkillSetuLocation)

    if not search_str:
        # Empty search: Popular tech hubs first, then others
        if hasattr(models.SkillSetuLocation, "is_popular"):
            locations = query.order_by(models.SkillSetuLocation.is_popular.desc(), models.SkillSetuLocation.popularity_score.desc(), models.SkillSetuLocation.name.asc()).limit(limit).all()
        else:
            locations = query.order_by(models.SkillSetuLocation.name.asc()).limit(limit).all()
    else:
        search_pattern = f"%{search_str}%"
        all_matches = query.filter(
            or_(
                func.lower(models.SkillSetuLocation.name).like(search_pattern),
                func.lower(models.SkillSetuLocation.city).like(search_pattern),
                func.lower(models.SkillSetuLocation.district).like(search_pattern),
                func.lower(models.SkillSetuLocation.state).like(search_pattern),
                func.lower(models.SkillSetuLocation.country).like(search_pattern)
            )
        ).all()

        # Score & Rank matches: Exact (1000) > Name Prefix (500) > State/Country Prefix (300) + Popularity Score
        def rank_location(loc):
            nl = (loc.name or "").lower()
            cl = (loc.city or "").lower()
            sl = (loc.state or "").lower()
            ctl = (loc.country or "").lower()
            
            if nl == search_str or cl == search_str:
                score = 1000
            elif nl.startswith(search_str) or cl.startswith(search_str):
                score = 500
            elif sl == search_str or ctl == search_str:
                score = 400
            elif sl.startswith(search_str) or ctl.startswith(search_str):
                score = 300
            else:
                score = 100
            
            pop_score = (loc.popularity_score or 10) + (50 if loc.is_popular else 0)
            return (score, pop_score)

        all_matches.sort(key=rank_location, reverse=True)
        locations = all_matches[:limit]

    return {
        "status": "success",
        "count": len(locations),
        "data": [
            {
                "id": loc.id,
                "name": loc.name,
                "type": loc.type,
                "city": loc.city,
                "district": loc.district,
                "state": loc.state,
                "country": loc.country,
                "country_code": loc.country_code,
                "parent_location_id": getattr(loc, "parent_location_id", ""),
                "is_popular": getattr(loc, "is_popular", False)
            }
            for loc in locations
        ]
    }


@router.get("/enums")
def get_controlled_enums():
    """
    Returns controlled enum choices for Opportunity Types, Work Preferences, and Timelines.
    """
    return {
        "status": "success",
        "data": {
            "opportunity_types": [
                {"id": "internship", "label": "Internship"},
                {"id": "fulltime", "label": "Full-time"},
                {"id": "parttime", "label": "Part-time"},
                {"id": "contract", "label": "Contract"}
            ],
            "work_preferences": [
                {"id": "remote", "label": "Remote"},
                {"id": "hybrid", "label": "Hybrid"},
                {"id": "onsite", "label": "On-site"}
            ],
            "timelines": [
                {"id": "immediately", "label": "Immediately"},
                {"id": "within_1_month", "label": "Within 1 Month"},
                {"id": "1_to_3_months", "label": "1–3 Months"},
                {"id": "3_to_6_months", "label": "3–6 Months"},
                {"id": "6_to_12_months", "label": "6–12 Months"},
                {"id": "12_plus_months", "label": "12+ Months"}
            ]
        }
    }


# ----------------------------------------------------
# 2. Student Career Goals Selection Storage APIs
# ----------------------------------------------------
@router.get("/student/career-goals")
def get_student_career_goals(email: str, db: Session = Depends(get_db)):
    """
    Fetch student's stored canonical career goals and selection IDs directly from the students table.
    """
    student = db.query(models.StudentUser).filter(models.StudentUser.email == email.lower()).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student user not found.")

    def parse_list(val):
        if not val:
            return []
        try:
            return json.loads(val)
        except Exception:
            return [x.strip() for x in val.split(",") if x.strip()]

    target_careers = parse_list(student.target_careers)
    target_industries = parse_list(student.target_industries)
    skill_ids = parse_list(student.skill_ids)
    preferred_locations = parse_list(student.preferred_locations)
    opportunity_types = parse_list(student.opportunity_types)
    work_preferences = parse_list(student.work_preferences)

    target_career_id = target_careers[0] if target_careers else ""
    target_industry_id = target_industries[0] if target_industries else ""

    return {
        "status": "success",
        "data": {
            "email": email,
            "target_career_id": target_career_id,
            "target_career_ids": target_careers,
            "target_industry_id": target_industry_id,
            "target_industry_ids": target_industries,
            "timeline": getattr(student, "timeline", "") or "",
            "career_goal_text": getattr(student, "career_goal_text", getattr(student, "career_goal", "")) or "",
            "skill_ids": skill_ids,
            "preferred_location_ids": preferred_locations,
            "opportunity_types": opportunity_types,
            "work_preferences": work_preferences
        }
    }


@router.post("/student/career-goals")
def save_student_career_goals(payload: UpdateCareerGoalsPayload, db: Session = Depends(get_db)):
    """
    Save or update student's canonical career goals and selections directly into the students table.
    """
    email = payload.email.lower()
    student = db.query(models.StudentUser).filter(models.StudentUser.email == email).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student user not found.")

    all_careers = list(set([c.strip() for c in payload.target_career_ids if c.strip()]))
    if payload.target_career_id and payload.target_career_id.strip() and payload.target_career_id.strip() not in all_careers:
        all_careers.insert(0, payload.target_career_id.strip())

    all_industries = list(set([i.strip() for i in payload.target_industry_ids if i.strip()]))
    if payload.target_industry_id and payload.target_industry_id.strip() and payload.target_industry_id.strip() not in all_industries:
        all_industries.insert(0, payload.target_industry_id.strip())

    student.target_careers = json.dumps(all_careers)
    student.target_industries = json.dumps(all_industries)
    student.skill_ids = json.dumps(list(set([s.strip() for s in payload.skill_ids if s.strip()])))
    student.preferred_locations = json.dumps(list(set([l.strip() for l in payload.preferred_location_ids if l.strip()])))
    student.opportunity_types = json.dumps(list(set([o.strip() for o in payload.opportunity_types if o.strip()])))
    student.work_preferences = json.dumps(list(set([w.strip() for w in payload.work_preferences if w.strip()])))
    student.timeline = payload.timeline
    student.career_goal_text = payload.career_goal_text

    db.commit()
    db.refresh(student)

    return {
        "status": "success",
        "message": "Student career goals and canonical preferences saved directly in students collection!"
    }


# ----------------------------------------------------
# 3. Deterministic Explainable Matching Engine API
# ----------------------------------------------------
@router.get("/student/matching")
def compute_internship_matches(email: str, db: Session = Depends(get_db)):
    """
    Computes 100% deterministic, explainable match scores between student canonical selections and available internships.
    Reads data directly from the students table.
    """
    student = db.query(models.StudentUser).filter(models.StudentUser.email == email.lower()).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student user not found.")

    def parse_set(val):
        if not val:
            return set()
        try:
            return set(json.loads(val))
        except Exception:
            return {x.strip() for x in val.split(",") if x.strip()}

    student_careers = parse_set(student.target_careers)
    student_industries = parse_set(student.target_industries)
    student_skills = parse_set(student.skill_ids)
    student_locs = parse_set(student.preferred_locations)
    student_opps = parse_set(student.opportunity_types)
    student_wps = parse_set(student.work_preferences)

    target_career_id = list(student_careers)[0] if student_careers else ""
    target_industry_id = list(student_industries)[0] if student_industries else ""

    all_internships = db.query(models.InternshipListing).all()

    skills_by_id = {s.id: s.name for s in db.query(models.SkillSetuSkill).all()}
    careers_by_id = {c.id: c.name for c in db.query(models.SkillSetuCareer).all()}
    locations_by_id = {l.id: l.name for l in db.query(models.SkillSetuLocation).all()}

    match_results = []

    for listing in all_internships:
        req_skills_rows = db.query(models.InternshipRequiredSkill).filter(models.InternshipRequiredSkill.internship_id == listing.id).all()
        req_skill_ids = {r.skill_id for r in req_skills_rows}

        # Weighting Score Calculations
        # 1. Skills (40%)
        if req_skill_ids:
            matched_skills = student_skills.intersection(req_skill_ids)
            skill_score = len(matched_skills) / len(req_skill_ids)
        else:
            matched_skills = set()
            skill_score = 1.0

        # 2. Target Career (20%)
        career_score = 1.0 if (listing.career_id in student_careers or listing.career_id == target_career_id) else 0.0

        # 3. Target Industry (15%)
        industry_score = 1.0 if (listing.industry_id in student_industries or listing.industry_id == target_industry_id) else 0.5

        # 4. Location (10%)
        location_score = 1.0 if (not student_locs or listing.location_id in student_locs or listing.work_preference == "remote") else 0.0

        # 5. Opportunity Type (5%)
        type_score = 1.0 if (not student_opps or listing.opportunity_type in student_opps) else 0.0

        # 6. Work Preference (5%)
        wp_score = 1.0 if (not student_wps or listing.work_preference in student_wps) else 0.0

        # 7. Timeline (5%)
        timeline_score = 1.0

        total_match_score = round((
            skill_score * 40 +
            career_score * 20 +
            industry_score * 15 +
            location_score * 10 +
            type_score * 5 +
            wp_score * 5 +
            timeline_score * 5
        ), 1)

        # Match Explanations
        breakdown = []
        if career_score == 1.0:
            breakdown.append({"label": f"Career Match ({careers_by_id.get(listing.career_id, 'Target Career')})", "matched": True})
        
        for sk_id in matched_skills:
            breakdown.append({"label": f"{skills_by_id.get(sk_id, sk_id)} Skill Match", "matched": True})

        if location_score == 1.0:
            breakdown.append({"label": f"Location Match ({locations_by_id.get(listing.location_id, 'Preferred Location')})", "matched": True})

        if wp_score == 1.0:
            breakdown.append({"label": f"Work Preference Match ({listing.work_preference.title()})", "matched": True})

        missing_skills = [
            {"id": sk_id, "name": skills_by_id.get(sk_id, sk_id)}
            for sk_id in (req_skill_ids - matched_skills)
        ]

        match_results.append({
            "internship_id": listing.id,
            "title": listing.title,
            "company_name": listing.company_name,
            "match_score": total_match_score,
            "location": locations_by_id.get(listing.location_id, "Pune"),
            "work_preference": listing.work_preference,
            "stipend_amount": listing.stipend_amount,
            "duration": listing.duration,
            "breakdown": breakdown,
            "missing_skills": missing_skills
        })

    match_results.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "status": "success",
        "count": len(match_results),
        "data": match_results
    }


# ----------------------------------------------------
# 7. Taxonomy Admin & Groq Career-ESCO Mappings API
# ----------------------------------------------------
@router.get("/career-mappings")
def get_career_mappings(
    status_filter: Optional[str] = Query(None, description="Filter by status: validated, needs_review, pending, rejected"),
    db: Session = Depends(get_db)
):
    """
    ADMIN ENDPOINT: Retrieve all active SkillSetu career ↔ ESCO occupation mappings and validation status.
    """
    from app.services.esco_service import get_validated_esco_mapping
    
    careers = db.query(models.SkillSetuCareer).filter(models.SkillSetuCareer.is_visible == True).all()
    results = []

    for car in careers:
        mapping = db.query(models.CareerOccupationMapping).filter(
            models.CareerOccupationMapping.career_id == car.id
        ).first()

        if status_filter and mapping and mapping.mapping_status != status_filter:
            continue

        results.append({
            "career_id": car.id,
            "career_name": car.name,
            "category": car.category,
            "existing_esco_uri": car.esco_uri,
            "mapped_esco_uri": mapping.esco_occupation_uri if mapping else None,
            "confidence_score": mapping.confidence_score if mapping else 0.0,
            "mapping_status": mapping.mapping_status if mapping else "unresolved",
            "mapping_method": mapping.mapping_method if mapping else "none",
            "reasoning_summary": mapping.reasoning_summary if mapping else None,
            "validated_at": mapping.validated_at.isoformat() if (mapping and mapping.validated_at) else None
        })

    return {
        "status": "success",
        "total_careers": len(careers),
        "mappings": results
    }


@router.post("/career-mappings/{career_id}/validate")
def validate_career_mapping(
    career_id: str,
    db: Session = Depends(get_db)
):
    """
    ADMIN / INTERNAL ENDPOINT: Trigger server-side Groq semantic validation for a career against ESCO candidates.
    Updates or creates CareerOccupationMapping entry in PostgreSQL.
    """
    from app.services.esco_service import validate_career_esco_mapping_with_groq

    res = validate_career_esco_mapping_with_groq(career_id, db)
    if "error" in res:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])

    return {
        "status": "success",
        "message": f"Groq validation completed for '{career_id}'",
        "result": res
    }

