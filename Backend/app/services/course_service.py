import logging
import math
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Union
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app import models
from app.schemas.course import (
    NormalizedCourse,
    CourseCreate,
    CourseUpdate,
    ProviderCreate,
    CourseSkillCreate,
    CourseCareerCreate,
)

logger = logging.getLogger(__name__)

DEFAULT_PROVIDERS = [
    {
        "name": "NPTEL",
        "slug": "nptel",
        "type": "mooc",
        "base_url": "https://nptel.ac.in",
        "is_active": True,
    },
    {
        "name": "YouTube",
        "slug": "youtube",
        "type": "video_platform",
        "base_url": "https://www.youtube.com",
        "is_active": True,
    },
    {
        "name": "freeCodeCamp",
        "slug": "freecodecamp",
        "type": "open_curriculum",
        "base_url": "https://www.freecodecamp.org",
        "is_active": True,
    },
]


# ===========================================================================
# 1. Provider Operations
# ===========================================================================
def seed_default_providers(db: Session) -> List[models.Provider]:
    """
    Safely and idempotently seed default course providers into PostgreSQL.
    """
    seeded = []
    for prov_data in DEFAULT_PROVIDERS:
        existing = db.query(models.Provider).filter(
            func.lower(models.Provider.slug) == prov_data["slug"].lower()
        ).first()

        if not existing:
            provider = models.Provider(
                name=prov_data["name"],
                slug=prov_data["slug"],
                type=prov_data["type"],
                base_url=prov_data["base_url"],
                is_active=prov_data["is_active"],
            )
            db.add(provider)
            db.flush()
            seeded.append(provider)
            logger.info(f"Seeded provider: {provider.name} ({provider.slug})")
        else:
            seeded.append(existing)

    db.commit()
    return seeded


def get_provider_by_slug(db: Session, slug: str) -> Optional[models.Provider]:
    """Look up a provider by slug (case-insensitive)."""
    return db.query(models.Provider).filter(
        func.lower(models.Provider.slug) == slug.strip().lower()
    ).first()


def get_provider_by_id(db: Session, provider_id: int) -> Optional[models.Provider]:
    """Look up a provider by primary key."""
    return db.query(models.Provider).filter(models.Provider.id == provider_id).first()


def get_all_providers(db: Session, active_only: bool = False) -> List[models.Provider]:
    """Fetch all providers."""
    query = db.query(models.Provider)
    if active_only:
        query = query.filter(models.Provider.is_active == True)
    return query.order_by(models.Provider.id.asc()).all()


