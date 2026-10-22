"""
Gemini Job Description Analysis & Pipeline Synthesis Service
Uses:
- google-genai 2.28.0 SDK
- Configured model: gemini-3.5-flash-lite
- Structured JSON output with Pydantic validation
- AI usage telemetry and latency instrumentation
- Deterministic heuristic fallback in case of Gemini outages
"""

import os
import json
import time
import logging
from typing import Dict, Any, Optional

from app.config import settings
from app.services.ai_usage_telemetry_service import record_ai_invocation
from app.schemas.recruitment_automation import (
    PipelineConfigSchema,
    EvaluationRubricsSchema,
    EligibilityRulesSchema,
    ScoringWeightsSchema,
    AutomationPolicySchema,
)

logger = logging.getLogger("gemini_jd_analysis")

SYSTEM_INSTRUCTION = """
You are an expert AI Technical Recruitment Architect for SkillSetu.
Your task is to analyze job descriptions and propose a comprehensive, multi-round recruitment pipeline.
You must return a single valid JSON object adhering strictly to the schema provided.
Do NOT include markdown formatting or backticks outside the JSON.
"""


def _generate_fallback_pipeline(title: str, description: str) -> Dict[str, Any]:
    """Deterministic fallback pipeline when Gemini is unavailable or times out."""
    title_lower = title.lower()

    # Determine role type
    is_technical = any(k in title_lower for k in ["developer", "software", "engineer", "frontend", "backend", "full stack", "python", "react", "data", "ai", "ml"])
    
    rounds = [
        {
            "round_key": "aptitude",
            "round_name": "Aptitude & Problem Solving",
            "enabled": True,
            "order": 1,
            "duration_minutes": 30,
            "passing_cutoff": 60.0,
            "review_gated": False,
            "parameters": {"question_count": 15, "category": "general"}
        }
    ]

    if is_technical:
        rounds.append({
            "round_key": "technical",
            "round_name": "Technical Coding Assessment",
            "enabled": True,
            "order": 2,
            "duration_minutes": 45,
            "passing_cutoff": 65.0,
            "review_gated": False,
            "parameters": {"coding_problems": 2, "languages": ["python", "javascript"]}
        })

    rounds.append({
        "round_key": "interview",
        "round_name": "AI Voice Interview",
        "enabled": True,
        "order": len(rounds) + 1,
        "duration_minutes": 20,
        "passing_cutoff": 60.0,
        "review_gated": True,
        "parameters": {"question_count": 6}
    })

    weights = {"aptitude": 25.0, "technical": 45.0, "interview": 30.0} if is_technical else {"aptitude": 50.0, "interview": 50.0}

    return {
        "pipeline_config": {
            "rounds": rounds,
            "proctoring": {
                "camera_required": True,
                "mic_required": True,
                "max_warnings": 3
            }
        },
        "evaluation_rubrics": {
            "rubrics_by_round": {
                "aptitude": {"accuracy": 100},
                "technical": {"correctness": 50, "time_complexity": 25, "code_quality": 25},
                "interview": {"technical_depth": 40, "communication": 30, "problem_solving": 30}
            }
        },
        "eligibility_rules": {
            "min_cgpa": 6.5,
            "allowed_degrees": ["B.Tech", "B.E.", "MCA", "B.Sc", "BCA"],
            "allowed_branches": ["All"],
            "allowed_graduation_years": [2025, 2026, 2027],
            "mandatory_skills": ["Python"] if "python" in title_lower else [],
            "preferred_skills": ["Git", "SQL"],
            "work_modes_accepted": ["Remote", "Hybrid", "On-site"]
        },
        "scoring_weights": {
            "weights_by_round": weights,
            "overall_passing_threshold": 65.0,
            "tie_breaker_order": ["technical_score", "verified_evidence_score", "application_timestamp_asc"]
        },
        "automation_policy": {
            "mode": "REVIEW_GATED",
            "auto_screen": True,
            "shortlist_mode": "IMMEDIATE",
            "auto_progress_rounds": True,
            "auto_final_selection": False
        }
    }


