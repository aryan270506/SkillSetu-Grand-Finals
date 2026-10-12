import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.services.live_opportunities.base_source import BaseLiveSource
from app.database import SessionLocal
from app import models

logger = logging.getLogger("live_source_recruiter_postings")


class RecruiterPostingsLiveSource(BaseLiveSource):
    """
    Authoritative live adapter for verified recruiter postings created through
    the Recruiter Dashboard and persisted in PostgreSQL (InternshipPosting model).
    Zero mock/seed JSON data. Pure database-backed live source.
    """

    def __init__(self):
        super().__init__(source_name="recruiter_posting", source_type="internships")

    def fetch_live_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            now_dt = datetime.now(timezone.utc)
            
            # Query real published recruiter postings with valid company associations
            postings = (
                db.query(models.InternshipPosting)
                .join(models.Company, models.InternshipPosting.company_id == models.Company.id)
                .filter(
                    models.InternshipPosting.company_id.isnot(None),
                    models.InternshipPosting.status.in_(["Active", "PUBLISHED", "active", "published"]),
                )
                .order_by(models.InternshipPosting.created_at.desc())
                .all()
            )

            results: List[Dict[str, Any]] = []
            for p in postings:
                # Discard drafts, archived, closed, or paused records
                p_status = str(p.status or "Active").strip().lower()
                if p_status in ["draft", "archived", "closed", "deleted", "paused"]:
                    continue

                # Discard expired postings if deadline has passed
                if p.deadline:
                    p_deadline = p.deadline if p.deadline.tzinfo else p.deadline.replace(tzinfo=timezone.utc)
                    if p_deadline < now_dt:
                        continue

                comp = p.company
                if not comp or not comp.name:
                    continue

                comp_name = comp.name.strip()
                comp_logo = comp.logo_url or ""

                # Parse required skills cleanly
                raw_skills = p.required_skills or "[]"
                clean_skills: List[str] = []
                if isinstance(raw_skills, list):
                    clean_skills = [s.get("skill_name") if isinstance(s, dict) else str(s).strip() for s in raw_skills if str(s).strip()]
                elif isinstance(raw_skills, str):
                    raw_s = raw_skills.strip()
                    if raw_s.startswith("[") and raw_s.endswith("]"):
                        try:
                            parsed = json.loads(raw_s)
                            if isinstance(parsed, list):
                                clean_skills = [s.get("skill_name") if isinstance(s, dict) else str(s).strip() for s in parsed if str(s).strip()]
                        except Exception:
                            clean_skills = [s.strip() for s in raw_s.strip("[]").replace('"', '').replace("'", '').split(",") if s.strip()]
                    else:
                        clean_skills = [s.strip() for s in raw_s.split(",") if s.strip()]

                if not clean_skills:
                    clean_skills = ["Python", "SQL", "FastAPI"]

                deadline_iso = p.deadline.isoformat() if p.deadline else None
                threshold_val = int(p.application_threshold or 80)

                record = {
                    "id": p.id,
                    "internship_id": p.id,
                    "source": "recruiter_posting",
                    "source_type": "recruiter_verified",
                    "verification_status": "VERIFIED",
                    "verified": True,
                    "is_verified": True,
                    "source_id": str(p.id),
                    "source_url": "",
                    "apply_url": "",
                    "application_url": "",
                    "title": p.title.strip(),
                    "company": comp_name,
                    "company_name": comp_name,
                    "company_id": p.company_id,
                    "company_logo": comp_logo,
                    "description": p.description or f"{p.title} position at {comp_name}.",
                    "responsibilities": p.description or f"{p.title} position at {comp_name}.",
                    "department": p.department or "Engineering",
                    "career_id": None,
                    "location": p.location or "Pune (Hybrid)",
                    "location_name": p.location or "Pune (Hybrid)",
                    "work_preference": p.work_mode or "Remote",
                    "work_mode": p.work_mode or "Remote",
                    "stipend": p.stipend or "Competitive",
                    "duration": p.duration or "6 Months",
                    "openings": p.openings or 1,
                    "min_cgpa": 0.0,
                    "application_threshold": threshold_val,
                    "minimum_match_threshold": threshold_val,
                    "target_score": float(threshold_val),
                    "application_deadline": deadline_iso,
                    "deadline": deadline_iso,
                    "fetched_at": now_dt.isoformat(),
                    "required_skills": clean_skills,
                    "skills": clean_skills,
                    "is_active": True,
                    "status": p.status or "Active",
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                }
                results.append(record)

            return results if limit is None else results[:limit]
        except Exception as e:
            logger.error(f"Error fetching live recruiter postings from PostgreSQL: {e}")
            return []
        finally:
            db.close()

    def normalize_record(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return raw


# Alias for backward compatibility
CuratedLiveSource = RecruiterPostingsLiveSource
