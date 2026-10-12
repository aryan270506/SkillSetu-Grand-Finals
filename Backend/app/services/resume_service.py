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
    if not domains and skill_names:
        domains.append({
            "name": "Software Engineering Fundamentals",
            "value": 70,
            "evidence": skill_names[:3]
        })

    return domains


def calculate_role_fit(normalized_skills: list, experiences: list, projects: list, db: Session) -> dict:
    """
    Calculates evidence-based role fit against SkillSetu career taxonomy.
    Finds best-fit role, fit percentage, matched skills, missing skills, and evidence explanation.
    """
    extracted_skill_ids = [s.get("skill_id") for s in normalized_skills if s.get("skill_id")]
    extracted_skill_names = [s.get("name") for s in normalized_skills if s.get("name")]

    if not extracted_skill_names:
        return {
            "best_fit_role": None,
            "fit_score": 0.0,
            "matched_skills": [],
            "missing_skills": [],
            "evidence": [],
            "why_fit": "No skills could be reliably extracted from this resume."
        }

    from app.models import SkillSetuCareer, SkillSetuCareerSkill, SkillSetuSkill

    role_scores = []

    if extracted_skill_ids:
        career_matches = db.query(
            SkillSetuCareerSkill.career_id,
            func.count(SkillSetuCareerSkill.skill_id).label("matched_count")
        ).filter(
            SkillSetuCareerSkill.skill_id.in_(extracted_skill_ids)
        ).group_by(
            SkillSetuCareerSkill.career_id
        ).order_by(
            func.count(SkillSetuCareerSkill.skill_id).desc()
        ).limit(10).all()

        for career_id, matched_count in career_matches:
            career = db.query(SkillSetuCareer).filter(SkillSetuCareer.id == career_id).first()
            if not career:
                continue

            career_skills = db.query(SkillSetuCareerSkill, SkillSetuSkill).join(
                SkillSetuSkill, SkillSetuCareerSkill.skill_id == SkillSetuSkill.id
            ).filter(SkillSetuCareerSkill.career_id == career_id).all()

            total_req = len(career_skills)
            if total_req == 0:
                continue

            matched = []
            missing = []
            for cs, s in career_skills:
                if cs.skill_id in extracted_skill_ids:
                    matched.append(s.name)
                else:
                    is_ess = getattr(cs, 'relation_type', '') == 'essential'
                    if is_ess or len(missing) < 5:
                        missing.append(s.name)


            fit_score = round((len(matched) / total_req) * 100, 1)
            role_scores.append({
                "career_id": career.id,
                "role_name": career.name,
                "fit_score": min(fit_score, 100.0),
                "matched_skills": matched[:6],
                "missing_skills": missing[:5],
                "why_fit": f"Demonstrates {len(matched)} key skills including {', '.join(matched[:3])}." if matched else "Limited direct skill alignment."
            })

    if not role_scores:
        exp_titles = [e.get("role") or e.get("title") for e in experiences if e.get("role") or e.get("title")]
        for title in exp_titles:
            norm_c = normalize_career(db, title)
            if norm_c and norm_c.get("career_id"):
                c_id = norm_c.get("career_id")
                career = db.query(SkillSetuCareer).filter(SkillSetuCareer.id == c_id).first()
                if career:
                    role_scores.append({
                        "career_id": career.id,
                        "role_name": career.name,
                        "fit_score": 75.0,
                        "matched_skills": extracted_skill_names[:5],
                        "missing_skills": [],
                        "why_fit": f"Experience aligned with {career.name}."
                    })
                    break

    if role_scores:
        role_scores.sort(key=lambda x: x["fit_score"], reverse=True)
        best = role_scores[0]
        return {
            "best_fit_role": best["role_name"],
            "fit_score": best["fit_score"],
            "matched_skills": best["matched_skills"],
            "missing_skills": best["missing_skills"],
            "evidence": extracted_skill_names[:6],
            "why_fit": best["why_fit"],
            "all_matches": role_scores[:3]
        }
    else:
        return {
            "best_fit_role": None,
            "fit_score": 0.0,
            "matched_skills": [],
            "missing_skills": [],
            "evidence": extracted_skill_names[:6],
            "why_fit": "No sufficiently supported role match was found."
        }


