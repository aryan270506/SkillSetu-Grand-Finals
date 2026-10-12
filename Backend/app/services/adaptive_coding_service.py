import json
import logging
import hashlib
import time
import urllib.request
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models
from app.services.code_sandbox_service import execute_code_in_sandbox
from app.services.groq_service import key_manager
from app.services.skill_evidence_service import aggregate_skill_scores
from app.config import settings

logger = logging.getLogger("adaptive_coding_service")

# ===========================================================================
# 1. DETERMINISTIC SEED CHALLENGE REPOSITORY (NO SOLUTIONS IN STARTER CODE)
# ===========================================================================
BUILTIN_CHALLENGES = [
    {
        "id": "ch_sql_opt_01",
        "skill_name": "SQL Query Optimization",
        "title": "High-Volume Order Window Aggregation with Indexing",
        "difficulty": "intermediate",
        "language": "sql",
        "concepts": ["Composite Indexing", "Window Functions", "Filter Optimization"],
        "why_this_challenge": "Targeted practice for SQL optimization and query throughput bottlenecks in backend roles.",
        "description": (
            "You are given an e-commerce database with table `orders`:\n"
            "- `id` (INTEGER)\n"
            "- `user_id` (INTEGER)\n"
            "- `amount` (FLOAT)\n"
            "- `status` (TEXT: 'completed', 'pending', 'cancelled')\n"
            "- `order_date` (TEXT)\n\n"
            "Write a high-efficiency SQL query that returns the `user_id` and total spent (`total_spent`) for users "
            "who spent more than 500.00 across all 'completed' orders. Order the results by `total_spent` DESCENDING."
        ),
        "constraints": [
            "Filter strictly for status = 'completed'",
            "Include only users with total_spent > 500.00",
            "Result columns: user_id, total_spent"
        ],
        "examples": [
            {
                "input": "orders: (1, 101, 350.0, 'completed', '2026-01-01'), (2, 101, 200.0, 'completed', '2026-01-02'), (3, 102, 100.0, 'completed', '2026-01-01')",
                "output": "[(101, 550.0)]",
                "explanation": "User 101 spent 550.0 total, which is > 500.0."
            }
        ],
        "schema_sql": """
            CREATE TABLE orders (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                amount REAL,
                status TEXT,
                order_date TEXT
            );
            INSERT INTO orders VALUES (1, 101, 350.0, 'completed', '2026-01-01');
            INSERT INTO orders VALUES (2, 101, 250.0, 'completed', '2026-01-02');
            INSERT INTO orders VALUES (3, 102, 120.0, 'completed', '2026-01-03');
            INSERT INTO orders VALUES (4, 103, 800.0, 'completed', '2026-01-04');
            INSERT INTO orders VALUES (5, 103, 300.0, 'cancelled', '2026-01-05');
            INSERT INTO orders VALUES (6, 104, 500.0, 'completed', '2026-01-06');
        """,
        "starter_code": "",  # STRICTLY EMPTY FOR SQL
        "test_cases": [
            {
                "description": "Verify high-volume user filtration and sorting",
                "input": "Default Orders Schema",
                "expected_output": [[103, 800.0], [101, 600.0]],
                "is_hidden": False
            },
            {
                "description": "Edge Case: Exclude exact 500 threshold and cancelled amounts",
                "input": "Hidden Fixture Dataset",
                "expected_output": [[103, 800.0], [101, 600.0]],
                "is_hidden": True
            }
        ],
        "hints": [
            "Review how the query filters rows before aggregation versus after aggregation.",
            "Check whether the status filter belongs in WHERE and the sum threshold belongs in HAVING.",
            "Focus on the aggregate expression and ensure total_spent is ordered DESC."
        ],
        "xp_reward": 35
    },
    {
        "id": "ch_py_ratelimit_02",
        "skill_name": "Distributed Systems & Concurrency",
        "title": "Sliding Window Rate Limiter Implementation",
        "difficulty": "intermediate",
        "language": "python",
        "concepts": ["Sliding Window", "Rate Limiting", "State Management"],
        "why_this_challenge": "Reinforces concurrency and distributed request throttling required for backend platforms.",
        "description": (
            "Implement a function `is_request_allowed(request_timestamps, current_time, window_size, max_requests)`.\n"
            "- `request_timestamps`: list of past integer timestamps (in seconds) for a client.\n"
            "- `current_time`: current integer timestamp.\n"
            "- `window_size`: duration of the rate limit sliding window in seconds.\n"
            "- `max_requests`: maximum number of allowed requests in the window.\n\n"
            "Return `True` if the new request at `current_time` is allowed, otherwise `False`."
        ),
        "constraints": [
            "Timestamps are strictly non-negative integers.",
            "Window is inclusive of (current_time - window_size, current_time]."
        ],
        "examples": [
            {
                "input": "([1, 2, 5], 10, 10, 3)",
                "output": "False",
                "explanation": "Within window (0, 10], there are already 3 requests [1, 2, 5]. A 4th request exceeds max_requests=3."
            }
        ],
        "starter_code": "def is_request_allowed(request_timestamps, current_time, window_size, max_requests):\n    # Write your solution here\n    pass\n",
        "test_cases": [
            {
                "description": "Standard within-limit request",
                "input": [[1, 2, 5], 10, 10, 5],
                "expected_output": True,
                "is_hidden": False
            },
            {
                "description": "Window saturated limit exceeded",
                "input": [[1, 2, 3], 4, 5, 3],
                "expected_output": False,
                "is_hidden": False
            },
            {
                "description": "Expired timestamps outside window",
                "input": [[1, 2, 3], 20, 5, 2],
                "expected_output": True,
                "is_hidden": True
            }
        ],
        "hints": [
            "Calculate cutoff = current_time - window_size to determine the active window threshold.",
            "Count how many existing timestamps are strictly greater than cutoff.",
            "If active request count < max_requests, return True, else False."
        ],
        "xp_reward": 40
    },
    {
        "id": "ch_js_eventloop_03",
        "skill_name": "JavaScript",
        "title": "Debounce Async Task Batcher",
        "difficulty": "intermediate",
        "language": "javascript",
        "concepts": ["Asynchronous JS", "Timers & Closures", "Batch Processing"],
        "why_this_challenge": "Essential frontend & fullstack competency for UI event optimization and API load reduction.",
        "description": (
            "Write a function `batchItems(items, batchSize)` that partitions an array of items into chunks of `batchSize`.\n"
            "If the last chunk contains fewer elements, it should still be included as the final sub-array."
        ),
        "constraints": [
            "items is an array of primitives or objects.",
            "batchSize >= 1."
        ],
        "examples": [
            {
                "input": "([1, 2, 3, 4, 5], 2)",
                "output": "[[1, 2], [3, 4], [5]]",
                "explanation": "Partitioned into sub-arrays of maximum length 2."
            }
        ],
        "starter_code": "function solution(items, batchSize) {\n    // Write your solution here\n}\n",
        "test_cases": [
            {
                "description": "Even partition",
                "input": [[1, 2, 3, 4], 2],
                "expected_output": [[1, 2], [3, 4]],
                "is_hidden": False
            },
            {
                "description": "Uneven remainder chunk",
                "input": [["a", "b", "c", "d", "e"], 3],
                "expected_output": [["a", "b", "c"], ["d", "e"]],
                "is_hidden": False
            },
            {
                "description": "Empty input array",
                "input": [[], 4],
                "expected_output": [],
                "is_hidden": True
            }
        ],
        "hints": [
            "Use a loop incrementing by batchSize: for (let i = 0; i < items.length; i += batchSize).",
            "Slice items from i to i + batchSize and push each chunk into the results array."
        ],
        "xp_reward": 30
    },
    {
        "id": "ch_py_tree_depth_04",
        "skill_name": "Data Structures & Algorithms",
        "title": "Binary Tree Maximum Path Depth",
        "difficulty": "beginner",
        "language": "python",
        "concepts": ["Recursion", "Tree Traversal", "Depth-First Search"],
        "why_this_challenge": "Foundational algorithmic reasoning for technical interviews.",
        "description": (
            "Given a nested dictionary representation of a binary tree node `{'val': int, 'left': node or None, 'right': node or None}`,\n"
            "write a function `max_depth(root)` that returns the maximum depth from root to the furthest leaf node.\n"
            "An empty tree (`None`) has depth 0."
        ),
        "constraints": ["Depth of tree <= 1000 nodes."],
        "examples": [
            {
                "input": "{'val': 1, 'left': {'val': 2, 'left': None, 'right': None}, 'right': None}",
                "output": "2",
                "explanation": "Root 1 -> Left 2 gives depth 2."
            }
        ],
        "starter_code": "def max_depth(root):\n    # Write your solution here\n    pass\n",
        "test_cases": [
            {
                "description": "Empty root",
                "input": None,
                "expected_output": 0,
                "is_hidden": False
            },
            {
                "description": "2-Level binary tree",
                "input": {"val": 3, "left": {"val": 9, "left": None, "right": None}, "right": {"val": 20, "left": None, "right": None}},
                "expected_output": 2,
                "is_hidden": False
            },
            {
                "description": "Asymmetric 3-Level tree",
                "input": {"val": 1, "left": None, "right": {"val": 2, "left": None, "right": {"val": 3, "left": None, "right": None}}},
                "expected_output": 3,
                "is_hidden": True
            }
        ],
        "hints": [
            "Base case: if root is None return 0.",
            "Recursive step: 1 + max(max_depth(root.get('left')), max_depth(root.get('right')))."
        ],
        "xp_reward": 25
    }
]


