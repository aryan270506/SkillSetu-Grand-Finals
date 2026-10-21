"""
Integration and Concurrency Tests for PostgreSQL-Backed Durable Job Queue
Covers:
- Transactional enqueue and idempotency key uniqueness
- Multi-threaded concurrent worker safety (FOR UPDATE SKIP LOCKED)
- Worker crash simulation & stale job recovery
- Exponential backoff retry progression
- DEAD_LETTER transition upon retry exhaustion
- Dead-letter authorized resurrection
- Multi-worker PostgreSQL advisory lock leader election
"""

import time
import uuid
import threading
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models
from app.services import job_queue_service


def setup_module():
    """Ensure clean test slate."""
    job_queue_service.reset_shutdown_signal()


@pytest.fixture(autouse=True)
def clean_test_jobs():
    with SessionLocal() as db:
        db.query(models.RecruitmentJob).filter(
            models.RecruitmentJob.job_type.like("TEST_%")
        ).delete(synchronize_session=False)
        db.commit()
    yield
    with SessionLocal() as db:
        db.query(models.RecruitmentJob).filter(
            models.RecruitmentJob.job_type.like("TEST_%")
        ).delete(synchronize_session=False)
        db.commit()


def test_durable_job_enqueue_and_idempotency():
    """Test job insertion and idempotency key protection."""
    with SessionLocal() as db:
        test_key = f"idempotent_test_{uuid.uuid4().hex[:12]}"
        
        job1 = job_queue_service.enqueue_job(
            db=db,
            job_type="TEST_IDEMPOTENT_OP",
            payload={"action": "test", "val": 123},
            idempotency_key=test_key,
            priority=10
        )
        db.commit()

        assert job1.id is not None
        assert job1.status == "QUEUED"
        assert job1.idempotency_key == test_key

        # Second enqueue with same idempotency key must return same job without creating duplicate
        job2 = job_queue_service.enqueue_job(
            db=db,
            job_type="TEST_IDEMPOTENT_OP",
            payload={"action": "test_different", "val": 456},
            idempotency_key=test_key,
            priority=10
        )
        db.commit()

        assert job1.id == job2.id
        
        # Verify exactly one job exists with this key
        count = db.query(models.RecruitmentJob).filter(
            models.RecruitmentJob.idempotency_key == test_key
        ).count()
        assert count == 1


def test_successful_job_execution():
    """Test normal job claiming and completion."""
    job_type = f"TEST_SUCCESS_{uuid.uuid4().hex[:8]}"
    execution_record = []

    def handle_success(db: Session, payload: dict):
        execution_record.append(payload.get("data"))
        return {"result": "processed_ok", "item": payload.get("data")}

    job_queue_service.register_job_handler(job_type, handle_success)

    with SessionLocal() as db:
        job = job_queue_service.enqueue_job(
            db=db,
            job_type=job_type,
            payload={"data": "test_value_alpha"}
        )
        db.commit()
        job_id = job.id

    worker_id = "test_worker_1"
    processed = job_queue_service.process_queue_iteration(worker_id)
    assert processed is True
    assert "test_value_alpha" in execution_record

    with SessionLocal() as db:
        finished_job = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
        assert finished_job.status == "COMPLETED"
        assert finished_job.completed_at is not None
        assert finished_job.result["result"] == "processed_ok"
        assert finished_job.locked_by is None


def test_exponential_backoff_and_dead_letter():
    """Test failure retry backoff and transition to DEAD_LETTER after max retries."""
    job_type = f"TEST_FAIL_{uuid.uuid4().hex[:8]}"
    attempts = []

    def failing_handler(db: Session, payload: dict):
        attempts.append(len(attempts) + 1)
        raise RuntimeError("External dependency timeout simulated")

    job_queue_service.register_job_handler(job_type, failing_handler)

    with SessionLocal() as db:
        job = job_queue_service.enqueue_job(
            db=db,
            job_type=job_type,
            payload={"test": "fail"},
            max_retries=3
        )
        db.commit()
        job_id = job.id

    worker_id = "test_fail_worker"

    # Attempt 1
    job_queue_service.process_queue_iteration(worker_id)
    with SessionLocal() as db:
        j1 = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
        assert j1.status == "QUEUED"
        assert j1.retry_count == 1
        assert "External dependency timeout simulated" in j1.error_log
        # Manually reset next_run_at to past so we can test attempt 2 immediately
        j1.next_run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()

    # Attempt 2
    job_queue_service.process_queue_iteration(worker_id)
    with SessionLocal() as db:
        j2 = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
        assert j2.status == "QUEUED"
        assert j2.retry_count == 2
        j2.next_run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()

    # Attempt 3 (Max retries reached -> DEAD_LETTER)
    job_queue_service.process_queue_iteration(worker_id)
    with SessionLocal() as db:
        j3 = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
        assert j3.status == "DEAD_LETTER"
        assert j3.retry_count == 3
        assert j3.locked_by is None

    # Test dead-letter manual resurrection by recruiter
    resurrected = job_queue_service.retry_dead_letter_job(job_id=job_id, recruiter_or_admin_id=42)
    assert resurrected is True

    with SessionLocal() as db:
        j_resurrected = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
        assert j_resurrected.status == "QUEUED"
        assert j_resurrected.retry_count == 0
        assert "Manually resurrected by User 42" in j_resurrected.error_log


