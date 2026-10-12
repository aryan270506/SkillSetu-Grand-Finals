import json
import logging
import time
import zoneinfo
from datetime import datetime, date, timedelta, timezone
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("skillsetu_assessment_presence")

LIVE_HEARTBEAT_TIMEOUT_SECONDS = 15
RECONNECT_TIMEOUT_SECONDS = 45


class AssessmentPresenceService:
    """
    Authoritative real-time candidate presence & session state engine.
    
    Responsibilities:
    1. Tracks live candidate heartbeats per assessment session.
    2. Enforces live vs reconnecting vs offline state timeouts.
    3. Resolves timezone-aware PostgreSQL schedules and formats standard date/time.
    4. Computes server-authoritative candidate assessment status (SCHEDULED, WAITING_FOR_CANDIDATE, LIVE, RECONNECTING, COMPLETED, etc.).
    5. Strictly gates 'can_view_live' so View Live only appears during verified active sessions.
    """

    _heartbeats: Dict[str, Dict[str, Any]] = {}
    _lock = Lock()

    @classmethod
    def record_heartbeat(
        cls,
        session_id: str,
        student_id: Optional[int] = None,
        round_key: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Registers candidate heartbeat for an active assessment session.
        """
        if not session_id:
            return {"status": "error", "message": "session_id required"}

        s_clean = str(session_id).strip()
        now_ts = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()

        with cls._lock:
            existing = cls._heartbeats.get(s_clean, {})
            cls._heartbeats[s_clean] = {
                "session_id": s_clean,
                "student_id": student_id or existing.get("student_id"),
                "round_key": round_key or existing.get("round_key"),
                "last_heartbeat_at": now_ts,
                "last_heartbeat_iso": now_iso,
                "candidate_connected": True,
                "metadata": metadata or existing.get("metadata") or {}
            }

        return {
            "status": "success",
            "session_id": s_clean,
            "presence": "LIVE",
            "last_heartbeat_iso": now_iso,
            "candidate_connected": True
        }

    @classmethod
    def record_disconnect(cls, session_id: str) -> None:
        """
        Marks a candidate disconnected immediately.
        """
        if not session_id:
            return
        s_clean = str(session_id).strip()
        with cls._lock:
            if s_clean in cls._heartbeats:
                cls._heartbeats[s_clean]["candidate_connected"] = False
                cls._heartbeats[s_clean]["last_heartbeat_at"] = 0.0

    @classmethod
    def get_presence(cls, session_id: Optional[str]) -> Dict[str, Any]:
        """
        Calculates presence based on elapsed seconds since last heartbeat.
        - elapsed <= 15s: LIVE
        - 15s < elapsed <= 45s: RECONNECTING
        - > 45s or no heartbeat: OFFLINE
        """
        if not session_id:
            return {
                "presence": "OFFLINE",
                "candidate_connected": False,
                "seconds_since_heartbeat": None,
                "last_heartbeat_at": None,
                "last_heartbeat_iso": None,
                "livekit_connected": False
            }

        s_clean = str(session_id).strip()
        now_ts = time.time()

        with cls._lock:
            entry = cls._heartbeats.get(s_clean)

        if not entry or not entry.get("last_heartbeat_at"):
            return {
                "presence": "OFFLINE",
                "candidate_connected": False,
                "seconds_since_heartbeat": None,
                "last_heartbeat_at": None,
                "last_heartbeat_iso": None,
                "livekit_connected": False
            }

        elapsed = max(0.0, now_ts - float(entry["last_heartbeat_at"]))
        last_iso = entry.get("last_heartbeat_iso")

        if elapsed <= LIVE_HEARTBEAT_TIMEOUT_SECONDS:
            return {
                "presence": "LIVE",
                "candidate_connected": True,
                "seconds_since_heartbeat": round(elapsed, 1),
                "last_heartbeat_at": entry["last_heartbeat_at"],
                "last_heartbeat_iso": last_iso,
                "livekit_connected": True
            }
        elif elapsed <= RECONNECT_TIMEOUT_SECONDS:
            return {
                "presence": "RECONNECTING",
                "candidate_connected": True,
                "seconds_since_heartbeat": round(elapsed, 1),
                "last_heartbeat_at": entry["last_heartbeat_at"],
                "last_heartbeat_iso": last_iso,
                "livekit_connected": True
            }
        else:
            return {
                "presence": "OFFLINE",
                "candidate_connected": False,
                "seconds_since_heartbeat": round(elapsed, 1),
                "last_heartbeat_at": entry["last_heartbeat_at"],
                "last_heartbeat_iso": last_iso,
                "livekit_connected": False
            }

    @classmethod
    def resolve_round_schedule(
        cls,
        pipeline_config: Optional[Any],
        round_key: str,
        fallback_dt: Optional[datetime] = None,
        custom_tz: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Authoritatively extracts round schedule from PostgreSQL pipeline_config JSON.
        Returns UTC timestamps, configured timezone, and formatted display date/time.
        """
        p_dict = {}
        if pipeline_config:
            try:
                p_dict = json.loads(pipeline_config) if isinstance(pipeline_config, str) else pipeline_config
            except Exception:
                p_dict = {}

        round_cfg = p_dict.get(round_key, {}) if isinstance(p_dict, dict) else {}
        if not isinstance(round_cfg, dict):
            round_cfg = {}

        sched_obj = round_cfg.get("schedule", {}) if isinstance(round_cfg.get("schedule"), dict) else {}

        # 1. Resolve Timezone
        tz_str = custom_tz or sched_obj.get("timezone") or round_cfg.get("timezone") or p_dict.get("timezone") or "Asia/Kolkata"
        try:
            tz = zoneinfo.ZoneInfo(tz_str)
        except Exception:
            tz = zoneinfo.ZoneInfo("Asia/Kolkata")
            tz_str = "Asia/Kolkata"

        # 2. Extract Date & Times
        date_str = sched_obj.get("date") or sched_obj.get("start_date") or round_cfg.get("date") or round_cfg.get("scheduledDate")
        start_time_str = sched_obj.get("start") or sched_obj.get("start_time") or round_cfg.get("start") or "10:00"
        end_time_str = sched_obj.get("end") or sched_obj.get("end_time") or round_cfg.get("end") or "22:00"
        dur_min = int(round_cfg.get("durationMinutes") or round_cfg.get("duration_minutes") or round_cfg.get("duration_min") or 30)

        # Pre-calculated UTC boundaries if available
        start_utc_iso = sched_obj.get("start_at_utc")
        end_utc_iso = sched_obj.get("end_at_utc")

        start_dt_utc: Optional[datetime] = None
        end_dt_utc: Optional[datetime] = None

        if start_utc_iso:
            try:
                start_dt_utc = datetime.fromisoformat(start_utc_iso.replace("Z", "+00:00"))
            except Exception:
                pass

        if end_utc_iso:
            try:
                end_dt_utc = datetime.fromisoformat(end_utc_iso.replace("Z", "+00:00"))
            except Exception:
                pass

        if not start_dt_utc and date_str:
            clean_d = str(date_str).strip()
            clean_t = str(start_time_str).strip()
            for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d %I:%M %p", "%Y-%m-%d %I:%M%p", "%Y-%m-%d"]:
                try:
                    target_str = f"{clean_d} {clean_t}" if fmt != "%Y-%m-%d" else clean_d
                    dt_naive = datetime.strptime(target_str, fmt)
                    start_dt_utc = dt_naive.replace(tzinfo=tz).astimezone(timezone.utc)
                    break
                except ValueError:
                    continue

        if not end_dt_utc and date_str:
            clean_d = str(date_str).strip()
            clean_t = str(end_time_str).strip()
            for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d %I:%M %p", "%Y-%m-%d %I:%M%p"]:
                try:
                    dt_naive = datetime.strptime(f"{clean_d} {clean_t}", fmt)
                    end_dt_utc = dt_naive.replace(tzinfo=tz).astimezone(timezone.utc)
                    break
                except ValueError:
                    continue
            if not end_dt_utc and start_dt_utc:
                end_dt_utc = start_dt_utc + timedelta(minutes=dur_min)

        # Fallback to session / application created_at in timezone
        if not start_dt_utc:
            if fallback_dt:
                if fallback_dt.tzinfo is None:
                    fallback_dt = fallback_dt.replace(tzinfo=timezone.utc)
                start_dt_utc = fallback_dt
                end_dt_utc = start_dt_utc + timedelta(minutes=dur_min)
            else:
                now_utc = datetime.now(timezone.utc)
                start_dt_utc = now_utc
                end_dt_utc = now_utc + timedelta(minutes=dur_min)

        # Convert start & end to target configured timezone for display
        start_in_tz = start_dt_utc.astimezone(tz)
        end_in_tz = end_dt_utc.astimezone(tz) if end_dt_utc else (start_in_tz + timedelta(minutes=dur_min))

        # Timezone code / abbreviation
        tz_abbr = start_in_tz.strftime("%Z")
        if not tz_abbr or tz_abbr == "+0530":
            tz_abbr = "IST" if tz_str == "Asia/Kolkata" else tz_str

        # Format components
        formatted_date = start_in_tz.strftime("%d %b %Y")  # e.g. '06 Oct 2026'
        formatted_time = f"{start_in_tz.strftime('%I:%M %p').lstrip('0')} {tz_abbr}"  # e.g. '11:00 PM IST'
        formatted_time_range = f"{start_in_tz.strftime('%I:%M %p').lstrip('0')} – {end_in_tz.strftime('%I:%M %p').lstrip('0')} {tz_abbr}"
        display_datetime = f"{formatted_date} • {formatted_time}"

        # Relative day label relative to target timezone
        now_in_tz = datetime.now(timezone.utc).astimezone(tz)
        start_date = start_in_tz.date()
        today_date = now_in_tz.date()

        if start_date == today_date:
            relative_day = "Today"
        elif start_date == today_date + timedelta(days=1):
            relative_day = "Tomorrow"
        elif start_date == today_date - timedelta(days=1):
            relative_day = "Yesterday"
        else:
            relative_day = ""

        return {
            "timezone": tz_str,
            "timezone_abbr": tz_abbr,
            "start_at_utc": start_dt_utc.isoformat(),
            "end_at_utc": end_dt_utc.isoformat() if end_dt_utc else None,
            "start_at_local": start_in_tz.isoformat(),
            "end_at_local": end_in_tz.isoformat(),
            "formatted_date": formatted_date,
            "formatted_time": formatted_time,
            "formatted_time_range": formatted_time_range,
            "display_datetime": display_datetime,
            "relative_day_label": relative_day,
            "is_today": (start_date == today_date),
            "is_future": (start_dt_utc > datetime.now(timezone.utc)),
            "duration_minutes": dur_min
        }

    @classmethod
    def resolve_candidate_assessment_state(
        cls,
        session: Optional[Any],
        application: Any,
        progression: Dict[str, Any],
        round_schedule: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Determines canonical backend-authoritative assessment state, separating round progress from live presence.
        
        States:
        - SCHEDULED: scheduled window is in the future.
        - WAITING_FOR_CANDIDATE: scheduled start has passed, but candidate has not connected / not live.
        - LIVE: session IN_PROGRESS and recent heartbeat verified (<= 15s).
        - RECONNECTING: session IN_PROGRESS and heartbeat between 15s and 45s.
        - COMPLETED: assessment completed / score recorded.
        - NEEDS_FEEDBACK: completed but awaiting recruiter review.
        - SELECTED: application status SELECTED / HIRED.
        - REJECTED: application status REJECTED.
        - TERMINATED_FOR_INTEGRITY: integrity violation.
        """
        app_status = (getattr(application, "status", None) or "APPLIED").upper()
        sess_status = (getattr(session, "status", None) or "NOT_STARTED").upper() if session else "NOT_STARTED"
        sess_id = getattr(session, "id", None) if session else None
        overall_score = getattr(session, "overall_score", None) if session else getattr(application, "match_score_at_apply", 80.0)
        overall_score = round(overall_score, 1) if overall_score is not None else 80.0

        presence_info = cls.get_presence(sess_id)
        presence = presence_info["presence"]  # "LIVE", "RECONNECTING", "OFFLINE"

        is_completed = (sess_status == "COMPLETED" or progression.get("assessment_status") == "COMPLETED")
        is_terminated = (sess_status in ["TERMINATED", "FAILED"] or getattr(session, "integrity_status", None) in ["HIGH_RISK", "FAILED"])

        # Check awaiting feedback
        has_eval = False
        if session and getattr(session, "evaluation", None):
            try:
                eval_raw = session.evaluation
                eval_obj = json.loads(eval_raw) if isinstance(eval_raw, str) else eval_raw
                if isinstance(eval_obj, dict) and (eval_obj.get("ratings") or eval_obj.get("verdict") or eval_obj.get("feedback")):
                    has_eval = True
            except Exception:
                pass

        now_utc = datetime.now(timezone.utc)
        start_utc_iso = round_schedule.get("start_at_utc")
        scheduled_start_passed = True
        if start_utc_iso:
            try:
                s_dt = datetime.fromisoformat(start_utc_iso.replace("Z", "+00:00"))
                scheduled_start_passed = (now_utc >= s_dt)
            except Exception:
                scheduled_start_passed = True

        # State derivation
        canonical_state = "SCHEDULED"
        status_label = "Scheduled"
        status_bg = "#F1F5F9"
        status_txt = "#475569"
        can_view_live = False
        action_type = "VIEW_DETAILS"
        action_txt = "View Details"

        if is_terminated:
            canonical_state = "TERMINATED_FOR_INTEGRITY"
            status_label = "Terminated (Integrity)"
            status_bg = "#FEE2E2"
            status_txt = "#DC2626"
            can_view_live = False
            action_type = "VIEW_EVALUATION"
            action_txt = "Review Dossier"

        elif app_status in ["SELECTED", "HIRED"]:
            canonical_state = "SELECTED"
            status_label = f"✓ {int(overall_score)}/100 (Selected)"
            status_bg = "#DCFCE7"
            status_txt = "#15803D"
            can_view_live = False
            action_type = "VIEW_EVALUATION"
            action_txt = "Review Dossier"

        elif app_status in ["REJECTED", "NOT_SELECTED"]:
            canonical_state = "REJECTED"
            status_label = "Archived (Rejected)"
            status_bg = "#F1F5F9"
            status_txt = "#94A3B8"
            can_view_live = False
            action_type = "VIEW_DETAILS"
            action_txt = "View Record"

        elif is_completed and not has_eval and app_status not in ["SELECTED", "REJECTED"]:
            canonical_state = "NEEDS_FEEDBACK"
            status_label = "🔔 Needs Feedback"
            status_bg = "#FEF3C7"
            status_txt = "#D97706"
            can_view_live = False
            action_type = "VIEW_EVALUATION"
            action_txt = "Score Now"

        elif is_completed:
            canonical_state = "COMPLETED"
            status_label = f"✓ {int(overall_score)}/100"
            status_bg = "#DCFCE7"
            status_txt = "#15803D"
            can_view_live = False
            action_type = "VIEW_EVALUATION"
            action_txt = "Review Dossier"

        elif sess_status == "IN_PROGRESS" and presence == "LIVE":
            canonical_state = "LIVE"
            status_label = "● In Progress (Live)"
            status_bg = "#DCFCE7"
            status_txt = "#15803D"
            can_view_live = True
            action_type = "VIEW_LIVE"
            action_txt = "View Live"

        elif sess_status == "IN_PROGRESS" and presence == "RECONNECTING":
            canonical_state = "RECONNECTING"
            status_label = "⚠️ Reconnecting..."
            status_bg = "#FEF3C7"
            status_txt = "#D97706"
            can_view_live = True  # allow observer to reconnect to stream
            action_type = "VIEW_LIVE"
            action_txt = "View Live"

        elif scheduled_start_passed:
            # Time reached, but candidate has not joined / no live presence
            canonical_state = "WAITING_FOR_CANDIDATE"
            status_label = "Waiting for Candidate"
            status_bg = "#EFF6FF"
            status_txt = "#2563EB"
            can_view_live = False
            action_type = "VIEW_DETAILS"
            action_txt = "View Details"

        else:
            canonical_state = "SCHEDULED"
            status_label = "Scheduled"
            status_bg = "#F1F5F9"
            status_txt = "#475569"
            can_view_live = False
            action_type = "VIEW_DETAILS"
            action_txt = "View Details"

        return {
            "canonical_state": canonical_state,
            "display_status": canonical_state,
            "status_label": status_label,
            "status_bg": status_bg,
            "status_text": status_txt,
            "status_txt": status_txt,
            "can_view_live": can_view_live,
            "action_type": action_type,
            "action_text": action_txt,
            "presence": presence,
            "presence_info": presence_info,
            "is_live": (canonical_state == "LIVE"),
            "is_reconnecting": (canonical_state == "RECONNECTING"),
            "is_waiting": (canonical_state == "WAITING_FOR_CANDIDATE"),
            "is_completed": is_completed,
            "is_scheduled": (canonical_state == "SCHEDULED")
        }
