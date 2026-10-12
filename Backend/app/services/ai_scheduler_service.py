import json
import logging
import os
import zoneinfo
from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.config import settings

logger = logging.getLogger("skillsetu_ai_scheduler")

ROUND_KEY_TO_TYPE = {
    "aptitude": "APTITUDE",
    "technical": "TECHNICAL",
    "interview": "AI_INTERVIEW",
    "gd": "GROUP_DISCUSSION"
}

TYPE_TO_ROUND_KEY = {
    "APTITUDE": "aptitude",
    "TECHNICAL": "technical",
    "AI_INTERVIEW": "interview",
    "INTERVIEW": "interview",
    "AI_VOICE_INTERVIEW": "interview",
    "GROUP_DISCUSSION": "gd",
    "GD": "gd"
}

ROUND_CANONICAL_NAMES = {
    "aptitude": "Aptitude",
    "technical": "Technical Assessment",
    "interview": "AI Voice Interview",
    "gd": "Group Discussion"
}

DEFAULT_ROUND_DURATIONS = {
    "aptitude": 30,
    "technical": 45,
    "interview": 20,
    "gd": 40
}


def parse_to_utc(date_str: Optional[str], time_str: Optional[str], tz_str: str = "Asia/Kolkata") -> Optional[datetime]:
    if not date_str or not str(date_str).strip():
        return None
    try:
        tz = zoneinfo.ZoneInfo(tz_str)
    except Exception:
        tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    clean_date = str(date_str).strip()
    clean_time = str(time_str or "00:00").strip()

    for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d %I:%M %p", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %I:%M%p"]:
        try:
            dt_naive = datetime.strptime(f"{clean_date} {clean_time}", fmt)
            return dt_naive.replace(tzinfo=tz).astimezone(timezone.utc)
        except ValueError:
            continue

    try:
        dt_naive = datetime.strptime(clean_date, "%Y-%m-%d")
        return dt_naive.replace(tzinfo=tz).astimezone(timezone.utc)
    except ValueError:
        pass

    try:
        dt = datetime.fromisoformat(clean_date.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=tz)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def validate_gemini_schedule_item(
    item: Dict[str, Any],
    start_dt: date,
    end_dt: date,
    expected_type: str,
    expected_seq: int,
    tz_str: str
) -> Dict[str, Any]:
    """
    Validates a single schedule entry returned by Gemini against strict domain rules.
    """
    round_type = str(item.get("roundType") or item.get("round_type") or "").upper()
    if round_type not in TYPE_TO_ROUND_KEY:
        raise ValueError(f"Unknown roundType '{round_type}' in Gemini schedule.")
    
    canonical_key = TYPE_TO_ROUND_KEY[round_type]
    expected_key = TYPE_TO_ROUND_KEY.get(expected_type, expected_type.lower())
    if canonical_key != expected_key:
        raise ValueError(f"Sequence mismatch: expected {expected_key} at position {expected_seq}, got {canonical_key}")

    date_val = str(item.get("date") or item.get("scheduledDate") or item.get("start_date") or "").strip()
    if not date_val or date_val.upper() in ["N/A", "NONE", "NULL", "TBD"]:
        raise ValueError(f"Mandatory date missing for round {round_type}.")

    try:
        round_d = datetime.strptime(date_val, "%Y-%m-%d").date()
    except Exception:
        raise ValueError(f"Invalid date format '{date_val}' for round {round_type}. Expected YYYY-MM-DD.")

    if round_d < start_dt or round_d > end_dt:
        raise ValueError(f"Date {date_val} for {round_type} is outside assessment window [{start_dt}, {end_dt}].")

    dur = int(item.get("durationMinutes") or item.get("duration_minutes") or item.get("duration") or DEFAULT_ROUND_DURATIONS.get(canonical_key, 30))
    if dur <= 0:
        raise ValueError(f"Invalid duration {dur} for round {round_type}.")

    sched_type = str(item.get("scheduleType") or item.get("schedule_mode") or "").upper()
    start_time = item.get("start") or item.get("start_time")
    end_time = item.get("end") or item.get("end_time")

    if canonical_key == "interview":
        sched_type = "GEMINI_MANAGED"
        start_time = None
        end_time = None
    elif canonical_key == "gd":
        sched_type = "FIXED_SESSION"
        if not start_time:
            start_time = "16:00"
        try:
            st_dt = datetime.strptime(str(start_time).strip(), "%H:%M")
            end_time = (st_dt + timedelta(minutes=dur)).strftime("%H:%M")
        except Exception:
            start_time = "16:00"
            end_time = "16:40"
    else:
        sched_type = "FLEXIBLE_WINDOW"
        if not start_time:
            start_time = "10:00"
        if not end_time:
            end_time = "22:00"

    return {
        "roundType": ROUND_KEY_TO_TYPE.get(canonical_key, round_type),
        "round_key": canonical_key,
        "sequence": expected_seq,
        "scheduleType": sched_type,
        "date": date_val,
        "start": start_time,
        "end": end_time,
        "durationMinutes": dur,
        "timezone": tz_str
    }


