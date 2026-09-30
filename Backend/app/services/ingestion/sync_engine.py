import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app import models
from app.services.ingestion.internship.curated_loader import CuratedVerifiedInternshipAdapter
from app.services.ingestion.internship.jobicy import JobicyAdapter
from app.services.ingestion.internship.arbeitnow import ArbeitnowAdapter
from app.services.ingestion.scholarship.scholarship_loader import VerifiedScholarshipAdapter

logger = logging.getLogger("skillsetu_ingestion")


class OpportunitySyncEngine:
    """
    Central coordinator for opportunity and scholarship ingestion, normalization,
    deduplication, freshness management, and database persistence.
    """

    def __init__(self, db: Session = None):
        self.db = db

    def sync_all_internships(self, include_external: bool = True) -> Dict[str, Any]:
        if not self.db:
            from app.database import SessionLocal
            session = SessionLocal()
            try:
                return self.run_internship_sync(session, include_external=include_external)
            finally:
                session.close()
        return self.run_internship_sync(self.db, include_external=include_external)

    def sync_all_scholarships(self) -> Dict[str, Any]:
        if not self.db:
            from app.database import SessionLocal
            session = SessionLocal()
            try:
                return self.run_scholarship_sync(session)
            finally:
                session.close()
        return self.run_scholarship_sync(self.db)

    @classmethod
    def run_internship_sync(cls, db: Session, include_external: bool = True) -> Dict[str, Any]:
        """
        Ingests and upserts real internships with deduplication and content hashing.
        """
        started_at = datetime.now(timezone.utc)
        stats = {
            "source_type": "internships",
            "records_found": 0,
            "records_created": 0,
            "records_updated": 0,
            "records_deactivated": 0,
            "errors_count": 0,
            "status": "RUNNING"
        }

        log_entry = models.IngestionRunLog(
            source_type="internships",
            source_name="all_internship_adapters",
            started_at=started_at,
            status="RUNNING"
        )
        db.add(log_entry)
        db.commit()

        adapters = [CuratedVerifiedInternshipAdapter()]
        if include_external:
            adapters.extend([JobicyAdapter(), ArbeitnowAdapter()])

        # First, deactivate expired listings
        now = datetime.now(timezone.utc)
        expired_count = db.query(models.InternshipListing).filter(
            models.InternshipListing.application_deadline.isnot(None),
            models.InternshipListing.application_deadline < now,
            models.InternshipListing.is_active == True
        ).update({"is_active": False}, synchronize_session=False)
        stats["records_deactivated"] = expired_count

        for adapter in adapters:
            try:
                raw_records = adapter.fetch_records(limit=25)
                stats["records_found"] += len(raw_records)

                for raw in raw_records:
                    norm = adapter.normalize_record(raw)
                    if not norm:
                        continue

                    # Deduplication check by (source, source_id) or content_hash
                    existing = db.query(models.InternshipListing).filter(
                        models.InternshipListing.source == norm["source"],
                        models.InternshipListing.source_id == norm["source_id"]
                    ).first()

                    if not existing and norm.get("content_hash"):
                        existing = db.query(models.InternshipListing).filter(
                            models.InternshipListing.content_hash == norm["content_hash"]
                        ).first()

                    if existing:
                        # If content hash changed, update fields; else update timestamps
                        if existing.content_hash != norm.get("content_hash"):
                            existing.title = norm["title"]
                            existing.company_name = norm["company_name"]
                            existing.description = norm["description"]
                            existing.location_name = norm["location_name"]
                            existing.stipend = norm["stipend"]
                            existing.stipend_min = norm.get("stipend_min")
                            existing.stipend_max = norm.get("stipend_max")
                            existing.apply_url = norm["apply_url"]
                            existing.application_deadline = norm["application_deadline"]
                            existing.content_hash = norm.get("content_hash")
                            existing.is_active = True
                            stats["records_updated"] += 1
                        existing.last_seen_at = now
                        existing.last_verified_at = now
                    else:
                        # Create new listing
                        listing = models.InternshipListing(
                            source=norm["source"],
                            source_id=norm["source_id"],
                            source_url=norm.get("source_url"),
                            title=norm["title"],
                            company_name=norm["company_name"],
                            company_logo=norm.get("company_logo"),
                            description=norm.get("description"),
                            career_id=norm.get("career_id"),
                            industry_id=norm.get("industry_id"),
                            location_id=norm.get("location_id"),
                            location_name=norm.get("location_name", "Pune, India"),
                            stipend=norm.get("stipend", "₹25,000 / month"),
                            stipend_min=norm.get("stipend_min"),
                            stipend_max=norm.get("stipend_max"),
                            currency=norm.get("currency", "INR"),
                            duration=norm.get("duration", "6 Months"),
                            opportunity_type=norm.get("opportunity_type", "internship"),
                            work_preference=norm.get("work_preference", "hybrid"),
                            min_cgpa=norm.get("min_cgpa", 0.0),
                            openings=norm.get("openings", 1),
                            batch_eligible=norm.get("batch_eligible"),
                            education_requirements=norm.get("education_requirements"),
                            branch_requirements=norm.get("branch_requirements"),
                            apply_url=norm.get("apply_url"),
                            application_deadline=norm.get("application_deadline"),
                            is_active=True,
                            verified=True,
                            content_hash=norm.get("content_hash"),
                            first_seen_at=now,
                            last_seen_at=now,
                            last_verified_at=now
                        )
                        db.add(listing)
                        db.flush()

                        # Add required skills
                        skills_list = norm.get("skills", [])
                        for sk_name in skills_list:
                            # Check if canonical ESCO skill exists
                            esco_sk = db.query(models.EscoSkill).filter(
                                models.EscoSkill.preferred_label.ilike(sk_name)
                            ).first()

                            db.add(models.InternshipRequiredSkill(
                                internship_id=listing.id,
                                skill_id=f"sk_{sk_name.lower().replace(' ', '_')}",
                                skill_name=sk_name,
                                esco_skill_id=esco_sk.id if esco_sk else None,
                                is_mandatory=True
                            ))
                        stats["records_created"] += 1
                db.commit()
            except Exception as e:
                logger.error(f"Error executing adapter {adapter.source_name}: {e}")
                stats["errors_count"] += 1

        completed_at = datetime.now(timezone.utc)
        stats["status"] = "SUCCESS" if stats["errors_count"] == 0 else "PARTIAL"

        log_entry.completed_at = completed_at
        log_entry.records_found = stats["records_found"]
        log_entry.records_created = stats["records_created"]
        log_entry.records_updated = stats["records_updated"]
        log_entry.records_deactivated = stats["records_deactivated"]
        log_entry.errors_count = stats["errors_count"]
        log_entry.status = stats["status"]
        db.commit()

        logger.info(f"Internship sync complete: {stats}")
        return stats

    @classmethod
    def run_scholarship_sync(cls, db: Session) -> Dict[str, Any]:
        """
        Ingests and upserts real government and foundation scholarships with deterministic eligibility rules.
        """
        started_at = datetime.now(timezone.utc)
        stats = {
            "source_type": "scholarships",
            "records_found": 0,
            "records_created": 0,
            "records_updated": 0,
            "records_deactivated": 0,
            "errors_count": 0,
            "status": "RUNNING"
        }

        log_entry = models.IngestionRunLog(
            source_type="scholarships",
            source_name="verified_scholarships_loader",
            started_at=started_at,
            status="RUNNING"
        )
        db.add(log_entry)
        db.commit()

        # Deactivate expired scholarships
        now = datetime.now(timezone.utc)
        expired_count = db.query(models.Scholarship).filter(
            models.Scholarship.application_deadline.isnot(None),
            models.Scholarship.application_deadline < now,
            models.Scholarship.is_active == True
        ).update({"is_active": False}, synchronize_session=False)
        stats["records_deactivated"] = expired_count

        adapter = VerifiedScholarshipAdapter()
        try:
            raw_records = adapter.fetch_records(limit=50)
            stats["records_found"] = len(raw_records)

            for raw in raw_records:
                norm = adapter.normalize_record(raw)
                if not norm:
                    continue

                existing = db.query(models.Scholarship).filter(
                    models.Scholarship.source == norm["source"],
                    models.Scholarship.source_id == norm["source_id"]
                ).first()

                if not existing and norm.get("content_hash"):
                    existing = db.query(models.Scholarship).filter(
                        models.Scholarship.content_hash == norm["content_hash"]
                    ).first()

                if existing:
                    if existing.content_hash != norm.get("content_hash"):
                        existing.name = norm["name"]
                        existing.provider = norm["provider"]
                        existing.description = norm["description"]
                        existing.award_amount = norm["award_amount"]
                        existing.award_frequency = norm["award_frequency"]
                        existing.award_description = norm["award_description"]
                        existing.application_open = norm["application_open"]
                        existing.application_deadline = norm["application_deadline"]
                        existing.application_url = norm["application_url"]
                        existing.content_hash = norm.get("content_hash")
                        existing.is_active = True
                        stats["records_updated"] += 1
                    existing.last_seen_at = now
                    existing.last_verified_at = now
                else:
                    sch = models.Scholarship(
                        source=norm["source"],
                        source_id=norm["source_id"],
                        source_url=norm.get("source_url"),
                        name=norm["name"],
                        provider=norm["provider"],
                        description=norm.get("description"),
                        academic_year=norm.get("academic_year", "2026-27"),
                        scholarship_type=norm.get("scholarship_type", "Merit & Need-based"),
                        award_amount=norm.get("award_amount"),
                        award_frequency=norm.get("award_frequency", "per year"),
                        award_description=norm.get("award_description"),
                        application_open=norm.get("application_open"),
                        application_deadline=norm.get("application_deadline"),
                        application_url=norm.get("application_url"),
                        is_active=True,
                        verified=True,
                        content_hash=norm.get("content_hash"),
                        first_seen_at=now,
                        last_seen_at=now,
                        last_verified_at=now
                    )
                    db.add(sch)
                    db.flush()

                    # Add structured eligibility rules
                    r = norm.get("rules", {})
                    rule_entry = models.ScholarshipEligibilityRule(
                        scholarship_id=sch.id,
                        min_cgpa=r.get("min_cgpa"),
                        min_percentage_12th=r.get("min_percentage_12th"),
                        max_annual_family_income=r.get("max_annual_family_income"),
                        eligible_states=json.dumps(r.get("eligible_states", ["All"])),
                        eligible_categories=json.dumps(r.get("eligible_categories", ["All"])),
                        eligible_genders=json.dumps(r.get("eligible_genders", ["All"])),
                        eligible_degrees=json.dumps(r.get("eligible_degrees", ["All"])),
                        eligible_branches=json.dumps(r.get("eligible_branches", ["All"])),
                        eligible_years=json.dumps(r.get("eligible_years", ["All"])),
                        requires_pwd=r.get("requires_pwd", False),
                        requires_minority=r.get("requires_minority", False),
                        other_conditions=r.get("other_conditions")
                    )
                    db.add(rule_entry)
                    stats["records_created"] += 1
            db.commit()
        except Exception as e:
            logger.error(f"Error executing scholarship sync: {e}")
            stats["errors_count"] += 1

        completed_at = datetime.now(timezone.utc)
        stats["status"] = "SUCCESS" if stats["errors_count"] == 0 else "PARTIAL"

        log_entry.completed_at = completed_at
        log_entry.records_found = stats["records_found"]
        log_entry.records_created = stats["records_created"]
        log_entry.records_updated = stats["records_updated"]
        log_entry.records_deactivated = stats["records_deactivated"]
        log_entry.errors_count = stats["errors_count"]
        log_entry.status = stats["status"]
        db.commit()

        logger.info(f"Scholarship sync complete: {stats}")
        return stats
