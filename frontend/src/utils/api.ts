import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// API functions
export const authAPI = {
  login: (username: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    return api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  },
  
  register: (data: {
    username: string
    password: string
    email: string
    full_name: string
    role: string
    student_id?: string
  }) => api.post('/api/auth/register', data),
  getMe: () => api.get('/api/auth/me'),
  
  join: (data: {
    full_name: string
    student_id: string
    room_code: string
    passcode?: string
  }) => api.post('/api/auth/join', data),
}

export const roomsAPI = {
  create: (data: {
    room_code: string
    room_name: string
    passcode?: string
    description?: string
    start_time: string
    end_time: string
    duration_minutes: number
    max_attempts?: number
  }) => api.post('/api/rooms/', data),
  
  getAll: (skip = 0, limit = 100) =>
    api.get(`/api/rooms/?skip=${skip}&limit=${limit}`),
  
  getById: (room_id: number) => api.get(`/api/rooms/${room_id}`),
  
  getDashboard: (room_id: number) => api.get(`/api/rooms/${room_id}/dashboard`),
  
  update: (room_id: number, data: any) =>
    api.put(`/api/rooms/${room_id}`, data),
  
  delete: (room_id: number) => api.delete(`/api/rooms/${room_id}`),
}

export const questionsAPI = {
  create: (data: {
    room_id: number
    question_order: number
    question_title: string
    question_description: string
    question_type: string
    programming_language?: string
    max_points?: number
    time_limit_minutes?: number
    memory_limit_mb?: number
    test_cases?: Array<{
      input_data: string
      expected_output: string
      is_hidden: boolean
      points: number
    }>
  }) => api.post('/api/questions/', data),
  
  getByRoom: (room_id: number) =>
    api.get(`/api/questions/room/${room_id}`),
  
  getById: (question_id: number) =>
    api.get(`/api/questions/${question_id}`),
  
  update: (question_id: number, data: any) =>
    api.put(`/api/questions/${question_id}`, data),
  
  delete: (question_id: number) =>
    api.delete(`/api/questions/${question_id}`),
  
  getTestCases: (question_id: number) =>
    api.get(`/api/questions/${question_id}/test-cases`),
  
  createTestCase: (question_id: number, data: {
    input_data: string
    expected_output: string
    is_hidden: boolean
    points: number
  }) => api.post(`/api/questions/${question_id}/test-cases`, data),
}

export const submissionsAPI = {
  create: (data: {
    room_id: number
    question_id: number
    code_content: string
    language: string
    attempt_number?: number
  }) => api.post('/api/submissions/', data),
  
  getByStudent: (student_id: number, room_id?: number) =>
    api.get(`/api/submissions/student/${student_id}${room_id ? `?room_id=${room_id}` : ''}`),
  
  getByQuestion: (question_id: number) =>
    api.get(`/api/submissions/question/${question_id}`),
  
  getById: (submission_id: number) =>
    api.get(`/api/submissions/${submission_id}`),
  
  updateStatus: (submission_id: number, status: string) =>
    api.patch(`/api/submissions/${submission_id}/status`, { status }),
}

export const sessionsAPI = {
  create: (data: {
    room_id: number
    ip_address?: string
    user_agent?: string
    browser_fingerprint?: string
  }) => api.post('/api/sessions/', data),
  
  getByRoom: (room_id: number, active_only = false) =>
    api.get(`/api/sessions/room/${room_id}?active_only=${active_only}`),
  
  getByStudent: (student_id: number, room_id?: number, active_only = false) =>
    api.get(`/api/sessions/student/${student_id}${room_id ? `?room_id=${room_id}` : ''}&active_only=${active_only}`),
  
  getById: (session_id: number) =>
    api.get(`/api/sessions/${session_id}`),
  
  updateStatus: (session_id: number, status: string) =>
    api.patch(`/api/sessions/${session_id}/status`, { status }),
  
  end: (session_id: number) =>
    api.post(`/api/sessions/${session_id}/end`),
}

export const livekitAPI = {
  createRoom: (data: { room_name: string; empty_timeout?: number }) =>
    api.post('/api/livekit/rooms', data),
  
  deleteRoom: (room_name: string) =>
    api.delete(`/api/livekit/rooms/${room_name}`),
  
  getRoom: (room_name: string) =>
    api.get(`/api/livekit/rooms/${room_name}`),
  
  listRooms: () => api.get('/api/livekit/rooms'),
  
  generateToken: (data: { room_name: string; participant_name: string }) =>
    api.post('/api/livekit/tokens', data),
}

export const violationsAPI = {
  analyzeSnapshot: (data: { session_id: number; image_data: string }) =>
    api.post('/api/violations/analyze', data),
    
  create: (data: {
    session_id: number
    student_id: number
    violation_type: string
    severity?: string
    description?: string
    snapshot_data?: string
  }) => api.post('/api/violations/', data),
  
  getBySession: (session_id: number) =>
    api.get(`/api/violations/session/${session_id}`),
  
  getByStudent: (student_id: number, room_id?: number) =>
    api.get(`/api/violations/student/${student_id}${room_id ? `?room_id=${room_id}` : ''}`),
  
  review: (violation_id: number) =>
    api.patch(`/api/violations/${violation_id}/review`),
}

export const chatAPI = {
  sendMessage: (data: {
    room_id: number
    recipient_id?: number
    message: string
  }) => api.post('/api/chat/', data),
  
  getRoomMessages: (room_id: number, limit = 50) =>
    api.get(`/api/chat/room/${room_id}?limit=${limit}`),
  
  getConversation: (userId: number, roomId: number, limit = 50) =>
    api.get(`/api/chat/conversation/${userId}?room_id=${roomId}&limit=${limit}`),
}