def call_gemini_scheduler(
    gemini_input: Dict[str, Any],
    start_dt: date,
    end_dt: date,
    ordered_keys: List[str],
    tz_str: str,
    max_attempts: int = 3
) -> List[Dict[str, Any]]:
    """
    Calls Google Gemini with structured JSON Schema to generate an optimal assessment schedule.
    Retries up to max_attempts on recoverable errors or validation failures.
    """
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not configured. Falling back to deterministic scheduling planner.")
        return []

    model_name = settings.GEMINI_MODEL or os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"

    system_instruction = """You are an expert AI Assessment Scheduler for SkillSetu.
Your job is to generate an optimal, conflict-free multi-round assessment schedule for candidates.
Rules:
1. All dates must strictly lie within [start_date, end_date] in format YYYY-MM-DD.
2. The sequence of rounds MUST strictly match the provided roundSequence order.
3. Every enabled round MUST have a valid date.
4. AI_INTERVIEW MUST have a valid assigned Date inside the assessment window. Its scheduleType is "GEMINI_MANAGED", and its start/end times should be null because exact candidate slots are allocated later.
5. GROUP_DISCUSSION has scheduleType "FIXED_SESSION" with synchronized start (e.g., "16:00") and end time.
6. APTITUDE and TECHNICAL have scheduleType "FLEXIBLE_WINDOW" with start "10:00" and end "22:00".
7. Return strictly valid JSON object with key "schedule" containing a list of round schedule objects.
"""

    prompt_content = f"""Given the following assessment configuration, generate the optimal schedule:
{json.dumps(gemini_input, indent=2)}

JSON Output format:
{{
  "schedule": [
    {{
      "roundType": "ROUND_TYPE_HERE",
      "sequence": 1,
      "scheduleType": "SCHEDULE_TYPE_HERE",
      "date": "YYYY-MM-DD",
      "start": "HH:MM",
      "end": "HH:MM",
      "durationMinutes": 30
    }}
  ]
}}

Ensure:
- Assessment Window Start: {start_dt.strftime('%Y-%m-%d')}
- Assessment Window End: {end_dt.strftime('%Y-%m-%d')}
- Timezone: {tz_str}
- Sequence Order: {json.dumps(ordered_keys)}
"""

    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"Invoking Gemini scheduler (attempt {attempt}/{max_attempts}) with model {model_name}...")
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt_content,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.1,
                )
            )

            raw_text = response.text
            if not raw_text:
                raise ValueError("Empty response from Gemini model.")

            parsed_data = json.loads(raw_text)
            if isinstance(parsed_data, list):
                schedule_list = parsed_data
            elif isinstance(parsed_data, dict):
                schedule_list = parsed_data.get("schedule") or parsed_data.get("rounds") or []
            else:
                schedule_list = []

            if not isinstance(schedule_list, list) or len(schedule_list) != len(ordered_keys):
                raise ValueError(f"Gemini returned {len(schedule_list) if isinstance(schedule_list, list) else 0} rounds, expected {len(ordered_keys)}.")

            validated_schedule = []
            for idx, expected_key in enumerate(ordered_keys):
                raw_item = schedule_list[idx]
                expected_type = ROUND_KEY_TO_TYPE.get(expected_key, expected_key.upper())
                val_item = validate_gemini_schedule_item(
                    raw_item, start_dt, end_dt, expected_type, idx + 1, tz_str
                )
                validated_schedule.append(val_item)

            logger.info(f"Gemini schedule generated and validated successfully on attempt {attempt}.")
            return validated_schedule

        except Exception as e:
            logger.warning(f"Gemini scheduling attempt {attempt} failed: {e}")
            if attempt == max_attempts:
                logger.error(f"All {max_attempts} Gemini scheduling attempts failed.")

    return []


