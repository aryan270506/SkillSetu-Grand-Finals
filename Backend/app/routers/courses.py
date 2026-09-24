import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import course_service
from app.schemas.course import (
    CourseResponse,
    CoursePaginationResponse,
    ProviderResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# 1. Provider Reference Endpoints
# ---------------------------------------------------------------------------
@router.get("/providers", summary="List all course providers")
def list_providers(
    active_only: bool = Query(True, description="Filter for only active providers"),
    db: Session = Depends(get_db),
):
    """
    Get all configured course providers (e.g., NPTEL, Coursera, Udemy, YouTube).
    """
    providers = course_service.get_all_providers(db, active_only=active_only)
    return {
        "status": "success",
        "count": len(providers),
        "data": [ProviderResponse.model_validate(p) for p in providers],
    }


@router.get("/providers/status", summary="Get status and health of all course providers")
def get_providers_health_status(
    db: Session = Depends(get_db),
):
    """
    Check configuration, health status, live course count, and latest sync timestamp
    for each registered course provider (NPTEL, Coursera, Udemy, YouTube).
    """
    from app.services import course_sync_service
    status_report = course_sync_service.get_providers_status(db)
    return {
        "status": "success",
        "providers": status_report
    }


@router.post("/providers/{provider_slug}/sync", summary="Trigger manual provider course synchronization")
async def trigger_provider_sync(
    provider_slug: str,
    limit: int = Query(50, ge=1, le=500, description="Max courses to ingest"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    force_refresh: bool = Query(False, description="Force re-extraction and re-embedding"),
    dry_run: bool = Query(False, description="Dry run mode without DB modifications"),
    query: Optional[str] = Query(None, description="Optional search query for targeted content discovery"),
    db: Session = Depends(get_db),
):
    """
    Trigger live course synchronization for a specified provider and execute the
    automatic post-sync pipeline (Skill Extraction + ESCO Mapping + Qdrant Embeddings).
    """
    from app.services import course_sync_service
    result = await course_sync_service.sync_provider(
        provider_slug=provider_slug,
        limit=limit,
        offset=offset,
        force_refresh=force_refresh,
        dry_run=dry_run,
        query=query,
        db=db
    )
    if result.get("status") == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Course synchronization failed.")
        )
    return result


@router.get("/providers/{provider_slug}", summary="Get provider details and its courses")
def get_provider_courses(
    provider_slug: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Fetch provider information alongside its paginated courses.
    """
    provider = course_service.get_provider_by_slug(db, provider_slug)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider_slug}' not found.",
        )

    courses, total = course_service.get_courses_by_provider(
        db, provider_identifier=provider.id, page=page, page_size=page_size
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return {
        "status": "success",
        "provider": ProviderResponse.model_validate(provider),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "data": [CourseResponse.model_validate(c) for c in courses],
    }


# ---------------------------------------------------------------------------
# 2. Course Listing and Filtering Endpoints
# ---------------------------------------------------------------------------
@router.get("", response_model=CoursePaginationResponse, summary="List and filter courses")
def list_courses(
    provider: Optional[str] = Query(None, description="Filter by provider slug (e.g., 'nptel', 'coursera')"),
    level: Optional[str] = Query(None, description="Filter by course level (e.g., 'Beginner', 'Intermediate')"),
    language: Optional[str] = Query(None, description="Filter by language"),
    is_active: Optional[bool] = Query(True, description="Filter active courses"),
    search: Optional[str] = Query(None, description="Search term in title, description, instructor, or institution"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    db: Session = Depends(get_db),
):
    """
    Query normalized courses with multi-criteria filtering, search, and pagination.
    """
    courses, total = course_service.get_courses(
        db=db,
        provider_slug=provider,
        level=level,
        language=language,
        is_active=is_active,
        search=search,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return CoursePaginationResponse(
        status="success",
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        data=[CourseResponse.model_validate(c) for c in courses],
    )


# ---------------------------------------------------------------------------
# 3. Semantic Course Search Endpoint
# ---------------------------------------------------------------------------
@router.get("/search", summary="Semantic course search via Qdrant vector retrieval")
def search_courses_endpoint(
    q: str = Query(..., min_length=1, description="Search query string (e.g., 'machine learning', 'computational fluid dynamics')"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results to return"),
    provider: Optional[str] = Query(None, description="Filter by provider slug (e.g., 'nptel')"),
    level: Optional[str] = Query(None, description="Filter by course level (e.g., 'Undergraduate', 'Postgraduate')"),
    db: Session = Depends(get_db),
):
    """
    Search courses semantically using vector embeddings in Qdrant and retrieve
    complete, authoritative records from PostgreSQL.
    """
    from app.services import course_search_service
    results = course_search_service.search_courses(
        db=db,
        query=q,
        limit=limit,
        provider=provider,
        level=level
    )
    return {
        "status": "success",
        "query": q,
        "count": len(results),
        "results": results,
    }


# ---------------------------------------------------------------------------
# 4. Personalized Course Recommendations Endpoint
# ---------------------------------------------------------------------------
@router.get("/recommendations", summary="Personalized course recommendations for student skill gaps")
def get_course_recommendations_endpoint(
    email: Optional[str] = Query(None, description="Student email identifier"),
    career: Optional[str] = Query(None, description="Optional target career focus override (e.g., 'Full Stack Developer')"),
    provider: Optional[str] = Query(None, description="Filter by provider slug (e.g., 'nptel')"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of recommendations to return"),
    include_inactive: bool = Query(False, description="Include inactive courses"),
    db: Session = Depends(get_db),
):
    """
    Generate personalized, deterministic course recommendations based on the student's
    active target careers, verified skill evidence, and ESCO skill gaps.
    Combines direct PostgreSQL skill coverage with Qdrant vector semantic relevance.
    """
    from app.services import course_recommendation_service
    recommendations_dossier = course_recommendation_service.get_personalized_course_recommendations(
        db=db,
        student_email=email,
        career_override=career,
        provider_slug=provider,
        limit=limit,
        include_inactive=include_inactive,
    )
    return recommendations_dossier


# ---------------------------------------------------------------------------
# 5. Single Course Detail Endpoint
# ---------------------------------------------------------------------------
@router.get("/{course_id}", summary="Get course details by ID")
def get_course_detail(
    course_id: int,
    db: Session = Depends(get_db),
):
    """
    Fetch comprehensive details for a specific course including its associated
    ESCO skills, SkillSetu careers, and provider metadata.
    """
    course = course_service.get_course(db, course_id=course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID {course_id} not found.",
        )

    return {
        "status": "success",
        "data": CourseResponse.model_validate(course),
    }
