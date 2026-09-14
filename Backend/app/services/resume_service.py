from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import SkillSetuSkill, SkillSetuSkillAlias, SkillSetuCareer, SkillSetuLocation
import re

def normalize_skill(db: Session, raw_skill_name: str) -> dict:
    """
    Normalizes a raw skill string against SkillSetu taxonomy (13,968 skills).
    Returns dict with skill_id, name, confidence, and requires_review.
    """
    clean_name = raw_skill_name.strip()
    if not clean_name:
        return None

    # 1. Exact match on SkillSetuSkill.name (case insensitive)
    exact_skill = db.query(SkillSetuSkill).filter(
        func.lower(SkillSetuSkill.name) == clean_name.lower()
    ).first()

    if exact_skill:
        return {
            "skill_id": exact_skill.id,
            "name": exact_skill.name,
            "confidence": 1.0,
            "requires_review": False
        }

    # 2. Check SkillSetuSkillAlias table
    alias = db.query(SkillSetuSkillAlias).filter(
        func.lower(SkillSetuSkillAlias.alias_name) == clean_name.lower()
    ).first()

    if alias:
        canon_skill = db.query(SkillSetuSkill).filter(SkillSetuSkill.id == alias.canonical_skill_id).first()
        if canon_skill:
            return {
                "skill_id": canon_skill.id,
                "name": canon_skill.name,
                "confidence": 0.95,
                "requires_review": False
            }

    # 3. Common variations / regex cleanup
    # e.g. "ReactJS" -> "React", "Python 3" -> "Python", "PostgreSQL database" -> "PostgreSQL"
    simplified = re.sub(r'(?i)\b(js|programming|language|framework|library|database|tool)\b', '', clean_name).strip()
    if simplified and simplified.lower() != clean_name.lower():
        var_skill = db.query(SkillSetuSkill).filter(
            func.lower(SkillSetuSkill.name) == simplified.lower()
        ).first()
        if var_skill:
            return {
                "skill_id": var_skill.id,
                "name": var_skill.name,
                "confidence": 0.90,
                "requires_review": False
            }

    # 4. Partial substring match
    partial_skill = db.query(SkillSetuSkill).filter(
        func.lower(SkillSetuSkill.name).ilike(f"%{clean_name.lower()}%")
    ).order_by(SkillSetuSkill.popularity_score.desc()).first()

    if partial_skill:
        return {
            "skill_id": partial_skill.id,
            "name": partial_skill.name,
            "confidence": 0.75,
            "requires_review": True
        }

    # Unknown skill - preserve text, return low confidence
    return {
        "skill_id": None,
        "name": clean_name,
        "confidence": 0.40,
        "requires_review": True
    }


def normalize_career(db: Session, raw_job_title: str) -> dict:
    """
    Normalizes a raw job title against SkillSetu 3,053 ESCO career taxonomy.
    """
    clean_title = raw_job_title.strip()
    if not clean_title:
        return None

    # 1. Exact match
    exact_car = db.query(SkillSetuCareer).filter(
        func.lower(SkillSetuCareer.name) == clean_title.lower()
    ).first()

    if exact_car:
        return {
            "career_id": exact_car.id,
            "name": exact_car.name,
            "confidence": 1.0,
            "requires_review": False
        }

    # 2. ILIKE Partial match
    partial_car = db.query(SkillSetuCareer).filter(
        func.lower(SkillSetuCareer.name).ilike(f"%{clean_title.lower()}%")
    ).order_by(SkillSetuCareer.popularity_score.desc()).first()

    if partial_car:
        return {
            "career_id": partial_car.id,
            "name": partial_car.name,
            "confidence": 0.85,
            "requires_review": False
        }

    return {
        "career_id": None,
        "name": clean_title,
        "confidence": 0.40,
        "requires_review": True
    }


def normalize_location(db: Session, raw_location: str) -> dict:
    """
    Normalizes a location string against SkillSetu 153,492 location taxonomy.
    """
    clean_loc = raw_location.strip()
    if not clean_loc:
        return None

    # Exact match on city/name
    loc = db.query(SkillSetuLocation).filter(
        func.lower(SkillSetuLocation.name) == clean_loc.lower()
    ).order_by(SkillSetuLocation.popularity_score.desc()).first()

    if loc:
        return {
            "location_id": loc.id,
            "name": loc.name,
            "state": loc.state,
            "country": loc.country,
            "confidence": 0.95,
            "requires_review": False
        }

    return {
        "location_id": None,
        "name": clean_loc,
        "confidence": 0.40,
        "requires_review": True
    }