# ===========================================================================
# 2. ADAPTIVE CHALLENGE GENERATION & SELECTION ENGINE
# ===========================================================================
def get_or_generate_adaptive_challenge(
    db: Session,
    student_id: int,
    target_career: Optional[str] = None,
    preferred_gap_skill: Optional[str] = None,
    force_new: bool = False
) -> Dict[str, Any]:
    """
    Selects or synthesizes the next adaptive coding challenge tailored to the student's
    skill gap, difficulty level, and past attempt history.
    """
    # 1. Fetch student's progress record
    progress = db.query(models.AdaptiveCodingProgress).filter(
        models.AdaptiveCodingProgress.student_id == student_id
    ).first()

    if not progress:
        progress = models.AdaptiveCodingProgress(
            student_id=student_id,
            current_difficulty="intermediate",
            completed_challenges_count=0,
            completed_challenge_ids_json="[]",
            failed_challenge_ids_json="[]",
            weak_concepts_json="[]",
            mastered_concepts_json="[]",
            total_xp_earned=0
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)

    completed_ids = set(json.loads(progress.completed_challenge_ids_json or "[]"))
    weak_concepts = json.loads(progress.weak_concepts_json or "[]")

    # 2. If student already has an active incomplete challenge and not forced new, return it
    if progress.current_challenge_id and not force_new and progress.current_challenge_id not in completed_ids:
        ch = db.query(models.AdaptiveCodingChallenge).filter(
            models.AdaptiveCodingChallenge.id == progress.current_challenge_id
        ).first()
        if ch:
            return _format_challenge_dict(ch, progress)

    # 3. Determine target gap skill
    target_skill = preferred_gap_skill
    if not target_skill:
        target_skill = "SQL Query Optimization" if "SQL" in (target_career or "") else "Python"

    # 4. Determine adaptive difficulty
    difficulty = progress.current_difficulty or "intermediate"
    if progress.consecutive_successes >= 2:
        difficulty = "advanced" if difficulty == "intermediate" else "intermediate"
    elif progress.consecutive_failures >= 2:
        difficulty = "beginner"

    # 5. Look for an available challenge in database / built-in repository matching skill & not yet completed
    candidate = None
    
    # Check DB challenges
    db_candidates = db.query(models.AdaptiveCodingChallenge).filter(
        ~models.AdaptiveCodingChallenge.id.in_(completed_ids) if completed_ids else True
    ).all()
    
    for c in db_candidates:
        if target_skill.lower() in c.skill_name.lower() or c.skill_name.lower() in target_skill.lower():
            candidate = c
            break
            
    if not candidate:
        # Check builtins
        for b in BUILTIN_CHALLENGES:
            if b["id"] not in completed_ids:
                if not target_skill or target_skill.lower() in b["skill_name"].lower() or b["skill_name"].lower() in target_skill.lower() or not candidate:
                    candidate = _persist_challenge_dict(db, b)
                    break

    if not candidate:
        # Fallback to any uncompleted builtin
        for b in BUILTIN_CHALLENGES:
            if b["id"] not in completed_ids:
                candidate = _persist_challenge_dict(db, b)
                break

    if not candidate:
        # Generate dynamic challenge with Groq LLM
        candidate = _generate_dynamic_challenge_with_groq(db, target_skill, target_career, difficulty, weak_concepts)

    if not candidate:
        candidate = _persist_challenge_dict(db, BUILTIN_CHALLENGES[0])

    # Update student current challenge
    progress.current_challenge_id = candidate.id
    progress.current_skill_name = candidate.skill_name
    progress.current_difficulty = candidate.difficulty
    db.commit()

    return _format_challenge_dict(candidate, progress)


