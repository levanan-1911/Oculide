from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List

from config import settings
from services.livekit_service import livekit_service
from api.auth import get_current_user

router = APIRouter()

# Models
class RoomCreate(BaseModel):
    room_name: str
    empty_timeout: int = 300

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str

class RoomResponse(BaseModel):
    sid: str
    name: str
    creation_time: int
    num_participants: int
    max_participants: int

class TokenResponse(BaseModel):
    token: str
    room_name: str
    participant_identity: str

@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_livekit_room(
    room_data: RoomCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new LiveKit room"""
    # Only instructors and admins can create rooms
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can create LiveKit rooms"
        )
    
    try:
        room = livekit_service.create_room(
            room_name=room_data.room_name,
            empty_timeout=room_data.empty_timeout
        )
        return RoomResponse(**room)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create LiveKit room: {str(e)}"
        )

@router.delete("/rooms/{room_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_livekit_room(
    room_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a LiveKit room"""
    # Only instructors and admins can delete rooms
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can delete LiveKit rooms"
        )
    
    try:
        livekit_service.delete_room(room_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete LiveKit room: {str(e)}"
        )

@router.get("/rooms/{room_name}", response_model=RoomResponse)
async def get_livekit_room(
    room_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Get LiveKit room information"""
    try:
        room = livekit_service.get_room(room_name)
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        return RoomResponse(**room)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get LiveKit room: {str(e)}"
        )

@router.get("/rooms", response_model=List[RoomResponse])
async def list_livekit_rooms(
    current_user: dict = Depends(get_current_user)
):
    """List all LiveKit rooms"""
    # Only instructors and admins can list all rooms
    if current_user["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can list LiveKit rooms"
        )
    
    try:
        rooms = livekit_service.list_rooms()
        return [RoomResponse(**room) for room in rooms]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list LiveKit rooms: {str(e)}"
        )

@router.post("/tokens", response_model=TokenResponse)
async def generate_token(
    token_request: TokenRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate access token for a room"""
    try:
        # Check if room exists
        room = livekit_service.get_room(token_request.room_name)
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Generate token based on user role
        if current_user["role"] == "instructor":
            token = livekit_service.generate_instructor_token(
                room_name=token_request.room_name,
                instructor_id=current_user["user_id"],
                instructor_name=token_request.participant_name or current_user["full_name"]
            )
            participant_identity = f"instructor_{current_user['user_id']}"
        elif current_user["role"] == "student":
            token = livekit_service.generate_student_token(
                room_name=token_request.room_name,
                student_id=current_user["user_id"],
                student_name=token_request.participant_name or current_user["full_name"]
            )
            participant_identity = f"student_{current_user['user_id']}"
        else:  # admin
            token = livekit_service.generate_token(
                room_name=token_request.room_name,
                participant_identity=f"admin_{current_user['user_id']}",
                participant_name=token_request.participant_name or current_user["full_name"],
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
                expires_in_minutes=120
            )
            participant_identity = f"admin_{current_user['user_id']}"
        
        return TokenResponse(
            token=token,
            room_name=token_request.room_name,
            participant_identity=participant_identity
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate token: {str(e)}"
        )
