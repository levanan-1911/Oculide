from livekit.api import AccessToken, VideoGrants
from datetime import timedelta
from typing import Optional
from config import settings
import requests

class LiveKitService:
    def __init__(self):
        self.base_url = settings.LIVEKIT_URL.replace('ws://', 'http://').replace('wss://', 'https://')
        self.api_key = settings.LIVEKIT_API_KEY
        self.api_secret = settings.LIVEKIT_API_SECRET
    
    def create_room(self, room_name: str, empty_timeout: int = 300) -> dict:
        """
        Create a LiveKit room using HTTP API
        
        Args:
            room_name: Name of the room
            empty_timeout: Seconds to keep room alive after last participant leaves (default: 5 minutes)
        
        Returns:
            Room information
        """
        try:
            url = f"{self.base_url}/twirp/livekit.RoomService/CreateRoom"
            headers = {
                "Authorization": f"Bearer {self._generate_admin_token()}",
                "Content-Type": "application/json"
            }
            data = {
                "name": room_name,
                "empty_timeout": empty_timeout,
                "max_participants": 100
            }
            response = requests.post(url, json=data, headers=headers)
            response.raise_for_status()
            result = response.json()
            return {
                "sid": result.get("sid"),
                "name": result.get("name"),
                "creation_time": result.get("creation_time"),
                "num_participants": result.get("num_participants", 0),
                "max_participants": result.get("max_participants")
            }
        except Exception as e:
            raise Exception(f"Failed to create LiveKit room: {str(e)}")
    
    def delete_room(self, room_name: str) -> bool:
        """
        Delete a LiveKit room using HTTP API
        
        Args:
            room_name: Name of the room to delete
        
        Returns:
            True if successful
        """
        try:
            url = f"{self.base_url}/twirp/livekit.RoomService/DeleteRoom"
            headers = {
                "Authorization": f"Bearer {self._generate_admin_token()}",
                "Content-Type": "application/json"
            }
            data = {"room": room_name}
            response = requests.post(url, json=data, headers=headers)
            response.raise_for_status()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete LiveKit room: {str(e)}")
    
    def get_room(self, room_name: str) -> Optional[dict]:
        """
        Get room information using HTTP API
        
        Args:
            room_name: Name of the room
        
        Returns:
            Room information or None if not found
        """
        try:
            url = f"{self.base_url}/twirp/livekit.RoomService/ListRooms"
            headers = {
                "Authorization": f"Bearer {self._generate_admin_token()}",
                "Content-Type": "application/json"
            }
            data = {"names": [room_name]}
            response = requests.post(url, json=data, headers=headers)
            response.raise_for_status()
            result = response.json()
            rooms = result.get("rooms", [])
            if rooms and len(rooms) > 0:
                room = rooms[0]
                return {
                    "sid": room.get("sid"),
                    "name": room.get("name"),
                    "creation_time": room.get("creation_time"),
                    "num_participants": room.get("num_participants", 0),
                    "max_participants": room.get("max_participants")
                }
            return None
        except Exception as e:
            raise Exception(f"Failed to get LiveKit room: {str(e)}")
    
    def generate_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: str,
        can_publish: bool = True,
        can_subscribe: bool = True,
        can_publish_data: bool = True,
        expires_in_minutes: int = 30
    ) -> str:
        """
        Generate an access token for a participant
        
        Args:
            room_name: Name of the room
            participant_identity: Unique identifier for the participant (e.g., user_id)
            participant_name: Display name for the participant
            can_publish: Whether participant can publish audio/video
            can_subscribe: Whether participant can subscribe to audio/video
            can_publish_data: Whether participant can publish data messages
            expires_in_minutes: Token expiration time in minutes
        
        Returns:
            JWT access token
        """
        try:
            grants = VideoGrants(
                room=room_name,
                room_join=True,
                can_publish=can_publish,
                can_subscribe=can_subscribe,
                can_publish_data=can_publish_data
            )
            
            token = AccessToken(
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET
            ).with_identity(
                participant_identity
            ).with_name(
                participant_name
            ).with_grants(
                grants
            ).with_ttl(
                timedelta(minutes=expires_in_minutes)
            )
            
            return token.to_jwt()
        except Exception as e:
            raise Exception(f"Failed to generate LiveKit token: {str(e)}")
    
    def generate_instructor_token(
        self,
        room_name: str,
        instructor_id: int,
        instructor_name: str
    ) -> str:
        """
        Generate token for instructor (full permissions)
        """
        return self.generate_token(
            room_name=room_name,
            participant_identity=f"instructor_{instructor_id}",
            participant_name=instructor_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            expires_in_minutes=120  # 2 hours for instructors
        )
    
    def generate_student_token(
        self,
        room_name: str,
        student_id: int,
        student_name: str
    ) -> str:
        """
        Generate token for student (limited permissions)
        """
        return self.generate_token(
            room_name=room_name,
            participant_identity=f"student_{student_id}",
            participant_name=student_name,
            can_publish=True,  # Students need to publish their video
            can_subscribe=True,  # Students need to see instructor
            can_publish_data=False,  # Students cannot publish data messages
            expires_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    def list_rooms(self) -> list:
        """
        List all active rooms using HTTP API
        
        Returns:
            List of room information
        """
        try:
            url = f"{self.base_url}/twirp/livekit.RoomService/ListRooms"
            headers = {
                "Authorization": f"Bearer {self._generate_admin_token()}",
                "Content-Type": "application/json"
            }
            response = requests.post(url, json={}, headers=headers)
            response.raise_for_status()
            result = response.json()
            rooms = result.get("rooms", [])
            return [
                {
                    "sid": room.get("sid"),
                    "name": room.get("name"),
                    "creation_time": room.get("creation_time"),
                    "num_participants": room.get("num_participants", 0),
                    "max_participants": room.get("max_participants")
                }
                for room in rooms
            ]
        except Exception as e:
            raise Exception(f"Failed to list LiveKit rooms: {str(e)}")
    
    def _generate_admin_token(self) -> str:
        """Generate an admin token for API authentication"""
        try:
            grants = VideoGrants(
                room_create=True,
                room_list=True,
                room_admin=True
            )
            
            token = AccessToken(
                api_key=self.api_key,
                api_secret=self.api_secret
            ).with_identity(
                "admin"
            ).with_name(
                "Admin"
            ).with_grants(
                grants
            ).with_ttl(
                timedelta(hours=24)
            )
            
            return token.to_jwt()
        except Exception as e:
            raise Exception(f"Failed to generate admin token: {str(e)}")

# Global LiveKit service instance
livekit_service = LiveKitService()