def calculate_resume_score(extracted_data: dict, normalized_skills: list) -> dict:
    """
    Calculates transparent, explainable 100-point deterministic resume score.
    Breakdown:
    1. Skills Completeness: 30 pts
    2. Experience Quality: 20 pts
    3. Projects Quality: 20 pts
    4. Education Completeness: 15 pts
    5. Links & Certifications & Achievements: 15 pts
    """
    score_skills = 0
    # Deduplicate skills by ID / name for deterministic scoring
    unique_skill_keys = set()
    for sk in normalized_skills:
        if isinstance(sk, dict):
            key = sk.get("skill_id") or sk.get("name", "").strip().lower()
            if key:
                unique_skill_keys.add(key)
    num_skills = len(unique_skill_keys)

    if num_skills >= 8:
        score_skills = 30
    elif num_skills >= 5:
        score_skills = 24
    elif num_skills >= 3:
        score_skills = 18
    elif num_skills >= 1:
        score_skills = 10


    # Experience
    score_exp = 0
    experiences = extracted_data.get("experience") or []
    if len(experiences) >= 2:
        score_exp = 20
    elif len(experiences) == 1:
        score_exp = 15

    # Projects
    score_proj = 0
    projects = extracted_data.get("projects") or []
    if len(projects) >= 3:
        score_proj = 20
    elif len(projects) == 2:
        score_proj = 16
    elif len(projects) == 1:
        score_proj = 10

    # Education
    score_edu = 0
    education = extracted_data.get("education") or []
    if len(education) > 0 and (education[0].get("institution") or education[0].get("degree")):
        score_edu = 15
    elif len(education) > 0:
        score_edu = 8

    # Links / Certs / Achievements
    score_extras = 0
    links = extracted_data.get("links") or {}
    certs = extracted_data.get("certifications") or []
    achievements = extracted_data.get("achievements") or []

    if links.get("github") or links.get("linkedin") or links.get("portfolio"):
        score_extras += 7
    if len(certs) > 0:
        score_extras += 4
    if len(achievements) > 0:
        score_extras += 4
    if score_extras > 15:
        score_extras = 15

    total_score = score_skills + score_exp + score_proj + score_edu + score_extras

    # Generate transparent score explanation text
    explanation_parts = []
    if score_skills >= 24:
        explanation_parts.append("Strong technical alignment")
    elif score_skills < 18:
        explanation_parts.append("Adding more technical skills will boost your profile match")

    if score_proj < 16:
        explanation_parts.append("Adding more measurable metrics to projects could increase impact")
    else:
        explanation_parts.append("Good project documentation")

    score_text = ". ".join(explanation_parts) + "."

    return {
        "overall_score": total_score,
        "breakdown": {
            "skills": score_skills,
            "experience": score_exp,
            "projects": score_proj,
            "education": score_edu,
            "extras": score_extras
        },
        "score_text": score_text
    }


def derive_skill_domains(normalized_skills: list, experiences: list, projects: list) -> list:
    """
    Derives explainable skill domains based on normalized canonical skills & extracted context.
    """
    skill_names = [s.get("name", "").lower() for s in normalized_skills if s.get("name")]
    domains = []

    # Frontend Domain
    fe_keywords = ["react", "typescript", "javascript", "frontend", "html", "css", "vue", "angular", "tailwind", "redux", "next.js", "nextjs"]
    fe_matches = [k for k in fe_keywords if any(k in sn for sn in skill_names)]
    if fe_matches:
        pct = min(95, 60 + len(fe_matches) * 10)
        domains.append({
            "name": "Frontend Architecture",
            "value": pct,
            "evidence": fe_matches
        })

    # Backend / Fullstack Domain
    be_keywords = ["python", "node.js", "nodejs", "fastapi", "express", "sql", "postgresql", "postgres", "mongodb", "graphql", "django", "java", "c++", "golang"]
    be_matches = [k for k in be_keywords if any(k in sn for sn in skill_names)]
    if be_matches:
        pct = min(95, 60 + len(be_matches) * 10)
        domains.append({
            "name": "Backend & Cloud Services",
            "value": pct,
            "evidence": be_matches
        })

    # Data / AI Domain
    ai_keywords = ["python", "pandas", "numpy", "pytorch", "tensorflow", "machine learning", "deep learning", "sql", "scikit-learn"]
    ai_matches = [k for k in ai_keywords if any(k in sn for sn in skill_names)]
    if ai_matches and len(ai_matches) >= 2:
        pct = min(95, 60 + len(ai_matches) * 10)
        domains.append({
            "name": "Data Engineering & AI",
            "value": pct,
            "evidence": ai_matches
        })

    # Fallback if no specific tech stack recognized
    if not domains:
        domains.append({
            "name": "Software Engineering Fundamentals",
            "value": 75,
            "evidence": skill_names[:3]
        })

    return domains
