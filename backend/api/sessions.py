from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import pyodbc

from config import settings
from database.session_db import (
    create_session, get_session_by_id, get_sessions_by_room,
    get_sessions_by_student, update_session_status, end_session
)
from api.auth import get_current_user

router = APIRouter()

# Models
class SessionCreate(BaseModel):
    room_id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    browser_fingerprint: Optional[str] = None

class SessionResponse(BaseModel):
    session_id: int
    room_id: int
    student_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    ip_address: Optional[str]
    user_agent: Optional[str]
    browser_fingerprint: Optional[str]
    status: str

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_session(
    session_data: SessionCreate,
    current_user: dict = Depends(get_current_user)
):
    # Only students can create sessions
    if current_user["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can start exam sessions"
        )
    
    # Check if room is active
    from database.room_db import get_room_by_id
    room = get_room_by_id(session_data.room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    if not room["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Room is not active"
        )
    
    # Check if student is enrolled in the room
    from database.enrollment_db import is_student_enrolled
    if not is_student_enrolled(session_data.room_id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not enrolled in this room"
        )
    
    # Check if student already has an active session
    existing_session = get_sessions_by_student(current_user["user_id"], session_data.room_id, active_only=True)
    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active session for this room"
        )
    
    try:
        session = create_session(
            room_id=session_data.room_id,
            student_id=current_user["user_id"],
            ip_address=session_data.ip_address,
            user_agent=session_data.user_agent,
            browser_fingerprint=session_data.browser_fingerprint
        )
        return SessionResponse(**session)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating session: {str(e)}"
        )

@router.get("/room/{room_id}", response_model=List[SessionResponse])
async def get_room_sessions(
    room_id: int,
    active_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    # Check room access
    from database.room_db import get_room_by_id
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check permissions
    if current_user["role"] == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot view all sessions"
        )
    elif current_user["role"] == "instructor":
        if room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view sessions for your own rooms"
            )
    
    sessions = get_sessions_by_room(room_id, active_only)
    return [SessionResponse(**s) for s in sessions]

@router.get("/student/{student_id}", response_model=List[SessionResponse])
async def get_student_sessions(
    student_id: int,
    room_id: Optional[int] = None,
    active_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    # Check permissions
    if current_user["role"] == "student":
        # Students can only see their own sessions
        if student_id != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own sessions"
            )
    elif current_user["role"] == "instructor":
        # Instructors can view sessions for their rooms
        if room_id:
            from database.room_db import get_room_by_id
            room = get_room_by_id(room_id)
            if not room or room["instructor_id"] != current_user["user_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view sessions for your own rooms"
                )
    # Admins can view all sessions
    
    sessions = get_sessions_by_student(student_id, room_id, active_only)
    return [SessionResponse(**s) for s in sessions]

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    current_user: dict = Depends(get_current_user)
):
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check permissions
    if current_user["role"] == "student":
        # Students can only view their own sessions
        if session["student_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own sessions"
            )
    elif current_user["role"] == "instructor":
        # Instructors can view sessions for their rooms
        from database.room_db import get_room_by_id
        room = get_room_by_id(session["room_id"])
        if not room or room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view sessions for your own rooms"
            )
    # Admins can view all sessions
    
    return SessionResponse(**session)

@router.patch("/{session_id}/status")
async def update_session_status_endpoint(
    session_id: int,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    # Check permissions (instructor or admin only)
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can update session status"
        )
    
    # Validate status
    if status not in ["active", "completed", "terminated", "abandoned"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    try:
        update_session_status(session_id, status)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating session status: {str(e)}"
        )

@router.post("/{session_id}/end")
async def end_exam_session(
    session_id: int,
    current_user: dict = Depends(get_current_user)
):
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check permissions
    if current_user["role"] == "student":
        # Students can only end their own sessions
        if session["student_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only end your own sessions"
            )
    elif current_user["role"] == "instructor":
        # Instructors can end sessions for their rooms
        from database.room_db import get_room_by_id
        room = get_room_by_id(session["room_id"])
        if not room or room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only end sessions for your own rooms"
            )
    
    try:
        end_session(session_id)
        return {"status": "ended"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ending session: {str(e)}"
        )
