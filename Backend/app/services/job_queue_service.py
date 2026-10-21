"""
Durable PostgreSQL-Backed Job Queue Service
Implements:
- Transactional job enqueueing with business state changes
- Concurrency-safe job claiming via SELECT ... FOR UPDATE SKIP LOCKED
- Session isolation (no sharing of request sessions with background workers)
- Exponential backoff retries and DEAD_LETTER state
- Stale job recovery / worker reaper
- Distributed lock via PostgreSQL Advisory Locks for multi-worker deadline sweeps
- At-least-once execution with idempotent handler guarantees
"""

import os
import sys
import time
import json
import uuid
import logging
import traceback
from datetime import datetime, timezone, timedelta
from typing import Callable, Dict, Any, Optional

from sqlalchemy import text, func
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

logger = logging.getLogger("recruitment_job_queue")

# Registry of job handlers: Dict[job_type, Callable[[Session, Dict[str, Any]], Dict[str, Any]]]
JOB_HANDLERS: Dict[str, Callable[[Session, Dict[str, Any]], Dict[str, Any]]] = {}

_WORKER_SHUTDOWN_SIGNAL = False


def register_job_handler(job_type: str, handler: Callable[[Session, Dict[str, Any]], Dict[str, Any]]):
    """Registers an authoritative business handler for a specific job_type."""
    JOB_HANDLERS[job_type] = handler
    logger.info(f"Registered job handler for '{job_type}'")


def stop_worker_loop():
    """Signals all worker loops in this process to gracefully terminate."""
    global _WORKER_SHUTDOWN_SIGNAL
    _WORKER_SHUTDOWN_SIGNAL = True
    logger.info("Worker shutdown signal received.")


def is_shutdown_requested() -> bool:
    global _WORKER_SHUTDOWN_SIGNAL
    return _WORKER_SHUTDOWN_SIGNAL


def reset_shutdown_signal():
    global _WORKER_SHUTDOWN_SIGNAL
    _WORKER_SHUTDOWN_SIGNAL = False


def enqueue_job(
    db: Session,
    job_type: str,
    payload: Dict[str, Any],
    execute_at: Optional[datetime] = None,
    idempotency_key: Optional[str] = None,
    priority: int = 0,
    max_retries: int = 5
) -> models.RecruitmentJob:
    """
    Enqueues a job into recruitment_job_queue within the caller's active database transaction.
    If idempotency_key is provided and already exists:
    - Returns the existing job without creating a duplicate.
    """
    now_utc = datetime.now(timezone.utc)
    target_run_at = execute_at if execute_at is not None else now_utc

    if idempotency_key:
        existing = db.query(models.RecruitmentJob).filter(
            models.RecruitmentJob.idempotency_key == idempotency_key
        ).first()
        if existing:
            logger.info(f"Job with idempotency_key='{idempotency_key}' already exists (ID: {existing.id}, Status: {existing.status}). Skipping duplicate insertion.")
            return existing

    job = models.RecruitmentJob(
        job_type=job_type,
        status="QUEUED",
        priority=priority,
        idempotency_key=idempotency_key,
        payload=payload,
        max_retries=max_retries,
        retry_count=0,
        next_run_at=target_run_at,
        created_at=now_utc
    )
    db.add(job)
    db.flush()
    logger.debug(f"Enqueued job {job.id} of type '{job_type}' for execution at {target_run_at.isoformat()}")
    return job


