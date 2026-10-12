import json
import logging
from typing import Dict, Any, List, Optional, Callable
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app import models
from app.services.student_context_service import StudentContextService
from app.services import (
    esco_service,
    career_intelligence_service,
    resume_service,
    course_recommendation_service,
    learning_path_service
)

logger = logging.getLogger("mentor_tools")
logger.setLevel(logging.INFO)


# ==========================================
# TOOL SCHEMAS FOR GROQ FUNCTION CALLING
# ==========================================
MENTOR_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_student_profile",
            "description": "Retrieves the authenticated student's academic background, degree, branch, university, graduation year, CGPA, and personal headline.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_student_skills",
            "description": "Retrieves the student's verified skills, developing skills, skill evidence sources (from GitHub, projects, resume), and proficiency levels.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_student_projects",
            "description": "Retrieves the student's verified projects from resume and connected GitHub repositories, including tech stacks and descriptions.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_student_github_analysis",
            "description": "Retrieves analysis of the student's connected GitHub account: top programming languages, repositories, and evidence of applied technical skills.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_student_resume",
            "description": "Retrieves the student's resume ATS score, structured parsed sections, detected strengths, and specific resume improvement areas.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_student_skill_gaps",
            "description": "Performs deterministic skill gap analysis comparing the student's verified skills against target career or role requirements. Returns prioritized missing skills.",
            "parameters": {
                "type": "object",
                "properties": {
                    "career_name": {
                        "type": "string",
                        "description": "Optional target career name (e.g. 'Backend Developer', 'Full Stack Developer', 'Data Scientist'). Defaults to student's active target career."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_student_applications",
            "description": "Retrieves the student's current internship application history, review statuses, and recruiter feedback.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_career_readiness",
            "description": "Calculates the student's deterministic career readiness score (0-100%) for a target career based on verified skills, gaps, and evidence.",
            "parameters": {
                "type": "object",
                "properties": {
                    "career_name": {
                        "type": "string",
                        "description": "Target career name (e.g. 'Backend Developer', 'Full Stack Developer')."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_internships",
            "description": "Searches real, available tech internships in SkillSetu matching keyword query, career track, location, or work preference.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search keyword (e.g. 'backend', 'python', 'react', 'fastapi')."
                    },
                    "career_name": {
                        "type": "string",
                        "description": "Filter by career track (e.g. 'Backend Developer', 'Frontend Developer')."
                    },
                    "location": {
                        "type": "string",
                        "description": "Filter by location (e.g. 'Pune', 'Remote', 'Bengaluru')."
                    },
                    "work_preference": {
                        "type": "string",
                        "description": "Filter by work type ('remote', 'hybrid', 'on-site')."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recommended_internships",
            "description": "Retrieves personalized recommended internships for the authenticated student, with explainable match percentages and breakdown of matched vs missing skills.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of recommended internships to return (default: 5)."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_internship_match",
            "description": "Calculates deterministic, explainable match breakdown between the authenticated student and a specific internship listing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "internship_id": {
                        "type": "integer",
                        "description": "ID of the internship listing to evaluate."
                    }
                },
                "required": ["internship_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_courses",
            "description": "Searches curated courses and learning modules (from NPTEL, SWAYAM, freeCodeCamp, etc.) to learn new skills or close skill gaps.",
            "parameters": {
                "type": "object",
                "properties": {
                    "skill_name": {
                        "type": "string",
                        "description": "Skill name to find courses for (e.g. 'Docker', 'Redis', 'PostgreSQL', 'FastAPI')."
                    },
                    "query": {
                        "type": "string",
                        "description": "General search keyword."
                    },
                    "level": {
                        "type": "string",
                        "description": "Course level ('Beginner', 'Intermediate', 'Advanced')."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_courses_for_skill_gap",
            "description": "Finds targeted courses from the course catalog specifically tailored to close the student's highest priority skill gap.",
            "parameters": {
                "type": "object",
                "properties": {
                    "skill_name": {
                        "type": "string",
                        "description": "The gap skill name to resolve (e.g. 'Docker', 'Redis', 'Kubernetes')."
                    }
                },
                "required": ["skill_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_learning_roadmap",
            "description": "Generates a multi-stage personalized learning roadmap (Foundation, Intermediate, Advanced) to master the student's target career.",
            "parameters": {
                "type": "object",
                "properties": {
                    "career_name": {
                        "type": "string",
                        "description": "Target career name (defaults to student's active career goal)."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_resume_improvement_suggestions",
            "description": "Generates concrete, actionable ATS optimization tips and missing keywords tailored to the student's target role.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_career": {
                        "type": "string",
                        "description": "Role to optimize resume for (e.g. 'Backend Developer')."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_interview_plan",
            "description": "Generates a customized technical interview preparation plan and diagnostic questions based on the student's verified and gap skills.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_role": {
                        "type": "string",
                        "description": "Target role for interview prep (e.g. 'Junior Backend Engineer')."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_app_feature_info",
            "description": "Retrieves authoritative knowledge about any SkillSetu application feature, tab, screen, button, metric, score calculation formula, workflow, or navigation location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The feature, tab, screen, metric, score, button, or workflow to look up (e.g. 'Skill Gaps', 'Career Readiness calculation', 'How to connect GitHub', 'Resume ATS score', 'Internships tab', 'Interview prep', 'Sarvam OCR marksheet')."
                    }
                },
                "required": ["query"]
            }
        }
    }
]


# ==========================================
# TOOL IMPLEMENTATION HANDLERS
# ==========================================
class MentorToolRegistry:
    """
    Executes authorized SkillSetu tools on behalf of the authenticated student.
    Enforces student isolation and ensures the LLM receives authoritative data.
    """

    @classmethod
    def execute_tool(
        cls,
        tool_name: str,
        arguments: Dict[str, Any],
        student_id: int,
        student_context: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Main execution router for tool calls.
        """
        logger.info(f"Executing mentor tool '{tool_name}' for student_id={student_id} with args={arguments}")

        try:
            handler = getattr(cls, f"_tool_{tool_name}", None)
            if not handler:
                return {
                    "error": f"Tool '{tool_name}' is not recognized or not authorized.",
                    "status": "unsupported"
                }

            return handler(
                args=arguments,
                student_id=student_id,
                context=student_context,
                db=db
            )
        except Exception as e:
            logger.error(f"Error executing tool '{tool_name}': {e}", exc_info=True)
            return {
                "error": f"Failed to execute {tool_name}: {str(e)}",
                "status": "error"
            }

    # -------------------------------------------------------------
    # Tool: get_student_profile
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_student_profile(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        st = context.get("student", {})
        return {
            "student_id": st.get("id", student_id),
            "name": st.get("name"),
            "email": st.get("email"),
            "headline": st.get("headline"),
            "location": st.get("location"),
            "education": {
                "degree": st.get("degree"),
                "branch": st.get("branch"),
                "university": st.get("university"),
                "graduation_year": st.get("graduationYear"),
                "cgpa": st.get("cgpa"),
                "academic_year": st.get("year"),
                "summary": st.get("education")
            },
            "experience": st.get("experience"),
            "bio": st.get("bio")
        }

    # -------------------------------------------------------------
    # Tool: get_student_skills
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_student_skills(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        sk = context.get("skills", {})
        return {
            "verified_skills": sk.get("verified", []),
            "developing_skills": sk.get("developing", []),
            "evidence": sk.get("evidence", []),
            "skills_summary": sk.get("summary", "")
        }

    # -------------------------------------------------------------
    # Tool: get_student_projects
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_student_projects(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        return {
            "projects": context.get("projects", []),
            "total_projects": len(context.get("projects", []))
        }

    # -------------------------------------------------------------
    # Tool: get_student_github_analysis
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_student_github_analysis(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        return context.get("github", {"connected": False})

    # -------------------------------------------------------------
    # Tool: get_student_resume
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_student_resume(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        res = context.get("resume", {})
        return {
            "has_resume": res.get("hasResume", False),
            "ats_score": res.get("resumeScore", 0),
            "summary": res.get("summary", ""),
            "score_breakdown": res.get("scoreBreakdown", {}),
            "extracted_skills": res.get("extractedSkills", []),
            "strengths": res.get("strengths", []),
            "improvement_areas": res.get("improvementAreas", [])
        }

    # -------------------------------------------------------------
    # Tool: get_student_skill_gaps
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_student_skill_gaps(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        career = args.get("career_name") or context.get("career", {}).get("targetCareer", "Full Stack Developer")
        resolved_career = esco_service.resolve_career_name(career, db)
        
        intel = career_intelligence_service.get_student_career_intelligence(
            db=db,
            student_email=context.get("student", {}).get("email", ""),
            career_name=resolved_career
        )

        matrix = intel.get("skills_matrix", [])
        gaps = [s for s in matrix if s.get("canonical_status") != "verified"]
        verified = [s for s in matrix if s.get("canonical_status") == "verified"]

        return {
            "target_career": resolved_career,
            "readiness_score": intel.get("readiness", {}).get("score", 0),
            "verified_skills": [v.get("skill_name") for v in verified],
            "skill_gaps": [
                {
                    "skill_name": g.get("skill_name"),
                    "current_score": g.get("current_score"),
                    "target_score": g.get("target_score"),
                    "gap": g.get("gap"),
                    "importance": g.get("importance", "CORE"),
                    "status": g.get("status"),
                    "explanation": g.get("gap_explanation")
                }
                for g in gaps
            ]
        }

    # -------------------------------------------------------------
    # Tool: get_student_applications
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_student_applications(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        return {
            "applications": context.get("applications", []),
            "total_applications": len(context.get("applications", []))
        }

    # -------------------------------------------------------------
    # Tool: analyze_career_readiness
    # -------------------------------------------------------------
    @classmethod
    def _tool_analyze_career_readiness(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        career = args.get("career_name") or context.get("career", {}).get("targetCareer", "Full Stack Developer")
        resolved_career = esco_service.resolve_career_name(career, db)

        intel = career_intelligence_service.get_student_career_intelligence(
            db=db,
            student_email=context.get("student", {}).get("email", ""),
            career_name=resolved_career
        )

        readiness = intel.get("readiness", {})
        return {
            "target_career": resolved_career,
            "readiness_score": readiness.get("score", 0.0),
            "target_fit_score": readiness.get("target_fit_score", 0.0),
            "status": readiness.get("status", "Developing"),
            "verified_skills_count": readiness.get("verified_count", 0),
            "gap_skills_count": readiness.get("gap_count", 0),
            "total_skills_count": readiness.get("total_skills", 0)
        }

    # -------------------------------------------------------------
    # Tool: search_internships
    # -------------------------------------------------------------
    @classmethod
    def _tool_search_internships(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        query = (args.get("query") or "").lower().strip()
        career_filter = (args.get("career_name") or "").lower().strip()
        location_filter = (args.get("location") or "").lower().strip()
        work_pref_filter = (args.get("work_preference") or "").lower().strip()

        from app.services.live_opportunities.live_engine import LiveOpportunityEngine
        live_listings = LiveOpportunityEngine.get_live_internships()

        filtered = []
        for l in live_listings:
            t = str(l.get("title", "")).lower()
            c = str(l.get("company_name", l.get("company", ""))).lower()
            d = str(l.get("description", "")).lower()
            loc = str(l.get("location", "")).lower()
            wp = str(l.get("work_preference", "")).lower()

            if query and (query not in t and query not in c and query not in d):
                continue
            if career_filter and (career_filter not in t and career_filter not in d):
                continue
            if location_filter and location_filter != "remote" and location_filter not in loc:
                continue
            if work_pref_filter and work_pref_filter not in wp:
                continue

            filtered.append(l)

        return {
            "count": len(filtered[:8]),
            "internships": filtered[:8]
        }

    # -------------------------------------------------------------
    # Tool: calculate_internship_match
    # -------------------------------------------------------------
    @classmethod
    def _tool_calculate_internship_match(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        internship_id = str(args.get("internship_id", ""))
        if not internship_id:
            return {"error": "internship_id argument is required"}

        from app.services.live_opportunities.live_engine import LiveOpportunityEngine
        live_listings = LiveOpportunityEngine.get_live_internships()
        listing = next((l for l in live_listings if str(l.get("id")) == internship_id or str(l.get("source_id")) == internship_id), None)

        student = db.query(models.StudentUser).filter(models.StudentUser.id == student_id).first()
        if not student:
            return {"error": "Student not found"}

        from app.services.internship_matching_service import InternshipMatchingService
        if listing:
            return InternshipMatchingService.evaluate_student_internship_match(student, listing, db)

        return {"error": f"Internship with ID {internship_id} not found."}

    # -------------------------------------------------------------
    # Tool: get_recommended_internships
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_recommended_internships(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        limit = args.get("limit", 5)

        student = db.query(models.StudentUser).filter(models.StudentUser.id == student_id).first()
        if student:
            from app.services.internship_matching_service import InternshipMatchingService
            from app.services.live_opportunities.live_engine import LiveOpportunityEngine
            ranked = InternshipMatchingService.get_ranked_recommendations(student, db, limit=limit)
            all_live = LiveOpportunityEngine.get_live_internships()
            return {
                "recommended_internships": ranked,
                "total_available": len(all_live)
            }

        return {"recommended_internships": [], "total_available": 0}

    # -------------------------------------------------------------
    # Tool: search_courses & find_courses_for_skill_gap
    # -------------------------------------------------------------
    @classmethod
    def _tool_search_courses(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        skill_name = (args.get("skill_name") or "").lower().strip()
        query = (args.get("query") or "").lower().strip()
        level = args.get("level")

        db_query = db.query(models.Course).options(
            joinedload(models.Course.provider),
            joinedload(models.Course.skills)
        ).filter(models.Course.is_active == True)

        if skill_name:
            db_query = db_query.join(models.CourseSkill, models.CourseSkill.course_id == models.Course.id).filter(
                models.CourseSkill.skill_name.ilike(f"%{skill_name}%")
            )
        elif query:
            db_query = db_query.filter(
                or_(
                    models.Course.title.ilike(f"%{query}%"),
                    models.Course.description.ilike(f"%{query}%")
                )
            )

        if level:
            db_query = db_query.filter(models.Course.level.ilike(f"%{level}%"))

        courses = db_query.limit(6).all()

        results = []
        for c in courses:
            prov_name = c.provider.name if c.provider else "NPTEL"
            results.append({
                "id": c.id,
                "title": c.title,
                "provider": prov_name,
                "url": c.url,
                "level": c.level or "Intermediate",
                "duration": f"{c.duration} {c.duration_unit or 'weeks'}" if c.duration else "Self-paced",
                "certificate_available": c.certificate_available or False,
                "price": float(c.price or 0.0)
            })

        return {
            "count": len(results),
            "courses": results
        }

    @classmethod
    def _tool_find_courses_for_skill_gap(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        skill_name = (args.get("skill_name") or "").strip()
        if not skill_name:
            return {"error": "skill_name is required"}

        return cls._tool_search_courses(args={"skill_name": skill_name}, student_id=student_id, context=context, db=db)

    # -------------------------------------------------------------
    # Tool: generate_learning_roadmap
    # -------------------------------------------------------------
    @classmethod
    def _tool_generate_learning_roadmap(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        career = args.get("career_name") or context.get("career", {}).get("targetCareer", "Full Stack Developer")
        resolved_career = esco_service.resolve_career_name(career, db)

        intel = career_intelligence_service.get_student_career_intelligence(
            db=db,
            student_email=context.get("student", {}).get("email", ""),
            career_name=resolved_career
        )

        milestones = intel.get("roadmap_milestones", [])
        next_steps = intel.get("curated_next_steps", [])

        return {
            "career_name": resolved_career,
            "readiness_score": intel.get("readiness", {}).get("score", 0),
            "stages": [
                {
                    "stage": m.get("stage"),
                    "title": m.get("title"),
                    "description": m.get("description"),
                    "status": m.get("status"),
                    "progress": m.get("progress"),
                    "skills_addressed": [s.get("skill_name") for s in m.get("skills", [])]
                }
                for m in milestones
            ],
            "immediate_next_steps": next_steps
        }

    # -------------------------------------------------------------
    # Tool: get_resume_improvement_suggestions
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_resume_improvement_suggestions(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        res = context.get("resume", {})
        target_role = args.get("target_career") or context.get("career", {}).get("targetCareer", "Software Engineer")

        gaps = context.get("skillGaps", [])
        gap_keywords = [g.get("skill_name") for g in gaps[:4]]

        suggestions = list(res.get("improvementAreas", []))
        if gap_keywords:
            suggestions.append(f"Add projects demonstrating: {', '.join(gap_keywords)} to pass ATS keyword filters for {target_role}.")

        suggestions.append("Structure bullet points using Action Verb + Task + Quantifiable Impact (e.g. 'Optimized REST API query latency by 40% with PostgreSQL indexing').")

        return {
            "current_ats_score": res.get("resumeScore", 0),
            "target_role": target_role,
            "recommended_keywords_to_add": gap_keywords,
            "actionable_suggestions": suggestions,
            "strengths_to_keep": res.get("strengths", [])
        }

    # -------------------------------------------------------------
    # Tool: generate_interview_plan
    # -------------------------------------------------------------
    @classmethod
    def _tool_generate_interview_plan(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        target_role = args.get("target_role") or context.get("career", {}).get("targetCareer", "Full Stack Developer")
        verified_skills = [v.get("skill_name") for v in context.get("skills", {}).get("verified", [])]
        gaps = [g.get("skill_name") for g in context.get("skillGaps", [])]

        return {
            "target_role": target_role,
            "strengths_to_highlight": verified_skills[:4],
            "technical_areas_to_revise": gaps[:3],
            "suggested_interview_modules": [
                {
                    "round": "Round 1: Core Fundamentals & Coding",
                    "focus": f"Data Structures, Problem Solving, and {verified_skills[0] if verified_skills else 'Programming'}"
                },
                {
                    "round": "Round 2: Framework & Architecture",
                    "focus": f"REST APIs, Database Design, and State Management for {target_role}"
                },
                {
                    "round": "Round 3: System Design & Deployment",
                    "focus": f"Containerization ({gaps[0] if gaps else 'Docker'}), Caching, and Git Workflows"
                }
            ]
        }

    # -------------------------------------------------------------
    # Tool: get_app_feature_info
    # -------------------------------------------------------------
    @classmethod
    def _tool_get_app_feature_info(cls, args: Dict[str, Any], student_id: int, context: Dict[str, Any], db: Session) -> Dict[str, Any]:
        query = args.get("query", "")
        from app.services.app_knowledge_service import AppKnowledgeService
        return AppKnowledgeService.search_app_knowledge(query)
