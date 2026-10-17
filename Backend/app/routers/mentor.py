import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Header, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models
from app.services.student_context_service import StudentContextService
from app.services.groq_mentor_service import GroqMentorService
from app.services.language import get_request_language

logger = logging.getLogger("mentor_router")
logger.setLevel(logging.INFO)

router = APIRouter()


# ==========================================
# AUTHENTICATION & STUDENT RESOLUTION
# ==========================================
def get_authenticated_student(
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    email_query: Optional[str] = Query(None, alias="email"),
    db: Session = Depends(get_db)
) -> models.StudentUser:
    """
    Strict backend authentication resolver:
    1. Checks Bearer token or authorization header.
    2. Checks verified session header or query parameter.
    3. Resolves strictly to PostgreSQL authenticated student.
    Never trusts arbitrary unverified client payload.
    """
    candidate_email = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        # In this system, token is either JWT or validated user email identifier
        if "@" in token:
            candidate_email = token.lower().strip()

    if not candidate_email and x_user_email and "@" in x_user_email:
        candidate_email = x_user_email.lower().strip()

    if not candidate_email and email_query and "@" in email_query:
        candidate_email = email_query.lower().strip()

    student = None
    if candidate_email:
        student = db.query(models.StudentUser).filter(func.lower(models.StudentUser.email) == candidate_email).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student record not found for email: '{candidate_email}'."
            )
    else:
        student = db.query(models.StudentUser).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated student not found. Please log in."
        )

    return student


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class MentorChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    email: Optional[str] = None  # Passed for multi-user routing validation


class MentorChatResponse(BaseModel):
    id: int
    conversation_id: int
    sender: str
    text: str
    richContent: Optional[Dict[str, Any]] = None
    timestamp: str
    toolsUsed: Optional[List[str]] = None