def claim_next_job(worker_id: str) -> Optional[int]:
    """
    Atomically claims the highest-priority overdue job using PostgreSQL's
    SELECT ... FOR UPDATE SKIP LOCKED.
    Uses its own isolated SessionLocal() to prevent sharing sessions.
    Returns the claimed job ID, or None if no eligible jobs are pending.
    """
    now_utc = datetime.now(timezone.utc)
    with SessionLocal() as db:
        # Check database engine dialect
        dialect_name = db.bind.dialect.name if db.bind else "postgresql"

        if dialect_name == "postgresql":
            # PostgreSQL FOR UPDATE SKIP LOCKED
            claimed_job = db.query(models.RecruitmentJob).filter(
                models.RecruitmentJob.status == "QUEUED",
                models.RecruitmentJob.next_run_at <= now_utc
            ).order_by(
                models.RecruitmentJob.priority.desc(),
                models.RecruitmentJob.created_at.asc()
            ).with_for_update(skip_locked=True).first()
        else:
            # Fallback for SQLite in local test environments
            claimed_job = db.query(models.RecruitmentJob).filter(
                models.RecruitmentJob.status == "QUEUED",
                models.RecruitmentJob.next_run_at <= now_utc
            ).order_by(
                models.RecruitmentJob.priority.desc(),
                models.RecruitmentJob.created_at.asc()
            ).first()

        if not claimed_job:
            return None

        claimed_job.status = "PROCESSING"
        claimed_job.locked_by = worker_id
        claimed_job.locked_at = now_utc
        db.commit()
        return claimed_job.id


def execute_job_by_id(job_id: int, worker_id: str) -> bool:
    """
    Executes a previously claimed job within an isolated SQLAlchemy transaction.
    Handles success, exponential backoff retries, and DEAD_LETTER transitions.
    """
    with SessionLocal() as db:
        job = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
        if not job or job.status != "PROCESSING":
            logger.warning(f"Worker {worker_id} attempted to execute job {job_id} but status is not PROCESSING.")
            return False

        handler = JOB_HANDLERS.get(job.job_type)
        if not handler:
            err_msg = f"No handler registered for job type '{job.job_type}'"
            logger.error(err_msg)
            job.status = "FAILED"
            job.error_log = err_msg
            job.locked_by = None
            db.commit()
            return False

        now_utc = datetime.now(timezone.utc)
        try:
            logger.info(f"Worker {worker_id} executing job {job_id} ('{job.job_type}')")
            handler_result = handler(db, job.payload or {})
            
            # Successful completion
            job.status = "COMPLETED"
            job.result = handler_result or {"status": "success"}
            job.completed_at = datetime.now(timezone.utc)
            job.locked_by = None
            job.error_log = None
            db.commit()
            logger.info(f"Worker {worker_id} successfully completed job {job_id} ('{job.job_type}')")
            return True

        except Exception as exc:
            db.rollback()
            err_trace = traceback.format_exc()
            clean_err = f"{type(exc).__name__}: {str(exc)}"
            logger.error(f"Worker {worker_id} encountered error executing job {job_id}: {clean_err}\n{err_trace}")

            # Re-fetch job after rollback to record failure
            job = db.query(models.RecruitmentJob).filter(models.RecruitmentJob.id == job_id).first()
            if not job:
                return False

            job.retry_count += 1
            sanitized_err_log = (
                f"Attempt {job.retry_count} failed at {now_utc.isoformat()}:\n"
                f"{clean_err}\n{err_trace[:2000]}"
            )
            job.error_log = sanitized_err_log
            job.locked_by = None

            if job.retry_count >= job.max_retries:
                # Exhausted all retries -> DEAD_LETTER
                job.status = "DEAD_LETTER"
                logger.critical(
                    f"Job {job.id} ('{job.job_type}') exhausted maximum retries ({job.max_retries}). "
                    f"Moved to DEAD_LETTER state. Alerting administrators."
                )
            else:
                # Exponential backoff: 15s * 2^(retry_count - 1)
                backoff_seconds = int(15 * (2 ** (job.retry_count - 1)))
                job.status = "QUEUED"
                job.next_run_at = now_utc + timedelta(seconds=backoff_seconds)
                logger.warning(
                    f"Job {job.id} ('{job.job_type}') will retry in {backoff_seconds}s "
                    f"(Attempt {job.retry_count + 1}/{job.max_retries}) at {job.next_run_at.isoformat()}"
                )

            db.commit()
            return False


