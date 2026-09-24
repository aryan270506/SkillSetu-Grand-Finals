from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import skill_evidence_service
from app.schemas.skill_evidence import (
    SkillEvidenceSummaryResponse,
    SkillEvidenceDetailResponse,
    SkillEvidenceSyncRequest,
    SkillEvidenceSyncResponse
)

router = APIRouter()


# ---------------------------------------------------------------------------
# 1. GET /api/v1/student/skill-evidence?email={email}
# ---------------------------------------------------------------------------
@router.get("", response_model=SkillEvidenceSummaryResponse, summary="Retrieve unified student skill evidence")
def get_student_skill_evidence(
    email: str = Query(..., description="Student email identifier"),
    db: Session = Depends(get_db),
):
    """
    Retrieve unified skill evidence scores, statuses, and multi-source breakdowns
    (GitHub, Resume, Profile, Completed Course, Learning Progress) for all student skills.
    """
    try:
        data = skill_evidence_service.get_unified_skill_evidence(db=db, student_email=email)
        return data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve skill evidence: {str(e)}"
        )


# ---------------------------------------------------------------------------
# 2. GET /api/v1/student/skill-evidence/{skill_id}?email={email}
# ---------------------------------------------------------------------------
@router.get("/{skill_id}", response_model=SkillEvidenceDetailResponse, summary="Get granular skill evidence breakdown and timeline")
def get_student_skill_evidence_detail(
    skill_id: str = Path(..., description="ESCO Skill ID or Skill Name"),
    email: str = Query(..., description="Student email identifier"),
    db: Session = Depends(get_db),
):
    """
    Retrieve an explainable breakdown for a specific ESCO skill including:
    - Current score & status
    - Individual source contributions (GitHub, Resume, Profile, Learning)
    - Completed and in-progress courses
    - Target careers requiring this skill
    - Chronological evidence timeline
    """
    try:
        data = skill_evidence_service.get_skill_evidence_detail(
            db=db,
            student_email=email,
            skill_name_or_id=skill_id
        )
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Skill evidence detail not found for skill_id {skill_id} and student {email}"
            )
        return data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve skill detail: {str(e)}"
        )


# ---------------------------------------------------------------------------
# 3. POST /api/v1/student/skill-evidence/sync
# ---------------------------------------------------------------------------
@router.post("/sync", response_model=SkillEvidenceSyncResponse, summary="Synchronize all student evidence sources")
def sync_student_evidence(
    payload: SkillEvidenceSyncRequest,
    db: Session = Depends(get_db),
):
    """
    Scan student profile, resume data, connected GitHub repositories, and learning paths
    to sync and upsert all StudentSkillEvidence records in PostgreSQL.
    """
    try:
        result = skill_evidence_service.sync_all_student_evidence(db=db, student_email=payload.email)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synchronize skill evidence: {str(e)}"
        )