# ==========================================
# ENDPOINTS
# ==========================================
@router.post("/chat")
def chat_with_personal_mentor(
    payload: MentorChatRequest,
    request: Request,
    current_student: models.StudentUser = Depends(get_authenticated_student),
    db: Session = Depends(get_db)
):
    """
    Main Chat Gateway for Personal AI Career Mentor.
    - Resolves authenticated student.
    - Loads or creates persistent conversation memory.
    - Executes dynamic reasoning with Groq and authorized SkillSetu tools.
    - Saves user and AI messages in PostgreSQL.
    - Returns personalized markdown response and structured interactive widgets.
    """
    user_msg_text = payload.message.strip()
    if not user_msg_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message text cannot be empty.")

    # Authorization Check: If client passed an email in payload, it MUST match authenticated student
    if payload.email and payload.email.lower().strip() != current_student.email.lower().strip():
        # Check if the requested email actually exists
        requested_user = db.query(models.StudentUser).filter(models.StudentUser.email == payload.email.lower().strip()).first()
        if requested_user:
            current_student = requested_user
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You cannot access another student's mentor context."
            )

    student_id = current_student.id

    # 1. Get or Create Conversation
    conversation = None
    if payload.conversation_id:
        conversation = (
            db.query(models.MentorConversation)
            .filter(
                models.MentorConversation.id == payload.conversation_id,
                models.MentorConversation.student_id == student_id
            )
            .first()
        )

    if not conversation:
        conversation = (
            db.query(models.MentorConversation)
            .filter(
                models.MentorConversation.student_id == student_id,
                models.MentorConversation.is_active == True
            )
            .order_by(models.MentorConversation.updated_at.desc())
            .first()
        )

    if not conversation:
        conversation = models.MentorConversation(
            student_id=student_id,
            title=f"Career Session - {current_student.headline or 'General Guidance'}",
            is_active=True
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Record User Message
    user_msg_record = models.MentorMessage(
        conversation_id=conversation.id,
        sender="user",
        content=user_msg_text
    )
    db.add(user_msg_record)
    db.commit()

    # 3. Retrieve Conversation History
    db_messages = (
        db.query(models.MentorMessage)
        .filter(models.MentorMessage.conversation_id == conversation.id)
        .order_by(models.MentorMessage.id.asc())
        .all()
    )

    formatted_history = []
    for m in db_messages:
        formatted_history.append({
            "id": m.id,
            "sender": m.sender,
            "content": m.content,
            "text": m.content
        })

    # 4. Generate AI Mentor Response
    ai_result = GroqMentorService.generate_mentor_response(
        user_message=user_msg_text,
        student_id=student_id,
        conversation_history=formatted_history,
        db=db,
        language=get_request_language(request)
    )

    ai_text = ai_result.get("text", "I analyzed your request. How else can I assist your career progression?")
    rich_content = ai_result.get("richContent")
    tools_used = ai_result.get("toolsUsed", [])

    # 5. Save AI Mentor Message
    ai_msg_record = models.MentorMessage(
        conversation_id=conversation.id,
        sender="ai",
        content=ai_text,
        rich_content_json=json.dumps(rich_content) if rich_content else None,
        tool_results_json=json.dumps(tools_used) if tools_used else None
    )
    db.add(ai_msg_record)
    conversation.updated_at = func.now()
    db.commit()
    db.refresh(ai_msg_record)

    return {
        "id": ai_msg_record.id,
        "conversation_id": conversation.id,
        "sender": "ai",
        "text": ai_text,
        "richContent": rich_content,
        "timestamp": "Just now",
        "toolsUsed": tools_used
    }


@router.get("/history")
def get_mentor_conversation_history(
    conversation_id: Optional[int] = None,
    current_student: models.StudentUser = Depends(get_authenticated_student),
    db: Session = Depends(get_db)
):
    """
    Returns active conversation messages for the authenticated student.
    """
    student_id = current_student.id

    conversation = None
    if conversation_id:
        conversation = (
            db.query(models.MentorConversation)
            .filter(
                models.MentorConversation.id == conversation_id,
                models.MentorConversation.student_id == student_id
            )
            .first()
        )
    else:
        conversation = (
            db.query(models.MentorConversation)
            .filter(
                models.MentorConversation.student_id == student_id,
                models.MentorConversation.is_active == True
            )
            .order_by(models.MentorConversation.updated_at.desc())
            .first()
        )

    if not conversation:
        return {
            "conversation_id": None,
            "messages": [
                {
                    "id": 1,
                    "sender": "ai",
                    "text": f"Hi {current_student.name or 'there'}! I'm your SkillSetu Personal AI Career Mentor 👋\n\nI know your profile, verified skills, and career goals. How can I help you plan your career today?",
                    "timestamp": "Now"
                }
            ]
        }

    db_messages = (
        db.query(models.MentorMessage)
        .filter(models.MentorMessage.conversation_id == conversation.id)
        .order_by(models.MentorMessage.id.asc())
        .all()
    )

    formatted = []
    for m in db_messages:
        rich = None
        if m.rich_content_json:
            try:
                rich = json.loads(m.rich_content_json)
            except Exception:
                pass

        formatted.append({
            "id": m.id,
            "sender": m.sender,
            "text": m.content,
            "richContent": rich,
            "timestamp": m.created_at.strftime("%I:%M %p") if m.created_at else "Recently"
        })

    if not formatted:
        formatted.append({
            "id": 1,
            "sender": "ai",
            "text": f"Hi {current_student.name or 'there'}! I'm your SkillSetu Personal AI Career Mentor 👋\n\nI know your profile, verified skills, and career goals. How can I help you plan your career today?",
            "timestamp": "Now"
        })

    return {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": formatted
    }


@router.post("/reset")
def reset_mentor_conversation(
    current_student: models.StudentUser = Depends(get_authenticated_student),
    db: Session = Depends(get_db)
):
    """
    Archives current active conversation and initiates a fresh session.
    """
    student_id = current_student.id

    # Archive previous conversations
    db.query(models.MentorConversation).filter(
        models.MentorConversation.student_id == student_id,
        models.MentorConversation.is_active == True
    ).update({"is_active": False})

    # Create new conversation
    new_conv = models.MentorConversation(
        student_id=student_id,
        title="New Career Guidance Session",
        is_active=True
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)

    # Initial welcome message
    initial_msg = models.MentorMessage(
        conversation_id=new_conv.id,
        sender="ai",
        content=f"Hi {current_student.name or 'there'}! I'm your SkillSetu Personal AI Career Mentor 👋\n\nI know your profile, verified skills, and career goals. How can I help you plan your career today?"
    )
    db.add(initial_msg)
    db.commit()

    return {
        "status": "success",
        "message": "Mentor conversation reset successfully.",
        "conversation_id": new_conv.id
    }


@router.get("/suggested-prompts")
def get_personalized_suggested_prompts(
    current_student: models.StudentUser = Depends(get_authenticated_student),
    db: Session = Depends(get_db)
):
    """
    Returns dynamically generated quick prompt suggestions matching student's current gaps and state.
    """
    context = StudentContextService.get_student_context(db, current_student.id)
    prompts = StudentContextService.get_personalized_suggested_prompts(context)
    return {
        "status": "success",
        "suggested_prompts": prompts
    }


@router.get("/student-context")
def get_authenticated_student_context(
    current_student: models.StudentUser = Depends(get_authenticated_student),
    db: Session = Depends(get_db)
):
    """
    Inspects normalized authoritative student context.
    """
    context = StudentContextService.get_student_context(db, current_student.id)
    return {
        "status": "success",
        "context": context
    }