def create_provider(db: Session, provider_in: ProviderCreate) -> models.Provider:
    """Create a new provider record."""
    slug = provider_in.slug.strip().lower()
    existing = get_provider_by_slug(db, slug)
    if existing:
        raise ValueError(f"Provider with slug '{slug}' already exists.")

    provider = models.Provider(
        name=provider_in.name.strip(),
        slug=slug,
        type=provider_in.type,
        base_url=provider_in.base_url,
        is_active=provider_in.is_active,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


# ===========================================================================
# 2. Course Operations & Idempotent Upsert
# ===========================================================================
def upsert_course_with_status(db: Session, normalized: NormalizedCourse) -> Tuple[models.Course, str]:
    """
    Idempotently insert or update a course based on (provider_id, external_id).
    Returns (course, status) where status is 'created', 'updated', or 'unchanged'.
    """
    # 1. Resolve Provider
    provider = get_provider_by_slug(db, normalized.provider_slug)
    if not provider:
        provider = models.Provider(
            name=normalized.provider_slug.capitalize(),
            slug=normalized.provider_slug.lower(),
            is_active=True
        )
        db.add(provider)
        db.flush()

    # 2. Check for existing course by (provider_id, external_id)
    course = db.query(models.Course).filter(
        models.Course.provider_id == provider.id,
        models.Course.external_id == normalized.external_id
    ).first()

    now = datetime.now(timezone.utc)
    status = "created"

    if course:
        # Check if content has changed via content_hash or critical fields
        is_unchanged = (
            course.content_hash is not None
            and normalized.content_hash is not None
            and course.content_hash == normalized.content_hash
            and course.title == normalized.title
            and course.url == normalized.url
        )

        if is_unchanged:
            course.last_synced_at = now
            status = "unchanged"
        else:
            status = "updated"
            course.title = normalized.title
            course.description = normalized.description
            course.url = normalized.url
            course.instructor = normalized.instructor
            course.institution = normalized.institution
            course.language = normalized.language
            course.level = normalized.level
            course.duration = normalized.duration
            course.duration_unit = normalized.duration_unit
            course.price = normalized.price
            course.currency = normalized.currency
            course.certificate_available = normalized.certificate_available
            course.start_date = normalized.start_date
            course.end_date = normalized.end_date
            course.rating = normalized.rating
            course.review_count = normalized.review_count
            course.thumbnail_url = normalized.thumbnail_url
            course.content_hash = normalized.content_hash
            course.is_active = normalized.is_active
            course.last_synced_at = now
    else:
        # Create new course record
        course = models.Course(
            provider_id=provider.id,
            external_id=normalized.external_id,
            title=normalized.title,
            description=normalized.description,
            url=normalized.url,
            instructor=normalized.instructor,
            institution=normalized.institution,
            language=normalized.language,
            level=normalized.level,
            duration=normalized.duration,
            duration_unit=normalized.duration_unit,
            price=normalized.price,
            currency=normalized.currency,
            certificate_available=normalized.certificate_available,
            start_date=normalized.start_date,
            end_date=normalized.end_date,
            rating=normalized.rating,
            review_count=normalized.review_count,
            thumbnail_url=normalized.thumbnail_url,
            content_hash=normalized.content_hash,
            is_active=normalized.is_active,
            last_synced_at=now,
        )
        db.add(course)
        db.flush()

    # 3. Associate Skills if present
    if normalized.skills:
        for skill_in in normalized.skills:
            existing_skill = None
            if skill_in.esco_skill_id:
                existing_skill = db.query(models.CourseSkill).filter(
                    models.CourseSkill.course_id == course.id,
                    models.CourseSkill.esco_skill_id == skill_in.esco_skill_id
                ).first()

            if not existing_skill:
                c_skill = models.CourseSkill(
                    course_id=course.id,
                    esco_skill_id=skill_in.esco_skill_id,
                    skill_name=skill_in.skill_name,
                    confidence=skill_in.confidence,
                    source=skill_in.source,
                )
                db.add(c_skill)
            else:
                existing_skill.confidence = skill_in.confidence
                existing_skill.source = skill_in.source

    # 4. Associate Careers if present
    if normalized.careers:
        for career_in in normalized.careers:
            existing_career = db.query(models.CourseCareer).filter(
                models.CourseCareer.course_id == course.id,
                models.CourseCareer.career_id == career_in.career_id
            ).first()

            if not existing_career:
                c_career = models.CourseCareer(
                    course_id=course.id,
                    career_id=career_in.career_id,
                    relevance_score=career_in.relevance_score,
                )
                db.add(c_career)
            else:
                existing_career.relevance_score = career_in.relevance_score

    db.commit()
    db.refresh(course)
    return course, status


def upsert_course(db: Session, normalized: NormalizedCourse) -> models.Course:
    """
    Idempotently insert or update a course based on (provider_id, external_id).
    Ensures running ingestion multiple times does not produce duplicates.
    """
    course, _ = upsert_course_with_status(db, normalized)
    return course


def create_course(db: Session, course_in: CourseCreate) -> models.Course:
    """Create a new course record directly."""
    existing = db.query(models.Course).filter(
        models.Course.provider_id == course_in.provider_id,
        models.Course.external_id == course_in.external_id
    ).first()

    if existing:
        raise ValueError(
            f"Course with external_id '{course_in.external_id}' for provider_id {course_in.provider_id} already exists."
        )

    course = models.Course(
        provider_id=course_in.provider_id,
        external_id=course_in.external_id,
        title=course_in.title,
        description=course_in.description,
        url=course_in.url,
        instructor=course_in.instructor,
        institution=course_in.institution,
        language=course_in.language,
        level=course_in.level,
        duration=course_in.duration,
        duration_unit=course_in.duration_unit,
        price=course_in.price,
        currency=course_in.currency,
        certificate_available=course_in.certificate_available,
        start_date=course_in.start_date,
        end_date=course_in.end_date,
        rating=course_in.rating,
        review_count=course_in.review_count,
        thumbnail_url=course_in.thumbnail_url,
        content_hash=course_in.content_hash,
        is_active=course_in.is_active,
        last_synced_at=datetime.now(timezone.utc),
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def get_course(db: Session, course_id: int) -> Optional[models.Course]:
    """Fetch single course by ID with eager-loaded relations."""
    return db.query(models.Course).options(
        joinedload(models.Course.provider),
        joinedload(models.Course.skills),
        joinedload(models.Course.careers),
    ).filter(models.Course.id == course_id).first()


def get_courses(
    db: Session,
    provider_slug: Optional[str] = None,
    provider_id: Optional[int] = None,
    level: Optional[str] = None,
    language: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[models.Course], int]:
    """
    Search and filter courses with pagination and eager-loaded relations.
    """
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = db.query(models.Course).options(
        joinedload(models.Course.provider),
        joinedload(models.Course.skills),
        joinedload(models.Course.careers),
    )

    if provider_id is not None:
        query = query.filter(models.Course.provider_id == provider_id)
    elif provider_slug:
        query = query.join(models.Provider).filter(
            func.lower(models.Provider.slug) == provider_slug.strip().lower()
        )

    if level:
        query = query.filter(func.lower(models.Course.level) == level.strip().lower())

    if language:
        query = query.filter(func.lower(models.Course.language) == language.strip().lower())

    if is_active is not None:
        query = query.filter(models.Course.is_active == is_active)

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(models.Course.title).like(search_pattern),
                func.lower(models.Course.description).like(search_pattern),
                func.lower(models.Course.instructor).like(search_pattern),
                func.lower(models.Course.institution).like(search_pattern),
            )
        )

    total = query.count()
    items = query.order_by(models.Course.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def update_course(db: Session, course_id: int, update_data: CourseUpdate) -> Optional[models.Course]:
    """Update fields on an existing course."""
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        return None

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(course, key, value)

    db.commit()
    db.refresh(course)
    return course


def deactivate_course(db: Session, course_id: int) -> bool:
    """Soft deactivate a course."""
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        return False
    course.is_active = False
    db.commit()
    return True


def get_courses_by_provider(
    db: Session,
    provider_identifier: Union[str, int],
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[models.Course], int]:
    """Fetch courses for a specific provider (by slug or ID)."""
    if isinstance(provider_identifier, int) or (isinstance(provider_identifier, str) and provider_identifier.isdigit()):
        return get_courses(db, provider_id=int(provider_identifier), page=page, page_size=page_size)
    return get_courses(db, provider_slug=str(provider_identifier), page=page, page_size=page_size)


def get_courses_by_skill(
    db: Session,
    skill_name_or_id: Union[str, int],
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[models.Course], int]:
    """Fetch courses tagged with a specific skill name or ESCO skill ID."""
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = db.query(models.Course).join(models.CourseSkill).options(
        joinedload(models.Course.provider),
        joinedload(models.Course.skills),
        joinedload(models.Course.careers),
    )

    if isinstance(skill_name_or_id, int) or (isinstance(skill_name_or_id, str) and skill_name_or_id.isdigit()):
        query = query.filter(models.CourseSkill.esco_skill_id == int(skill_name_or_id))
    else:
        query = query.filter(func.lower(models.CourseSkill.skill_name) == str(skill_name_or_id).strip().lower())

    total = query.count()
    items = query.order_by(models.Course.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_courses_by_career(
    db: Session,
    career_id: str,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[models.Course], int]:
    """Fetch courses mapped to a specific SkillSetu career target."""
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = db.query(models.Course).join(models.CourseCareer).options(
        joinedload(models.Course.provider),
        joinedload(models.Course.skills),
        joinedload(models.Course.careers),
    ).filter(models.CourseCareer.career_id == career_id.strip())

    total = query.count()
    items = query.order_by(models.CourseCareer.relevance_score.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


# ===========================================================================
# 3. Skill & Career Association Operations
# ===========================================================================
def add_course_skill(db: Session, course_id: int, skill_in: CourseSkillCreate) -> models.CourseSkill:
    """Associate an ESCO skill or skill name with a course."""
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise ValueError(f"Course with ID {course_id} not found.")

    existing = None
    if skill_in.esco_skill_id:
        existing = db.query(models.CourseSkill).filter(
            models.CourseSkill.course_id == course_id,
            models.CourseSkill.esco_skill_id == skill_in.esco_skill_id,
        ).first()

    if existing:
        existing.confidence = skill_in.confidence
        existing.source = skill_in.source
        db.commit()
        db.refresh(existing)
        return existing

    c_skill = models.CourseSkill(
        course_id=course_id,
        esco_skill_id=skill_in.esco_skill_id,
        skill_name=skill_in.skill_name,
        confidence=skill_in.confidence,
        source=skill_in.source,
    )
    db.add(c_skill)
    db.commit()
    db.refresh(c_skill)
    return c_skill


def add_course_career(db: Session, course_id: int, career_in: CourseCareerCreate) -> models.CourseCareer:
    """Associate a SkillSetu career with a course."""
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise ValueError(f"Course with ID {course_id} not found.")

    existing = db.query(models.CourseCareer).filter(
        models.CourseCareer.course_id == course_id,
        models.CourseCareer.career_id == career_in.career_id,
    ).first()

    if existing:
        existing.relevance_score = career_in.relevance_score
        db.commit()
        db.refresh(existing)
        return existing

    c_career = models.CourseCareer(
        course_id=course_id,
        career_id=career_in.career_id,
        relevance_score=career_in.relevance_score,
    )
    db.add(c_career)
    db.commit()
    db.refresh(c_career)
    return c_career


# ===========================================================================
# 4. Sync Log Operations
# ===========================================================================
def create_sync_log(db: Session, provider_id: int) -> models.CourseSyncLog:
    """Create a new course synchronization log record."""
    log = models.CourseSyncLog(
        provider_id=provider_id,
        status="running",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def complete_sync_log(
    db: Session,
    log_id: int,
    courses_found: int = 0,
    courses_created: int = 0,
    courses_updated: int = 0,
    courses_deactivated: int = 0,
    courses_failed: int = 0,
    status: str = "completed",
    error_message: Optional[str] = None,
) -> Optional[models.CourseSyncLog]:
    """Finalize a course synchronization log record."""
    log = db.query(models.CourseSyncLog).filter(models.CourseSyncLog.id == log_id).first()
    if not log:
        return None

    log.completed_at = datetime.now(timezone.utc)
    log.courses_found = courses_found
    log.courses_created = courses_created
    log.courses_updated = courses_updated
    log.courses_deactivated = courses_deactivated
    log.courses_failed = courses_failed
    log.status = status
    log.error_message = error_message

    db.commit()
    db.refresh(log)
    return log
