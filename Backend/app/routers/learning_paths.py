from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import learning_path_service
from app.schemas.learning_path import (
    LearningPathCreateRequest,
    LearningPathItemUpdateRequest,
    LearningPathResponse,
    LearningPathItemResponse,
    LearningPathAnalyticsResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# 1. Generate / Create Learning Path
# ---------------------------------------------------------------------------
@router.post("", response_model=LearningPathResponse, summary="Generate personalized skill-gap learning path")
def create_learning_path(
    payload: LearningPathCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a deterministic, stage-sequenced learning path based on the student's
    active target careers, missing ESCO skill gaps, and Phase 7 course recommendations.
    """
    try:
        path_data = learning_path_service.generate_learning_path(
            db=db,
            student_email=payload.email,
            target_careers=payload.target_careers,
            name=payload.name
        )
        return path_data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate learning path: {str(e)}"
        )


# ---------------------------------------------------------------------------
# 2. List Learning Paths for a Student
# ---------------------------------------------------------------------------
@router.get("", summary="List all learning paths for a student")
def list_student_learning_paths(
    email: str = Query(..., description="Student email identifier"),
    db: Session = Depends(get_db),
):
    """
    Retrieve all active, completed, and archived learning paths for a student.
    """
    paths = learning_path_service.get_student_learning_paths(db=db, student_email=email)
    return {
        "status": "success",
        "email": email,
        "count": len(paths),
        "data": paths
    }


# ---------------------------------------------------------------------------
# 3. Get Learning Path Detail
# ---------------------------------------------------------------------------
@router.get("/{path_id}", response_model=LearningPathResponse, summary="Get learning path detail by ID")
def get_learning_path_detail_endpoint(
    path_id: int,
    email: Optional[str] = Query(None, description="Optional student email for ownership verification"),
    db: Session = Depends(get_db),
):
    """
    Fetch comprehensive learning path structure with Foundation, Intermediate,
    and Advanced stages alongside course metadata and current progress percentages.
    """
    path = learning_path_service.get_learning_path_detail(db=db, path_id=path_id, student_email=email)
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {path_id} not found."
        )
    return path


# ---------------------------------------------------------------------------
# 4. Update Learning Path Item Progress
# ---------------------------------------------------------------------------
@router.patch("/{path_id}/items/{item_id}", response_model=LearningPathItemResponse, summary="Update course progress in learning path")
def update_item_progress_endpoint(
    path_id: int,
    item_id: int,
    payload: LearningPathItemUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Update progress percentage (0-100%) and status for a specific course in a learning path.
    Automatically handles transitions:
    - 0% -> not_started
    - 1-99% -> in_progress
    - 100% -> completed
    """
    try:
        updated_item = learning_path_service.update_learning_path_item_progress(
            db=db,
            path_id=path_id,
            item_id=item_id,
            progress_percent=payload.progress_percent,
            status_override=payload.status,
            student_email=payload.email
        )
        return updated_item
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update progress: {str(e)}"
        )


# ---------------------------------------------------------------------------
# 5. Refresh Learning Path
# ---------------------------------------------------------------------------
@router.post("/{path_id}/refresh", response_model=LearningPathResponse, summary="Refresh learning path with latest skill gaps")
def refresh_learning_path_endpoint(
    path_id: int,
    email: Optional[str] = Query(None, description="Optional student email for ownership verification"),
    db: Session = Depends(get_db),
):
    """
    Refresh an existing learning path against updated student evidence.
    Preserves completed and in-progress courses while refreshing remaining recommendations.
    """
    try:
        refreshed = learning_path_service.refresh_learning_path(
            db=db,
            path_id=path_id,
            student_email=email
        )
        return refreshed
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh learning path: {str(e)}"
        )


# ---------------------------------------------------------------------------
# 6. Learning Path Analytics
# ---------------------------------------------------------------------------
@router.get("/{path_id}/analytics", response_model=LearningPathAnalyticsResponse, summary="Get learning path progress analytics")
def get_path_analytics_endpoint(
    path_id: int,
    email: Optional[str] = Query(None, description="Optional student email for ownership verification"),
    db: Session = Depends(get_db),
):
    """
    Get detailed breakdown of learning path completion, skills addressed, courses
    in progress, and target career coverage.
    """
    try:
        analytics = learning_path_service.get_learning_path_analytics(
            db=db,
            path_id=path_id,
            student_email=email
        )
        return analytics
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve analytics: {str(e)}"
        )