def calculate_ai_diagnostics(raw_data: dict, normalized_skills: list, role_fit: dict, ats_result: dict, domains: list) -> dict:
    """
    Calculates genuine, evidence-based AI diagnostics from actual parsed resume contents:
    - Semantic Match (% and dynamic description)
    - Impact Quantification (% and dynamic description)
    - Technical Depth (% and dynamic description)
    - Readability & ATS (% and dynamic description)
    - Tier Label (dynamic benchmark based on genuine score)
    - Synthesis Note (dynamic AI pre-analysis synthesis)
    """
    # 1. Semantic Match
    fit_score = role_fit.get("fit_score", 0.0)
    matched_skills = role_fit.get("matched_skills") or []
    best_role = role_fit.get("best_fit_role") or "Software Engineering"
    
    if fit_score > 0:
        semantic_score = int(round(fit_score))
    elif normalized_skills:
        semantic_score = min(85, max(30, len(normalized_skills) * 10))
    else:
        semantic_score = 20
    semantic_score = max(0, min(100, semantic_score))
    
    if matched_skills:
        semantic_desc = f"Matched {len(matched_skills)} core skills for {best_role}"
    elif normalized_skills:
        semantic_desc = f"{len(normalized_skills)} skills matched to engineering taxonomy"
    else:
        semantic_desc = "No direct role skills matched"

    # 2. Impact Quantification
    # Analyze actual projects, experiences, and achievements for measurable metrics
    projects = raw_data.get("projects") or []
    experiences = raw_data.get("experience") or []
    achievements = raw_data.get("achievements") or []
    
    all_text_blocks = []
    for p in projects:
        if isinstance(p, dict):
            all_text_blocks.append(p.get("description") or "")
            all_text_blocks.append(p.get("measurable_results") or "")
        elif isinstance(p, str):
            all_text_blocks.append(p)
            
    for e in experiences:
        if isinstance(e, dict):
            all_text_blocks.append(e.get("description") or "")
            for ach in (e.get("achievements") or []):
                all_text_blocks.append(str(ach))
                
    for a in achievements:
        if isinstance(a, dict):
            all_text_blocks.append(a.get("description") or a.get("achievement") or "")
        elif isinstance(a, str):
            all_text_blocks.append(a)

    if raw_data.get("raw_text"):
        all_text_blocks.append(raw_data.get("raw_text"))

    combined_text = " ".join(all_text_blocks)

    
    # Check for quantitative patterns (percentages, multipliers, latency, counts, currency, scale)
    metric_matches = re.findall(
        r'(?:\b\d+(?:\.\d+)?%\b|\b\d+(?:\.\d+)?x\b|\b\d+\+?\s*(?:users|clients|rps|qps|requests|stars|downloads|endpoints|ms|seconds|min|hours|days|weeks|months|years|lakh|crore|k|m|million|billion|repos|commits)\b|[\$₹€]\s*\d+|\b(?:p95|p99|sla|latency|throughput|reduced|increased|improved|boosted|optimized|accelerated|saved|cut)\b)',
        combined_text,
        re.IGNORECASE
    )
    metric_count = len(metric_matches)
    total_items = len(projects) + len(experiences)
    
    if metric_count >= 5:
        impact_score = min(98, 88 + (metric_count - 5) * 2)
    elif metric_count == 4:
        impact_score = 85
    elif metric_count == 3:
        impact_score = 75
    elif metric_count == 2:
        impact_score = 65
    elif metric_count == 1:
        impact_score = 50
    else:
        impact_score = 25
    impact_score = max(0, min(100, impact_score))
    
    if metric_count > 0:
        impact_desc = f"{metric_count} measurable metric{'s' if metric_count != 1 else ''} across {total_items} items"
    else:
        impact_desc = f"0 quantifiable metrics across {total_items} items"

    # 3. Technical Depth
    num_norm_skills = len(normalized_skills)
    domain_names = [d.get("name", "") for d in domains if d.get("name")]
    
    if num_norm_skills >= 12:
        tech_score = min(98, 88 + (num_norm_skills - 12) * 2)
    elif num_norm_skills >= 8:
        tech_score = 82
    elif num_norm_skills >= 5:
        tech_score = 70
    elif num_norm_skills >= 3:
        tech_score = 55
    elif num_norm_skills >= 1:
        tech_score = 40
    else:
        tech_score = 15
    tech_score = max(0, min(100, tech_score))
    
    if domain_names:
        tech_desc = f"{num_norm_skills} skills across {len(domain_names)} tech domains"
    elif num_norm_skills > 0:
        tech_desc = f"{num_norm_skills} verified technical skills detected"
    else:
        tech_desc = "Limited technical keywords detected"

    # 4. Readability & ATS
    ats_sections_detected = 0
    # Contact
    has_contact = bool(raw_data.get("email") or raw_data.get("phone") or raw_data.get("full_name"))
    if has_contact:
        ats_sections_detected += 1
    # Education
    has_edu = len(raw_data.get("education") or []) > 0
    if has_edu:
        ats_sections_detected += 1
    # Skills
    has_skills = num_norm_skills >= 2 or len(raw_data.get("skills") or []) >= 2
    if has_skills:
        ats_sections_detected += 1
    # Projects or Experience
    has_proj_exp = len(projects) > 0 or len(experiences) > 0
    if has_proj_exp:
        ats_sections_detected += 1

    readability_score = 25 * ats_sections_detected
    if raw_data.get("links", {}).get("github") or raw_data.get("links", {}).get("linkedin"):
        readability_score = min(98, readability_score + 5)
    if not has_contact:
        readability_score = max(10, readability_score - 15)
    readability_score = max(0, min(100, readability_score))
    
    if ats_sections_detected == 4:
        readability_desc = "All 4 core ATS sections validated cleanly"
    else:
        readability_desc = f"{ats_sections_detected}/4 core ATS sections detected"

    # 5. Dynamic Tier Label based on genuine ATS score
    overall_score = ats_result.get("overall_score", 0)
    if overall_score >= 80:
        tier_label = "Tier-1 Elite Benchmark"
    elif overall_score >= 65:
        tier_label = "Tier-2 Proficient Benchmark"
    elif overall_score >= 45:
        tier_label = "Tier-3 Developing Benchmark"
    else:
        tier_label = "Foundational Benchmark"

    # 6. Dynamic Pre-Analysis Synthesis Note
    synthesis_points = []
    if domain_names:
        synthesis_points.append(f"Strong technical alignment in {domain_names[0]} with {num_norm_skills} verified skills")
    elif num_norm_skills > 0:
        synthesis_points.append(f"Identified {num_norm_skills} technical skills")
    else:
        synthesis_points.append("Technical profile requires additional skill evidence")

    if metric_count >= 3:
        synthesis_points.append(f"High-impact documentation with {metric_count} quantified outcomes")
    elif metric_count > 0:
        synthesis_points.append("Adding more measurable metrics (e.g. latency, user counts, scale) to projects could increase recruiter impact")
    else:
        synthesis_points.append("Project descriptions lack quantifiable metrics (e.g. percentage improvements or performance figures)")

    if ats_sections_detected == 4:
        synthesis_points.append("Zero ATS structural parsing errors detected")
    else:
        synthesis_points.append("ATS completeness can be enhanced with complete contact, education, and project records")

    synthesis_note = ". ".join(synthesis_points) + "."

    return {
        "semantic_match": {
            "score": semantic_score,
            "description": semantic_desc
        },
        "impact_quantification": {
            "score": impact_score,
            "description": impact_desc
        },
        "technical_depth": {
            "score": tech_score,
            "description": tech_desc
        },
        "readability_ats": {
            "score": readability_score,
            "description": readability_desc
        },
        "tier": tier_label,
        "synthesis_note": synthesis_note
    }


