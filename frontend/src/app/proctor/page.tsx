'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/useStore'
import { roomsAPI, questionsAPI } from '@/utils/api'
import { useSearchParams } from 'next/navigation'
import { LiveKitRoom, useTracks, VideoTrack } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { livekitAPI } from '@/utils/api'
import { Suspense } from 'react'
import Link from 'next/link'

function StudentVideo({ studentId, source = Track.Source.Camera }: { studentId: number, source?: Track.Source }) {
  const tracks = useTracks([{ source, withPlaceholder: false }])
  const track = tracks.find(t => t.participant.identity === `student_${studentId}`)
  
  if (!track || !track.publication) return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(135deg, rgba(15,15,42,0.8) 0%, rgba(0,0,0,1) 100%)`,
      fontSize: 24, userSelect: 'none', flexDirection: 'column', gap: 10
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>NO SIGNAL</span>
    </div>
  )
  
  return <VideoTrack trackRef={track as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'ĐANG THI',  color: '#34d399', bg: 'rgba(16,185,129,0.15)' },
  violation: { label: 'GIAN LẬN',  color: '#ef4444', bg: 'rgba(239,68,68,0.2)' },
  offline:   { label: 'MẤT KẾT NỐI', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)' },
  completed: { label: 'ĐÃ NỘP BÀI', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
}

interface StudentStatus {
  id: number
  name: string
  code: string
  score: number
  status: string
  violations: number
  progress: number
}

function ProctorDashboardContent() {
  const searchParams = useSearchParams()
  const roomIdParam = searchParams.get('room')
  const ROOM_ID = roomIdParam ? parseInt(roomIdParam) : 1

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selected, setSelected] = useState<number | null>(null)
  const [sidebar, setSidebar] = useState<'violations' | 'chat'>('violations')
  
  const [students, setStudents] = useState<StudentStatus[]>([])
  const [violations, setViolations] = useState<any[]>([])
  const [livekitToken, setLivekitToken] = useState('')
  const [totalQuestions, setTotalQuestions] = useState(1)
  
  const user = useAuthStore(state => state.user)
  const wsRef = useRef<WebSocket | null>(null)
  const studentsRef = useRef<StudentStatus[]>([])

  useEffect(() => {
    studentsRef.current = students
  }, [students])

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [res, qRes] = await Promise.all([
          roomsAPI.getDashboard(ROOM_ID),
          questionsAPI.getByRoom(ROOM_ID)
        ])
        if (qRes.data) {
          setTotalQuestions(Math.max(1, qRes.data.length))
        }
        const fetchedStudents = res.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          score: item.score,
          status: item.violations > 0 ? 'violation' : item.status, 
          violations: item.violations,
          progress: item.progress
        }))
        setStudents(fetchedStudents)
      } catch (err) {
        console.error("Lỗi lấy dữ liệu dashboard:", err)
      }
    }
    fetchDashboard()
  }, [ROOM_ID])

  useEffect(() => {
    if (!user || typeof window === 'undefined') return
    livekitAPI.generateToken({ 
      room_name: `exam_room_${ROOM_ID}`, 
      participant_name: user.full_name 
    }).then(res => setLivekitToken(res.data.token))
    .catch(err => console.error("LiveKit token error", err))
  }, [user, ROOM_ID])

  useEffect(() => {
    if (!user || typeof window === 'undefined') return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
    const ws = new WebSocket(`${wsUrl}/ws/${ROOM_ID}/${user.user_id}`)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'proctoring_violation') {
          const time = new Date().toLocaleTimeString('vi-VN', { hour12: false })
          const targetStudent = studentsRef.current.find(s => s.id === data.student_id)
          const studentName = targetStudent ? targetStudent.name : `Sinh viên ${data.student_id}`
          
          setViolations(prev => [
            ...data.violations.map((v: any, idx: number) => ({
              id: Date.now() + idx,
              student: studentName,
              type: v.type,
              time: time,
              severity: v.severity || 'high'
            })),
            ...prev
          ])
          
          setStudents(prev => prev.map(s => {
            if (s.id === data.student_id) {
              return { ...s, status: 'violation', violations: s.violations + data.violations.length }
            }
            return s
          }))
        } else if (data.type === 'grading_result') {
          setStudents(prev => prev.map(s => {
            if (s.id === data.student_id) {
              return { 
                ...s, 
                score: Math.max(s.score, Math.round(data.score_percentage)), 
                status: data.score_percentage >= 100 ? 'completed' : 'active' 
              }
            }
            return s
          }))
        } else if (data.type === 'status_update') {
          setStudents(prev => prev.map(s => {
            if (s.id === data.student_id) {
              if (s.status === 'completed' && data.status === 'active') return s;
              if (s.status === 'violation' && data.status === 'active') return s;
              return { ...s, status: data.status }
            }
            return s
          }))
        }
      } catch (e) {
        console.error('Error parsing WS message', e)
      }
    }

    wsRef.current = ws

    return () => ws.close()
  }, [user])

  const activeCount   = students.filter(s => s.status === 'active' || s.status === 'violation').length
  const violationCount = students.filter(s => s.status === 'violation').length
  const offlineCount  = students.filter(s => s.status === 'offline').length
  const avgScore = Math.round(students.reduce((a, s) => a + s.score, 0) / (students.length || 1))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#050510', color: 'white' }}>
      
      {/* Background Decor */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'fixed', inset: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M 20 0 L 0 0 0 20\' fill=\'none\' stroke=\'rgba(255,255,255,0.02)\' stroke-width=\'1\'/%3E%3C/svg%3E")', pointerEvents: 'none', zIndex: 0 }}></div>

      {livekitToken ? (
        <LiveKitRoom
          video={false}
          audio={false}
          token={livekitToken}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880'}
          style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', zIndex: 10 }}
        >
          {/* ── NAVBAR ── */}
          <nav style={{
            height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
            background: 'rgba(5,5,16,0.95)', borderBottom: '1px solid rgba(6,182,212,0.3)', flexShrink: 0,
            backdropFilter: 'blur(10px)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '0.05em', color: '#fff' }}>OCULIDE PROCTOR</span>
                <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Surveillance Active</span>
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Quick stats indicators */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#34d399' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', animation: 'pulse 2s infinite' }} />
                {activeCount} ĐANG THI
              </div>
              {violationCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, color: '#fca5a5', animation: 'pulse 1s infinite' }}>
                  ⚠️ {violationCount} CẢNH BÁO
                </div>
              )}
            </div>

            {/* View toggle */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', marginLeft: 16 }}>
              {(['grid', 'list'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '8px 12px', border: 'none', cursor: 'pointer', background: view === v ? 'rgba(6,182,212,0.2)' : 'transparent',
                    color: view === v ? '#67e8f9' : 'var(--text-muted)', transition: 'all 0.2s',
                  }}
                >
                  {v === 'grid' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                  )}
                </button>
              ))}
            </div>

            <Link href="/instructor" style={{ marginLeft: 8, padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, color: 'var(--text-muted)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
            </Link>
          </nav>

          {/* ── BODY ── */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* ── MAIN AREA ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

              {/* Advanced Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'TỔNG SINH VIÊN', value: students.length, color: '#a5b4fc', bg: 'rgba(165,180,252,0.1)' },
                  { label: 'ĐANG LÀM BÀI', value: activeCount, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
                  { label: 'CẢNH BÁO AI', value: violationCount, color: '#f87171', bg: 'rgba(248,113,113,0.15)', glow: violationCount > 0 },
                  { label: 'ĐIỂM TRUNG BÌNH', value: `${avgScore}/10`, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                ].map((s, i) => (
                  <div key={i} style={{ 
                    background: 'rgba(15,15,42,0.8)', padding: '20px 24px', borderRadius: 16, 
                    border: `1px solid ${s.glow ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.05)'}`,
                    boxShadow: s.glow ? '0 0 20px rgba(248,113,113,0.2)' : 'none',
                    display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', right: -20, top: -20, width: 80, height: 80, background: s.bg, borderRadius: '50%', filter: 'blur(20px)' }}></div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8, zIndex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1, zIndex: 1 }}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* View Toggle Content */}
              {view === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {students.map(s => {
                    const status = statusConfig[s.status];
                    const isViolating = s.status === 'violation';
                    
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelected(selected === s.id ? null : s.id)}
                        style={{
                          background: 'rgba(10,10,26,0.9)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                          border: `1px solid ${selected === s.id ? '#06b6d4' : isViolating ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.05)'}`,
                          boxShadow: selected === s.id ? '0 0 20px rgba(6,182,212,0.3)' : isViolating ? '0 0 15px rgba(239,68,68,0.2)' : 'none',
                          transition: 'all 0.2s', position: 'relative'
                        }}
                      >
                        {/* Camera Frame */}
                        <div style={{ height: 180, position: 'relative', background: '#000' }}>
                          {selected === s.id ? (
                            <StudentVideo studentId={s.id} source={Track.Source.ScreenShare} />
                          ) : (
                            <StudentVideo studentId={s.id} source={Track.Source.Camera} />
                          )}
                          
                          {/* Cyberpunk Scanline */}
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.2) 50%)', backgroundSize: '100% 4px', pointerEvents: 'none', opacity: 0.5 }}></div>
                          
                          {/* Top Badges */}
                          <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
                            <span style={{ background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, color: '#fff', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }}></div>
                              REC
                            </span>
                            <span style={{ background: status.bg, color: status.color, padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, backdropFilter: 'blur(4px)', border: `1px solid ${status.color}44` }}>
                              {status.label}
                            </span>
                          </div>

                          {/* Violations Warning overlay */}
                          {isViolating && (
                            <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(239,68,68,0.8)', pointerEvents: 'none', zIndex: 5, animation: 'pulse 1.5s infinite' }}></div>
                          )}
                        </div>

                        {/* Info Footer */}
                        <div style={{ padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>{s.name}</h3>
                              <div className="font-code" style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {s.code}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 18, fontWeight: 900, color: s.score >= 80 ? '#34d399' : s.score >= 50 ? '#fbbf24' : '#f87171' }}>{s.score} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>PTS</span></div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${(s.progress / totalQuestions) * 100}%`, height: '100%', background: '#06b6d4', borderRadius: 2 }}></div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{s.progress}/{totalQuestions}</span>
                          </div>

                          {/* Action Buttons for violator */}
                          {isViolating && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                              <button style={{ flex: 1, padding: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); alert('Đã gửi tin nhắn cảnh cáo!'); }}>CẢNH CÁO</button>
                              <button style={{ flex: 1, padding: '6px', background: 'rgba(239,68,68,0.8)', border: 'none', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if(confirm(`Đuổi ${s.name}?`)) wsRef.current?.send(JSON.stringify({ type: 'kick_student', student_id: s.id })); }}>KICK</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ background: 'rgba(10,10,26,0.9)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Họ Tên</th>
                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>MSSV</th>
                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Trạng Thái</th>
                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Điểm</th>
                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Tiến Độ</th>
                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, idx) => {
                        const status = statusConfig[s.status];
                        return (
                          <tr key={s.id} style={{ borderBottom: idx === students.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', background: s.status === 'violation' ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                            <td style={{ padding: '16px 24px', fontWeight: 700, color: '#f1f5f9' }}>{s.name}</td>
                            <td style={{ padding: '16px 24px' }} className="font-code text-sm text-slate-400">{s.code}</td>
                            <td style={{ padding: '16px 24px' }}>
                              <span style={{ background: status.bg, color: status.color, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, border: `1px solid ${status.color}44` }}>
                                {status.label} {s.violations > 0 ? `(${s.violations})` : ''}
                              </span>
                            </td>
                            <td style={{ padding: '16px 24px', fontWeight: 800, color: s.score >= 80 ? '#34d399' : s.score >= 50 ? '#fbbf24' : '#f87171' }}>{s.score}</td>
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 100 }}>
                                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}><div style={{ width: `${(s.progress / totalQuestions) * 100}%`, height: '100%', background: '#06b6d4', borderRadius: 2 }}></div></div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.progress}/{totalQuestions}</span>
                              </div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6 }}>View</button>
                                <button className="btn-secondary" onClick={() => { if(confirm(`Đuổi ${s.name}?`)) wsRef.current?.send(JSON.stringify({ type: 'kick_student', student_id: s.id })); }} style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6, color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)' }}>Kick</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── RIGHT SIDEBAR: TERMINAL ── */}
            <div style={{
              width: 340, borderLeft: '1px solid rgba(6,182,212,0.3)', flexShrink: 0,
              display: 'flex', flexDirection: 'column', background: 'rgba(5,5,16,0.95)', overflow: 'hidden',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
            }}>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {(['violations', 'chat'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setSidebar(t)}
                    style={{
                      flex: 1, padding: '16px 12px', border: 'none', cursor: 'pointer', background: sidebar === t ? 'rgba(6,182,212,0.1)' : 'transparent',
                      fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: sidebar === t ? '#67e8f9' : 'var(--text-muted)',
                      borderBottom: sidebar === t ? '2px solid #06b6d4' : '2px solid transparent',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                  >
                    {t === 'violations' ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Cảnh báo AI ({violations.length})</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Chat Lớp</>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 16, fontFamily: '"JetBrains Mono", monospace' }}>
                {sidebar === 'violations' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {violations.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 40 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 8px', opacity: 0.5 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        Hệ thống bình thường.<br/>Chưa ghi nhận vi phạm nào.
                      </div>
                    ) : (
                      violations.map(v => (
                        <div key={v.id} style={{ padding: 12, background: 'rgba(239,68,68,0.05)', borderLeft: '3px solid #ef4444', borderRadius: '0 8px 8px 0', fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: '#fca5a5', fontWeight: 700 }}>[ {v.time} ]</span>
                            <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>AI_DETECTED</span>
                          </div>
                          <div style={{ color: '#fff', fontWeight: 700, marginBottom: 2 }}>{v.student}</div>
                          <div style={{ color: 'var(--text-secondary)' }}>{v.type}</div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                    <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
                      <div style={{ color: '#67e8f9', fontWeight: 700, fontSize: 11, marginBottom: 4 }}>HỆ THỐNG</div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Kỳ thi bắt đầu. Dữ liệu đang được ghi hình.</p>
                    </div>
                  </div>
                )}
              </div>

              {sidebar === 'chat' && (
                <div style={{ padding: 16, background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input-field" placeholder="Gửi thông báo..." style={{ fontSize: 13, padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.5)' }} />
                    <button className="btn-primary" style={{ padding: '0 16px', borderRadius: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </LiveKitRoom>
      ) : (
        <div className="cyber-scanner scanning" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(6,182,212,0.2)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ color: '#67e8f9', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>INITIALIZING SURVEILLANCE...</span>
        </div>
      )}
    </div>
  )
}

export default function ProctorDashboard() {
  return (
    <Suspense fallback={<div style={{ background: '#050510', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải giao diện giám sát...</div>}>
      <ProctorDashboardContent />
    </Suspense>
  )
}
