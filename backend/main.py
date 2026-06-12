from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings, get_cors_origins
import uvicorn

from api import auth, rooms, questions, submissions, sessions, livekit, violations, chat
from websocket.connection_manager import ConnectionManager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"📦 Debug mode: {settings.DEBUG}")
    yield
    # Shutdown
    print("🛑 Shutting down...")

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
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(room_id, f"User {user_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id, user_id)
        await manager.broadcast(room_id, f"User {user_id} left")

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