def test_crash_simulation_and_stale_job_reaper():
    """Test that a worker crashing mid-job is recovered by reap_stale_jobs."""
    job_type = f"TEST_CRASH_{uuid.uuid4().hex[:8]}"

    with SessionLocal() as db:
        job = job_queue_service.enqueue_job(
            db=db,
            job_type=job_type,
            payload={"task": "crash_test"}
        )
        db.commit()
        job_id = job.id

    # Simulate worker claiming job then crashing (status=PROCESSING with old locked_at)
    with SessionLocal() as db:
        j = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
        j.status = "PROCESSING"
        j.locked_by = "dead_worker_pid_9999"
        j.locked_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        db.commit()

    # Run reaper with 5-minute threshold
    reaped = job_queue_service.reap_stale_jobs(stale_threshold_seconds=300)
    assert reaped >= 1

    with SessionLocal() as db:
        recovered = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
        assert recovered.status == "QUEUED"
        assert recovered.locked_by is None
        assert recovered.locked_at is None


def test_multi_threaded_concurrent_worker_safety():
    """
    Test that 4 simultaneous worker threads claiming 20 jobs
    execute every single job exactly once with ZERO collisions.
    """
    job_type = f"TEST_CONCURRENT_{uuid.uuid4().hex[:8]}"
    processed_items = []
    lock = threading.Lock()

    def concurrent_handler(db: Session, payload: dict):
        item_id = payload.get("item_index")
        with lock:
            processed_items.append(item_id)
        time.sleep(0.01)  # small work simulation
        return {"processed": item_id}

    job_queue_service.register_job_handler(job_type, concurrent_handler)

    total_jobs = 20
    with SessionLocal() as db:
        for i in range(total_jobs):
            job_queue_service.enqueue_job(
                db=db,
                job_type=job_type,
                payload={"item_index": i},
                priority=i
            )
        db.commit()

    # Launch 4 worker threads pulling from queue concurrently
    def worker_thread(worker_name: str):
        for _ in range(35):
            job_queue_service.process_queue_iteration(worker_name)
            time.sleep(0.005)

    threads = [
        threading.Thread(target=worker_thread, args=(f"thread_worker_{idx}",))
        for idx in range(4)
    ]

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # Verify all 20 jobs were processed exactly once
    assert len(processed_items) == total_jobs, f"Expected {total_jobs} processed, got {len(processed_items)}"
    assert sorted(processed_items) == list(range(total_jobs)), "Every item index must be processed exactly once"


def test_postgresql_advisory_lock_leader_election():
    """
    Test that PostgreSQL advisory locks elect exactly 1 worker
    when multiple threads attempt to run a deadline sweep.
    """
    lock_key = f"test_advisory_lock_{uuid.uuid4().hex[:8]}"
    execution_count = []
    lock = threading.Lock()

    def sweep_task():
        with lock:
            execution_count.append(1)
        time.sleep(0.05)  # hold the lock briefly

    # Launch 4 threads attempting to run the sweep simultaneously
    results = []

    def attempt_sweep():
        acquired = job_queue_service.run_with_advisory_lock(lock_key, sweep_task)
        results.append(acquired)

    threads = [threading.Thread(target=attempt_sweep) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # Exactly 1 thread should have acquired the lock, other 3 skipped
    assert len(execution_count) == 1
    assert results.count(True) == 1
    assert results.count(False) == 3