def analyze_job_description_and_suggest_pipeline(
    title: str,
    description: str,
    department: Optional[str] = None,
    work_mode: Optional[str] = "Remote",
    openings: int = 1
) -> Dict[str, Any]:
    """
    Invokes Gemini model (gemini-3.5-flash-lite) to parse the job requirements
    and synthesize an end-to-end recruitment pipeline configuration.
    Records operational telemetry and falls back gracefully on errors.
    """
    model_name = settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
    api_key = settings.GEMINI_API_KEY
    start_time = time.time()

    prompt = f"""
Analyze the following internship/job opening and generate a complete, production-ready recruitment pipeline:
Role Title: {title}
Department: {department or "Engineering"}
Work Mode: {work_mode}
Openings: {openings}
Job Description:
{description}

Generate a JSON object with EXACTLY these top-level keys:
1. "pipeline_config": Object containing "rounds" (array of rounds with round_key, round_name, enabled, order, duration_minutes, passing_cutoff, review_gated, parameters) and "proctoring". Use canonical lowercase round_key values: "aptitude" (cognitive screening), "technical" (coding/domain assessment), "interview" (AI voice interview), "gd" (group discussion). Always include "aptitude" as the first screening round.
2. "evaluation_rubrics": Object containing "rubrics_by_round".
3. "eligibility_rules": Object containing "min_cgpa", "allowed_degrees", "allowed_branches", "allowed_graduation_years", "mandatory_skills", "preferred_skills", "work_modes_accepted".
4. "scoring_weights": Object containing "weights_by_round", "overall_passing_threshold", "tie_breaker_order".
5. "automation_policy": Object containing "mode" ("REVIEW_GATED"), "auto_screen" (true), "shortlist_mode" ("IMMEDIATE"), "auto_progress_rounds" (true), "auto_final_selection" (false).
"""

    if not api_key:
        logger.warning("GEMINI_API_KEY is not set. Generating deterministic fallback pipeline.")
        return _generate_fallback_pipeline(title, description)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                temperature=0.2,
            )
        )
        latency_ms = int((time.time() - start_time) * 1000)

        raw_text = response.text
        if not raw_text:
            raise ValueError("Empty response received from Gemini.")

        parsed = json.loads(raw_text)

        # Normalize round keys to canonical forms
        rounds = parsed.get("pipeline_config", {}).get("rounds", [])
        canonical_keys = ["aptitude", "technical", "interview", "gd"]
        for idx, r in enumerate(rounds):
            rk = str(r.get("round_key", "")).lower().strip()
            rn = str(r.get("round_name", "")).lower()

            if "aptitude" in rk or "aptitude" in rn or "screening" in rn or "cognitive" in rn:
                r["round_key"] = "aptitude"
            elif "interview" in rk or "voice" in rk or "interview" in rn or "voice" in rn:
                r["round_key"] = "interview"
            elif "discussion" in rk or "gd" in rk or "discussion" in rn or "gd" in rn:
                r["round_key"] = "gd"
            elif "tech" in rk or "code" in rk or "tech" in rn or "code" in rn:
                r["round_key"] = "technical"
            elif rk in canonical_keys:
                r["round_key"] = rk
            else:
                r["round_key"] = canonical_keys[min(idx, len(canonical_keys) - 1)]

        # Guarantee canonical aptitude is present in rounds
        if rounds and not any(r.get("round_key") == "aptitude" for r in rounds):
            rounds[0]["round_key"] = "aptitude"

        # Validate with Pydantic
        PipelineConfigSchema.model_validate(parsed["pipeline_config"])
        EvaluationRubricsSchema.model_validate(parsed["evaluation_rubrics"])
        EligibilityRulesSchema.model_validate(parsed["eligibility_rules"])
        ScoringWeightsSchema.model_validate(parsed["scoring_weights"])
        AutomationPolicySchema.model_validate(parsed["automation_policy"])

        # Record telemetry
        prompt_tokens = getattr(response.usage_metadata, "prompt_token_count", None)
        completion_tokens = getattr(response.usage_metadata, "candidates_token_count", None)
        record_ai_invocation(
            feature="JD_ANALYSIS",
            model=model_name,
            latency_ms=latency_ms,
            status="SUCCESS",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens
        )
        logger.info(f"Gemini successfully synthesized pipeline for '{title}' in {latency_ms}ms")
        return parsed

    except Exception as exc:
        latency_ms = int((time.time() - start_time) * 1000)
        logger.warning(f"Gemini JD analysis failed ({exc}). Falling back to deterministic pipeline generator.")
        record_ai_invocation(
            feature="JD_ANALYSIS",
            model=model_name,
            latency_ms=latency_ms,
            status="API_ERROR",
            error_detail=str(exc)
        )
        return _generate_fallback_pipeline(title, description)
