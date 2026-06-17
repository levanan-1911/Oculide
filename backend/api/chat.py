from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

from config import settings
from database.chat_db import (
    create_message, get_messages_by_room, get_messages_between_users
)
from api.auth import get_current_user

router = APIRouter()

# Models
class MessageCreate(BaseModel):
    room_id: int
    recipient_id: Optional[int] = None
    message: str

class MessageResponse(BaseModel):
    message_id: int
    room_id: int
    sender_id: int
    recipient_id: Optional[int]
    message: str
    sent_at: datetime

@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a chat message"""
    try:
        message = create_message(
            room_id=message_data.room_id,
            sender_id=current_user["user_id"],
            recipient_id=message_data.recipient_id,
            message=message_data.message
        )
        
        # Notify WebSocket of new chat message via Redis
        try:
            import redis
            import json
            from config import settings
            r = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB)
            msg = {
                "type": "chat_message",
                "room_id": message_data.room_id,
                "sender_id": current_user["user_id"],
                "recipient_id": message_data.recipient_id,
                "message": message_data.message,
                "message_id": message["message_id"]
            }
            r.publish("ws_updates", json.dumps(msg))
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to publish chat WS update: {e}")
            
        return MessageResponse(**message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending message: {str(e)}"
        )

@router.get("/room/{room_id}", response_model=List[MessageResponse])
async def get_room_messages(
    room_id: int,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a room"""
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
                detail="You can only view messages for your own rooms"
            )
    
    messages = get_messages_by_room(room_id, limit)
    return [MessageResponse(**m) for m in messages]

@router.get("/conversation/{user_id}", response_model=List[MessageResponse])
async def get_conversation(
    user_id: int,
    room_id: int,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get messages between current user and another user"""
    # Students can only view their own conversations
    if current_user["role"] == "student" and user_id != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own conversations"
        )
    
    messages = get_messages_between_users(
        current_user["user_id"],
        user_id,
        room_id,
        limit
    )
    return [MessageResponse(**m) for m in messages]
