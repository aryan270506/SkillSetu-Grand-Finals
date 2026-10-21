import re
import json
import logging
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.services.language import language_instruction
from app.config import settings
from app.services.student_context_service import StudentContextService
from app.services.mentor_tools import MENTOR_TOOL_DEFINITIONS, MentorToolRegistry
from app.services.app_knowledge_service import AppKnowledgeService

logger = logging.getLogger("groq_mentor_service")
logger.setLevel(logging.INFO)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqMentorService:
    """
    Reasoning and Tool-Execution Orchestrator for Personal AI Career Mentor.
    Uses Groq LLM API with authorized SkillSetu tools, Google Gemini multi-turn failover,
    and dynamic student context.
    """

    @classmethod
    def generate_mentor_response(
        cls,
        user_message: str,
        student_id: int,
        conversation_history: List[Dict[str, Any]],
        db: Session,
        model: Optional[str] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Executes the personal career mentor conversation pipeline:
        1. Retrieves authoritative student context.
        2. Builds system instructions with student profile.
        3. Cleans history turns so latest message is not duplicated.
        4. Calls Groq with tool calling enabled.
        5. If Groq unavailable/rate-limited, falls back to Google Gemini.
        6. If LLMs unavailable, falls back to context-aware deterministic engine.
        7. Formulates structured rich UI response with actionable links.
        """
        t0 = time.time()
        # 1. Authoritative Student Context
        student_context = StudentContextService.get_student_context(db, student_id)
        profile_summary = StudentContextService.get_context_summary_for_prompt(student_context)

        target_model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"
        api_key = settings.GROQ_API_KEY
        gemini_api_key = settings.GEMINI_API_KEY

        # 2. Build System Prompt
        system_prompt = cls._build_system_prompt(profile_summary, student_context) + language_instruction(language)

        # 3. Build Conversation Messages Payload without duplication
        messages = [{"role": "system", "content": system_prompt}]

        history_to_process = list(conversation_history or [])
        # Strip trailing duplicate user turn if database already stored user_message before calling service
        if history_to_process and history_to_process[-1].get("sender", "").lower() in ("user", "human"):
            last_content = (history_to_process[-1].get("content") or history_to_process[-1].get("text") or "").strip()
            if last_content == user_message.strip():
                history_to_process = history_to_process[:-1]

        recent_history = history_to_process[-10:] if len(history_to_process) > 10 else history_to_process
        for msg in recent_history:
            sender = msg.get("sender", "").lower()
            content = (msg.get("content") or msg.get("text") or "").strip()
            if not content:
                continue

            if sender in ("user", "human"):
                messages.append({"role": "user", "content": content})
            elif sender in ("ai", "assistant", "mentor"):
                messages.append({"role": "assistant", "content": content})

        # Add current user prompt exactly once
        messages.append({"role": "user", "content": user_message.strip()})

        executed_tools_data: List[Dict[str, Any]] = []
        final_text = ""
        provider_used = None

        # 4. Try Groq (if configured)
        if api_key:
            try:
                max_tool_iterations = 4
                current_iteration = 0
                while current_iteration < max_tool_iterations:
                    current_iteration += 1
                    payload = {
                        "model": target_model,
                        "messages": messages,
                        "tools": MENTOR_TOOL_DEFINITIONS,
                        "tool_choice": "auto",
                        "temperature": 0.3,
                        "max_tokens": 1200
                    }
                    groq_resp = cls._call_groq_api(payload, api_key)
                    if not groq_resp or "choices" not in groq_resp or not groq_resp["choices"]:
                        break

                    choice = groq_resp["choices"][0]
                    assistant_msg = choice.get("message", {})
                    tool_calls = assistant_msg.get("tool_calls")

                    if not tool_calls:
                        final_text = assistant_msg.get("content", "")
                        provider_used = "groq"
                        break

                    messages.append(assistant_msg)
                    for tc in tool_calls:
                        t_id = tc.get("id", f"call_{len(executed_tools_data)}")
                        fn = tc.get("function", {})
                        fn_name = fn.get("name", "")
                        fn_args_str = fn.get("arguments", "{}")
                        try:
                            fn_args = json.loads(fn_args_str) if isinstance(fn_args_str, str) else fn_args_str
                        except Exception:
                            fn_args = {}

                        tool_result = MentorToolRegistry.execute_tool(
                            tool_name=fn_name,
                            arguments=fn_args,
                            student_id=student_id,
                            student_context=student_context,
                            db=db
                        )
                        executed_tools_data.append({
                            "tool_name": fn_name,
                            "arguments": fn_args,
                            "result": tool_result
                        })
                        messages.append({
                            "role": "tool",
                            "tool_call_id": t_id,
                            "name": fn_name,
                            "content": json.dumps(tool_result)
                        })
            except Exception as e:
                logger.warning(f"Groq mentor execution failed: {e}. Attempting failover...")

        # 5. Failover to Google Gemini if Groq did not produce a text answer
        if not final_text and gemini_api_key:
            try:
                logger.info("Executing mentor conversational turn with Google Gemini...")
                gemini_result = cls._call_gemini_api(
                    messages=messages,
                    system_prompt=system_prompt,
                    api_key=gemini_api_key,
                    model_name=settings.GEMINI_MODEL
                )
                if gemini_result:
                    final_text = gemini_result
                    provider_used = "gemini"
            except Exception as gemini_err:
                logger.warning(f"Gemini mentor execution failed: {gemini_err}. Attempting deterministic fallback...")

        # 6. Fallback to intelligent context-aware deterministic engine if all external LLMs failed
        if not final_text:
            logger.info("Using context-aware deterministic SkillSetu Career Mentor fallback engine.")
            fallback_res = cls._generate_deterministic_fallback(
                user_message=user_message,
                context=student_context,
                db=db,
                conversation_history=conversation_history
            )
            final_text = fallback_res.get("text", "")
            if not executed_tools_data and fallback_res.get("richContent"):
                return fallback_res

        if not final_text:
            final_text = cls._summarize_tool_executions(user_message, executed_tools_data, student_context)

        # 7. Extract Rich UI Content (Cards, Buttons, Badges)
        rich_content = cls._extract_rich_ui_content(user_message, executed_tools_data, student_context)

        latency_ms = int((time.time() - t0) * 1000)
        logger.info(f"Mentor turn completed in {latency_ms}ms via {provider_used or 'deterministic'}.")

        return {
            "text": final_text,
            "richContent": rich_content,
            "toolCallsCount": len(executed_tools_data),
            "toolsUsed": [t["tool_name"] for t in executed_tools_data],
            "provider": provider_used or "deterministic",
            "latencyMs": latency_ms
        }

    @classmethod
    def _call_groq_api(cls, payload: Dict[str, Any], api_key: str) -> Optional[Dict[str, Any]]:
        """Makes direct HTTP request to Groq OpenAI-compatible completions API with model fallback on rate limit."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "SkillSetu-Personal-AI-Mentor/1.0"
        }

        candidate_models = [
            payload.get("model") or "llama-3.3-70b-versatile",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "qwen/qwen3.8-27b"
        ]
        # Deduplicate while preserving order
        unique_models = []
        for m in candidate_models:
            if m and m not in unique_models:
                unique_models.append(m)

        for model_name in unique_models:
            current_payload = dict(payload)
            current_payload["model"] = model_name

            req = urllib.request.Request(
                GROQ_API_URL,
                data=json.dumps(current_payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=25) as resp:
                    body = resp.read().decode("utf-8")
                    return json.loads(body)
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    logger.warning(f"Groq model '{model_name}' hit 429 rate limit. Trying fallback model...")
                    continue
                else:
                    err_body = e.read().decode("utf-8") if e.fp else str(e)
                    logger.error(f"Groq API HTTP {e.code} error on model {model_name}: {err_body}")
                    raise e
            except Exception as e:
                logger.error(f"Groq request error on model {model_name}: {e}")
                raise e

        return None

    @classmethod
    def _call_gemini_api(
        cls,
        messages: List[Dict[str, Any]],
        system_prompt: str,
        api_key: str,
        model_name: Optional[str] = None
    ) -> Optional[str]:
        """
        Executes conversation turn using Google Gemini (gemini-3.5-flash-lite) API.
        Extracts candidate text and records latency / token metrics.
        """
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            target_model = model_name or settings.GEMINI_MODEL or "gemini-3.5-flash-lite"

            contents = []
            for m in messages:
                if m.get("role") == "system":
                    continue
                role = "user" if m.get("role") == "user" else "model"
                text_part = m.get("content") or ""
                if text_part.strip():
                    contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text_part)]))

            if not contents:
                return None

            t0 = time.time()
            resp = client.models.generate_content(
                model=target_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.3,
                    max_output_tokens=1200
                )
            )
            latency_ms = int((time.time() - t0) * 1000)
            token_count = resp.usage_metadata.total_token_count if resp and hasattr(resp, "usage_metadata") and resp.usage_metadata else None
            logger.info(f"Gemini mentor turn succeeded in {latency_ms}ms with model {target_model} (tokens: {token_count}).")
            return resp.text.strip() if resp and resp.text else None
        except Exception as e:
            logger.error(f"Gemini mentor API call failed: {e}")
            return None

    @classmethod
    def _build_system_prompt(cls, profile_summary: str, student_context: Dict[str, Any]) -> str:
        """
        Builds the comprehensive system prompt for the Personal AI Career Mentor
        with separated Application Knowledge and Personal Student Knowledge layers.
        """
        target_career = student_context.get("career", {}).get("targetCareer", "Full Stack Developer")
        student_name = student_context.get("student", {}).get("name", "Student")
        app_summary = AppKnowledgeService.get_knowledge_summary_for_prompt()

        return f"""You are the Personal AI Career Mentor inside SkillSetu.

You are the dedicated, highly qualified career mentor for {student_name}.
You have complete, comprehensive, and authoritative knowledge of:
1. THE ENTIRE SKILLSETU APPLICATION (how every tab, screen, button, metric, score calculation, workflow, and recommendation engine works).
2. THIS SPECIFIC STUDENT'S CAREER PROFILE (their verified skills, GitHub evidence, resume analysis, skill gaps, target career, and applications).

================================================================================
LAYER 1: SKILLSETU APPLICATION KNOWLEDGE (HOW THE PLATFORM WORKS)
================================================================================
{app_summary}

KEY FORMULAS & SCORES:
- Career Readiness Score: (verified_skills / total_required_skills) * 100
- Target Fit Score: min(100, max(45, round(Career_Readiness * 0.85 + 25)))
- GitHub Skill Index (0-100): 60% Core Skill Strength + 25% Project Depth + 15% Skill Breadth (Tier 1 vs Tier 2 vs Tier 3 taxonomy)
- Resume ATS Score (0-100): Contact (10%) + Experience impact (35%) + Skill keyword alignment (30%) + Education (15%) + Certifications/Links (10%)
- Internship Match Score (0-100%): 40% Skills + 20% Career + 15% Industry + 10% Location + 5% Type + 5% Work Preference + 5% Timeline Fit
- Profile Completion (0-100%): 5 Steps (16% each) = 80% baseline + 20% Verified Badge bonus = 100%

================================================================================
LAYER 2: AUTHENTICATED STUDENT PERSONAL KNOWLEDGE
================================================================================
{profile_summary}

================================================================================
CRITICAL OPERATIONAL RULES:
================================================================================

1. DUAL KNOWLEDGE SEPARATION & INTEGRATION:
   - Always clearly distinguish between:
     * APPLICATION KNOWLEDGE: How SkillSetu works, what features do, how metrics are calculated, where things are located, and how to use them.
     * PERSONAL STUDENT KNOWLEDGE: What is true about this specific student's profile, data, verified skills, and applications.
   - When asked a combined question (e.g. "What is Career Readiness and why is mine 68?", or "What is Skill Gap and what are MY skill gaps?"):
     1. First, explain what the feature/metric is and how SkillSetu calculates it.
     2. Second, retrieve and state the student's actual current score or data.
     3. Third, break down the specific factors/skills responsible for their result.
     4. Fourth, give actionable next steps with exact SkillSetu navigation guidance.

2. ACCURATE APPLICATION NAVIGATION:
   - When users ask where a feature is located or how to do something, provide the exact navigation path:
     * Skill Gaps / Matrix / Assessments / Coding Challenges -> Header navigation -> "Skills" tab
     * Internships / Job Matching -> Header navigation -> "Opportunities" tab
     * Resume Generator / ATS Score / Resume Editor -> Header navigation -> "Resume" tab
     * Learning Roadmap / Courses / Study Schedule -> Header navigation -> "Learning" tab
     * Interview Preparation / AI Mock Interviews / Question Bank -> Header navigation -> "Interview" tab
     * Profile / Marksheet OCR / GitHub Connection / Career Preferences -> Header navigation -> "My Profile" tab
     * Submitted Application Pipeline -> Header navigation -> "Applications" tab
     * Scholarships / Financial Aid -> Header navigation -> "Scholarships" tab
     * Dashboard / Skill Index / Action Plan -> Header navigation -> "Dashboard" tab

3. TRUTH & INTEGRITY (NO HALLUCINATIONS):
   - NEVER hallucinate a non-existent SkillSetu feature, screen, button, route, metric, or calculation. If something does not exist in the current application, clearly state that it is not currently available.
   - NEVER invent or fabricate student skills, projects, certifications, experiences, or applications.
   - Use `get_app_feature_info` whenever you need to look up detailed application specifications.

4. TOOL USAGE:
   - For student internships: call `get_recommended_internships` or `search_internships`.
   - For student skill gaps: call `get_student_skill_gaps` or `analyze_career_readiness`.
   - For course recommendations: call `search_courses` or `find_courses_for_skill_gap`.
   - For resume reviews: call `get_student_resume` or `get_resume_improvement_suggestions`.
   - For application feature lookup: call `get_app_feature_info`.

5. TONE & STRUCTURE:
   - Speak directly to the student as an encouraging, authoritative mentor.
   - Use clean GitHub-flavored markdown with bolding, bullet points, and numbered lists.
   - Keep answers structured, concrete, and directly actionable.

6. ACTIVE LISTENING & MULTI-TURN CONTINUITY:
   - Carefully review prior messages in the conversation history.
   - When the student responds to a question, suggestion, or choice you previously offered, ALWAYS address their specific answer directly.
   - NEVER restart the conversation, reset to an introductory greeting, or ignore what the student just answered.
   - Build continuously on their stated choices, goals, and answers.
"""

    @classmethod
    def _extract_rich_ui_content(
        cls,
        user_message: str,
        executed_tools: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Analyzes executed tools and conversation intent to attach rich interactive UI widgets
        with registered, safe navigation action tabs.
        """
        # 1. Check if internships were retrieved
        for t in executed_tools:
            if t["tool_name"] in ("get_recommended_internships", "search_internships", "calculate_internship_match"):
                res = t.get("result", {})
                internships = res.get("recommended_internships") or res.get("internships")
                if internships and isinstance(internships, list) and len(internships) > 0:
                    formatted_jobs = []
                    for itm in internships[:4]:
                        formatted_jobs.append({
                            "id": itm.get("internship_id") or itm.get("id"),
                            "title": itm.get("title"),
                            "company": itm.get("company_name"),
                            "location": itm.get("location"),
                            "match": round(itm.get("match_score", 85)),
                            "stipend": itm.get("stipend"),
                            "workPreference": itm.get("work_preference"),
                            "matchedSkills": itm.get("matched_skills", [])[:3],
                            "missingSkills": itm.get("missing_skills", [])[:2]
                        })
                    return {
                        "type": "internships_list",
                        "title": "Matching Opportunities",
                        "jobs": formatted_jobs,
                        "actionTab": "Opportunities",
                        "buttonLabel": "Explore All Internships"
                    }

        # 2. Check if courses or skill gap were investigated
        for t in executed_tools:
            if t["tool_name"] in ("find_courses_for_skill_gap", "search_courses", "generate_learning_roadmap"):
                res = t.get("result", {})
                courses = res.get("courses") or []
                if courses:
                    top_c = courses[0]
                    return {
                        "type": "skill_card",
                        "title": top_c.get("title", "Recommended Course"),
                        "skillName": t.get("arguments", {}).get("skill_name", "Target Skill"),
                        "provider": top_c.get("provider", "NPTEL"),
                        "url": top_c.get("url", ""),
                        "duration": top_c.get("duration", "Self-paced"),
                        "buttonLabel": f"Start {top_c.get('provider', 'Course')}",
                        "actionTab": "Learning"
                    }

        # 3. Check if resume was queried
        for t in executed_tools:
            if t["tool_name"] in ("get_student_resume", "get_resume_improvement_suggestions"):
                res = t.get("result", {})
                return {
                    "type": "resume_insights",
                    "score": res.get("ats_score") or res.get("current_ats_score", 75),
                    "points": res.get("actionable_suggestions", res.get("improvement_areas", []))[:3],
                    "actionTab": "Resume",
                    "buttonLabel": "Optimize Resume ATS"
                }

        # 4. Check if interview plan was queried
        for t in executed_tools:
            if t["tool_name"] == "generate_interview_plan":
                return {
                    "type": "text_link",
                    "label": "Launch AI Mock Interview",
                    "actionTab": "InterviewPrep"
                }

        # 5. Check if app knowledge tool was called
        for t in executed_tools:
            if t["tool_name"] == "get_app_feature_info":
                res = t.get("result", {})
                resolved_tab = res.get("resolvedTab") or "Dashboard"
                return {
                    "type": "text_link",
                    "label": f"Open {resolved_tab}",
                    "actionTab": resolved_tab
                }

        # 6. Fallback intent matching for registered action tabs
        safe_tab = AppKnowledgeService.resolve_safe_tab(user_message)
        if safe_tab and safe_tab != "Dashboard":
            tab_info = AppKnowledgeService.get_screen_info(safe_tab)
            label = f"Open {tab_info['navLabel']}" if tab_info else f"Open {safe_tab}"
            return {
                "type": "text_link",
                "label": label,
                "actionTab": safe_tab
            }

        return None

    @classmethod
    def _generate_deterministic_fallback(
        cls,
        user_message: str,
        context: Dict[str, Any],
        db: Session,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Deterministic, profile- and application-aware response engine when Groq API key is not supplied or offline.
        Uses real SkillSetu database calculations, student context, conversation history, and AppKnowledgeService.
        """
        msg_lower = user_message.lower().strip()
        st_name = context.get("student", {}).get("name", "Student")
        target_career = context.get("career", {}).get("targetCareer", "Full Stack Developer")
        readiness = context.get("career", {}).get("careerReadiness", 0)
        verified = [v.get("skill_name") for v in context.get("skills", {}).get("verified", [])]
        gaps = context.get("skillGaps", [])
        resume_score = context.get("resume", {}).get("resumeScore", 0)

        # Inspect conversation history to understand multi-turn context
        last_assistant_msg = ""
        prior_turns_count = 0
        if conversation_history:
            for prev in reversed(conversation_history):
                sender = prev.get("sender", "").lower()
                if sender in ("ai", "assistant", "mentor") and not last_assistant_msg:
                    last_assistant_msg = (prev.get("content") or prev.get("text") or "").strip()
                if sender in ("user", "human"):
                    prior_turns_count += 1

        last_ai_lower = last_assistant_msg.lower()

        # Check if the user is answering or confirming a prior question from the mentor
        is_confirmation = any(w in msg_lower for w in ("yes", "sure", "ok", "okay", "yep", "let's do", "sounds good", "please", "definitely", "agree", "proceed", "start"))
        is_first_option = any(w in msg_lower for w in ("first", "1", "option 1", "former"))
        is_second_option = any(w in msg_lower for w in ("second", "2", "option 2", "latter"))

        # Check if user is asking an explicit workflow, screen, or metric question
        search_res = AppKnowledgeService.search_app_knowledge(user_message)
        matched_workflows = search_res.get("matchedWorkflows", [])
        metric_info = AppKnowledgeService.get_metric_explanation(user_message)
        is_workflow_or_metric = bool(
            (metric_info and any(q_word in msg_lower for q_word in ("how", "calculate", "formula", "what is", "why", "work", "mean"))) or
            (matched_workflows and any(w in msg_lower for w in ("how", "where", "connect", "step", "tab", "screen", "find", "use")))
        )

        # Skill matching from context (only when replying about learning a skill, not querying an app workflow)
        matched_skill_in_answer = None
        if not is_workflow_or_metric:
            all_relevant_skills = [g.get("skill_name") for g in gaps] + verified + ["Docker", "FastAPI", "Python", "PostgreSQL", "React", "Redis", "System Design", "AWS", "Kubernetes", "Git"]
            for s in all_relevant_skills:
                if s and re.search(rf"\b{re.escape(s.lower())}\b", msg_lower):
                    if s.lower() == "git" and "github" in msg_lower:
                        continue
                    matched_skill_in_answer = s
                    break

        # 0. Active Follow-up & Answer Processing when replying to prior assistant question
        if matched_skill_in_answer:
            target_skill = matched_skill_in_answer
            courses_res = MentorToolRegistry.execute_tool(
                "search_courses",
                {"skill_name": target_skill},
                context.get("student", {}).get("id", 1),
                context,
                db
            )
            c_list = courses_res.get("courses", [])
            c_sample = c_list[0] if c_list else {"title": f"Mastering {target_skill}", "provider": "NPTEL"}
            text = (
                f"Understood! Focusing on **{target_skill}** is an excellent strategic choice for your **{target_career}** progression.\n\n"
                f"**Immediate Action Plan for {target_skill}:**\n"
                f"1. **Targeted Course:** Enroll in **{c_sample.get('title')}** ({c_sample.get('provider', 'NPTEL')}) via the **Learning** tab.\n"
                f"2. **Hands-on Proof:** Implement a project repository demonstrating {target_skill} and push it to your connected GitHub.\n"
                f"3. **Skill Verification:** Complete the diagnostic quiz on the **Skills** tab to earn your verified badge and boost your readiness above {min(100, int(readiness + 15))}%."
            )
            return {
                "text": text,
                "richContent": {
                    "type": "skill_card",
                    "title": c_sample.get("title", f"Learn {target_skill}"),
                    "skillName": target_skill,
                    "provider": c_sample.get("provider", "NPTEL"),
                    "url": c_sample.get("url", ""),
                    "buttonLabel": "Enroll Free in Module",
                    "actionTab": "Learning"
                }
            }

        elif is_confirmation and ("docker" in last_ai_lower or "learning" in last_ai_lower or "course" in last_ai_lower or "skill" in last_ai_lower):
            top_gap = gaps[0].get("skill_name", "Docker") if gaps else "System Design"
            text = (
                f"Great, let's get started on closing your priority gap in **{top_gap}**!\n\n"
                f"• **Step 1:** Head to the **Learning** tab to start the targeted module for {top_gap}.\n"
                f"• **Step 2:** Take the short skill assessment to verify this competency.\n"
                f"• **Impact:** Earning this verified badge will directly improve your internship matching rate for **{target_career}**."
            )
            return {
                "text": text,
                "richContent": {
                    "type": "skill_card",
                    "title": f"Priority Focus: {top_gap}",
                    "skillName": top_gap,
                    "buttonLabel": "Start Learning Roadmap",
                    "actionTab": "Learning"
                }
            }

        # 1. Check if user is asking about an Application Metric / Calculation
        metric_info = AppKnowledgeService.get_metric_explanation(user_message)
        if metric_info and any(q_word in msg_lower for q_word in ("how", "calculate", "formula", "what is", "why", "work", "mean")):
            m_name = metric_info["name"]
            m_formula = metric_info["formula"]
            m_exp = metric_info["explanation"]
            m_loc = metric_info.get("whereFound", "SkillSetu")
            
            student_value_text = ""
            if "readiness" in m_name.lower() or "readiness" in msg_lower:
                student_value_text = (
                    f"\n\n**Your Specific Status:**\n"
                    f"• Current Career Readiness for **{target_career}**: **{readiness:.0f}%**\n"
                    f"• Verified Skills Count: **{len(verified)}** ({', '.join(verified[:4]) if verified else 'None'})\n"
                    f"• Priority Missing Skills: **{', '.join([g.get('skill_name') for g in gaps[:3]]) if gaps else 'None'}**\n\n"
                    f"**Next Step to Boost Score:** Take a diagnostic assessment on the **Skills** tab or complete modules on the **Learning** tab."
                )
            elif "ats" in m_name.lower() or "ats" in msg_lower or "resume" in msg_lower:
                student_value_text = (
                    f"\n\n**Your Specific Status:**\n"
                    f"• Current Resume ATS Score: **{resume_score}/100**\n"
                    f"• Missing Target Keywords: **{', '.join([g.get('skill_name') for g in gaps[:3]]) if gaps else 'FastAPI, Docker'}**\n\n"
                    f"**Next Step to Boost Score:** Open the **Resume** tab to generate an ATS-tailored resume with auto-aligned keywords."
                )

            text = (
                f"### How SkillSetu Calculates {m_name}\n\n"
                f"**Formula:**\n`{m_formula}`\n\n"
                f"**Explanation:**\n{m_exp}\n\n"
                f"**Where to Find:** {m_loc}"
                f"{student_value_text}"
            )
            safe_tab = AppKnowledgeService.resolve_safe_tab(user_message)
            return {
                "text": text,
                "richContent": {
                    "type": "text_link",
                    "label": f"Open {safe_tab}",
                    "actionTab": safe_tab
                }
            }

        # 2. Check if user is asking about a Screen / Feature / Workflow
        search_res = AppKnowledgeService.search_app_knowledge(user_message)
        matched_tabs = search_res.get("matchedTabs", [])
        matched_workflows = search_res.get("matchedWorkflows", [])

        if (matched_workflows or (matched_tabs and any(w in msg_lower for w in ("where", "how do i", "how to", "what does", "feature", "button", "tab", "screen", "find", "use")))):
            if matched_workflows:
                wf = matched_workflows[0]
                steps_text = "\n".join(wf["steps"])
                text = (
                    f"### {wf['title']}\n\n"
                    f"{steps_text}\n\n"
                    f"You can jump straight there using the button below."
                )
                return {
                    "text": text,
                    "richContent": {
                        "type": "text_link",
                        "label": f"Open {wf['actionTab']}",
                        "actionTab": wf["actionTab"]
                    }
                }
            elif matched_tabs:
                tab_data = matched_tabs[0]
                features_text = "\n".join([f"• **{f['name']}**: {f['description']}" for f in tab_data.get("keyFeatures", [])[:3]])
                text = (
                    f"### {tab_data['title']} (`{tab_data['navLabel']}`)\n\n"
                    f"**Location:** {tab_data['location']}\n\n"
                    f"**Overview:**\n{tab_data['summary']}\n\n"
                    f"**Key Features:**\n{features_text}"
                )
                return {
                    "text": text,
                    "richContent": {
                        "type": "text_link",
                        "label": f"Open {tab_data['tabId']}",
                        "actionTab": tab_data["tabId"]
                    }
                }

        # 3. Internship Queries
        if any(w in msg_lower for w in ("internship", "job", "apply", "opportunity", "hire")):
            rec_tool = MentorToolRegistry.execute_tool(
                "get_recommended_internships",
                {"limit": 4},
                context.get("student", {}).get("id", 1),
                context,
                db
            )
            jobs = rec_tool.get("recommended_internships", [])
            
            job_lines = []
            for j in jobs[:3]:
                job_lines.append(
                    f"• **{j.get('title')}** at {j.get('company_name')} ({j.get('location')})\n"
                    f"  **Match: {j.get('match_score'):.0f}%** | Stipend: {j.get('stipend')}\n"
                    f"  ✓ Matched: {', '.join(j.get('matched_skills', [])[:3])}\n"
                    f"  ✗ Missing: {', '.join(j.get('missing_skills', [])[:2]) if j.get('missing_skills') else 'None'}\n"
                    f"  ➔ *{j.get('recommendation')}*"
                )

            jobs_text = "\n\n".join(job_lines) if job_lines else "No direct matches found in current catalog."

            text = (
                f"Here are the top real-world internships matching your **{target_career}** profile right now:\n\n"
                f"{jobs_text}\n\n"
                f"**Mentor Recommendation:** Focus on closing your gap in **{gaps[0].get('skill_name') if gaps else 'system design'}** to boost your match scores above 90%."
            )
            return {
                "text": text,
                "richContent": {
                    "type": "internships_list",
                    "jobs": [
                        {
                            "id": j.get("internship_id"),
                            "title": j.get("title"),
                            "company": j.get("company_name"),
                            "location": j.get("location"),
                            "match": round(j.get("match_score", 85)),
                            "stipend": j.get("stipend")
                        }
                        for j in jobs[:3]
                    ],
                    "actionTab": "Opportunities",
                    "buttonLabel": "View Opportunities"
                }
            }

        # 4. Skill Gap Queries
        elif any(w in msg_lower for w in ("missing", "gap", "ready", "readiness", "backend", "fullstack", "what should i do")):
            v_text = ", ".join(verified[:4]) if verified else "General fundamentals"
            gap_items = []
            for idx, g in enumerate(gaps[:4], 1):
                gap_items.append(f"{idx}. **{g.get('skill_name')}** (Importance: {g.get('importance', 'CORE')}) — *{g.get('explanation', 'Core role competency')}*")

            gap_list_text = "\n".join(gap_items) if gap_items else "All core competencies currently satisfied!"

            text = (
                f"Based on your SkillSetu profile analysis for **{target_career}** (Current Readiness: **{readiness:.0f}%**):\n\n"
                f"**Your Strongest Verified Skills:**\n"
                f"✓ {v_text}\n\n"
                f"**Your High-Priority Skill Gaps:**\n"
                f"{gap_list_text}\n\n"
                f"**Actionable Next Step:**\n"
                f"Navigate to the **Skills** tab to take diagnostic assessments or the **Learning** tab to start targeted modules."
            )
            return {
                "text": text,
                "richContent": {
                    "type": "skill_card",
                    "title": f"Priority Gap: {gaps[0].get('skill_name') if gaps else 'Cloud & Containers'}",
                    "skillName": gaps[0].get("skill_name") if gaps else "Docker",
                    "buttonLabel": "Start Skill Path",
                    "actionTab": "Skills"
                }
            }

        # 5. Learning & Course Queries
        elif any(w in msg_lower for w in ("learn", "course", "roadmap", "study", "month")):
            top_gap = gaps[0].get("skill_name", "Docker") if gaps else "System Design"
            courses_res = MentorToolRegistry.execute_tool(
                "search_courses",
                {"skill_name": top_gap},
                context.get("student", {}).get("id", 1),
                context,
                db
            )
            c_list = courses_res.get("courses", [])
            c_sample = c_list[0] if c_list else {"title": f"Mastering {top_gap}", "provider": "NPTEL"}

            text = (
                f"Here is your personalized learning plan to accelerate toward **{target_career}**:\n\n"
                f"1. **Primary Target:** {top_gap}\n"
                f"   • Recommended Resource: **{c_sample.get('title')}** ({c_sample.get('provider', 'NPTEL')})\n"
                f"   • Focus: Hands-on implementation and test cases.\n\n"
                f"2. **Secondary Target:** {gaps[1].get('skill_name') if len(gaps) > 1 else 'Automated Testing'}\n"
                f"   • Build and benchmark query optimization.\n\n"
                f"3. **Capstone Milestone:** Deploy an end-to-end repository incorporating {top_gap} with automated CI/CD."
            )
            return {
                "text": text,
                "richContent": {
                    "type": "skill_card",
                    "title": c_sample.get("title", f"Learn {top_gap}"),
                    "skillName": top_gap,
                    "provider": c_sample.get("provider", "NPTEL"),
                    "url": c_sample.get("url", ""),
                    "buttonLabel": "Enroll Free in Module",
                    "actionTab": "Learning"
                }
            }

        # 6. Resume Queries
        elif any(w in msg_lower for w in ("resume", "cv", "ats", "shortlist")):
            res = context.get("resume", {})
            imp = res.get("improvementAreas", [])
            imp_text = "\n".join([f"• {i}" for i in imp[:3]]) if imp else "• Add quantifiable metrics to project descriptions.\n• Highlight Docker & REST API architecture."

            text = (
                f"Your current resume ATS score is **{resume_score}/100** for **{target_career}**.\n\n"
                f"**High-Impact Improvements:**\n"
                f"{imp_text}\n\n"
                f"**Missing Target Keywords to Include:**\n"
                f"{', '.join([g.get('skill_name') for g in gaps[:4]]) if gaps else 'FastAPI, Docker, PostgreSQL'}\n\n"
                f"Applying these will raise your shortlist rate across tech recruiters."
            )
            return {
                "text": text,
                "richContent": {
                    "type": "resume_insights",
                    "score": resume_score,
                    "points": imp[:3] if imp else ["Include quantifiable metrics", "Highlight REST API architecture"],
                    "actionTab": "Resume",
                    "buttonLabel": "Optimize Resume Now"
                }
            }

        # 7. Ongoing conversation follow-up (when user responded to a prior assistant question/comment)
        elif prior_turns_count > 0:
            text = (
                f"I noted your answer: **\"{user_message}\"**.\n\n"
                f"For your target track as **{target_career}** (Current Readiness: **{readiness:.0f}%**):\n"
                f"• **Priority Gap to Bridge:** {gaps[0].get('skill_name') if gaps else 'Cloud Architecture'}\n"
                f"• **Verified Core Competencies:** {', '.join(verified[:3]) if verified else 'Foundational CS'}\n\n"
                f"Would you like to explore matching internships on the **Opportunities** tab, launch targeted learning on the **Learning** tab, or run a mock interview on the **Interview** tab?"
            )
            return {
                "text": text,
                "richContent": {
                    "type": "text_link",
                    "label": "Open Learning Roadmap",
                    "actionTab": "Learning"
                }
            }

        # 8. Initial First Turn Overview (only when there are no prior turns)
        else:
            text = (
                f"Hello {st_name}! I am your Personal AI Career Mentor with complete knowledge of your profile and the entire SkillSetu platform.\n\n"
                f"• **Your Target Track:** {target_career} (Readiness: {readiness:.0f}%)\n"
                f"• **Top Verified:** {', '.join(verified[:3]) if verified else 'Foundational CS'}\n"
                f"• **Next Gap to Bridge:** {gaps[0].get('skill_name') if gaps else 'Cloud Architecture'}\n\n"
                f"You can ask me about **any SkillSetu feature, tab, score calculation, or workflow**, or ask for personalized recommendations on internships, courses, and resume ATS optimization."
            )
            return {
                "text": text,
                "richContent": {
                    "type": "text_link",
                    "label": "Explore Skill Intelligence",
                    "actionTab": "Skills"
                }
            }

    @classmethod
    def _summarize_tool_executions(
        cls,
        user_message: str,
        executed_tools: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> str:
        """Fallback tool execution summarizer if LLM did not return text."""
        target_career = context.get("career", {}).get("targetCareer", "your target career")
        return f"I analyzed your SkillSetu profile and application intelligence for **{target_career}**. Check the structured insights and recommendations above."

