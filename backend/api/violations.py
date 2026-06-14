from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import base64

from config import settings
from database.violation_db import (
    create_violation, get_violations_by_session, get_violations_by_student,
    update_violation_review
)
from api.auth import get_current_user

router = APIRouter()

# Models
class ViolationCreate(BaseModel):
    session_id: int
    student_id: int
    violation_type: str
    severity: str = "warning"
    description: Optional[str] = None
    snapshot_data: Optional[str] = None  # Base64 encoded image

class ViolationResponse(BaseModel):
    violation_id: int
    session_id: int
    student_id: int
    violation_type: str
    severity: str
    description: Optional[str]
    snapshot_url: Optional[str]
    detected_at: datetime
    is_reviewed: bool
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]

@router.post("/", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
async def create_violation_endpoint(
    violation_data: ViolationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new violation record"""
    # Validate violation type
    valid_types = [
        'tab_switch', 'copy_paste', 'no_face_detected',
        'multiple_faces', 'phone_detected', 'suspicious_object',
        'fullscreen_exit', 'camera_blocked', 'time_exceeded', 'inactive_30s', 'multiple_people'
    ]
    if violation_data.violation_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid violation type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Validate severity
    valid_severities = ['low', 'medium', 'high', 'critical']
    if violation_data.severity not in valid_severities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid severity. Must be one of: {', '.join(valid_severities)}"
        )
    
    try:
        # Convert base64 image to URL (in production, upload to storage)
        snapshot_url = None
        if violation_data.snapshot_data:
            # For now, just store the base64 data as a data URL
            # In production, upload to S3 or similar
            snapshot_url = f"data:image/jpeg;base64,{violation_data.snapshot_data}"
        
        violation = create_violation(
            session_id=violation_data.session_id,
            student_id=violation_data.student_id,
            violation_type=violation_data.violation_type,
            severity=violation_data.severity,
            description=violation_data.description,
            snapshot_url=snapshot_url
        )
        
        # Publish WebSocket update to Proctor via Redis
        try:
            from database.session_db import get_session_by_id
            import redis
            import json
            
            session = get_session_by_id(violation_data.session_id)
            if session:
                r = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB)
                msg = {
                    "type": "proctoring_violation",
                    "room_id": session["room_id"],
                    "student_id": violation_data.student_id,
                    "violations": [
                        {
                            "type": violation_data.violation_type, 
                            "severity": violation_data.severity, 
                            "description": violation_data.description
                        }
                    ]
                }
                r.publish("ws_updates", json.dumps(msg))
        except Exception as ws_e:
            import logging
            logging.getLogger(__name__).error(f"Failed to publish WS update: {ws_e}")
            
        return ViolationResponse(**violation)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating violation: {str(e)}"
        )

class SnapshotAnalysisRequest(BaseModel):
    session_id: int
    image_data: str  # Base64 string

@router.post("/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze_snapshot_endpoint(
    request: SnapshotAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send webcam snapshot to Celery AI Worker for proctoring analysis"""
    from celery_app import celery_app  # Initialize Celery app context
    from tasks.ai_proctoring_tasks import analyze_snapshot
    
    # Send task to Celery asynchronously via 'proctoring' queue
    analyze_snapshot.apply_async(
        args=[request.image_data, request.session_id, current_user["user_id"]],
        queue='proctoring'
    )
    
    return {"status": "accepted", "message": "Snapshot sent for AI analysis"}

@router.get("/session/{session_id}", response_model=List[ViolationResponse])
async def get_session_violations(
    session_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get all violations for a session"""
    # Check permissions
    if current_user["role"] == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot view violations"
        )
    
    violations = get_violations_by_session(session_id)
    return [ViolationResponse(**v) for v in violations]

@router.get("/student/{student_id}", response_model=List[ViolationResponse])
async def get_student_violations(
    student_id: int,
    room_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all violations for a student"""
    # Check permissions
    if current_user["role"] == "student":
        # Students can only view their own violations
        if student_id != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own violations"
            )
    elif current_user["role"] == "instructor":
        # Instructors can view violations for their rooms
        if room_id:
            from database.room_db import get_room_by_id
            room = get_room_by_id(room_id)
            if not room or room["instructor_id"] != current_user["user_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view violations for your own rooms"
                )
    
    violations = get_violations_by_student(student_id, room_id)
    return [ViolationResponse(**v) for v in violations]

@router.patch("/{violation_id}/review")
async def review_violation(
    violation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Mark a violation as reviewed"""
    # Check permissions (instructor or admin only)
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can review violations"
        )
    
    try:
        update_violation_review(violation_id, current_user["user_id"])
        return {"status": "reviewed"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reviewing violation: {str(e)}"
        )
