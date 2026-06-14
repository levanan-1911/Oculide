import sys
import os
sys.path.append('/app')
from services.livekit_service import livekit_service

try:
    room_name = "exam_room_4"
    print("1. Checking room...")
    room = livekit_service.get_room(room_name)
    print(f"Room found: {room}")
    
    if not room:
        print(f"2. Auto-creating LiveKit room: {room_name}")
        livekit_service.create_room(
            room_name=room_name,
            empty_timeout=7200  # Default 2 hours
        )
        print("Room created successfully.")
    
    print("3. Generating instructor token...")
    token = livekit_service.generate_instructor_token(
        room_name=room_name,
        instructor_id=1,
        instructor_name="Test"
    )
    print(f"SUCCESS! Token: {token[:20]}...")
except Exception as e:
    import traceback
    print(f"FAILED: {e}")
    traceback.print_exc()