# ===========================================================================
# 3. CODE EXECUTION & EVALUATION WORKFLOW
# ===========================================================================
def execute_and_evaluate_challenge(
    db: Session,
    student_id: int,
    challenge_id: str,
    code: str,
    is_submission: bool = False
) -> Dict[str, Any]:
    """
    Executes student code in the sandbox against both visible and hidden test cases.
    If is_submission=True and all tests pass:
      - Marks challenge completed
      - Updates XP and learning evidence
      - Prepares next adaptive challenge
    """
    code_clean = (code or "").strip()
    if not code_clean:
        return {
            "passed": False,
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "compile_error": "Write your solution before running the code.",
            "runtime_error": None,
            "test_results": [],
            "execution_time_ms": 0.0,
            "is_completed": False
        }

    challenge = db.query(models.AdaptiveCodingChallenge).filter(
        models.AdaptiveCodingChallenge.id == challenge_id
    ).first()

    if not challenge:
        for b in BUILTIN_CHALLENGES:
            if b["id"] == challenge_id:
                challenge = _persist_challenge_dict(db, b)
                break

    if not challenge:
        return {
            "passed": False,
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "compile_error": "Challenge not found in system.",
            "runtime_error": None,
            "test_results": [],
            "execution_time_ms": 0.0,
            "is_completed": False
        }

    test_cases = json.loads(challenge.test_cases_json or "[]")
    
    # Run in sandbox
    sandbox_res = execute_code_in_sandbox(
        language=challenge.language,
        code=code_clean,
        test_cases=test_cases,
        schema_sql=challenge.schema_sql
    )

    passed_all = sandbox_res.get("passed", False)
    
    # Fetch progress
    progress = db.query(models.AdaptiveCodingProgress).filter(
        models.AdaptiveCodingProgress.student_id == student_id
    ).first()

    if not progress:
        progress = models.AdaptiveCodingProgress(student_id=student_id)
        db.add(progress)
        db.commit()

    # Count prior attempts for this challenge
    attempt_count = db.query(models.AdaptiveCodingAttempt).filter(
        models.AdaptiveCodingAttempt.student_id == student_id,
        models.AdaptiveCodingAttempt.challenge_id == challenge_id
    ).count() + 1

    # Record Attempt
    attempt = models.AdaptiveCodingAttempt(
        student_id=student_id,
        challenge_id=challenge_id,
        skill_name=challenge.skill_name,
        language=challenge.language,
        code_submitted=code_clean,
        passed=passed_all,
        passed_tests=sandbox_res.get("passed_tests", 0),
        total_tests=sandbox_res.get("total_tests", 0),
        test_results_json=json.dumps(sandbox_res.get("test_results", [])),
        compile_error=sandbox_res.get("compile_error"),
        runtime_error=sandbox_res.get("runtime_error"),
        execution_time_ms=sandbox_res.get("execution_time_ms", 0.0),
        attempt_number=attempt_count
    )
    db.add(attempt)

    concepts = json.loads(challenge.concepts_json or "[]")
    completed_ids = json.loads(progress.completed_challenge_ids_json or "[]")
    weak_concepts = json.loads(progress.weak_concepts_json or "[]")
    mastered_concepts = json.loads(progress.mastered_concepts_json or "[]")

    xp_earned = 0
    if passed_all and is_submission:
        if challenge_id not in completed_ids:
            completed_ids.append(challenge_id)
            progress.completed_challenge_ids_json = json.dumps(completed_ids)
            progress.completed_challenges_count = len(completed_ids)
            
            base_xp = challenge.xp_reward or 30
            bonus = 10 if attempt_count == 1 else 0
            xp_earned = base_xp + bonus
            progress.total_xp_earned = (progress.total_xp_earned or 0) + xp_earned

            # Update mastered concepts
            for c in concepts:
                if c not in mastered_concepts:
                    mastered_concepts.append(c)
                if c in weak_concepts:
                    weak_concepts.remove(c)
            progress.mastered_concepts_json = json.dumps(mastered_concepts)
            progress.weak_concepts_json = json.dumps(weak_concepts)

            progress.consecutive_successes = (progress.consecutive_successes or 0) + 1
            progress.consecutive_failures = 0

            # Generate real skill evidence record
            _record_coding_skill_evidence(db, student_id, challenge.skill_name, difficulty=challenge.difficulty)

    elif not passed_all:
        progress.consecutive_failures = (progress.consecutive_failures or 0) + 1
        progress.consecutive_successes = 0
        for c in concepts:
            if c not in weak_concepts and c not in mastered_concepts:
                weak_concepts.append(c)
        progress.weak_concepts_json = json.dumps(weak_concepts)

    db.commit()

    # Diagnostic guidance feedback if failed
    diagnostic_feedback = None
    if not passed_all:
        if sandbox_res.get("compile_error"):
            diagnostic_feedback = "Syntax or compilation error detected. Check missing brackets, commas, or statement syntax."
        elif sandbox_res.get("runtime_error"):
            diagnostic_feedback = f"Runtime error: {sandbox_res.get('runtime_error')}. Check boundary conditions and variable types."
        else:
            diagnostic_feedback = "Logic error: some test cases produced unexpected outputs. Click '💡 Hint' for targeted guidance."

    return {
        "passed": passed_all,
        "is_completed": passed_all and is_submission,
        "total_tests": sandbox_res.get("total_tests", 0),
        "passed_tests": sandbox_res.get("passed_tests", 0),
        "failed_tests": sandbox_res.get("failed_tests", 0),
        "test_results": sandbox_res.get("test_results", []),
        "compile_error": sandbox_res.get("compile_error"),
        "runtime_error": sandbox_res.get("runtime_error"),
        "execution_time_ms": sandbox_res.get("execution_time_ms", 0.0),
        "attempt_number": attempt_count,
        "xp_earned": xp_earned,
        "concepts_mastered": concepts if passed_all else [],
        "diagnostic_feedback": diagnostic_feedback,
        "hints_available": len(json.loads(challenge.hints_json or "[]"))
    }


