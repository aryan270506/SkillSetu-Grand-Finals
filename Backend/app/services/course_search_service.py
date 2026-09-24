import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from app.config import settings
from app.models import Course, CourseSkill, Provider
from app.services import embedding_service, course_embedding_service

logger = logging.getLogger("course_search_service")


def search_courses(
    db: Session,
    query: str,
    limit: int = 10,
    provider: Optional[str] = None,
    level: Optional[str] = None,
    client: Optional[QdrantClient] = None,
    collection_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Perform semantic vector search against Qdrant and retrieve authoritative
    course records from PostgreSQL.
    """
    if not query or not query.strip():
        return []

    qdrant = client or course_embedding_service.get_qdrant_client()
    col_name = collection_name or settings.QDRANT_COLLECTION_COURSES

    # 1. Ensure collection exists
    if not qdrant.collection_exists(col_name):
        logger.warning(f"Qdrant collection '{col_name}' does not exist.")
        return []

    # 2. Embed user search query
    query_vector = embedding_service.embed_text(query)

    # 3. Construct Qdrant filters
    must_conditions = [
        qdrant_models.FieldCondition(
            key="is_active",
            match=qdrant_models.MatchValue(value=True)
        )
    ]

    if provider:
        must_conditions.append(
            qdrant_models.FieldCondition(
                key="provider",
                match=qdrant_models.MatchValue(value=provider.lower().strip())
            )
        )

    if level:
        must_conditions.append(
            qdrant_models.FieldCondition(
                key="level",
                match=qdrant_models.MatchValue(value=level.strip())
            )
        )

    query_filter = qdrant_models.Filter(must=must_conditions)

    # 4. Search Qdrant
    try:
        # qdrant-client query_points or search
        if hasattr(qdrant, "query_points"):
            search_response = qdrant.query_points(
                collection_name=col_name,
                query=query_vector,
                query_filter=query_filter,
                limit=limit,
                with_payload=True,
            )
            hits = search_response.points
        else:
            hits = qdrant.search(
                collection_name=col_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=limit,
                with_payload=True,
            )
    except Exception as e:
        logger.error(f"Qdrant search failed: {e}")
        return []

    if not hits:
        return []

    # 5. Extract course IDs and maintain ranked score map
    course_scores: Dict[int, float] = {}
    ordered_course_ids: List[int] = []

    for hit in hits:
        c_id = hit.payload.get("course_id", hit.id) if hit.payload else hit.id
        try:
            c_id_int = int(c_id)
            course_scores[c_id_int] = float(hit.score)
            ordered_course_ids.append(c_id_int)
        except (ValueError, TypeError):
            continue

    if not ordered_course_ids:
        return []

    # 6. Fetch full authoritative records from PostgreSQL
    courses = (
        db.query(Course)
        .options(
            joinedload(Course.provider),
            joinedload(Course.skills),
            joinedload(Course.careers)
        )
        .filter(Course.id.in_(ordered_course_ids))
        .all()
    )

    course_by_id = {c.id: c for c in courses}

    # 7. Assemble ranked results
    results = []
    for c_id in ordered_course_ids:
        course = course_by_id.get(c_id)
        if not course:
            continue

        score = course_scores.get(c_id, 0.0)
        
        duration_str = None
        if course.duration is not None:
            unit = course.duration_unit or "weeks"
            duration_str = f"{course.duration} {unit}"

        skills_list = [s.skill_name for s in course.skills]

        results.append({
            "course_id": course.id,
            "title": course.title,
            "description": course.description,
            "provider": course.provider.slug if course.provider else "nptel",
            "external_id": course.external_id,
            "url": course.url,
            "instructor": course.instructor,
            "institution": course.institution,
            "level": course.level,
            "language": course.language,
            "duration": duration_str,
            "price": float(course.price) if course.price is not None else None,
            "currency": course.currency,
            "certificate_available": course.certificate_available,
            "skills": skills_list,
            "similarity_score": round(score, 4),
        })

    return results
