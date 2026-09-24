import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("groq_service")
logger.setLevel(logging.INFO)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

def validate_career_esco_mapping_with_groq(
    career_profile: Dict[str, Any],
    candidate_occupations: List[Dict[str, Any]],
    groq_api_key: Optional[str] = None,
    model: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Calls Groq LLM API server-side to semantically validate and choose the best matching ESCO occupation
    from a list of real PostgreSQL candidate ESCO occupations.

    GROQ MUST NOT:
    - Invent ESCO URIs
    - Invent required skills
    - Generate proficiency levels
    - Calculate gaps or readiness scores
    
    Returns structured JSON:
    {
      "selected_occupation_uri": "...",
      "confidence": 0.91,
      "decision": "match" | "needs_review" | "no_good_match",
      "reasoning_summary": "..."
    }
    """
    api_key = groq_api_key or settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set. Cannot perform Groq semantic validation.")
        return None

    target_model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"

    if not candidate_occupations:
        logger.warning("No candidate occupations provided to Groq service.")
        return {
            "selected_occupation_uri": None,
            "confidence": 0.0,
            "decision": "no_good_match",
            "reasoning_summary": "No candidate ESCO occupations were supplied."
        }

    # Format career profile
    career_title = career_profile.get("name", "Unknown Career")
    career_desc = career_profile.get("description", "No description available.")
    career_category = career_profile.get("category", "General")

    # Format candidates list for prompt
    candidates_formatted = []
    valid_uris = set()
    for idx, cand in enumerate(candidate_occupations, 1):
        uri = cand.get("concept_uri") or cand.get("uri")
        title = cand.get("preferred_label") or cand.get("title")
        desc = cand.get("description", "")
        alt_labels = cand.get("alt_labels", "")
        if uri and title:
            valid_uris.add(uri)
            candidates_formatted.append(
                f"Candidate #{idx}:\n"
                f"  URI: {uri}\n"
                f"  Title: {title}\n"
                f"  Alt Labels: {alt_labels[:100]}\n"
                f"  Description: {desc[:120]}"
            )

    system_prompt = (
        "You are an expert ESCO career taxonomy classification specialist. Your sole job is to evaluate a SkillSetu career "
        "and choose the BEST matching ESCO occupation from a provided candidate list.\n\n"
        "RULES:\n"
        "1. You MUST choose ONLY from the supplied candidate URIs or return 'no_good_match' with null URI.\n"
        "2. Do NOT invent new URIs, titles, or skill lists.\n"
        "3. Output MUST strictly be valid JSON matching the exact schema specified.\n"
        "4. Assign confidence between 0.00 and 1.00 based on semantic alignment.\n"
        "5. Allowed decisions: 'match' (confidence >= 0.80), 'needs_review' (0.60-0.79), 'no_good_match' (< 0.60).\n"
    )

    user_prompt = (
        f"SkillSetu Career Profile:\n"
        f"Title: {career_title}\n"
        f"Category: {career_category}\n"
        f"Description: {career_desc}\n\n"
        f"Candidate ESCO Occupations:\n"
        + "\n\n".join(candidates_formatted) + "\n\n"
        "Return JSON only:\n"
        "{\n"
        '  "selected_occupation_uri": "<exact_uri_from_candidates_or_null>",\n'
        '  "confidence": <float_between_0_and_1>,\n'
        '  "decision": "match" | "needs_review" | "no_good_match",\n'
        '  "reasoning_summary": "<brief concise technical rationale>"\n'
        "}"
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "SkillSetu-Backend/1.0"
    }

    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }

    try:
        req = urllib.request.Request(
            GROQ_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            res_data = json.loads(body)
            content = res_data["choices"][0]["message"]["content"]
            result = json.loads(content)

            # Strict Backend Validation
            selected_uri = result.get("selected_occupation_uri")
            confidence = float(result.get("confidence", 0.0))
            decision = result.get("decision", "needs_review")
            reasoning = result.get("reasoning_summary", "")

            # Ensure URI is actually in candidate list
            if selected_uri and selected_uri not in valid_uris:
                logger.error(f"Groq returned invalid/unlisted ESCO URI '{selected_uri}'. Rejecting.")
                return {
                    "selected_occupation_uri": None,
                    "confidence": 0.0,
                    "decision": "rejected",
                    "reasoning_summary": f"Groq generated URI outside candidate set: {selected_uri}"
                }

            if confidence >= 0.80 and selected_uri:
                decision = "match"
            elif confidence >= 0.60:
                decision = "needs_review"
            else:
                decision = "no_good_match"

            return {
                "selected_occupation_uri": selected_uri if decision != "no_good_match" else None,
                "confidence": confidence,
                "decision": decision,
                "reasoning_summary": reasoning,
                "groq_model": target_model
            }

    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8") if e.fp else str(e)
        logger.error(f"Groq HTTP Error {e.code}: {err_msg}")
        return None
    except Exception as exc:
        logger.error(f"Error calling Groq service: {exc}")
        return None


def evaluate_student_skill_career_relationships_with_groq(
    student_skills: List[Dict[str, Any]],
    esco_requirements: List[Dict[str, Any]],
    target_career: str,
    groq_api_key: Optional[str] = None,
    model: Optional[str] = None
) -> Optional[List[Dict[str, Any]]]:
    """
    Calls Groq LLM API to evaluate semantic relationship between candidate student verified skills
    and career ESCO competencies.

    GROQ MUST NOT:
    - Invent student skills
    - Invent ESCO competencies
    - Invent evidence
    - Assign or alter student proficiency scores
    - Decide final scores or hiring probability

    Groq ONLY determines:
    - relationship_type: DIRECT, STRONG_RELATED, SUPPORTING, NONE
    - confidence: float between 0.0 and 1.0
    - reason: concise technical rationale
    """
    api_key = groq_api_key or settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set. Cannot perform Groq semantic skill evaluation.")
        return None

    target_model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"

    if not student_skills or not esco_requirements:
        return []

    # Limit payload batch size to 10-30 candidate pairs
    student_summary = [f"{s['skill_name']} (score: {s.get('score', s.get('current_level', 0))})" for s in student_skills[:20]]
    esco_summary = [f"{e['skill_name']} (relation: {e.get('relation', 'essential')})" for e in esco_requirements[:20]]

    system_prompt = (
        "You are a technical career domain semantic reasoning engine for SkillSetu.\n"
        "Your task is to evaluate whether a student's demonstrated real-world technologies/skills "
        "semantically relate to required ESCO career competencies for the target career.\n\n"
        "CRITICAL CONSTRAINTS & RULES:\n"
        "1. DO NOT invent student skills or ESCO competencies.\n"
        "2. DO NOT change student proficiency scores or calculate alignment numbers.\n"
        "3. Allowed relationship_type values: DIRECT, STRONG_RELATED, SUPPORTING, NONE.\n"
        "   - DIRECT: Exact or canonical match (e.g. Python -> Python).\n"
        "   - STRONG_RELATED: Real technology strongly demonstrates competency (e.g. React/React Native -> application development, Express/FastAPI -> web services, MongoDB -> database).\n"
        "   - SUPPORTING: Relevant workflow evidence (e.g. Git -> software development tools).\n"
        "   - NONE: No defensible relationship.\n"
        "4. DO NOT create relationships on loose substring match (e.g. iOS != Axios, R != React, Docker != software configuration management).\n"
        "5. Return confidence score between 0.00 and 1.00.\n"
        "6. Output MUST strictly be valid JSON containing a 'relationships' array."
    )

    user_prompt = (
        f"Target Career: {target_career}\n\n"
        f"Verified Student Skills:\n" + "\n".join([f"- {s}" for s in student_summary]) + "\n\n"
        f"Target Career ESCO Competencies:\n" + "\n".join([f"- {e}" for e in esco_summary]) + "\n\n"
        "Return JSON only in this exact format:\n"
        "{\n"
        '  "relationships": [\n'
        '    {\n'
        '      "student_skill": "<exact_student_skill_name>",\n'
        '      "career_competency": "<exact_esco_competency_name>",\n'
        '      "relationship_type": "DIRECT" | "STRONG_RELATED" | "SUPPORTING" | "NONE",\n'
        '      "confidence": <float_0_to_1>,\n'
        '      "reason": "<concise evidence-backed technical rationale>"\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "SkillSetu-Backend/1.0"
    }

    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }

    try:
        req = urllib.request.Request(
            GROQ_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            res_data = json.loads(body)
            content = res_data["choices"][0]["message"]["content"]
            result = json.loads(content)
            raw_rels = result.get("relationships", [])

            valid_student_names = {s["skill_name"].strip().lower(): s["skill_name"] for s in student_skills}
            valid_esco_names = {e["skill_name"].strip().lower(): e["skill_name"] for e in esco_requirements}

            validated_results = []
            for item in raw_rels:
                st_name = item.get("student_skill", "").strip()
                esco_name = item.get("career_competency", "").strip()
                rel_type = item.get("relationship_type", "NONE").upper()
                conf = float(item.get("confidence", 0.0))
                reason = item.get("reason", "")

                # Python Validation against database authority
                st_canonical = valid_student_names.get(st_name.lower())
                esco_canonical = valid_esco_names.get(esco_name.lower())

                if not st_canonical or not esco_canonical:
                    continue  # Reject hallucinated skill names

                if rel_type not in ("DIRECT", "STRONG_RELATED", "SUPPORTING", "NONE"):
                    rel_type = "NONE"

                # Apply strict negative evidence rules
                if st_canonical.lower() in ('axios', 'axios library') and 'ios' in esco_canonical.lower():
                    rel_type = "NONE"
                    conf = 0.0
                if st_canonical.lower() == 'r' and 'react' in esco_canonical.lower():
                    rel_type = "NONE"
                    conf = 0.0

                validated_results.append({
                    "student_skill": st_canonical,
                    "career_competency": esco_canonical,
                    "relationship_type": rel_type,
                    "confidence": max(0.0, min(1.0, conf)),
                    "reason": reason,
                    "groq_model": target_model
                })

            return validated_results
    except Exception as exc:
        logger.error(f"Error calling Groq semantic skill relationship evaluator: {exc}")
        return None

