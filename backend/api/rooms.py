from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
import pyodbc

from config import settings
from database.room_db import (
    create_room, get_room_by_id, get_room_by_code, get_rooms_by_instructor,
    update_room, delete_room, get_all_rooms
)
from api.auth import get_current_user
from services.livekit_service import livekit_service

router = APIRouter()

# Models
class RoomCreate(BaseModel):
    room_code: str = Field(..., min_length=3, max_length=20)
    room_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int = Field(..., gt=0)
    max_attempts: int = Field(default=1, gt=0)

class RoomUpdate(BaseModel):
    room_name: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    is_active: Optional[bool] = None

class RoomResponse(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    instructor_id: int
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    max_attempts: int
    is_active: bool
    livekit_room_name: Optional[str]
    created_at: datetime
    updated_at: datetime

@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_room(
    room_data: RoomCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if user is instructor or admin
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can create exam rooms"
        )
    
    # Check if room code already exists
    existing_room = get_room_by_code(room_data.room_code)
    if existing_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room code already exists"
        )
    
    # Validate time
    if room_data.end_time <= room_data.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )
    
    try:
        room = create_room(
            room_code=room_data.room_code,
            room_name=room_data.room_name,
            instructor_id=current_user["user_id"],
            description=room_data.description,
            start_time=room_data.start_time,
            end_time=room_data.end_time,
            duration_minutes=room_data.duration_minutes,
            max_attempts=room_data.max_attempts
        )
        
        # Create LiveKit room for video streaming
        livekit_room_name = f"exam_room_{room['room_id']}"
        try:
            livekit_room = livekit_service.create_room(
                room_name=livekit_room_name,
                empty_timeout=room_data.duration_minutes * 60  # Match exam duration
            )
            
            # Update exam room with LiveKit room name
            from database.room_db import update_room
            update_room(room["room_id"], livekit_room_name=livekit_room_name)
            room["livekit_room_name"] = livekit_room_name
        except Exception as e:
            print(f"Warning: Failed to create LiveKit room: {str(e)}")
            # Continue without LiveKit room for now
        
        return RoomResponse(**room)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating room: {str(e)}"
        )

@router.get("/", response_model=List[RoomResponse])
async def get_rooms(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    # Instructors can only see their rooms, admins can see all
    if current_user["role"] == "instructor":
        rooms = get_rooms_by_instructor(current_user["user_id"], skip, limit)
    elif current_user["role"] == "admin":
        rooms = get_all_rooms(skip, limit)
    else:
        # Students can only see active rooms they're enrolled in
        # For now, return empty list for students
        rooms = []
    
    return [RoomResponse(**room) for room in rooms]

@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: int,
    current_user: dict = Depends(get_current_user)
):
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check permissions
    if current_user["role"] == "student":
        # Students can only view rooms they're enrolled in
        # For now, allow viewing active rooms
        if not room["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Room is not active"
            )
    elif current_user["role"] == "instructor":
        # Instructors can only view their own rooms
        if room["instructor_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own rooms"
            )
    
    return RoomResponse(**room)

@router.put("/{room_id}", response_model=RoomResponse)
async def update_exam_room(
    room_id: int,
    room_data: RoomUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Check if room exists
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check permissions (only instructor or admin)
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can update rooms"
        )
    
    # Instructors can only update their own rooms
    if current_user["role"] == "instructor" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own rooms"
        )
    
    try:
        update_data = {k: v for k, v in room_data.dict().items() if v is not None}
        updated_room = update_room(room_id, **update_data)
        return RoomResponse(**updated_room)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating room: {str(e)}"
        )

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_room(
    room_id: int,
    current_user: dict = Depends(get_current_user)
):
    # Check if room exists
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check permissions (only instructor or admin)
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can delete rooms"
        )
    
    # Instructors can only delete their own rooms
    if current_user["role"] == "instructor" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own rooms"
        )
    
    try:
        delete_room(room_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting room: {str(e)}"
        )