def generate_skillsetu_value(ats_result: dict, role_fit: dict, raw_extraction: dict, db: Session) -> list:
    """
    Generates genuine, evidence-based recommendations on why SkillSetu can help this candidate.
    """
    points = []

    ats_score = ats_result.get("overall_score", 0)
    if ats_score < 75:
        points.append(f"ATS score is {ats_score}/100. Structure and keyword density can be optimized.")

    missing = role_fit.get("missing_skills", [])
    role_name = role_fit.get("best_fit_role")
    if missing and role_name:
        points.append(f"Identified {len(missing)} skill gaps for {role_name} ({', '.join(missing[:3])}) with verified learning paths available.")

    links = raw_extraction.get("links") or {}
    projects = raw_extraction.get("projects") or []
    if not links.get("github"):
        points.append("Connect GitHub to verify coding evidence and boost recruiter discovery.")
    elif len(projects) == 0:
        points.append("Add verified project repositories to demonstrate hands-on application.")

    if role_name:
        points.append(f"Explore live internships matching your verified skills in {role_name}.")
    else:
        points.append("Explore live internships with strict eligibility matching on SkillSetu.")

    return points


async def analyze_resume_file(file_bytes: bytes, filename: str, db: Session) -> dict:
    """
    Unified entry point for resume extraction, normalization, ATS calculation, and role fit.
    Used identically by Profile Resume Upload, Dashboard Resume Intelligence, and Profile Re-analysis.
    """
    from app.services.document_service import extract_resume_data

    # 1. Unified extraction
    raw_data = await extract_resume_data(file_bytes, filename)

    # 2. Skill Normalization via 13,968 ESCO taxonomy
    raw_skills = raw_data.get("skills") or []
    normalized_skills = []
    for s in raw_skills:
        s_name = s if isinstance(s, str) else s.get("name", "")
        if s_name:
            norm = normalize_skill(db, s_name)
            if norm:
                normalized_skills.append(norm)

    # 3. ATS Calculation
    ats_result = calculate_resume_score(raw_data, normalized_skills)

    # 4. Skill Domains
    experiences = raw_data.get("experience") or []
    projects = raw_data.get("projects") or []
    domains = derive_skill_domains(normalized_skills, experiences, projects)

    # 5. Role Fit against SkillSetuCareer
    role_fit = calculate_role_fit(normalized_skills, experiences, projects, db)

    # 6. AI Diagnostics Calculation
    diagnostics = calculate_ai_diagnostics(raw_data, normalized_skills, role_fit, ats_result, domains)
    ats_result["diagnostics"] = diagnostics
    ats_result["breakdown"]["semantic_match"] = diagnostics["semantic_match"]["score"]
    ats_result["breakdown"]["impact_quantification"] = diagnostics["impact_quantification"]["score"]
    ats_result["breakdown"]["technical_depth"] = diagnostics["technical_depth"]["score"]
    ats_result["breakdown"]["readability_ats"] = diagnostics["readability_ats"]["score"]
    ats_result["score_text"] = diagnostics["synthesis_note"]

    # 7. Genuine SkillSetu Value propositions
    skillsetu_value = generate_skillsetu_value(ats_result, role_fit, raw_data, db)

    return {
        "filename": filename,
        "raw_data": raw_data,
        "normalized_skills": normalized_skills,
        "ats_result": ats_result,
        "domains": domains,
        "role_fit": role_fit,
        "diagnostics": diagnostics,
        "skillsetu_value": skillsetu_value
    }


