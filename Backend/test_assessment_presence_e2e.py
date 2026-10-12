import os
import sys
import time
import json
from datetime import datetime, timedelta, timezone
import zoneinfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.assessment_presence_service import AssessmentPresenceService
from app.database import get_db, SessionLocal
from app import models
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_all_presence_and_schedule_cases():
    print("=" * 70)
    print("RUNNING RECRUITER ASSESSMENT SCHEDULE & PRESENCE TEST SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # TEST 1: Scheduled tomorrow -> correct future date/time
    # -------------------------------------------------------------
    tz_kolkata = "Asia/Kolkata"
    now_in_kolkata = datetime.now(timezone.utc).astimezone(zoneinfo.ZoneInfo(tz_kolkata))
    tomorrow_date = (now_in_kolkata + timedelta(days=1)).strftime("%Y-%m-%d")

    pipeline_cfg_tomorrow = {
        "round_sequence": ["technical"],
        "timezone": tz_kolkata,
        "technical": {
            "enabled": True,
            "date": tomorrow_date,
            "start": "11:00",
            "end": "11:45",
            "durationMinutes": 45
        }
    }

    sched_res_1 = AssessmentPresenceService.resolve_round_schedule(
        pipeline_config=pipeline_cfg_tomorrow,
        round_key="technical"
    )

    print("\n[TEST 1] Scheduled Tomorrow:")
    print("  Date:", sched_res_1["formatted_date"])
    print("  Time:", sched_res_1["formatted_time"])
    print("  Relative day:", sched_res_1["relative_day_label"])
    print("  Is future:", sched_res_1["is_future"])
    assert sched_res_1["relative_day_label"] == "Tomorrow", f"Expected 'Tomorrow', got {sched_res_1['relative_day_label']}"
    assert "11:00 AM IST" in sched_res_1["formatted_time"] or "11:00 AM" in sched_res_1["formatted_time"]
    assert sched_res_1["is_future"] is True
    print("  ✅ TEST 1 PASSED: Tomorrow date preserved and relative label correct.")

    # -------------------------------------------------------------
    # TEST 2: Scheduled today -> actual date + time
    # -------------------------------------------------------------
    today_date = now_in_kolkata.strftime("%Y-%m-%d")
    pipeline_cfg_today = {
        "round_sequence": ["interview"],
        "timezone": tz_kolkata,
        "interview": {
            "enabled": True,
            "date": today_date,
            "start": "15:30",
            "end": "16:00",
            "durationMinutes": 30
        }
    }

    sched_res_2 = AssessmentPresenceService.resolve_round_schedule(
        pipeline_config=pipeline_cfg_today,
        round_key="interview"
    )

    print("\n[TEST 2] Scheduled Today:")
    print("  Date:", sched_res_2["formatted_date"])
    print("  Time:", sched_res_2["formatted_time"])
    print("  Relative day:", sched_res_2["relative_day_label"])
    assert sched_res_2["is_today"] is True
    assert sched_res_2["relative_day_label"] == "Today"
    assert "03:30 PM IST" in sched_res_2["formatted_time"] or "3:30 PM IST" in sched_res_2["formatted_time"]
    print("  ✅ TEST 2 PASSED: Today date correctly preserves date and specifies 'Today'.")

    # -------------------------------------------------------------
    # TEST 3: Different timezone -> America/New_York
    # -------------------------------------------------------------
    pipeline_cfg_ny = {
        "round_sequence": ["gd"],
        "timezone": "America/New_York",
        "gd": {
            "enabled": True,
            "date": "2026-10-15",
            "start": "14:00",
            "end": "14:40",
            "durationMinutes": 40
        }
    }

    sched_res_3 = AssessmentPresenceService.resolve_round_schedule(
        pipeline_config=pipeline_cfg_ny,
        round_key="gd"
    )

    print("\n[TEST 3] Different Timezone (America/New_York):")
    print("  Date:", sched_res_3["formatted_date"])
    print("  Time:", sched_res_3["formatted_time"])
    print("  Timezone:", sched_res_3["timezone"])
    print("  UTC Start:", sched_res_3["start_at_utc"])
    assert sched_res_3["timezone"] == "America/New_York"
    assert "EDT" in sched_res_3["formatted_time"] or "EST" in sched_res_3["formatted_time"] or "America/New_York" in sched_res_3["formatted_time"]
    print("  ✅ TEST 3 PASSED: Configured timezone America/New_York correctly converted and formatted.")

    # -------------------------------------------------------------
    # TEST 4: Time passed but candidate has NOT joined -> WAITING_FOR_CANDIDATE
    # -------------------------------------------------------------
    test_sess_id = "test-session-presence-001"
    AssessmentPresenceService.record_disconnect(test_sess_id)

    # Start time was 30 mins ago
    past_start_utc = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    mock_sched = {
        "start_at_utc": past_start_utc,
        "is_today": True,
        "formatted_date": "05 Oct 2026",
        "formatted_time": "10:00 PM IST",
        "relative_day_label": "Today"
    }

    class MockApp:
        status = "SHORTLISTED"
        match_score_at_apply = 85.0

    class MockSession:
        id = test_sess_id
        status = "CREATED"
        overall_score = 85.0
        integrity_status = "VERIFIED"
        evaluation = None

    state_4 = AssessmentPresenceService.resolve_candidate_assessment_state(
        session=MockSession(),
        application=MockApp(),
        progression={"assessment_status": "IN_PROGRESS"},
        round_schedule=mock_sched
    )

    print("\n[TEST 4] Time Passed, Candidate Not Joined:")
    print("  Canonical State:", state_4["canonical_state"])
    print("  Status Label:", state_4["status_label"])
    print("  Can View Live:", state_4["can_view_live"])
    assert state_4["canonical_state"] == "WAITING_FOR_CANDIDATE"
    assert state_4["can_view_live"] is False
    print("  ✅ TEST 4 PASSED: Status is WAITING_FOR_CANDIDATE, View Live is false.")

    # -------------------------------------------------------------
    # TEST 5: Candidate joins & sends heartbeat -> LIVE + View Live = True
    # -------------------------------------------------------------
    AssessmentPresenceService.record_heartbeat(
        session_id=test_sess_id,
        student_id=1,
        round_key="technical"
    )

    MockSession.status = "IN_PROGRESS"
    state_5 = AssessmentPresenceService.resolve_candidate_assessment_state(
        session=MockSession(),
        application=MockApp(),
        progression={"assessment_status": "IN_PROGRESS"},
        round_schedule=mock_sched
    )

    print("\n[TEST 5] Candidate Joined & Active Heartbeat:")
    print("  Canonical State:", state_5["canonical_state"])
    print("  Status Label:", state_5["status_label"])
    print("  Can View Live:", state_5["can_view_live"])
    assert state_5["canonical_state"] == "LIVE"
    assert state_5["can_view_live"] is True
    print("  ✅ TEST 5 PASSED: Status is LIVE, View Live is true.")

    # -------------------------------------------------------------
    # TEST 6: Candidate temporarily disconnects (15s < elapsed <= 45s) -> RECONNECTING
    # -------------------------------------------------------------
    with AssessmentPresenceService._lock:
        AssessmentPresenceService._heartbeats[test_sess_id]["last_heartbeat_at"] = time.time() - 25

    state_6 = AssessmentPresenceService.resolve_candidate_assessment_state(
        session=MockSession(),
        application=MockApp(),
        progression={"assessment_status": "IN_PROGRESS"},
        round_schedule=mock_sched
    )

    print("\n[TEST 6] Candidate Inactivity for 25s:")
    print("  Canonical State:", state_6["canonical_state"])
    print("  Status Label:", state_6["status_label"])
    print("  Can View Live:", state_6["can_view_live"])
    assert state_6["canonical_state"] == "RECONNECTING"
    assert "Reconnecting" in state_6["status_label"]
    print("  ✅ TEST 6 PASSED: Status is RECONNECTING, grace period respected.")

    # -------------------------------------------------------------
    # TEST 7: Candidate disconnects permanently (> 45s) -> OFFLINE / WAITING_FOR_CANDIDATE
    # -------------------------------------------------------------
    with AssessmentPresenceService._lock:
        AssessmentPresenceService._heartbeats[test_sess_id]["last_heartbeat_at"] = time.time() - 60

    MockSession.status = "CREATED"
    state_7 = AssessmentPresenceService.resolve_candidate_assessment_state(
        session=MockSession(),
        application=MockApp(),
        progression={"assessment_status": "IN_PROGRESS"},
        round_schedule=mock_sched
    )

    print("\n[TEST 7] Candidate Inactivity for 60s (Timeout):")
    print("  Canonical State:", state_7["canonical_state"])
    print("  Status Label:", state_7["status_label"])
    print("  Can View Live:", state_7["can_view_live"])
    assert state_7["canonical_state"] == "WAITING_FOR_CANDIDATE"
    assert state_7["can_view_live"] is False
    print("  ✅ TEST 7 PASSED: Timeout triggered, View Live hidden.")

    # -------------------------------------------------------------
    # TEST 8: Candidate completes assessment -> COMPLETED
    # -------------------------------------------------------------
    MockSession.status = "COMPLETED"
    MockSession.evaluation = json.dumps({"ratings": {"techDepth": 5}, "verdict": "Recommend"})
    state_8 = AssessmentPresenceService.resolve_candidate_assessment_state(
        session=MockSession(),
        application=MockApp(),
        progression={"assessment_status": "COMPLETED"},
        round_schedule=mock_sched
    )

    print("\n[TEST 8] Candidate Completed Assessment:")
    print("  Canonical State:", state_8["canonical_state"])
    print("  Status Label:", state_8["status_label"])
    print("  Can View Live:", state_8["can_view_live"])
    assert state_8["canonical_state"] == "COMPLETED"
    assert state_8["can_view_live"] is False
    print("  ✅ TEST 8 PASSED: Status is COMPLETED, View Live is false.")

    # -------------------------------------------------------------
    # TEST 9: Candidate terminated for integrity violation -> TERMINATED_FOR_INTEGRITY
    # -------------------------------------------------------------
    MockSession.status = "TERMINATED"
    MockSession.integrity_status = "HIGH_RISK"
    state_9 = AssessmentPresenceService.resolve_candidate_assessment_state(
        session=MockSession(),
        application=MockApp(),
        progression={"assessment_status": "TERMINATED"},
        round_schedule=mock_sched
    )

    print("\n[TEST 9] Candidate Terminated for Integrity Violation:")
    print("  Canonical State:", state_9["canonical_state"])
    print("  Status Label:", state_9["status_label"])
    print("  Can View Live:", state_9["can_view_live"])
    assert state_9["canonical_state"] == "TERMINATED_FOR_INTEGRITY"
    assert state_9["can_view_live"] is False
    print("  ✅ TEST 9 PASSED: Status is TERMINATED_FOR_INTEGRITY, View Live is false.")

    # -------------------------------------------------------------
    # TEST 10 & 11: Heartbeat HTTP Endpoint Verification
    # -------------------------------------------------------------
    resp = client.post(
        f"/api/v1/assessment/sessions/{test_sess_id}/heartbeat",
        json={"student_id": 1, "round_key": "technical", "metadata": {"test": True}}
    )
    print("\n[TEST 10] POST /assessment/sessions/{id}/heartbeat:")
    print("  Response:", resp.status_code, resp.json())
    assert resp.status_code == 200
    assert resp.json()["presence"] == "LIVE"

    resp_pres = client.get(f"/api/v1/assessment/sessions/{test_sess_id}/presence")
    print("\n[TEST 11] GET /assessment/sessions/{id}/presence:")
    print("  Response:", resp_pres.status_code, resp_pres.json())
    assert resp_pres.status_code == 200
    assert resp_pres.json()["presence"] == "LIVE"
    assert resp_pres.json()["candidate_connected"] is True
    print("  ✅ TEST 10 & 11 PASSED: Heartbeat and presence REST endpoints verified.")

    # -------------------------------------------------------------
    # TEST 12: Historical record preservation
    # -------------------------------------------------------------
    past_date_str = "2026-09-15"
    pipeline_cfg_hist = {
        "round_sequence": ["aptitude"],
        "timezone": "Asia/Kolkata",
        "aptitude": {
            "enabled": True,
            "date": past_date_str,
            "start": "10:00",
            "end": "10:30",
            "durationMinutes": 30
        }
    }
    sched_res_12 = AssessmentPresenceService.resolve_round_schedule(
        pipeline_config=pipeline_cfg_hist,
        round_key="aptitude"
    )
    print("\n[TEST 12] Historical Record:")
    print("  Date:", sched_res_12["formatted_date"])
    print("  Time:", sched_res_12["formatted_time"])
    assert "15 Sep 2026" in sched_res_12["formatted_date"]
    assert "10:00 AM IST" in sched_res_12["formatted_time"]
    print("  ✅ TEST 12 PASSED: Historical scheduled date/time is immutable.")

    print("\n" + "=" * 70)
    print("ALL 12 CANDIDATE ASSESSMENT SCHEDULE & PRESENCE TESTS PASSED! 🎉")
    print("=" * 70)

if __name__ == "__main__":
    test_all_presence_and_schedule_cases()