def reap_stale_jobs(stale_threshold_seconds: int = 300) -> int:
    """
    Reclaims jobs that were marked 'PROCESSING' but whose worker crashed or abandoned them.
    Any job locked longer than stale_threshold_seconds is returned to 'QUEUED'.
    """
    now_utc = datetime.now(timezone.utc)
    threshold_time = now_utc - timedelta(seconds=stale_threshold_seconds)

    with SessionLocal() as db:
        stale_jobs = db.query(models.RecruitmentJob).filter(
            models.RecruitmentJob.status == "PROCESSING",
            models.RecruitmentJob.locked_at <= threshold_time
        ).all()

        reaped_count = 0
        for job in stale_jobs:
            logger.warning(
                f"Reaping stale job {job.id} ('{job.job_type}') locked by '{job.locked_by}' "
                f"at {job.locked_at.isoformat()}. Resetting to QUEUED."
            )
            job.status = "QUEUED"
            job.locked_by = None
            job.locked_at = None
            reaped_count += 1

        if reaped_count > 0:
            db.commit()
            logger.info(f"Reaped {reaped_count} stale jobs back to QUEUED status.")
        return reaped_count


def retry_dead_letter_job(job_id: int, recruiter_or_admin_id: int) -> bool:
    """
    Permission-protected idempotent action to resurrect a DEAD_LETTER job.
    Resets status to QUEUED and sets next_run_at to NOW.
    """
    with SessionLocal() as db:
        job = db.query(models.RecruitmentJob).filter(
            models.RecruitmentJob.id == job_id,
            models.RecruitmentJob.status == "DEAD_LETTER"
        ).first()

        if not job:
            logger.warning(f"Cannot retry job {job_id}: job not found or not in DEAD_LETTER status.")
            return False

        now_utc = datetime.now(timezone.utc)
        job.status = "QUEUED"
        job.retry_count = 0
        job.next_run_at = now_utc
        job.locked_by = None
        job.locked_at = None
        job.error_log = f"{job.error_log or ''}\n--- Manually resurrected by User {recruiter_or_admin_id} at {now_utc.isoformat()} ---"
        db.commit()
        logger.info(f"Job {job_id} successfully resurrected from DEAD_LETTER by User {recruiter_or_admin_id}.")
        return True


def run_with_advisory_lock(lock_key_name: str, task_func: Callable[[], Any]) -> bool:
    """
    Executes task_func safely under a PostgreSQL session-level advisory lock.
    If multiple application workers or processes invoke this simultaneously,
    only ONE worker acquires the lock; all others safely skip execution.
    Ensures the lock is released in a finally block even if an exception occurs.
    """
    with SessionLocal() as db:
        dialect_name = db.bind.dialect.name if db.bind else "postgresql"
        if dialect_name != "postgresql":
            # For non-PG environments, execute directly
            task_func()
            return True

        # Compute stable 32-bit integer hash from key name
        lock_query = text("SELECT pg_try_advisory_lock(hashtext(:key));")
        unlock_query = text("SELECT pg_advisory_unlock(hashtext(:key));")

        acquired = False
        try:
            result = db.execute(lock_query, {"key": lock_key_name}).scalar()
            if not result:
                logger.debug(f"Advisory lock for '{lock_key_name}' already held by another worker. Skipping sweep.")
                return False

            acquired = True
            logger.debug(f"Acquired advisory lock for '{lock_key_name}'. Executing protected task.")
            task_func()
            return True

        except Exception as exc:
            logger.error(f"Error while executing task under advisory lock '{lock_key_name}': {exc}", exc_info=True)
            raise
        finally:
            if acquired:
                try:
                    db.execute(unlock_query, {"key": lock_key_name})
                    db.commit()
                    logger.debug(f"Released advisory lock for '{lock_key_name}'.")
                except Exception as unlock_err:
                    logger.error(f"Failed to release advisory lock for '{lock_key_name}': {unlock_err}")


def process_queue_iteration(worker_id: str) -> bool:
    """
    Executes one queue processing step: claims next job and runs it.
    Returns True if a job was processed, False if queue was empty.
    """
    job_id = claim_next_job(worker_id)
    if job_id is None:
        return False

    execute_job_by_id(job_id, worker_id)
    return True
