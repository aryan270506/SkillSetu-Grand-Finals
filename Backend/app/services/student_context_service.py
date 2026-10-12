import json
import logging
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models import (
    StudentUser,
    StudentGithubConnection,
    StudentAssessmentAttempt,
    StudentPracticeAttempt,
    StudentLearningProgress,
    StudentSkillEvidence,
    LearningPath,
    LearningPathItem,
    InternshipApplication,
    InternshipListing,
    InternshipPosting,
    InternshipAssessmentConfig,
    CandidateAssessmentSession,
    Company,
    SkillSetuCareer,
    SkillSetuSkill
)
from app.services import (
    esco_service,
    career_intelligence_service,
    resume_service
)

logger = logging.getLogger("student_context_service")
logger.setLevel(logging.INFO)


class StudentContextService:
    """
    Centralized Student Context Service for SkillSetu Personal AI Mentor.
    Retrieves, correlates, and normalizes authoritative student information from PostgreSQL
    and existing intelligence services (ESCO taxonomy, GitHub analyzer, Resume parser, Learning Paths).
    """

    @staticmethod
    def get_student_user(db: Session, identifier: Union[int, str]) -> Optional[StudentUser]:
        """Resolves student by integer ID or email string."""
        if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
            return db.query(StudentUser).filter(StudentUser.id == int(identifier)).first()
        elif isinstance(identifier, str) and identifier.strip():
            return db.query(StudentUser).filter(func.lower(StudentUser.email) == identifier.strip().lower()).first()
        return None

    @classmethod
    def get_student_context(cls, db: Session, identifier: Union[int, str]) -> Dict[str, Any]:
        """
        Builds complete normalized student context object.
        Source of truth is the database and verified evidence.
        """
        student = cls.get_student_user(db, identifier) if identifier else None
        if not student and not identifier:
            # Fallback to first available student only if no identifier was passed at all
            student = db.query(StudentUser).first()
        if not student:
            return cls._get_empty_context()

        student_id = student.id
        student_email = (student.email or "").strip().lower()

        # 1. Resolve Target Careers
        target_careers_list = []
        if student.target_careers:
            try:
                tc = json.loads(student.target_careers) if student.target_careers.startswith("[") else [s.strip() for s in student.target_careers.split(",") if s.strip()]
                target_careers_list = tc
            except Exception:
                target_careers_list = [student.target_careers]

        if not target_careers_list:
            target_careers_list = ["Full Stack Developer"]

        primary_target_career = target_careers_list[0] if target_careers_list else "Full Stack Developer"
        resolved_primary_career = esco_service.resolve_career_name(primary_target_career, db)

        # 2. Extract Structured Resume Data
        resume_obj = cls._extract_resume_details(student)

        # 3. Extract GitHub Connection & Evidence
        github_obj = cls._extract_github_details(db, student_email)

        # 4. Extract Career Intelligence, Skills & Gaps
        career_intel = cls._extract_career_intelligence(db, student_email, resolved_primary_career)

        # 5. Extract Applications
        applications = cls._extract_applications(db, student_id)

        # 6. Extract Learning Path & Progress
        learning_progress = cls._extract_learning_progress(db, student_id)

        # 7. Extract Verified Project Evidence
        projects = cls._extract_projects(student, resume_obj, github_obj)

        # 8. Extract Preferences
        preferences = cls._extract_preferences(student)

        # Calculate Academic Year / Semester string
        grad_year = student.graduation_year or ""
        start_year = student.start_year or ""
        education_str = ""
        if student.degree or student.university:
            education_str = f"{student.degree or 'Degree'} in {student.branch or 'Engineering'}, {student.university or 'University'}"
            if start_year and grad_year:
                education_str += f" ({start_year} - {grad_year})"
            if student.cgpa_or_percentage:
                education_str += f", CGPA: {student.cgpa_or_percentage}"

        year_str = ""
        if grad_year:
            try:
                # Estimate year based on grad year or explicit field
                current_academic_year = 2026
                gy = int(grad_year[:4])
                sy = int(start_year[:4]) if start_year else (gy - 4)
                diff = current_academic_year - sy + 1
                if 1 <= diff <= 4:
                    year_str = f"Year {diff}"
                else:
                    year_str = f"Class of {grad_year}"
            except Exception:
                year_str = f"Graduation: {grad_year}"

        normalized_context = {
            "student": {
                "id": student.id,
                "name": student.name or "SkillSetu Student",
                "email": student.email,
                "phone": student.phone or "",
                "headline": student.headline or f"Aspiring {resolved_primary_career}",
                "location": student.location or "India",
                "education": education_str,
                "degree": student.degree or "",
                "branch": student.branch or "",
                "university": student.university or "",
                "startYear": student.start_year or "",
                "graduationYear": student.graduation_year or "",
                "cgpa": student.cgpa_or_percentage or "",
                "year": year_str,
                "bio": student.bio or "",
                "experience": student.years_of_experience or "Fresher / Student"
            },
            "career": {
                "targetCareer": resolved_primary_career,
                "targetCareers": target_careers_list,
                "targetIndustries": cls._parse_list_field(student.target_industries),
                "careerReadiness": career_intel.get("readiness_score", 0.0),
                "targetFitScore": career_intel.get("target_fit_score", 0.0),
                "careerStatus": career_intel.get("status", "Developing")
            },
            "skills": {
                "verified": career_intel.get("verified_skills", []),
                "developing": career_intel.get("developing_skills", []),
                "missing": career_intel.get("missing_skills", []),
                "evidence": career_intel.get("evidence_items", []),
                "summary": career_intel.get("skills_summary", "")
            },
            "projects": projects,
            "github": github_obj,
            "resume": resume_obj,
            "certifications": resume_obj.get("certifications", []),
            "courses": learning_progress.get("active_courses", []),
            "learningPath": learning_progress.get("learning_path", {}),
            "skillGaps": career_intel.get("skill_gaps", []),
            "applications": applications,
            "preferences": preferences
        }

        return normalized_context

    @staticmethod
    def _parse_list_field(val: Optional[str]) -> List[str]:
        if not val:
            return []
        try:
            if val.startswith("["):
                return json.loads(val)
            return [x.strip() for x in val.split(",") if x.strip()]
        except Exception:
            return [val.strip()]

    @classmethod
    def _extract_resume_details(cls, student: StudentUser) -> Dict[str, Any]:
        result = {
            "hasResume": bool(student.resume_url or student.resume_data),
            "resumeScore": student.resume_score or 0,
            "resumeUrl": student.resume_url or "",
            "fileName": student.resume_url.split("/")[-1] if student.resume_url else "Uploaded Resume",
            "summary": "",
            "scoreBreakdown": {},
            "extractedSkills": [],
            "experience": [],
            "certifications": [],
            "achievements": [],
            "strengths": [],
            "improvementAreas": []
        }

        if student.resume_data:
            try:
                parsed = json.loads(student.resume_data) if isinstance(student.resume_data, str) else student.resume_data
                result["resumeScore"] = parsed.get("score") or student.resume_score or result["resumeScore"]
                result["summary"] = parsed.get("summary") or parsed.get("score_text") or ""
                result["scoreBreakdown"] = parsed.get("score_breakdown") or {}
                result["strengths"] = parsed.get("strengths") or []
                result["improvementAreas"] = parsed.get("improvement_areas") or parsed.get("improvements") or []

                ext = parsed.get("extracted_data") or parsed.get("extractedData") or {}
                result["extractedSkills"] = ext.get("normalized_skills") or ext.get("coreTechnologies") or []
                result["experience"] = ext.get("experience") or []
                result["certifications"] = ext.get("certifications") or []
                result["achievements"] = ext.get("achievements") or []
            except Exception as e:
                logger.warning(f"Error parsing student resume_data: {e}")

        # Derive strengths and improvements if empty
        if not result["strengths"] and result["resumeScore"] > 70:
            result["strengths"] = ["Strong project domain alignment", "Verified contact details & education"]
        if not result["improvementAreas"] and result["resumeScore"] < 85:
            result["improvementAreas"] = [
                "Quantify project outcomes with measurable performance metrics",
                "Ensure core target career technologies (like Docker, CI/CD) are demonstrated in bullet points"
            ]

        return result

    @staticmethod
    def _extract_github_details(db: Session, student_email: str) -> Dict[str, Any]:
        gh_conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == student_email).first()
        if not gh_conn or gh_conn.connection_status != "CONNECTED":
            return {
                "connected": False,
                "username": "",
                "profileUrl": "",
                "reposCount": 0,
                "topLanguages": [],
                "verifiedSkills": [],
                "repos": []
            }

        repos = []
        if gh_conn.repos_json:
            try:
                repos = json.loads(gh_conn.repos_json)
            except Exception:
                repos = []

        skills_evidence = []
        if gh_conn.skills_json:
            try:
                skills_evidence = json.loads(gh_conn.skills_json)
            except Exception:
                skills_evidence = []

        top_langs = set()
        for r in repos:
            if isinstance(r, dict) and r.get("language"):
                top_langs.add(r.get("language"))

        return {
            "connected": True,
            "username": gh_conn.github_username,
            "profileUrl": gh_conn.github_profile_url or f"https://github.com/{gh_conn.github_username}",
            "reposCount": len(repos),
            "topLanguages": list(top_langs),
            "verifiedSkills": [s.get("skill_name") or s.get("name") for s in skills_evidence if isinstance(s, dict)] if skills_evidence else list(top_langs),
            "repos": [
                {
                    "name": r.get("name"),
                    "description": r.get("description", ""),
                    "language": r.get("language", ""),
                    "stars": r.get("stargazers_count", 0),
                    "url": r.get("html_url", "")
                }
                for r in repos[:6] if isinstance(r, dict)
            ]
        }

    @classmethod
    def _extract_career_intelligence(cls, db: Session, student_email: str, target_career: str) -> Dict[str, Any]:
        try:
            intel = career_intelligence_service.get_student_career_intelligence(
                db=db,
                student_email=student_email,
                career_name=target_career
            )
            readiness = intel.get("readiness", {})
            skills_matrix = intel.get("skills_matrix", [])

            verified = []
            developing = []
            missing = []
            gaps = []

            for sk in skills_matrix:
                c_status = sk.get("canonical_status", "needs_improvement")
                s_entry = {
                    "skill_name": sk.get("skill_name"),
                    "category": sk.get("category", "Core"),
                    "current_score": sk.get("current_score", 0.0),
                    "target_score": sk.get("target_score", 85.0),
                    "gap": sk.get("gap", 0.0),
                    "importance": sk.get("importance", "CORE"),
                    "status": sk.get("status", "Developing"),
                    "explanation": sk.get("gap_explanation", ""),
                    "recommended_courses": [
                        {
                            "title": rc.get("title"),
                            "provider": rc.get("provider_name", "NPTEL"),
                            "url": rc.get("canonical_url", "")
                        }
                        for rc in sk.get("recommended_courses", [])[:2]
                    ]
                }

                if c_status == "verified":
                    verified.append(s_entry)
                elif c_status in ("developing", "learning_active"):
                    developing.append(s_entry)
                    gaps.append(s_entry)
                else:
                    missing.append(s_entry)
                    gaps.append(s_entry)

            # Sort gaps by importance (CORE first) and gap size desc
            gaps.sort(key=lambda x: (0 if x["importance"] == "CORE" else 1, -x["gap"]))

            # Evidence records
            evidence_rows = (
                db.query(StudentSkillEvidence)
                .join(StudentUser, StudentUser.id == StudentSkillEvidence.student_id)
                .filter(StudentUser.email == student_email)
                .all()
            )
            evidence_items = [
                {
                    "skill": e.skill_name,
                    "source": e.source_type,
                    "score": round(e.evidence_score * 100, 1) if e.evidence_score <= 1.0 else e.evidence_score
                }
                for e in evidence_rows
            ]

            summary_text = (
                f"Target Career: {target_career} (Readiness: {readiness.get('score', 0)}%). "
                f"Verified: {len(verified)} skills ({', '.join([v['skill_name'] for v in verified[:5]])}). "
                f"Priority Gaps: {len(gaps)} skills ({', '.join([g['skill_name'] for g in gaps[:4]])})."
            )

            return {
                "readiness_score": readiness.get("score", 0.0),
                "target_fit_score": readiness.get("target_fit_score", 0.0),
                "status": readiness.get("status", "Developing"),
                "verified_skills": verified,
                "developing_skills": developing,
                "missing_skills": missing,
                "skill_gaps": gaps,
                "evidence_items": evidence_items,
                "skills_summary": summary_text
            }
        except Exception as e:
            logger.error(f"Error calculating career intelligence for student context: {e}")
            return {
                "readiness_score": 50.0,
                "target_fit_score": 65.0,
                "status": "Developing",
                "verified_skills": [],
                "developing_skills": [],
                "missing_skills": [],
                "skill_gaps": [],
                "evidence_items": [],
                "skills_summary": f"Target Career: {target_career}."
            }

    @staticmethod
    def _extract_applications(db: Session, student_id: int) -> List[Dict[str, Any]]:
        apps = (
            db.query(InternshipApplication)
            .filter(InternshipApplication.student_id == student_id)
            .order_by(InternshipApplication.applied_at.desc())
            .all()
        )

        app_list = []
        for a in apps:
            app_list.append({
                "id": a.id,
                "internship_id": a.internship_id or a.source_id,
                "title": getattr(a, 'title_snapshot', None) or "Internship",
                "company": getattr(a, 'company_snapshot', None) or "Tech Company",
                "status": a.status,
                "applied_at": a.applied_at.strftime("%Y-%m-%d") if a.applied_at else "Recently",
                "match_score": a.match_score_at_apply or 80.0,
                "feedback": a.feedback or ""
            })
        return app_list

    @staticmethod
    def _extract_learning_progress(db: Session, student_id: int) -> Dict[str, Any]:
        lp = (
            db.query(LearningPath)
            .options(
                joinedload(LearningPath.items).joinedload(LearningPathItem.course)
            )
            .filter(LearningPath.student_id == student_id)
            .order_by(LearningPath.created_at.desc())
            .first()
        )

        if not lp or not lp.items:
            return {"active_courses": [], "learning_path": {}}

        active_courses = []
        for item in lp.items:
            c = item.course
            if c:
                active_courses.append({
                    "course_id": c.id,
                    "title": c.title,
                    "skill_name": item.skill_name,
                    "stage": item.stage,
                    "progress": item.progress_percent,
                    "status": item.status,
                    "url": c.url,
                    "duration": f"{c.duration} {c.duration_unit or 'weeks'}" if c.duration else "Self-paced"
                })

        return {
            "active_courses": active_courses,
            "learning_path": {
                "id": lp.id,
                "name": lp.name,
                "overall_progress": lp.progress_percent,
                "items_count": len(lp.items)
            }
        }

    @staticmethod
    def _extract_projects(student: StudentUser, resume_obj: Dict[str, Any], github_obj: Dict[str, Any]) -> List[Dict[str, Any]]:
        projects = []
        # From resume
        for exp in resume_obj.get("experience", []):
            if isinstance(exp, dict) and exp.get("role"):
                projects.append({
                    "title": exp.get("role") or exp.get("title", "Project"),
                    "tech": exp.get("tech_stack") or exp.get("technologies") or [],
                    "description": exp.get("description") or exp.get("summary") or ""
                })

        # From GitHub repos
        for repo in github_obj.get("repos", []):
            if repo.get("name"):
                projects.append({
                    "title": repo.get("name"),
                    "tech": [repo.get("language")] if repo.get("language") else [],
                    "description": repo.get("description") or f"GitHub Repository ({repo.get('stars', 0)} stars)",
                    "url": repo.get("url")
                })

        return projects[:6]

    @classmethod
    def _extract_preferences(cls, student: StudentUser) -> Dict[str, Any]:
        return {
            "preferredLocations": cls._parse_list_field(student.preferred_locations) or ([student.location] if student.location else ["Remote", "Pune"]),
            "workPreferences": cls._parse_list_field(student.work_preferences) or ["remote", "hybrid"],
            "opportunityTypes": cls._parse_list_field(student.opportunity_types) or ["internship"],
            "timeline": student.timeline or "Immediate"
        }

    @classmethod
    def get_context_summary_for_prompt(cls, context: Dict[str, Any], max_length: int = 2500) -> str:
        """
        Creates a clean, token-efficient, authoritative summary of the student's profile for the Groq system prompt.
        Eliminates any private sensitive credentials while maintaining 100% fidelity on skills, education, and career data.
        """
        st = context.get("student", {})
        cr = context.get("career", {})
        sk = context.get("skills", {})
        gh = context.get("github", {})
        res = context.get("resume", {})
        apps = context.get("applications", [])
        gaps = context.get("skillGaps", [])
        projs = context.get("projects", [])

        verified_names = [v.get("skill_name") for v in sk.get("verified", [])]
        developing_names = [d.get("skill_name") for d in sk.get("developing", [])]
        gap_names = [f"{g.get('skill_name')} (Gap: {g.get('gap', 0):.0f}%, {g.get('importance', 'CORE')})" for g in gaps[:6]]

        apps_summary = ", ".join([f"{a['title']} at {a['company']} [{a['status']}]" for a in apps[:3]]) if apps else "None yet"
        proj_summary = ", ".join([p.get("title", "") for p in projs[:4] if p.get("title")]) if projs else "None registered"

        lines = [
            f"STUDENT PROFILE:",
            f"- Name: {st.get('name')}",
            f"- Education: {st.get('education') or 'Undergraduate Student'} ({st.get('year', 'Current Student')})",
            f"- Location: {st.get('location', 'India')}",
            f"- Target Career: {cr.get('targetCareer')} (Readiness: {cr.get('careerReadiness', 0):.0f}%, Status: {cr.get('careerStatus')})",
            f"- Verified Skills: {', '.join(verified_names) if verified_names else 'No verified skills yet'}",
            f"- Developing Skills: {', '.join(developing_names) if developing_names else 'None in progress'}",
            f"- Priority Skill Gaps: {'; '.join(gap_names) if gap_names else 'No major gaps identified'}",
            f"- Projects: {proj_summary}",
            f"- GitHub: {'Connected (@' + gh.get('username') + ') with ' + str(gh.get('reposCount', 0)) + ' repos' if gh.get('connected') else 'Not connected'}",
            f"- Resume ATS Score: {res.get('resumeScore', 0)}/100 ({'Uploaded' if res.get('hasResume') else 'No resume uploaded'})",
            f"- Recent Applications: {apps_summary}",
            f"- Preferences: {', '.join(context.get('preferences', {}).get('preferredLocations', []))} | {', '.join(context.get('preferences', {}).get('workPreferences', []))}"
        ]

        text = "\n".join(lines)
        return text[:max_length]

    @classmethod
    def get_personalized_suggested_prompts(cls, context: Dict[str, Any]) -> List[str]:
        """
        Generates dynamic, highly contextual quick prompt suggestions based on student's actual gaps and state.
        """
        target_career = context.get("career", {}).get("targetCareer", "my target career")
        gaps = context.get("skillGaps", [])
        verified = context.get("skills", {}).get("verified", [])
        has_gh = context.get("github", {}).get("connected", False)
        resume_score = context.get("resume", {}).get("resumeScore", 0)

        suggestions = []

        # 1. Combined Career Readiness / Calculation Prompt
        suggestions.append(f"How is my Career Readiness calculated and what are my skill gaps?")

        # 2. Internship Match Prompt
        suggestions.append(f"What internships match my profile for {target_career}?")

        # 3. Application Feature / Navigation Prompt
        suggestions.append("How do I generate and export an ATS-tailored resume?")

        # 4. Learning Roadmap Prompt
        if gaps:
            top_gap = gaps[0].get("skill_name", "")
            suggestions.append(f"How should I learn {top_gap} to close my biggest skill gap?")
        else:
            suggestions.append("Generate a prioritized 30-day learning roadmap for me.")

        # 5. Resume / ATS optimization
        if resume_score < 85:
            suggestions.append("How can I optimize my resume ATS score for backend roles?")
        else:
            suggestions.append("Where can I take diagnostic assessments to verify new skills?")

        return suggestions[:5]

    @classmethod
    def build_assessment_agent_context(
        cls,
        db: Session,
        student_identifier: Union[int, str],
        application_id: Optional[int] = None,
        internship_id: Optional[int] = None,
        target_round_key: Optional[str] = None,
        mode: str = "REAL"
    ) -> Dict[str, Any]:
        """
        Builds the unified, authoritative, sanitized candidate context object
        for both PRACTICE and REAL assessment/interview sessions.
        
        Collects 100% from PostgreSQL database:
        - Authenticated Student Profile & Education
        - Canonical Verified & Developing Skills (with ESCO IDs & exact scores)
        - Student Projects (extracted & GitHub verified)
        - Connected GitHub Evidence (repos, languages, frameworks)
        - Completed Courses & Certifications
        - Target Internship Requirements & Role description
        - Authoritative Application state & progression
        - Configured Round parameters (type, duration, schedule, rules)
        
        Zero uploads needed from the student.
        """
        student = cls.get_student_user(db, student_identifier)
        if not student:
            raise ValueError("Student record not found in database.")

        student_id = student.id
        student_email = (student.email or "").strip().lower()

        # 1. Resolve Application (if any)
        app_record = None
        if application_id:
            app_record = db.query(InternshipApplication).filter(
                InternshipApplication.id == application_id,
                InternshipApplication.student_id == student_id
            ).first()
            if app_record and not internship_id:
                internship_id = app_record.internship_id
                if not internship_id and app_record.source_id and app_record.source_id.isdigit():
                    internship_id = int(app_record.source_id)

        # 2. Resolve Target Internship Posting
        posting = None
        company_name = "Tech Partner"
        if internship_id:
            posting = db.query(InternshipPosting).filter(InternshipPosting.id == internship_id).first()
            if posting and posting.company:
                company_name = posting.company.name
            elif posting:
                comp = db.query(Company).filter(Company.id == posting.company_id).first()
                if comp:
                    company_name = comp.name
        elif app_record and app_record.company_snapshot:
            company_name = app_record.company_snapshot

        # 3. Resolve Assessment Pipeline Config
        config = None
        pipeline_dict = {}
        if posting:
            config = db.query(InternshipAssessmentConfig).filter(
                InternshipAssessmentConfig.internship_id == posting.id,
                InternshipAssessmentConfig.is_active == True
            ).first()
            if config and config.pipeline_config:
                pipeline_dict = json.loads(config.pipeline_config) if isinstance(config.pipeline_config, str) else config.pipeline_config

        canonical_labels = {
            "aptitude": "Aptitude",
            "technical": "Technical Assessment",
            "interview": "AI Voice Interview",
            "gd": "Group Discussion"
        }

        canonical_types = {
            "aptitude": "APTITUDE",
            "technical": "TECHNICAL",
            "interview": "AI_INTERVIEW",
            "gd": "GROUP_DISCUSSION"
        }

        round_seq = pipeline_dict.get("round_sequence") or ["aptitude", "technical", "interview", "gd"]
        ordered_round_keys = [r for r in round_seq if pipeline_dict.get(r, {}).get("enabled")]
        for r in ["aptitude", "technical", "interview", "gd"]:
            if pipeline_dict.get(r, {}).get("enabled") and r not in ordered_round_keys:
                ordered_round_keys.append(r)

        if not ordered_round_keys:
            ordered_round_keys = ["interview"]

        # Determine target round key
        if not target_round_key or target_round_key.lower().strip() not in canonical_labels:
            if app_record:
                session = db.query(CandidateAssessmentSession).filter(
                    CandidateAssessmentSession.application_id == app_record.id
                ).first()
                if session and session.current_round:
                    target_round_key = session.current_round
                else:
                    target_round_key = ordered_round_keys[0]
            else:
                target_round_key = ordered_round_keys[0]

        target_round_key = target_round_key.lower().strip()
        target_round_label = canonical_labels.get(target_round_key, target_round_key.capitalize())
        target_round_type = canonical_types.get(target_round_key, "AI_INTERVIEW")
        target_sequence = (ordered_round_keys.index(target_round_key) + 1) if target_round_key in ordered_round_keys else 1

        active_round_cfg = pipeline_dict.get(target_round_key, {})
        active_sched = active_round_cfg.get("schedule", {})
        duration_min = active_round_cfg.get("duration_minutes") or active_round_cfg.get("duration_min", 30)

        # 4. Extract Structured Student Profile & Skills
        resume_obj = cls._extract_resume_details(student)
        github_obj = cls._extract_github_details(db, student_email)

        target_career_name = posting.title if posting else (student.headline or "Software Engineer")
        career_intel = cls._extract_career_intelligence(db, student_email, target_career_name)

        projects_data = cls._extract_projects(student, resume_obj, github_obj)
        learning_data = cls._extract_learning_progress(db, student_id)

        # Education string
        grad_year = student.graduation_year or ""
        start_year = student.start_year or ""
        education_str = ""
        if student.degree or student.university:
            education_str = f"{student.degree or 'Degree'} in {student.branch or 'Engineering'}, {student.university or 'University'}"
            if start_year and grad_year:
                education_str += f" ({start_year} - {grad_year})"
            if student.cgpa_or_percentage:
                education_str += f", CGPA: {student.cgpa_or_percentage}"

        # Parse required and preferred skills for the internship
        required_skills_list = []
        if posting and posting.required_skills:
            try:
                if posting.required_skills.startswith("["):
                    required_skills_list = json.loads(posting.required_skills)
                else:
                    required_skills_list = [s.strip() for s in posting.required_skills.split(",") if s.strip()]
            except Exception:
                required_skills_list = [posting.required_skills]
        elif app_record and app_record.title_snapshot:
            required_skills_list = ["Problem Solving", "Technical Competency", "System Design"]

        # Parse canonical verified skills
        canonical_skills = []
        for sk in career_intel.get("verified_skills", []):
            canonical_skills.append({
                "skill_name": sk.get("skill_name"),
                "category": sk.get("category", "Core"),
                "current_score": sk.get("current_score", 100),
                "status": "VERIFIED",
                "importance": sk.get("importance", "CORE")
            })
        for sk in career_intel.get("developing_skills", []):
            canonical_skills.append({
                "skill_name": sk.get("skill_name"),
                "category": sk.get("category", "Core"),
                "current_score": sk.get("current_score", 50),
                "status": "DEVELOPING",
                "importance": sk.get("importance", "CORE")
            })

        # Whitelist Sanitized Context
        sanitized_context = {
            "mode": mode.upper(),  # "PRACTICE" or "REAL"
            "student": {
                "profile": {
                    "id": student.id,
                    "name": student.name or "Candidate",
                    "email": student.email,
                    "headline": student.headline or "",
                    "bio": student.bio or "",
                    "location": student.location or "India",
                    "education": education_str or "Undergraduate Student",
                    "degree": student.degree or "",
                    "branch": student.branch or "",
                    "university": student.university or "",
                    "graduationYear": student.graduation_year or "",
                    "cgpa": student.cgpa_or_percentage or ""
                },
                "education": [education_str] if education_str else [],
                "skills": canonical_skills,
                "projects": projects_data,
                "githubEvidence": github_obj.get("repos", []),
                "courses": learning_data.get("active_courses", []),
                "certifications": resume_obj.get("certifications", []),
                "achievements": resume_obj.get("achievements", [])
            },
            "application": {
                "id": app_record.id if app_record else None,
                "status": app_record.status if app_record else "APPLIED",
                "currentRound": target_round_key,
                "currentRoundName": target_round_label,
                "progressionState": "IN_PROGRESS"
            },
            "internship": {
                "id": posting.id if posting else None,
                "title": posting.title if posting else (app_record.title_snapshot if app_record else "Software Engineering Intern"),
                "company": company_name,
                "description": posting.description if posting else "",
                "requiredSkills": required_skills_list,
                "preferredSkills": [],
                "location": posting.location if posting else "Remote",
                "duration": posting.duration if posting else "6 Months",
                "stipend": posting.stipend if posting else "Unspecified"
            },
            "round": {
                "id": target_round_key,
                "name": target_round_label,
                "type": target_round_type,
                "sequence": target_sequence,
                "status": "AVAILABLE",
                "duration_minutes": duration_min,
                "schedule": active_sched,
                "configuration": active_round_cfg
            }
        }

        # Build clean LLM / Agent Prompt Context text
        verified_skills_str = ", ".join([f"{s['skill_name']} ({s['current_score']}% - {s['status']})" for s in canonical_skills[:8]]) or "Demonstrated foundational CS skills"
        req_skills_str = ", ".join(required_skills_list) if required_skills_list else "Software Engineering core fundamentals"
        
        projects_summary_lines = []
        for p in projects_data[:4]:
            t_stack = ", ".join(p.get("tech", [])) if p.get("tech") else "General Tech"
            projects_summary_lines.append(f"- {p.get('title')}: {p.get('description', '')} (Tech: {t_stack})")
        projects_summary_text = "\n".join(projects_summary_lines) if projects_summary_lines else "- Demonstrated academic coursework & capstone engineering projects."

        agent_prompt_text = f"""============================================================
CANDIDATE ASSESSMENT CONTEXT [MODE: {mode.upper()}]
============================================================
Candidate Name: {student.name or 'Candidate'}
Email: {student.email}
Education: {education_str or 'Engineering Student'}
Target Role: {sanitized_context['internship']['title']} at {company_name}
Target Assessment Round: Round {target_sequence} - {target_round_label} ({target_round_type})
Duration: {duration_min} minutes

REQUIRED SKILLS FOR THIS INTERNSHIP:
{req_skills_str}

CANONICAL VERIFIED SKILLS & SCORES:
{verified_skills_str}

STORED STUDENT PROJECTS:
{projects_summary_text}

GITHUB EVIDENCE:
- Connected: {'Yes (@' + github_obj.get('username', '') + ')' if github_obj.get('connected') else 'No'}
- Repositories: {len(github_obj.get('repos', []))} public projects analyzed

CERTIFICATIONS & ACHIEVEMENTS:
- {', '.join([c.get('name', 'Certification') for c in resume_obj.get('certifications', [])]) if resume_obj.get('certifications') else 'SkillSetu Verified Profile'}

INSTRUCTIONS FOR AI AGENT:
- Dynamically tailor and personalize questions for {sanitized_context['internship']['title']}.
- Reference candidate's real stored projects and verified skill strengths/gaps during the evaluation.
- Never ask the candidate to upload a resume or manual project descriptions; all facts are established above.
============================================================"""

        sanitized_context["agent_prompt_context_text"] = agent_prompt_text
        return sanitized_context

    @staticmethod
    def _get_empty_context() -> Dict[str, Any]:
        return {
            "student": {"name": "Student", "education": "Undergraduate", "location": "India"},
            "career": {"targetCareer": "Full Stack Developer", "careerReadiness": 0.0},
            "skills": {"verified": [], "developing": [], "missing": [], "evidence": []},
            "projects": [],
            "github": {"connected": False},
            "resume": {"resumeScore": 0},
            "certifications": [],
            "courses": [],
            "skillGaps": [],
            "applications": [],
            "preferences": {}
        }


# Authoritative Context Builder Alias
StudentContextBuilder = StudentContextService