def generate_deterministic_schedule(
    start_dt: date,
    end_dt: date,
    ordered_keys: List[str],
    pipe_dict: Dict[str, Any],
    tz_str: str
) -> List[Dict[str, Any]]:
    """
    Deterministic schedule generator that strictly respects round sequence,
    distributes dates evenly across the window, and provides mandatory dates for all rounds.
    """
    total_days = max(0, (end_dt - start_dt).days)
    n_rounds = len(ordered_keys)
    result = []

    for i, r_k in enumerate(ordered_keys):
        if n_rounds == 1:
            round_date = start_dt
        else:
            day_offset = int(round(i * (total_days / max(1, n_rounds - 1)))) if total_days >= (n_rounds - 1) else min(i, total_days)
            round_date = start_dt + timedelta(days=day_offset)

        round_d_str = round_date.strftime("%Y-%m-%d")
        r_info = pipe_dict.get(r_k, {})
        dur = r_info.get("duration_minutes") or r_info.get("duration_min") or DEFAULT_ROUND_DURATIONS.get(r_k, 30)

        if r_k == "interview":
            result.append({
                "roundType": "AI_INTERVIEW",
                "round_key": "interview",
                "sequence": i + 1,
                "scheduleType": "GEMINI_MANAGED",
                "date": round_d_str,
                "start": None,
                "end": None,
                "durationMinutes": dur,
                "timezone": tz_str
            })
        elif r_k == "gd":
            prep_m = r_info.get("prep_time_min", 2)
            disc_m = r_info.get("discussion_time_min", 10)
            total_gd_m = prep_m + disc_m
            gd_start = "16:00"
            gd_end = (datetime.strptime(gd_start, "%H:%M") + timedelta(minutes=total_gd_m)).strftime("%H:%M")
            result.append({
                "roundType": "GROUP_DISCUSSION",
                "round_key": "gd",
                "sequence": i + 1,
                "scheduleType": "FIXED_SESSION",
                "date": round_d_str,
                "start": gd_start,
                "end": gd_end,
                "durationMinutes": total_gd_m,
                "timezone": tz_str
            })
        else:
            r_type = "APTITUDE" if r_k == "aptitude" else "TECHNICAL"
            result.append({
                "roundType": r_type,
                "round_key": r_k,
                "sequence": i + 1,
                "scheduleType": "FLEXIBLE_WINDOW",
                "date": round_d_str,
                "start": "10:00",
                "end": "22:00",
                "durationMinutes": dur,
                "timezone": tz_str
            })

    return result


