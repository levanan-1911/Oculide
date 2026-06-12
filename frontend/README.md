# Exam System Frontend

Next.js frontend for the Online Exam System with AI Proctoring.

## Features

- **Monaco Editor**: VS Code-like code editor for submissions
- **LiveKit Integration**: Real-time video streaming for proctoring
- **Authentication**: JWT-based authentication
- **State Management**: Zustand for global state
- **Styling**: Tailwind CSS for modern UI

## Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running on http://localhost:8000
- LiveKit Server running (optional for video features)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Update .env with your API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable components
│   │   ├── MonacoEditor.tsx   # Monaco code editor
│   │   └── LiveKitVideo.tsx   # LiveKit video component
│   ├── store/                 # State management
│   │   └── useStore.ts        # Zustand store
│   └── utils/                 # Utility functions
│       └── api.ts             # API client
├── public/                    # Static assets
├── package.json              # Dependencies
├── tsconfig.json            # TypeScript config
├── tailwind.config.ts       # Tailwind CSS config
├── next.config.js           # Next.js config
└── postcss.config.js        # PostCSS config
```

## Components

### MonacoEditor
VS Code-like code editor component with:
- Syntax highlighting
- Auto-completion
- Multiple language support
- Configurable options
- Read-only mode for exams

### LiveKitVideo
Real-time video streaming component with:
- Camera and microphone access
- Room connection management
- Error handling
- Loading states

## API Integration

The frontend uses Axios for API calls with automatic token injection. API functions are organized by feature:

- `authAPI` - Authentication endpoints
- `roomsAPI` - Exam room management
- `questionsAPI` - Question management
- `submissionsAPI` - Code submissions
- `sessionsAPI` - Exam sessions
- `livekitAPI` - LiveKit integration

## State Management

Zustand is used for global state management:
- `useAuthStore` - Authentication state (user, token, isAuthenticated)

## Pages to Implement

- [ ] Login page (`/login`)
- [ ] Register page (`/register`)
- [ ] Dashboard (`/dashboard`)
- [ ] Instructor Dashboard (`/instructor`)
- [ ] Student Dashboard (`/student`)
- [ ] Exam Room (`/room/[id]`)
- [ ] Exam Taking Interface (`/exam/[id]`)

## Next Steps

- [ ] Implement authentication pages
- [ ] Create dashboard pages
- [ ] Build exam room interface
- [ ] Implement exam taking interface
- [ ] Add event trackers (page visibility, copy-paste prevention)
- [ ] Implement webcam snapshot functionality
- [ ] Add violation detection UI
- [ ] Create chat interface
- [ ] Add submission history
- [ ] Implement real-time updates via WebSocket

## Notes

- The lint errors shown in the IDE are expected until dependencies are installed
- Run `npm install` to resolve all import errors
- Make sure the backend API is running before starting the frontend
- LiveKit features require LiveKit Server to be running
