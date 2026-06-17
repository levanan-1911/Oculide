import { create } from 'zustand'

interface User {
  user_id: number
  username: string
  email: string
  full_name: string
  role: string
  student_id?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isHydrated: boolean   // true after localStorage has been read
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('token', token)
    }
    set({ user, token, isAuthenticated: true })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    }
    set({ user: null, token: null, isAuthenticated: false })
  },
}))

// Initialize auth from localStorage (runs only on client)
if (typeof window !== 'undefined') {
  const user = localStorage.getItem('user')
  const token = localStorage.getItem('token')
  if (user && token) {
    useAuthStore.setState({
      user: JSON.parse(user),
      token,
      isAuthenticated: true,
      isHydrated: true,
    })
  } else {
    // No saved session — still mark as hydrated so pages know to redirect
    useAuthStore.setState({ isHydrated: true })
  }
}
