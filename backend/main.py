from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings, get_cors_origins
import uvicorn

from api import auth, rooms, questions, submissions, sessions, livekit, violations, chat
from websocket.connection_manager import ConnectionManager

import asyncio
import json
import redis.asyncio as redis_async

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"📦 Debug mode: {settings.DEBUG}")
    
    # Setup Redis listener for WebSocket updates from Celery workers
    redis_client = redis_async.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("ws_updates")
    
    async def redis_listener():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        room_id = data.get("room_id")
                        if room_id:
                            if data.get("type") == "proctoring_violation":
                                student_id = data.get("student_id")
                                from database.room_db import get_room_by_id
                                room = await asyncio.to_thread(get_room_by_id, room_id)
                                instructor_id = room["instructor_id"] if room else None
                                
                                msg_str = json.dumps(data)
                                if instructor_id:
                                    await manager.send_personal_message(msg_str, room_id, instructor_id)
                                if student_id and student_id != instructor_id:
                                    await manager.send_personal_message(msg_str, room_id, student_id)
                            else:
                                await manager.broadcast_json(room_id, data)
                    except json.JSONDecodeError:
                        pass
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Redis listener error: {e}")
            
    listener_task = asyncio.create_task(redis_listener())
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    listener_task.cancel()
    try:
        await pubsub.unsubscribe("ws_updates")
        await pubsub.close()
        await redis_client.aclose()
    except Exception:
        pass

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager
manager = ConnectionManager()

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["Exam Rooms"])
app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(livekit.router, prefix="/api/livekit", tags=["LiveKit"])
app.include_router(violations.router, prefix="/api/violations", tags=["Violations"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

# WebSocket endpoint
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int, user_id: int):
    await manager.connect(websocket, room_id, user_id)
    await manager.broadcast_json(room_id, {"type": "status_update", "student_id": user_id, "status": "active"})
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "kick_student":
                    await manager.broadcast_json(room_id, message)
                else:
                    await manager.broadcast_json(room_id, message)
            except json.JSONDecodeError:
                await manager.broadcast(room_id, f"User {user_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id, user_id)
        await manager.broadcast_json(room_id, {"type": "status_update", "student_id": user_id, "status": "offline"})

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