# ===========================================================================
# 4. REAL-TIME AI & PROGRESSIVE HINT ENGINE
# ===========================================================================
def get_progressive_hint(
    db: Session,
    challenge_id: str,
    hint_level: int = 1,
    student_code: Optional[str] = None,
    compile_error: Optional[str] = None,
    runtime_error: Optional[str] = None,
    failed_tests: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Generates or retrieves a dynamic, educational hint tailored to the problem,
    the student's written code, and the specific failure reason without leaking the answer.
    """
    challenge = db.query(models.AdaptiveCodingChallenge).filter(
        models.AdaptiveCodingChallenge.id == challenge_id
    ).first()

    if not challenge:
        for b in BUILTIN_CHALLENGES:
            if b["id"] == challenge_id:
                challenge = _persist_challenge_dict(db, b)
                break

    hints = json.loads(challenge.hints_json or "[]") if challenge else []
    
    # If student provided code / error data, attempt AI hint generation with Groq
    if (student_code or compile_error or runtime_error or failed_tests) and challenge:
        ai_hint = _generate_ai_hint_with_groq(
            challenge=challenge,
            student_code=student_code,
            compile_error=compile_error,
            runtime_error=runtime_error,
            failed_tests=failed_tests,
            hint_level=hint_level
        )
        if ai_hint:
            return {
                "hint_level": hint_level,
                "total_hints": max(3, len(hints)),
                "hint": ai_hint,
                "has_more": hint_level < max(3, len(hints)),
                "source": "ai_mentor"
            }

    # Deterministic progressive fallback
    level_idx = max(0, min(len(hints) - 1, hint_level - 1)) if hints else 0
    hint_text = hints[level_idx] if hints else "Review the problem constraints and variable definitions carefully."

    return {
        "hint_level": hint_level,
        "total_hints": max(3, len(hints)),
        "hint": hint_text,
        "has_more": hint_level < max(3, len(hints)),
        "source": "curriculum_bank"
    }


def _generate_ai_hint_with_groq(
    challenge: models.AdaptiveCodingChallenge,
    student_code: Optional[str],
    compile_error: Optional[str],
    runtime_error: Optional[str],
    failed_tests: Optional[List[Dict[str, Any]]],
    hint_level: int
) -> Optional[str]:
    """
    Calls Groq to generate a 1-2 sentence constructive hint that points out logic/syntax issues
    without providing the complete answer.
    """
    target_model = settings.GROQ_MODEL or "llama-3.3-70b-versatile"
    
    failure_details = []
    if compile_error:
        failure_details.append(f"Compile Error: {compile_error[:150]}")
    if runtime_error:
        failure_details.append(f"Runtime Error: {runtime_error[:150]}")
    if failed_tests:
        for ft in failed_tests[:2]:
            failure_details.append(f"Failed Test: {ft.get('description')} (Input: {ft.get('input')})")

    prompt = f"""
You are an expert pair-programming AI mentor. Give a concise, encouraging, educational hint to a student working on a coding problem.

Problem: {challenge.title}
Language: {challenge.language}
Requirements: {challenge.description[:300]}
Constraints: {challenge.constraints_json}

Student's Attempted Code:
{student_code or '(No code written yet)'}

Errors / Failures:
{'; '.join(failure_details) if failure_details else 'None reported'}

Hint Tier: Level {hint_level} of 3 ({'General conceptual clue' if hint_level == 1 else 'Logic/boundary guidance' if hint_level == 2 else 'Specific structure pointer'})

CRITICAL RULES:
1. Do NOT write the complete solution or full query.
2. Provide 1 to 2 clear, helpful sentences guiding the student towards fixing their mistake.
3. Return valid JSON only: {{"hint": "your hint text"}}
"""
    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": "You are a coding mentor. Output JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }

    try:
        res_data = key_manager.execute_with_failover(payload, timeout=10)
        content = json.loads(res_data["choices"][0]["message"]["content"])
        return content.get("hint")
    except Exception as e:
        logger.warning(f"Groq AI hint generation failed: {e}")
        return None


# ===========================================================================
# 5. HELPER UTILITIES & PERSISTENCE
# ===========================================================================
def _persist_challenge_dict(db: Session, data: Dict[str, Any]) -> models.AdaptiveCodingChallenge:
    existing = db.query(models.AdaptiveCodingChallenge).filter(
        models.AdaptiveCodingChallenge.id == data["id"]
    ).first()
    if existing:
        existing.starter_code = data.get("starter_code", "") if data.get("language") != "sql" else ""
        existing.hints_json = json.dumps(data.get("hints", []))
        existing.test_cases_json = json.dumps(data.get("test_cases", []))
        if data.get("schema_sql"):
            existing.schema_sql = data.get("schema_sql")
        if data.get("description"):
            existing.description = data.get("description")
        db.commit()
        db.refresh(existing)
        return existing

    obj = models.AdaptiveCodingChallenge(
        id=data["id"],
        skill_name=data["skill_name"],
        title=data["title"],
        difficulty=data.get("difficulty", "intermediate"),
        language=data.get("language", "python"),
        concepts_json=json.dumps(data.get("concepts", [])),
        why_this_challenge=data.get("why_this_challenge", ""),
        description=data["description"],
        constraints_json=json.dumps(data.get("constraints", [])),
        examples_json=json.dumps(data.get("examples", [])),
        starter_code=data.get("starter_code", "") if data.get("language") != "sql" else "",
        test_cases_json=json.dumps(data["test_cases"]),
        schema_sql=data.get("schema_sql"),
        hints_json=json.dumps(data.get("hints", [])),
        xp_reward=data.get("xp_reward", 30)
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def _format_challenge_dict(ch: models.AdaptiveCodingChallenge, progress: models.AdaptiveCodingProgress) -> Dict[str, Any]:
    examples = json.loads(ch.examples_json or "[]")
    constraints = json.loads(ch.constraints_json or "[]")
    concepts = json.loads(ch.concepts_json or "[]")
    test_cases = json.loads(ch.test_cases_json or "[]")
    
    # Hide server-side test values for hidden tests in initial prompt payload
    visible_tests = []
    for idx, tc in enumerate(test_cases, 1):
        visible_tests.append({
            "test_num": idx,
            "description": tc.get("description", f"Test Case #{idx}"),
            "input": tc.get("input") if not tc.get("is_hidden") else "<Hidden Input>",
            "expected_output": tc.get("expected_output") if not tc.get("is_hidden") else "<Hidden Expected Output>",
            "is_hidden": tc.get("is_hidden", False)
        })

    completed_ids = json.loads(progress.completed_challenge_ids_json or "[]") if progress else []

    # Ensure SQL starter code is always empty string
    clean_starter = ch.starter_code if ch.language != "sql" else ""

    return {
        "challenge_id": ch.id,
        "skill_name": ch.skill_name,
        "title": ch.title,
        "difficulty": ch.difficulty,
        "language": ch.language,
        "concepts": concepts,
        "why_this_challenge": ch.why_this_challenge or f"Calibrated challenge for {ch.skill_name}.",
        "description": ch.description,
        "constraints": constraints,
        "examples": examples,
        "starter_code": clean_starter,
        "visible_test_cases": visible_tests,
        "total_test_count": len(test_cases),
        "xp_reward": ch.xp_reward or 30,
        "progress_step": len(completed_ids) + 1,
        "completed_count": len(completed_ids),
        "total_xp_earned": progress.total_xp_earned if progress else 0
    }


def _generate_dynamic_challenge_with_groq(
    db: Session,
    skill_name: str,
    target_career: Optional[str],
    difficulty: str,
    weak_concepts: List[str]
) -> models.AdaptiveCodingChallenge:
    target_model = settings.GROQ_MODEL or "llama-3.3-70b-versatile"
    
    prompt = f"""
Generate an adaptive coding practice challenge in JSON format.
Skill: {skill_name}
Target Career: {target_career or 'Software Development Engineer'}
Difficulty: {difficulty} (beginner, intermediate, or advanced)
Weak Concepts to reinforce: {', '.join(weak_concepts) if weak_concepts else 'Core concepts'}

Return JSON matching this exact structure:
{{
  "id": "ch_{skill_name.lower().replace(' ', '_')[:8]}_{int(time.time()) % 10000}",
  "skill_name": "{skill_name}",
  "title": "Clear Technical Title",
  "difficulty": "{difficulty}",
  "language": "python",
  "concepts": ["Concept 1", "Concept 2"],
  "why_this_challenge": "1 sentence explaining why this gap matters",
  "description": "Clear problem statement with instructions",
  "constraints": ["Constraint 1", "Constraint 2"],
  "examples": [
    {{"input": "example input", "output": "example output", "explanation": "why"}}
  ],
  "starter_code": "def solution(arg):\\n    # Write your solution here\\n    pass\\n",
  "test_cases": [
    {{"description": "Visible test", "input": 5, "expected_output": 10, "is_hidden": false}},
    {{"description": "Hidden test", "input": 10, "expected_output": 20, "is_hidden": true}}
  ],
  "hints": ["Hint 1", "Hint 2"],
  "xp_reward": 35
}}
"""
    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": "You are an automated coding assessment generator. Return valid JSON only. Do not put solutions in starter_code."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }

    try:
        res_data = key_manager.execute_with_failover(payload, timeout=15)
        content = res_data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return _persist_challenge_dict(db, parsed)
    except Exception as e:
        logger.warning(f"Groq dynamic challenge generation failed: {e}. Using deterministic fallback.")
        fallback = BUILTIN_CHALLENGES[0].copy()
        fallback["id"] = f"ch_fb_{int(time.time())}"
        fallback["skill_name"] = skill_name
        return _persist_challenge_dict(db, fallback)


def _record_coding_skill_evidence(db: Session, student_id: int, skill_name: str, difficulty: str):
    norm_skill = skill_name.strip()
    evidence_score = 0.85 if difficulty == "advanced" else (0.75 if difficulty == "intermediate" else 0.60)
    
    existing = db.query(models.StudentSkillEvidence).filter(
        models.StudentSkillEvidence.student_id == student_id,
        func.lower(models.StudentSkillEvidence.skill_name) == norm_skill.lower(),
        models.StudentSkillEvidence.source_type == "adaptive_coding_challenge"
    ).first()

    if existing:
        existing.evidence_score = max(existing.evidence_score or 0.0, evidence_score)
        existing.confidence_score = 0.95
        existing.evidence_metadata = json.dumps({
            "source": "SkillSetu Adaptive Practice Engine",
            "difficulty": difficulty,
            "verified_at": time.time()
        })
    else:
        new_ev = models.StudentSkillEvidence(
            student_id=student_id,
            skill_name=norm_skill,
            source_type="adaptive_coding_challenge",
            source_id=f"adaptive_drill_{norm_skill.lower().replace(' ', '_')[:20]}",
            evidence_score=evidence_score,
            confidence_score=0.95,
            evidence_metadata=json.dumps({
                "source": "SkillSetu Adaptive Practice Engine",
                "difficulty": difficulty,
                "verified_at": time.time()
            })
        )
        db.add(new_ev)
    db.commit()
