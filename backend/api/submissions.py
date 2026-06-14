from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import pyodbc

from config import settings
from database.submission_db import (
    create_submission, get_submission_by_id, get_submissions_by_student,
    get_submissions_by_question, update_submission_status
)
from api.auth import get_current_user

router = APIRouter()

# Models
class SubmissionCreate(BaseModel):
    room_id: int
    question_id: int
    code_content: str
    language: str
    attempt_number: int = 1

class SubmissionResponse(BaseModel):
    submission_id: int
    room_id: int
    student_id: int
    question_id: int
    attempt_number: int
    code_content: str
    language: str
    submitted_at: datetime
    status: str

@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission_endpoint(
    submission_data: SubmissionCreate,
    current_user: dict = Depends(get_current_user)
):
    # Only students can submit
    if current_user["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can submit answers"
        )
    
    # Check if room is active
    from database.room_db import get_room_by_id
    room = get_room_by_id(submission_data.room_id)
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
    
    # Check if question exists and belongs to room
    from database.question_db import get_question_by_id
    question = get_question_by_id(submission_data.question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    if question["room_id"] != submission_data.room_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question does not belong to this room"
        )
    
    try:
        submission = create_submission(
            room_id=submission_data.room_id,
            student_id=current_user["user_id"],
            question_id=submission_data.question_id,
            attempt_number=submission_data.attempt_number,
            code_content=submission_data.code_content,
            language=submission_data.language
        )
        
        # Trigger Celery Background Task for Grading
        from celery_app import celery_app
        celery_app.send_task(
            'tasks.grading_tasks.grade_submission',
            args=[
                submission["submission_id"],
                submission_data.question_id,
                submission_data.code_content,
                submission_data.language
            ],
            queue='grading'
        )
        
        return SubmissionResponse(**submission)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating submission: {str(e)}"
        )

@router.get("/student/{student_id}", response_model=List[SubmissionResponse])
async def get_student_submissions(
    student_id: int,
    room_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    # Check permissions
    if current_user["role"] == "student":
        # Students can only see their own submissions
        if student_id != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own submissions"
            )
    elif current_user["role"] == "instructor":
        # Instructors can view submissions for their rooms
        if room_id:
            from database.room_db import get_room_by_id
            room = get_room_by_id(room_id)
            if not room or room["instructor_id"] != current_user["user_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view submissions for your own rooms"
                )
    # Admins can view all submissions
    
    submissions = get_submissions_by_student(student_id, room_id)
    return [SubmissionResponse(**s) for s in submissions]

@router.get("/question/{question_id}", response_model=List[SubmissionResponse])
async def get_question_submissions(
    question_id: int,
    current_user: dict = Depends(get_current_user)
):
    # Check permissions (instructor or admin only)
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can view all submissions for a question"
        )
    
    # For instructors, check if they own the room
    if current_user["role"] == "instructor":
        from database.question_db import get_question_by_id
        from database.room_db import get_room_by_id
        question = get_question_by_id(question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        room = get_room_by_id(question["room_id"])
        if not room or room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view submissions for your own rooms"
            )
    
    submissions = get_submissions_by_question(question_id)
    return [SubmissionResponse(**s) for s in submissions]

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    current_user: dict = Depends(get_current_user)
):
    submission = get_submission_by_id(submission_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permissions
    if current_user["role"] == "student":
        # Students can only view their own submissions
        if submission["student_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own submissions"
            )
    elif current_user["role"] == "instructor":
        # Instructors can view submissions for their rooms
        from database.room_db import get_room_by_id
        room = get_room_by_id(submission["room_id"])
        if not room or room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view submissions for your own rooms"
            )
    # Admins can view all submissions
    
    return SubmissionResponse(**submission)

@router.patch("/{submission_id}/status")
async def update_submission_status_endpoint(
    submission_id: int,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    # Check permissions (instructor or admin only)
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can update submission status"
        )
    
    # Validate status
    if status not in ["pending", "grading", "completed", "failed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    try:
        update_submission_status(submission_id, status)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating submission status: {str(e)}"
        )
