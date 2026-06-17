'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authAPI } from '@/utils/api'
import { useAuthStore } from '@/store/useStore'
import { Suspense } from 'react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)
  
  const [role, setRole] = useState<'student' | 'instructor'>('student')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

    const user = useAuthStore((state) => state.user)
    const isHydrated = useAuthStore((state) => state.isHydrated)

    useEffect(() => {
      if (isHydrated && user) {
        if (user.role === 'instructor' || user.role === 'admin') {
          router.push('/instructor')
        } else {
          if ((user as any).room_id) {
            router.push(`/exam?room=${(user as any).room_id}`)
          }
        }
      }
    }, [isHydrated, user, router])

  useEffect(() => {
    const token = searchParams.get('token')
    const errorParam = searchParams.get('error')
    
    if (errorParam) {
      setError(errorParam.replace(/_/g, ' '))
    }
    
    if (token) {
      setLoading(true)
      localStorage.setItem('token', token)
      authAPI.getMe()
        .then(res => {
          setAuth(res.data, token)
          if (res.data.role === 'instructor' || res.data.role === 'admin') {
            router.push('/instructor')
          } else {
            if (res.data.room_id) {
              router.push(`/exam?room=${res.data.room_id}`)
            }
          }
        })
        .catch(err => {
          console.error(err)
          setError('Không thể đăng nhập bằng tài khoản liên kết')
          localStorage.removeItem('token')
          setLoading(false)
        })
    }
  }, [searchParams, router, setAuth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // Backend uses OAuth2 password form (username & password)
      const response = await authAPI.login(username, password)
      const { user, access_token } = response.data
      
      // Save to global state and localStorage
      setAuth(user, access_token)
      
      // Redirect based on user role
      if (user.role === 'instructor' || user.role === 'admin') {
        router.push('/instructor')
      } else {
        if ((user as any).room_id) {
          router.push(`/exam?room=${(user as any).room_id}`)
        } else {
          router.push('/join')
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.detail || 'Sai tài khoản hoặc mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', zIndex: 1 }}>
      {/* Back to home */}
      <Link href="/" style={{
        position: 'fixed', top: 20, left: 24, display: 'flex', alignItems: 'center', gap: 6,
        color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Oculide
      </Link>

      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div className="logo-glyph" style={{ width: 48, height: 48, borderRadius: 14 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
            Chào mừng trở lại
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Đăng nhập vào tài khoản Oculide của bạn
          </p>
        </div>

        {/* Role Switcher */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10,
          border: '1px solid var(--border-subtle)', padding: 4, marginBottom: 24,
        }}>
          {(['student', 'instructor'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: role === r ? 'linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))' : 'transparent',
                color: role === r ? 'white' : 'var(--text-secondary)',
                boxShadow: role === r ? '0 2px 12px var(--glow-primary)' : 'none',
              }}
            >
              {r === 'student' ? '🎓 Sinh viên' : '👨‍🏫 Giảng viên'}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: '32px 28px' }}>
          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          {role === 'instructor' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Username/Email */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Tài khoản (Email / MSSV)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Mật khẩu
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
                    }}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <a href="#" style={{ fontSize: 12, color: 'var(--brand-primary)', textDecoration: 'none' }}>
                  Quên mật khẩu?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 4 }}
              >
                {loading ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                )}
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              <div className="flex items-center gap-4 mt-2 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[var(--border-subtle)]"></div>
                <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">Hoặc tiếp tục với</span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[var(--border-subtle)]"></div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/login/google`}
                  className="flex-1 flex items-center justify-center gap-2 h-[42px] rounded-xl text-sm font-semibold text-slate-300 bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.08)] transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button 
                  type="button" 
                  onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/login/github`}
                  className="flex-1 flex items-center justify-center gap-2 h-[42px] rounded-xl text-sm font-semibold text-slate-300 bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ 
                width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
              }}>
                <span style={{ fontSize: 28 }}>👋</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Sinh viên không cần tài khoản!
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                Hệ thống thi Oculide cho phép sinh viên vào phòng thi ngay lập tức chỉ bằng Mã Phòng (Room Code) do Giảng viên cung cấp.
              </p>
              <Link href="/join" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Đến trang Nhập Mã Phòng
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Register link */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Chưa có tài khoản?{' '}
          <Link href="/register" style={{ color: 'var(--brand-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Đăng ký ngay
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <LoginContent />
    </Suspense>
  )
}
