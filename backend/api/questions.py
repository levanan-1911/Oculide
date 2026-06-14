from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
import pyodbc

from config import settings
from database.question_db import (
    create_question, get_question_by_id, get_questions_by_room,
    update_question, delete_question, get_test_cases_by_question,
    create_test_case, delete_test_case
)
from api.auth import get_current_user

router = APIRouter()

# Models
class TestCaseCreate(BaseModel):
    input_data: str
    expected_output: str
    is_hidden: bool = False
    points: float = 0.0

class QuestionCreate(BaseModel):
    room_id: int
    question_order: int = Field(..., gt=0)
    question_title: str = Field(..., min_length=1, max_length=200)
    question_description: str
    question_type: str = Field(..., pattern="^(coding|multiple_choice|essay)$")
    programming_language: Optional[str] = None
    max_points: float = Field(default=10.0, gt=0)
    time_limit_minutes: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    test_cases: Optional[List[TestCaseCreate]] = []

class QuestionUpdate(BaseModel):
    question_order: Optional[int] = None
    question_title: Optional[str] = None
    question_description: Optional[str] = None
    programming_language: Optional[str] = None
    max_points: Optional[float] = None
    time_limit_minutes: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    is_active: Optional[bool] = None
    test_cases: Optional[List[TestCaseCreate]] = None

class QuestionResponse(BaseModel):
    question_id: int
    room_id: int
    question_order: int
    question_title: str
    question_description: str
    question_type: str
    programming_language: Optional[str]
    max_points: float
    time_limit_minutes: Optional[int]
    memory_limit_mb: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime

class TestCaseResponse(BaseModel):
    test_case_id: int
    question_id: int
    input_data: str
    expected_output: str
    is_hidden: bool
    points: float
    created_at: datetime

@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_question(
    question_data: QuestionCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if user is instructor or admin
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can create questions"
        )
    
    # For instructors, check if they own the room
    if current_user["role"] == "instructor":
        from database.room_db import get_room_by_id
        room = get_room_by_id(question_data.room_id)
        if not room or room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create questions for your own rooms"
            )
    
    try:
        question = create_question(
            room_id=question_data.room_id,
            question_order=question_data.question_order,
            question_title=question_data.question_title,
            question_description=question_data.question_description,
            question_type=question_data.question_type,
            programming_language=question_data.programming_language,
            max_points=question_data.max_points,
            time_limit_minutes=question_data.time_limit_minutes,
            memory_limit_mb=question_data.memory_limit_mb
        )
        
        # Create test cases if provided
        if question_data.test_cases:
            for tc in question_data.test_cases:
                create_test_case(
                    question_id=question["question_id"],
                    input_data=tc.input_data,
                    expected_output=tc.expected_output,
                    is_hidden=tc.is_hidden,
                    points=tc.points
                )
        
        return QuestionResponse(**question)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating question: {str(e)}"
        )

@router.get("/room/{room_id}", response_model=List[QuestionResponse])
async def get_questions(
    room_id: int,
    current_user: dict = Depends(get_current_user)
):
    # Check if user has access to the room
    from database.room_db import get_room_by_id
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check permissions
    if current_user["role"] == "student":
        if not room["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Room is not active"
            )
    elif current_user["role"] == "instructor":
        if room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view questions for your own rooms"
            )
    
    questions = get_questions_by_room(room_id)
    return [QuestionResponse(**q) for q in questions]

@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: int,
    current_user: dict = Depends(get_current_user)
):
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Check room access
    from database.room_db import get_room_by_id
    room = get_room_by_id(question["room_id"])
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check permissions
    if current_user["role"] == "student":
        if not room["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Room is not active"
            )
    elif current_user["role"] == "instructor":
        if room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view questions for your own rooms"
            )
    
    return QuestionResponse(**question)

@router.put("/{question_id}", response_model=QuestionResponse)
async def update_exam_question(
    question_id: int,
    question_data: QuestionUpdate,
    current_user: dict = Depends(get_current_user)
):
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Check permissions (only instructor or admin)
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can update questions"
        )
    
    # For instructors, check if they own the room
    if current_user["role"] == "instructor":
        from database.room_db import get_room_by_id
        room = get_room_by_id(question["room_id"])
        if room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update questions for your own rooms"
            )
    
    try:
        update_data = {k: v for k, v in question_data.dict(exclude={'test_cases'}).items() if v is not None}
        updated_question = update_question(question_id, **update_data)
        
        # If test cases are provided, replace them all
        if question_data.test_cases is not None:
            # Delete old test cases
            from config import get_sqlserver_connection
            conn = get_sqlserver_connection()
            cursor = conn.cursor()
            
            # Xóa GradingResults liên kết với các test cases cũ để tránh lỗi FK
            cursor.execute("""
                DELETE FROM GradingResults 
                WHERE test_case_id IN (
                    SELECT test_case_id FROM TestCases WHERE question_id = ?
                )
            """, (question_id,))
            
            cursor.execute("DELETE FROM TestCases WHERE question_id = ?", (question_id,))
            conn.commit()
            conn.close()
            
            # Insert new test cases
            for tc in question_data.test_cases:
                create_test_case(
                    question_id=question_id,
                    input_data=tc.input_data,
                    expected_output=tc.expected_output,
                    is_hidden=tc.is_hidden,
                    points=tc.points
                )
                
        return QuestionResponse(**updated_question)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating question: {str(e)}"
        )

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_question(
    question_id: int,
    current_user: dict = Depends(get_current_user)
):
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Check permissions (only instructor or admin)
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can delete questions"
        )
    
    # For instructors, check if they own the room
    if current_user["role"] == "instructor":
        from database.room_db import get_room_by_id
        room = get_room_by_id(question["room_id"])
        if room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete questions for your own rooms"
            )
    
    try:
        delete_question(question_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting question: {str(e)}"
        )

@router.get("/{question_id}/test-cases", response_model=List[TestCaseResponse])
async def get_test_cases(
    question_id: int,
    current_user: dict = Depends(get_current_user)
):
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Check room access
    from database.room_db import get_room_by_id
    room = get_room_by_id(question["room_id"])
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check permissions
    if current_user["role"] == "student":
        # Students can only see non-hidden test cases
        test_cases = get_test_cases_by_question(question_id, hidden_only=False)
    elif current_user["role"] in ["instructor", "admin"]:
        # Instructors and admins can see all test cases
        test_cases = get_test_cases_by_question(question_id, hidden_only=None)
    else:
        test_cases = []
    
    return [TestCaseResponse(**tc) for tc in test_cases]

@router.post("/{question_id}/test-cases", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_test_case_endpoint(
    question_id: int,
    test_case_data: TestCaseCreate,
    current_user: dict = Depends(get_current_user)
):
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Check permissions (only instructor or admin)
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can create test cases"
        )
    
    # For instructors, check if they own the room
    if current_user["role"] == "instructor":
        from database.room_db import get_room_by_id
        room = get_room_by_id(question["room_id"])
        if room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create test cases for your own rooms"
            )
    
    try:
        test_case = create_test_case(
            question_id=question_id,
            input_data=test_case_data.input_data,
            expected_output=test_case_data.expected_output,
            is_hidden=test_case_data.is_hidden,
            points=test_case_data.points
        )
        return TestCaseResponse(**test_case)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating test case: {str(e)}"
        )
