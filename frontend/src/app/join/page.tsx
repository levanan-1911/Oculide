'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/utils/api'
import { useAuthStore } from '@/store/useStore'
import Link from 'next/link'

export default function JoinRoomPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [fullName, setFullName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [passcode, setPasscode] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  // Auto focus room code on load
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await authAPI.join({
        full_name: fullName,
        student_id: studentId,
        room_code: roomCode.toUpperCase(),
        passcode: passcode || undefined
      })
      
      const { user, access_token } = response.data
      setAuth(user, access_token)
      
      // Navigate straight to the exam room
      router.push(`/exam?room=${user.room_id}`)
      
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.detail || 'Lỗi kết nối đến máy chủ. Vui lòng thử lại.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', zIndex: 1, backgroundColor: 'var(--surface-0)' }}>
      
      {/* Back to home / Login */}
      <Link href="/login" style={{
        position: 'absolute', top: 24, right: 32,
        color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 6
      }} className="hover:text-white transition-colors">
        Dành cho Giảng viên &rarr;
      </Link>

      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 520 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="inline-block relative">
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 8, color: '#fff', textTransform: 'uppercase' }}>
              <span className="shimmer-text" style={{ backgroundImage: 'linear-gradient(270deg, #06b6d4 0%, #3b82f6 50%, #06b6d4 100%)' }}>Initialize</span>
            </h1>
            <div style={{ position: 'absolute', top: -10, right: -20, background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9', fontSize: 10, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em', fontWeight: 800 }}>
              AI PROCTORING
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Hệ thống giám sát thi tự động Oculide
          </p>
        </div>

        {/* Cyberpunk Radar Container */}
        <div className={`glass-card cyber-scanner ${loading ? 'scanning' : ''}`} style={{ 
          padding: '40px', borderRadius: 16, border: '1px solid rgba(6,182,212,0.2)', 
          background: 'rgba(10,10,26,0.8)', backdropFilter: 'blur(20px)',
          boxShadow: loading ? '0 0 40px rgba(6,182,212,0.2)' : '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          
          <div className="scan-line" />

          {/* Form Content - higher z-index to stay above radar sweep */}
          <div className="relative z-10">
            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13, marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Massive Room Code Input */}
              <div style={{ textAlign: 'center' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#67e8f9', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                  {'// Mã phòng thi (Room Code)'}
                </label>
                <input 
                  ref={inputRef}
                  type="text" 
                  placeholder="CTDL2026" 
                  value={roomCode} 
                  onChange={e => setRoomCode(e.target.value.toUpperCase())} 
                  required 
                  disabled={loading}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(6,182,212,0.3)', 
                    borderRadius: 12, color: '#fff', fontSize: 32, fontWeight: 800, textAlign: 'center', 
                    letterSpacing: '0.2em', padding: '16px 8px', outline: 'none', transition: 'all 0.3s',
                    textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace'
                  }}
                  className="focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] placeholder:text-slate-700"
                />
              </div>

              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)', margin: '4px 0' }}></div>

              {/* Identity Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Họ và tên</label>
                  <input type="text" className="input-field" placeholder="Nguyễn Văn A" value={fullName} onChange={e => setFullName(e.target.value)} required disabled={loading} style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mã Sinh Viên</label>
                  <input type="text" className="input-field font-code" placeholder="2021..." value={studentId} onChange={e => setStudentId(e.target.value)} required disabled={loading} style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Passcode</span>
                  <span style={{ color: 'var(--text-muted)' }}>(Tùy chọn)</span>
                </label>
                <input type="password" className="input-field font-code" style={{ letterSpacing: '0.2em', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }} placeholder="••••" value={passcode} onChange={e => setPasscode(e.target.value)} disabled={loading} />
              </div>

              <button 
                type="submit" 
                disabled={loading || !roomCode} 
                style={{ 
                  width: '100%', padding: '16px', fontSize: 16, marginTop: 12, borderRadius: 12,
                  background: loading ? 'rgba(6,182,212,0.2)' : 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  color: loading ? '#67e8f9' : '#fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                  border: loading ? '1px solid rgba(6,182,212,0.5)' : 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
                }}
                className={!loading ? "hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(6,182,212,0.4)]" : "animate-pulse"}
              >
                {loading ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="0.75"></path>
                    </svg>
                    AUTHENTICATING...
                  </>
                ) : (
                  <>CONNECT &rarr;</>
                )}
              </button>
              
              <div style={{ textAlign: 'center', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span className="status-dot warning" style={{ width: 6, height: 6 }}></span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Camera/Mic Auto-Start
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