def schedule_assessment_pipeline(
    start_date_str: str,
    end_date_str: str,
    tz_str: str,
    pipeline_dict: Dict[str, Any],
    round_sequence: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Main entry point for generating a validated assessment schedule.
    1. Validates inputs & boundaries
    2. Builds structured Gemini input
    3. Calls Gemini API with fallback
    4. Enforces backend validation
    5. Formats schedule timeline with canonical names and durations
    """
    try:
        start_dt = datetime.strptime(start_date_str.strip(), "%Y-%m-%d").date()
        end_dt = datetime.strptime(end_date_str.strip(), "%Y-%m-%d").date()
    except Exception:
        raise ValueError("Invalid date format for assessment window. Expected YYYY-MM-DD.")

    if start_dt > end_dt:
        raise ValueError("Assessment Start Date cannot be after End Date.")

    canonical_all = ["aptitude", "technical", "interview", "gd"]
    seq_input = round_sequence or ["aptitude", "technical", "interview", "gd"]
    
    # Filter enabled rounds strictly preserving recruiter sequence
    ordered_rounds = [r for r in seq_input if r in pipeline_dict and pipeline_dict[r].get("enabled", True)]
    for r in canonical_all:
        if r in pipeline_dict and pipeline_dict[r].get("enabled", True) and r not in ordered_rounds:
            ordered_rounds.append(r)

    if not ordered_rounds:
        raise ValueError("At least one assessment round must be enabled to generate a schedule.")

    # Prepare structured Gemini input
    gemini_rounds = []
    for r_k in ordered_rounds:
        r_info = pipeline_dict.get(r_k, {})
        dur = r_info.get("duration_minutes") or r_info.get("duration_min") or DEFAULT_ROUND_DURATIONS.get(r_k, 30)
        gemini_rounds.append({
            "type": ROUND_KEY_TO_TYPE.get(r_k, r_k.upper()),
            "durationMinutes": dur
        })

    gemini_input = {
        "assessmentWindow": {
            "start": start_date_str,
            "end": end_date_str,
            "timezone": tz_str
        },
        "roundSequence": [ROUND_KEY_TO_TYPE.get(r, r.upper()) for r in ordered_rounds],
        "rounds": gemini_rounds
    }

    # Attempt Gemini Schedule Generation
    schedule_data = call_gemini_scheduler(
        gemini_input=gemini_input,
        start_dt=start_dt,
        end_dt=end_dt,
        ordered_keys=ordered_rounds,
        tz_str=tz_str
    )

    # Fallback if Gemini unavailable or returned invalid schema
    if not schedule_data:
        logger.info("Using deterministic schedule planner to ensure 100% strict compliance.")
        schedule_data = generate_deterministic_schedule(
            start_dt=start_dt,
            end_dt=end_dt,
            ordered_keys=ordered_rounds,
            pipe_dict=pipeline_dict,
            tz_str=tz_str
        )

    # Update pipeline_dict with generated schedules
    for item in schedule_data:
        r_k = item["round_key"]
        dur = item["durationMinutes"]
        s_date = item["date"]
        s_mode = "GEMINI_MANAGED" if item["scheduleType"] == "GEMINI_MANAGED" else ("fixed_session" if item["scheduleType"] == "FIXED_SESSION" else "flexible_window")
        
        pipe_dict_entry = pipeline_dict.get(r_k, {})
        pipe_dict_entry["sequence"] = item["sequence"]
        pipe_dict_entry["duration_min"] = dur
        
        sched_entry = {
            "sequence": item["sequence"],
            "schedule_mode": s_mode,
            "start_date": s_date,
            "start_time": item.get("start"),
            "end_date": s_date if s_mode != "flexible_window" else min(datetime.strptime(s_date, "%Y-%m-%d").date() + timedelta(days=1), end_dt).strftime("%Y-%m-%d"),
            "end_time": item.get("end"),
            "timezone": tz_str,
            "duration_minutes": dur,
        }

        if s_mode != "GEMINI_MANAGED":
            s_utc = parse_to_utc(sched_entry["start_date"], sched_entry["start_time"], tz_str)
            e_utc = parse_to_utc(sched_entry["end_date"], sched_entry["end_time"], tz_str)
            sched_entry["start_at_utc"] = s_utc.isoformat() if s_utc else None
            sched_entry["end_at_utc"] = e_utc.isoformat() if e_utc else None
        else:
            sched_entry["start_at_utc"] = None
            sched_entry["end_at_utc"] = None

        pipe_dict_entry["schedule"] = sched_entry
        pipeline_dict[r_k] = pipe_dict_entry

    pipeline_dict["round_sequence"] = ordered_rounds

    # Build review schedule / timeline with all canonical names and duration labels
    schedule_timeline = []
    for item in schedule_data:
        r_k = item["round_key"]
        r_name = ROUND_CANONICAL_NAMES.get(r_k, r_k.capitalize())
        dur = item["durationMinutes"]
        s_mode = item["scheduleType"]
        mode_label = "Gemini Managed" if s_mode == "GEMINI_MANAGED" else ("Fixed Session" if s_mode == "FIXED_SESSION" else "Flexible Window")
        
        time_display = item.get("start") or ("Gemini Managed" if s_mode == "GEMINI_MANAGED" else "Flexible Window")

        schedule_timeline.append({
            "sequence": item["sequence"],
            "round_key": r_k,
            "round_id": r_k,
            "roundId": r_k,
            "round_type": item["roundType"],
            "roundType": item["roundType"],
            "round": r_name,
            "round_name": r_name,
            "displayName": r_name,
            "display_name": r_name,
            "label": r_name,
            "name": r_name,
            "schedule_mode": s_mode,
            "scheduleMode": s_mode,
            "schedule_type": mode_label,
            "scheduleType": mode_label,
            "date": item["date"],
            "scheduled_date": item["date"],
            "scheduledDate": item["date"],
            "start_date": item["date"],
            "time": time_display,
            "start_time": item.get("start"),
            "scheduled_start": item.get("start"),
            "scheduledStart": item.get("start"),
            "end_date": pipeline_dict[r_k]["schedule"]["end_date"],
            "end_time": item.get("end"),
            "scheduled_end": item.get("end"),
            "scheduledEnd": item.get("end"),
            "duration": dur,
            "duration_min": dur,
            "duration_minutes": dur,
            "durationMinutes": dur,
            "duration_display": f"{dur} min",
            "timezone": tz_str
        })

    return {
        "assessment_window": {
            "start_date": start_date_str,
            "end_date": end_date_str,
            "timezone": tz_str
        },
        "round_sequence": ordered_rounds,
        "schedule": schedule_timeline,
        "schedule_timeline": schedule_timeline,
        "pipeline_config": pipeline_dict
    }
