'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<'student' | 'instructor'>('student')
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      // For now, route back to login after successful mock registration
      router.push('/login')
    }, 1500)
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ zIndex: 1, backgroundColor: 'var(--surface-0)' }}>
      {/* ── LEFT SIDE: BRANDING & VISUALS ── */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative">
        {/* Glow backdrop for text */}
        <div style={{
          position: 'absolute', top: '30%', left: '20%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <Link href="/" className="flex items-center gap-3 relative z-10 w-fit">
          <div className="logo-glyph" style={{ width: 36, height: 36 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', color: '#f1f5f9' }}>
            Ocu<span className="shimmer-text">lide</span>
          </span>
        </Link>

        <div className="relative z-10 max-w-md animate-fade-in-up">
          <h1 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.03em' }}>
            Bắt đầu hành trình <br /> <span className="shimmer-text">Trung thực.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Tham gia nền tảng thi lập trình có tích hợp AI giám sát hiện đại nhất. Trải nghiệm môi trường thi công bằng, minh bạch và mạnh mẽ.
          </p>
        </div>

        <div className="relative z-10 text-sm text-slate-500 font-medium">
          © 2025 Oculide. All rights reserved.
        </div>
      </div>

      {/* ── RIGHT SIDE: FORM ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div 
          className="glass-card w-full max-w-md animate-fade-in-up animate-delay-100 relative overflow-hidden" 
          style={{ padding: '48px 40px', background: 'rgba(10,10,26,0.6)', backdropFilter: 'blur(40px)' }}
        >
          {/* Subtle gradient border effect */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400" />

          <div className="text-center mb-8">
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
              Tạo tài khoản mới
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Đã có tài khoản? <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">Đăng nhập ngay</Link>
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            {/* Role Selection */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${role === 'student' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'text-slate-400 hover:text-slate-200'}`}
              >
                👨‍🎓 Sinh viên
              </button>
              <button
                type="button"
                onClick={() => setRole('instructor')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${role === 'instructor' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'text-slate-400 hover:text-slate-200'}`}
              >
                👨‍🏫 Giảng viên
              </button>
            </div>

            {/* Input Fields */}
            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Họ và tên</label>
                <div className="relative">
                  <input type="text" required className="input-field pl-10" placeholder="Nguyễn Văn A" />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  {role === 'student' ? 'Mã số sinh viên' : 'Email giảng viên'}
                </label>
                <div className="relative">
                  <input type={role === 'student' ? 'text' : 'email'} required className="input-field pl-10" placeholder={role === 'student' ? 'VD: 20123456' : 'email@university.edu.vn'} />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {role === 'student' ? (
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    ) : (
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    )}
                    {role === 'student' && <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>}
                    {role === 'instructor' && <polyline points="22,6 12,13 2,6"></polyline>}
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Mật khẩu</label>
                <div className="relative">
                  <input type="password" required className="input-field pl-10" placeholder="••••••••" />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-primary w-full justify-center mt-4 h-[48px]"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Đăng ký tài khoản'
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 mt-2 mb-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[var(--border-subtle)]"></div>
              <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">Hoặc tiếp tục với</span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[var(--border-subtle)]"></div>
            </div>

            {/* Social Buttons */}
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => window.location.href = 'http://localhost:8000/api/auth/login/google'}
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
                onClick={() => window.location.href = 'http://localhost:8000/api/auth/login/github'}
                className="flex-1 flex items-center justify-center gap-2 h-[42px] rounded-xl text-sm font-semibold text-slate-300 bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
