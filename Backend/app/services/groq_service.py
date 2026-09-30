import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from app.config import settings
from app.services.groq_key_manager import key_manager

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
        res_data = key_manager.execute_with_failover(payload, url=GROQ_API_URL, timeout=15)
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
        res_data = key_manager.execute_with_failover(payload, url=GROQ_API_URL, timeout=15)
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


def generate_dynamic_assessment_with_groq(
    skill_name: str,
    difficulty: str = "intermediate",
    num_questions: int = 20,
    model: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generates dynamic, multiple-choice skill assessment questions using Groq Key Manager.
    Strictly conforms to SkillSetu Rule 35:
    - Minimum 15 questions, maximum 25 questions (default 20)
    - 4 distinct options (A, B, C, D)
    - Valid correct_option
    - Technical explanation
    - Balanced difficulty coverage
    """
    # Enforce Rule 35 bounds
    target_count = max(15, min(25, num_questions))
    target_model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"
    
    system_prompt = (
        "You are an expert technical interviewer and assessment designer for SkillSetu.\n"
        "Your task is to generate a comprehensive, highly accurate technical multiple-choice assessment for the specified skill.\n\n"
        "RULES (STRICT SKILLSETU RULE 35 CONFORMANCE):\n"
        f"1. Generate exactly {target_count} realistic, practical multiple-choice questions targeting '{skill_name}'. Every question MUST be unique.\n"
        f"2. Questions must match '{difficulty}' difficulty level with balanced coverage (e.g. 5 Easy, 10 Medium, 5 Hard).\n"
        "3. Each question must have exactly 4 options with keys 'A', 'B', 'C', 'D'.\n"
        "4. Exactly one option must be the correct answer. 'correct_option' must be 'A', 'B', 'C', or 'D'.\n"
        "5. Include a clear, concise technical explanation for why the correct option is right.\n"
        "6. Do NOT make trick questions, placeholder questions, or duplicate questions. Avoid negative questions like 'Which is NOT'.\n"
        "7. Output MUST strictly be valid JSON."
    )

    user_prompt = (
        f"Skill: {skill_name}\n"
        f"Difficulty: {difficulty}\n"
        f"Question Count: {target_count}\n\n"
        "Return JSON only in this exact format:\n"
        "{\n"
        f'  "title": "{skill_name} Technical Assessment",\n'
        f'  "difficulty": "{difficulty}",\n'
        '  "passing_score": 70,\n'
        '  "questions": [\n'
        '    {\n'
        '      "question_text": "<clear question description>",\n'
        '      "options": {\n'
        '        "A": "<option A>",\n'
        '        "B": "<option B>",\n'
        '        "C": "<option C>",\n'
        '        "D": "<option D>"\n'
        '      },\n'
        '      "correct_option": "A",\n'
        '      "explanation": "<technical explanation>"\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }

    try:
        res_data = key_manager.execute_with_failover(payload, url=GROQ_API_URL, timeout=25)
        content = res_data["choices"][0]["message"]["content"]
        data = json.loads(content)
        
        questions = data.get("questions", [])
        if not isinstance(questions, list) or len(questions) < 15:
            logger.warning(f"Groq generated insufficient questions ({len(questions)}) for {skill_name}. Minimum required is 15.")
            return None

        validated_questions = []
        seen_texts = set()
        for q in questions:
            q_text = (q.get("question_text") or "").strip()
            opts = q.get("options") or {}
            c_opt = (q.get("correct_option") or "").strip().upper()
            expl = (q.get("explanation") or "").strip()

            if not q_text or len(q_text) < 10 or q_text.lower() in seen_texts:
                continue
            if not isinstance(opts, dict) or len(opts) != 4:
                continue
            if c_opt not in ("A", "B", "C", "D"):
                continue
            if not opts.get("A") or not opts.get("B") or not opts.get("C") or not opts.get("D"):
                continue

            seen_texts.add(q_text.lower())
            validated_questions.append({
                "question_text": q_text,
                "options": {
                    "A": str(opts.get("A", "")).strip(),
                    "B": str(opts.get("B", "")).strip(),
                    "C": str(opts.get("C", "")).strip(),
                    "D": str(opts.get("D", "")).strip(),
                },
                "correct_option": c_opt,
                "explanation": expl or f"Option {c_opt} is the correct technical implementation for {skill_name}."
            })

            if len(validated_questions) >= 25:
                break

        if len(validated_questions) < 15:
            logger.warning(f"Valid questions count ({len(validated_questions)}) is below Rule 35 minimum of 15 for {skill_name}.")
            return None

        return {
            "title": data.get("title", f"{skill_name} Technical Assessment"),
            "difficulty": data.get("difficulty", difficulty),
            "passing_score": int(data.get("passing_score", 70)),
            "questions": validated_questions
        }

    except Exception as exc:
        logger.error(f"Error generating dynamic assessment with Groq: {exc}")
        return None


def generate_personalized_project_with_groq(
    skill_name: str,
    target_career: str = "Full Stack Developer",
    difficulty: str = "intermediate",
    student_skills: Optional[List[str]] = None,
    missing_skills: Optional[List[str]] = None,
    model: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generates a personalized, practical coding project targeting a student's gap skill
    in the context of their target career role.
    """
    target_model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"

    system_prompt = (
        "You are an expert technical curriculum designer for SkillSetu.\n"
        "Your task is to design a realistic, production-grade hands-on project assignment for a student.\n"
        "The project MUST target closing a specific skill gap while aligning with their target career role.\n\n"
        "RULES:\n"
        "1. Focus heavily on practical implementation of the target skill.\n"
        "2. Define 3-5 clear, progressive milestones/steps.\n"
        "3. Provide realistic repository deliverables suitable for GitHub verification.\n"
        "4. Output MUST strictly be valid JSON."
    )

    user_prompt = (
        f"Target Skill Gap: {skill_name}\n"
        f"Target Career: {target_career}\n"
        f"Difficulty: {difficulty}\n"
        f"Known Skills: {', '.join(student_skills[:5]) if student_skills else 'Standard Developer Stack'}\n\n"
        "Return JSON only in this exact format:\n"
        "{\n"
        f'  "title": "Production-Grade {skill_name} Practical Service",\n'
        '  "description": "<2-3 sentence project overview>",\n'
        f'  "difficulty": "{difficulty}",\n'
        '  "total_steps": 3,\n'
        f'  "tags": ["{skill_name.upper()}", "PROJECT", "GITHUB"],\n'
        '  "requirements": [\n'
        '    "<Requirement 1>",\n'
        '    "<Requirement 2>",\n'
        '    "<Requirement 3>"\n'
        '  ],\n'
        '  "deliverables": [\n'
        '    "<Deliverable 1>",\n'
        '    "<Deliverable 2>"\n'
        '  ]\n'
        "}"
    )

    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }

    try:
        res_data = key_manager.execute_with_failover(payload, url=GROQ_API_URL, timeout=20)
        content = res_data["choices"][0]["message"]["content"]
        data = json.loads(content)

        return {
            "title": data.get("title", f"Hands-on {skill_name} Project"),
            "description": data.get("description", f"Build a practical {skill_name} service module."),
            "difficulty": data.get("difficulty", difficulty),
            "total_steps": int(data.get("total_steps", 3)),
            "tags": data.get("tags", [skill_name.upper(), "PROJECT"]),
            "requirements": data.get("requirements", []),
            "deliverables": data.get("deliverables", [])
        }

    except Exception as exc:
        logger.error(f"Error generating personalized project with Groq: {exc}")
        return None


