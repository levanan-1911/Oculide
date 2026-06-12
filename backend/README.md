# Exam System Backend

FastAPI backend for the Online Exam System with AI Proctoring.

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **Exam Rooms**: Create and manage exam rooms
- **Questions**: Manage exam questions with test cases
- **Submissions**: Handle student code submissions
- **Sessions**: Track exam sessions
- **LiveKit Integration**: Video streaming for proctoring
- **WebSocket**: Real-time communication

## Prerequisites

- Python 3.9+
- SQL Server
- Redis (for caching and Celery)
- LiveKit Server (for video streaming)

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Setup database:
- Create SQL Server database `ExamSystem`
- Run the schema script from `../database/schema.sql` or `../database/tables_only.sql`

## Running LiveKit Server

The LiveKit server source code is located at `../livekit/`. To run it:

### Option 1: Using Docker (Recommended)

```bash
cd ../livekit
docker-compose up
```

### Option 2: Build and Run from Source

**For Windows:**
```bash
cd ../livekit
# Install Go if not already installed
# Build the server
go build ./cmd/server
# Run the server
./server --config config-sample.yaml
```

**For Linux/Mac:**
```bash
cd ../livekit
./bootstrap.sh
```

### Configure LiveKit

Edit `config-sample.yaml` in the livekit directory:
- Set your Redis configuration
- Set your API key and secret
- Configure ports (default: 7880 for HTTP, 7881 for HTTPS, 7882 for RTC)

Update `.env` in backend with your LiveKit configuration:
```
LIVEKIT_URL=http://localhost:7880
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

## Running the Backend

### Development Mode

```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Exam Rooms
- `POST /api/rooms/` - Create exam room (creates LiveKit room automatically)
- `GET /api/rooms/` - List rooms
- `GET /api/rooms/{room_id}` - Get room details
- `PUT /api/rooms/{room_id}` - Update room
- `DELETE /api/rooms/{room_id}` - Delete room

### Questions
- `POST /api/questions/` - Create question
- `GET /api/questions/room/{room_id}` - Get questions for a room
- `GET /api/questions/{question_id}` - Get question details
- `PUT /api/questions/{question_id}` - Update question
- `DELETE /api/questions/{question_id}` - Delete question
- `GET /api/questions/{question_id}/test-cases` - Get test cases
- `POST /api/questions/{question_id}/test-cases` - Create test case

### Submissions
- `POST /api/submissions/` - Submit answer
- `GET /api/submissions/student/{student_id}` - Get student submissions
- `GET /api/submissions/question/{question_id}` - Get question submissions
- `GET /api/submissions/{submission_id}` - Get submission details
- `PATCH /api/submissions/{submission_id}/status` - Update submission status

### Sessions
- `POST /api/sessions/` - Start exam session
- `GET /api/sessions/room/{room_id}` - Get room sessions
- `GET /api/sessions/student/{student_id}` - Get student sessions
- `GET /api/sessions/{session_id}` - Get session details
- `PATCH /api/sessions/{session_id}/status` - Update session status
- `POST /api/sessions/{session_id}/end` - End session

### LiveKit
- `POST /api/livekit/rooms` - Create LiveKit room
- `DELETE /api/livekit/rooms/{room_name}` - Delete LiveKit room
- `GET /api/livekit/rooms/{room_name}` - Get LiveKit room info
- `GET /api/livekit/rooms` - List all LiveKit rooms
- `POST /api/livekit/tokens` - Generate access token

### WebSocket
- `WS /ws/{room_id}/{user_id}` - WebSocket connection for real-time updates

## Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── config.py               # Configuration settings
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── api/                    # API routers
│   ├── auth.py            # Authentication endpoints
│   ├── rooms.py           # Exam room endpoints
│   ├── questions.py       # Question endpoints
│   ├── submissions.py     # Submission endpoints
│   ├── sessions.py        # Session endpoints
│   └── livekit.py         # LiveKit integration endpoints
├── database/              # Database operations
│   ├── user_db.py         # User database operations
│   ├── room_db.py         # Room database operations
│   ├── question_db.py     # Question database operations
│   ├── submission_db.py   # Submission database operations
│   ├── session_db.py      # Session database operations
│   └── enrollment_db.py   # Enrollment database operations
├── services/              # Business logic services
│   └── livekit_service.py # LiveKit service
└── websocket/             # WebSocket handlers
    └── connection_manager.py  # WebSocket connection manager
```

## Security Notes

- Change `JWT_SECRET_KEY` in production
- Use strong passwords for database
- Enable HTTPS in production
- Configure proper CORS origins
- Use environment variables for sensitive data

## Next Steps

- [ ] Setup Redis and Celery for background tasks
- [ ] Implement AI Proctoring Workers
- [ ] Add Docker sandbox for code execution
- [ ] Implement auto-grading system
- [ ] Add comprehensive error handling
- [ ] Add logging and monitoring
