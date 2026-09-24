import hashlib
import logging
import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from qdrant_client.http.models import Distance, VectorParams, PointStruct

from app.config import settings
from app.models import Course, CourseSkill, EscoSkill
from app.services import embedding_service

logger = logging.getLogger("course_embedding_service")

_qdrant_client: Optional[QdrantClient] = None


def get_qdrant_client(in_memory: bool = False) -> QdrantClient:
    """
    Get or initialize a Qdrant client.
    Supports remote Qdrant server, local disk embedded storage, or in-memory.
    """
    global _qdrant_client
    if in_memory:
        return QdrantClient(":memory:")

    if _qdrant_client is not None:
        return _qdrant_client

    # Try connecting to remote/server Qdrant URL
    if settings.QDRANT_URL and not settings.QDRANT_URL.startswith("file://"):
        try:
            import httpx
            # Quick probe check
            resp = httpx.get(f"{settings.QDRANT_URL}/healthz", timeout=1.0)
            if resp.status_code == 200:
                logger.info(f"Connected to Qdrant server at {settings.QDRANT_URL}")
                _qdrant_client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
                )
                return _qdrant_client
        except Exception:
            logger.info(f"Qdrant server at {settings.QDRANT_URL} not reachable. Falling back to local embedded storage.")

    # Fallback to local embedded storage directory
    storage_path = settings.QDRANT_STORAGE_PATH
    os.makedirs(storage_path, exist_ok=True)
    logger.info(f"Initializing local embedded Qdrant client at {storage_path}")
    _qdrant_client = QdrantClient(path=storage_path)
    return _qdrant_client


def reset_qdrant_client():
    """Reset singleton client (useful for tests)."""
    global _qdrant_client
    _qdrant_client = None


def ensure_course_collection(
    client: QdrantClient,
    collection_name: Optional[str] = None,
    vector_size: Optional[int] = None,
    distance: Distance = Distance.COSINE
) -> bool:
    """Ensure the Qdrant collection exists with proper vector size and distance metric."""
    col_name = collection_name or settings.QDRANT_COLLECTION_COURSES
    v_size = vector_size or embedding_service.get_embedding_dimension()

    try:
        if client.collection_exists(col_name):
            return True

        logger.info(f"Creating Qdrant collection '{col_name}' with vector size {v_size} and distance {distance}...")
        client.create_collection(
            collection_name=col_name,
            vectors_config=VectorParams(size=v_size, distance=distance)
        )
        return True
    except Exception as e:
        logger.error(f"Error ensuring Qdrant collection '{col_name}': {e}")
        raise e


def build_course_embedding_text(course: Course, skills: Optional[List[CourseSkill]] = None) -> str:
    """
    Construct a deterministic textual representation of a course for embedding.
    Combines: Title, Description, Institution, Instructor, Level, Language, Duration,
    and both ESCO mapped and unmatched candidate skills.
    """
    sections = []

    # 1. Course Title
    if course.title:
        sections.append(f"Course Title:\n{course.title.strip()}")

    # 2. Description
    if course.description:
        sections.append(f"Description:\n{course.description.strip()}")

    # 3. Academic & Metadata Context
    meta_lines = []
    if course.institution:
        meta_lines.append(f"Institution: {course.institution.strip()}")
    if course.instructor:
        meta_lines.append(f"Instructor: {course.instructor.strip()}")
    if course.level:
        meta_lines.append(f"Level: {course.level.strip()}")
    if course.language:
        meta_lines.append(f"Language: {course.language.strip()}")
    if course.duration:
        unit = course.duration_unit or "weeks"
        meta_lines.append(f"Duration: {course.duration} {unit}")
    
    if meta_lines:
        sections.append("Metadata:\n" + "\n".join(meta_lines))

    # 4. Skills & ESCO Mapping
    if skills:
        esco_skills = []
        unmatched_skills = []
        for s in skills:
            if s.esco_skill_id is not None:
                esco_skills.append(s.skill_name.strip())
            else:
                unmatched_skills.append(s.skill_name.strip())

        if esco_skills:
            sections.append("ESCO Skills:\n" + "\n".join(sorted(set(esco_skills))))
        if unmatched_skills:
            sections.append("Candidate Skills:\n" + "\n".join(sorted(set(unmatched_skills))))

    return "\n\n".join(sections).strip()


def calculate_embedding_hash(embedding_text: str) -> str:
    """Calculate deterministic SHA-256 hash of the normalized embedding text."""
    normalized = "\n".join(line.strip() for line in embedding_text.splitlines() if line.strip())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def upsert_course_point(
    client: QdrantClient,
    course: Course,
    vector: List[float],
    skills: Optional[List[CourseSkill]] = None,
    collection_name: Optional[str] = None
) -> None:
    """
    Upsert a single course embedding point into Qdrant using stable integer point ID.
    Point ID = course.id.
    """
    col_name = collection_name or settings.QDRANT_COLLECTION_COURSES
    
    course_skills = skills or []
    esco_ids = [s.esco_skill_id for s in course_skills if s.esco_skill_id is not None]
    skill_names = [s.skill_name for s in course_skills]

    duration_str = None
    if course.duration is not None:
        unit = course.duration_unit or "weeks"
        duration_str = f"{course.duration} {unit}"

    payload: Dict[str, Any] = {
        "course_id": int(course.id),
        "provider": course.provider.slug if course.provider else "nptel",
        "external_id": str(course.external_id),
        "title": str(course.title),
        "level": course.level,
        "language": course.language,
        "duration": duration_str,
        "instructor": course.instructor,
        "institution": course.institution,
        "is_active": bool(course.is_active),
        "esco_skill_ids": esco_ids,
        "skill_names": skill_names,
    }

    point = PointStruct(
        id=int(course.id),
        vector=vector,
        payload=payload
    )

    client.upsert(
        collection_name=col_name,
        points=[point]
    )
    logger.debug(f"Upserted Qdrant point for course ID {course.id} into '{col_name}'")


def upsert_course_points_batch(
    client: QdrantClient,
    items: List[Dict[str, Any]],
    collection_name: Optional[str] = None
) -> None:
    """Batch upsert multiple course points into Qdrant."""
    if not items:
        return

    col_name = collection_name or settings.QDRANT_COLLECTION_COURSES
    points = []

    for item in items:
        course: Course = item["course"]
        vector: List[float] = item["vector"]
        course_skills: List[CourseSkill] = item.get("skills", [])

        esco_ids = [s.esco_skill_id for s in course_skills if s.esco_skill_id is not None]
        skill_names = [s.skill_name for s in course_skills]

        duration_str = None
        if course.duration is not None:
            unit = course.duration_unit or "weeks"
            duration_str = f"{course.duration} {unit}"

        payload = {
            "course_id": int(course.id),
            "provider": course.provider.slug if course.provider else "nptel",
            "external_id": str(course.external_id),
            "title": str(course.title),
            "level": course.level,
            "language": course.language,
            "duration": duration_str,
            "instructor": course.instructor,
            "institution": course.institution,
            "is_active": bool(course.is_active),
            "esco_skill_ids": esco_ids,
            "skill_names": skill_names,
        }

        points.append(PointStruct(
            id=int(course.id),
            vector=vector,
            payload=payload
        ))

    client.upsert(
        collection_name=col_name,
        points=points
    )
    logger.info(f"Batch upserted {len(points)} points into Qdrant '{col_name}'")
