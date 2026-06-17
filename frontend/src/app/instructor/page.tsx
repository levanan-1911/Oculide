'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useStore'
import { roomsAPI } from '@/utils/api'
import Link from 'next/link'

export default function InstructorDashboard() {
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const isHydrated = useAuthStore(state => state.isHydrated)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Helper tạo chuỗi datetime-local chuẩn theo múi giờ hiện tại
  const getLocalIsoString = (msOffset = 0) => {
    const d = new Date(Date.now() + msOffset)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  const [newRoom, setNewRoom] = useState({
    room_code: '',
    room_name: '',
    passcode: '',
    duration_minutes: 60,
    start_time: getLocalIsoString(86400000), // Ngày mai
    end_time: getLocalIsoString(86400000 + 7200000),
  })

  useEffect(() => {
    // Wait until localStorage has been read before making auth decisions
    if (!isHydrated) return

    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'instructor' && user.role !== 'admin') {
      alert("Bạn không có quyền truy cập trang này!")
      router.push('/')
      return
    }

    fetchRooms()
  }, [isHydrated, user, router])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const res = await roomsAPI.getAll()
      setRooms(res.data)
    } catch (error) {
      console.error("Lỗi lấy danh sách phòng:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const sTime = new Date(newRoom.start_time)
      const eTime = new Date(sTime.getTime() + Number(newRoom.duration_minutes) * 60000)

      await roomsAPI.create({
        room_code: newRoom.room_code,
        room_name: newRoom.room_name,
        passcode: newRoom.passcode || undefined,
        start_time: sTime.toISOString(),
        end_time: eTime.toISOString(),
        duration_minutes: Number(newRoom.duration_minutes),
        max_attempts: 1
      })
      setShowCreateModal(false)
      fetchRooms()
    } catch (error: any) {
      alert("Lỗi tạo phòng: " + (error.response?.data?.detail || "Mã phòng đã tồn tại hoặc dữ liệu sai"))
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    alert(`Đã copy mã phòng: ${code}. Gửi mã này cho sinh viên để vào thi nhé!`)
  }

  // Show spinner while hydrating from localStorage OR loading rooms
  if (!isHydrated || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ width: 60, height: 60, border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'white', padding: '40px 20px', position: 'relative', overflowX: 'hidden' }}>
      
      {/* BACKGROUND EFFECTS */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>
      
      {/* BACK BUTTON */}
      <Link href="/" style={{
        position: 'fixed', top: 20, left: 24, display: 'flex', alignItems: 'center', gap: 8,
        color: 'rgba(255,255,255,0.45)', fontSize: 13, textDecoration: 'none',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 14px', borderRadius: 10, fontWeight: 600, zIndex: 50,
        transition: 'all 0.2s', backdropFilter: 'blur(10px)'
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Trang chủ
      </Link>

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        
        {/* HEADER & TOP STATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30, marginBottom: 40 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Instructor Portal
                </div>
                <div className="status-dot online"></div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>System Online</span>
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: '-0.03em', color: '#fff' }}>
                Tổng quan hệ thống
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 16 }}>
                Chào mừng <span style={{ color: '#fff', fontWeight: 700 }}>Thầy/Cô {user?.full_name}</span>. Quản lý phòng thi, đề bài và theo dõi sinh viên trực tiếp.
              </p>
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary" 
              style={{ padding: '14px 28px', fontSize: 15, borderRadius: 14, display: 'flex', gap: 10, alignItems: 'center', fontWeight: 800, boxShadow: '0 8px 24px rgba(99,102,241,0.2)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              TẠO PHÒNG THI MỚI
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            <div className="glass-card" style={{ padding: 24, borderRadius: 16, borderLeft: '4px solid #6366f1', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ padding: 16, background: 'rgba(99,102,241,0.1)', borderRadius: 12 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng phòng thi</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{rooms.length}</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: 24, borderRadius: 16, borderLeft: '4px solid #06b6d4', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ padding: 16, background: 'rgba(6,182,212,0.1)', borderRadius: 12 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sinh viên tham gia</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>--</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: 24, borderRadius: 16, borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ padding: 16, background: 'rgba(245,158,11,0.1)', borderRadius: 12 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cảnh báo AI</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>--</div>
              </div>
            </div>
          </div>
        </div>

        {/* ROOMS GRID */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Danh Sách Phòng Thi
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
            {rooms.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: 80, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ width: 80, height: 80, background: 'rgba(99,102,241,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <h3 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 20 }}>Chưa có dữ liệu phòng thi</h3>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 20px' }}>Hệ thống đang trống. Bắt đầu bằng việc tạo một phòng thi mới.</p>
                <button onClick={() => setShowCreateModal(true)} className="btn-secondary" style={{ padding: '10px 24px', borderRadius: 8 }}>+ Tạo ngay</button>
              </div>
            ) : (
              rooms.map(room => {
                const now = new Date(currentTime)
                const sTimeStr = room.start_time.endsWith('Z') || room.start_time.includes('+') ? room.start_time : room.start_time + 'Z'
                const startTime = new Date(sTimeStr)
                
                let endTime: Date;
                if (room.end_time) {
                  const eTimeStr = room.end_time.endsWith('Z') || room.end_time.includes('+') ? room.end_time : room.end_time + 'Z'
                  endTime = new Date(eTimeStr)
                } else {
                  endTime = new Date(startTime.getTime() + room.duration_minutes * 60 * 1000)
                }
                
                const hasStarted = now >= startTime
                const hasEnded = now > endTime
                const isActive = room.is_active && hasStarted && !hasEnded
                const isScheduled = room.is_active && !hasStarted
                // isActive=true → ĐANG MỞ, isScheduled=true → CHƯA MỞ, else → ĐÃ ĐÓNG

                const statusLabel = isActive ? 'ĐANG MỞ' : isScheduled ? 'CHƯA MỞ' : 'ĐÃ ĐÓNG'
                const statusColor = isActive ? '#34d399' : isScheduled ? '#fbbf24' : 'var(--text-muted)'
                const statusBg    = isActive ? 'rgba(16,185,129,0.1)' : isScheduled ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)'
                const statusBorder= isActive ? 'rgba(16,185,129,0.2)' : isScheduled ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.1)'
                const cardBorder  = isActive ? 'rgba(16,185,129,0.3)' : isScheduled ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'

                return (
                  <div key={room.room_id} className="glass-card hover-glow" style={{ padding: 24, borderRadius: 20, border: `1px solid ${cardBorder}`, background: 'rgba(15,15,42,0.6)', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}>
                    
                    {/* Status top line */}
                    {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div>}
                    {isScheduled && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}></div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div style={{ flex: 1, paddingRight: 10 }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.3 }}>{room.room_name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="font-code" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700, border: '1px solid rgba(99,102,241,0.3)' }}>
                            {room.room_code}
                          </span>
                          <button onClick={() => copyToClipboard(room.room_code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 4, display: 'flex', alignItems: 'center' }} className="hover:bg-[rgba(255,255,255,0.1)] transition-colors" title="Copy mã chia sẻ">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ 
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: statusBg, color: statusColor, border: `1px solid ${statusBorder}`,
                        display: 'flex', alignItems: 'center', gap: 5
                      }}>
                        {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite' }} />}
                        {statusLabel}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Thời gian làm bài: <strong style={{ color: '#fff' }}>{room.duration_minutes} phút</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#34d399' : isScheduled ? '#fbbf24' : 'var(--text-muted)'} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        {isActive ? 'Khai mạc:' : isScheduled ? 'Khai mạc lúc:' : 'Đã kết thúc:'} <strong style={{ color: isScheduled ? '#fbbf24' : '#fff' }}>{startTime.toLocaleString('vi-VN')}</strong>
                      </div>
                      {isActive && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          Kết thúc lúc: <strong style={{ color: '#fca5a5' }}>{endTime.toLocaleString('vi-VN')}</strong>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isActive ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
                      {isScheduled ? (
                        <>
                          <Link href={`/instructor/room/${room.room_id}`} className="btn-secondary" style={{ padding: '10px 0', fontSize: 12, fontWeight: 700, borderRadius: 8, textAlign: 'center', textDecoration: 'none' }}>Tạo / Sửa Đề</Link>
                          <button onClick={async () => {
                             if(confirm('Chắc chắn muốn MỞ PHÒNG THI NGAY BÂY GIỜ? Sinh viên sẽ được làm bài lập tức.')) {
                               await roomsAPI.update(room.room_id, { start_time: new Date().toISOString() });
                               fetchRooms();
                             }
                          }} className="btn-primary" style={{ padding: '10px 0', fontSize: 12, fontWeight: 700, borderRadius: 8 }}>Mở Thi Ngay</button>
                        </>
                      ) : isActive ? (
                        <>
                          <button onClick={async () => {
                             if(confirm('Chưa làm xong đề? Hành động này sẽ LÙI GIỜ KHAI MẠC thêm 30 phút để bạn chuẩn bị. Sinh viên sẽ bị đưa về Phòng Chờ.')) {
                               const newStart = new Date(Date.now() + 30 * 60000);
                               const newEnd = new Date(newStart.getTime() + room.duration_minutes * 60000);
                               await roomsAPI.update(room.room_id, { start_time: newStart.toISOString(), end_time: newEnd.toISOString() });
                               fetchRooms();
                             }
                          }} className="btn-secondary" style={{ padding: '10px 0', fontSize: 11, fontWeight: 700, borderRadius: 8, color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)' }}>Tạm Khóa Lại</button>
                          
                          <button onClick={async () => {
                             if(confirm('Chắc chắn muốn KẾT THÚC SỚM? Tất cả bài của sinh viên sẽ bị thu lại ngay lập tức.')) {
                               await roomsAPI.update(room.room_id, { end_time: new Date().toISOString() });
                               fetchRooms();
                             }
                          }} className="btn-secondary" style={{ padding: '10px 0', fontSize: 11, fontWeight: 700, borderRadius: 8, color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)' }}>Kết Thúc Sớm</button>
                          
                          <Link href={`/proctor?room=${room.room_id}`} className="btn-primary" style={{ padding: '10px 0', fontSize: 11, fontWeight: 700, borderRadius: 8, textAlign: 'center', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                            Giám Sát
                          </Link>
                        </>
                      ) : (
                        <>
                          <button disabled className="btn-secondary" style={{ padding: '10px 0', fontSize: 12, fontWeight: 700, borderRadius: 8, opacity: 0.4, cursor: 'not-allowed' }}>Đã Đóng Môn</button>
                          <Link href={`/proctor?room=${room.room_id}&view=scoreboard`} className="btn-primary" style={{ padding: '10px 0', fontSize: 12, fontWeight: 700, borderRadius: 8, textAlign: 'center', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            Xem Bảng Điểm
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* CREATE ROOM MODAL - Premium Redesign */}
      {showCreateModal && (
        <div onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(3,3,20,0.88)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 620, borderRadius: 28, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.2)', position: 'relative' }}>
            
            {/* Glow accents */}
            <div style={{ position: 'absolute', top: -80, left: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: -60, right: -60, width: 220, height: 220, background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

            {/* Header band */}
            <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(6,182,212,0.08) 100%)', borderBottom: '1px solid rgba(99,102,241,0.2)', padding: '28px 32px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.4)', flexShrink: 0 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Instructor Portal</div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Khởi Tạo Phòng Thi</h2>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Step indicators */}
              <div style={{ display: 'flex', gap: 8, marginTop: 22, alignItems: 'center' }}>
                {['Thông tin cơ bản', 'Mã & Bảo mật', 'Lịch trình'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: i === 0 ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: i === 0 ? '#6366f1' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'white' }}>{i + 1}</div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? '#a5b4fc' : 'rgba(255,255,255,0.3)' }}>{step}</span>
                    </div>
                    {i < 2 && <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.1)' }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Form body */}
            <div style={{ position: 'relative', zIndex: 1, background: 'rgba(8,8,30,0.95)', padding: '28px 32px 32px' }}>
              <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                
                {/* Room name */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    Tên Môn Thi / Phòng Thi <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder="VD: Cấu trúc Dữ liệu & Giải thuật — Cuối kỳ 2026"
                      value={newRoom.room_name}
                      onChange={e => setNewRoom({...newRoom, room_name: e.target.value})}
                      style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>

                {/* Code & Password */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v4M14 2v4M8 10h8M8 14h8M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>
                        Mã Phòng <span style={{ color: '#ef4444' }}>*</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                          let res = '';
                          for(let i=0; i<6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
                          setNewRoom(prev => ({...prev, room_code: res}));
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '2px 8px', borderRadius: 6, color: '#a5b4fc', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)' }}
                        title="Tạo mã ngẫu nhiên"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                        TẠO NGẪU NHIÊN
                      </button>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CTDL2026"
                      value={newRoom.room_code}
                      onChange={e => setNewRoom({...newRoom, room_code: e.target.value.toUpperCase()})}
                      style={{ width: '100%', padding: '14px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, color: '#a5b4fc', fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '0.05em', transition: 'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.25)'}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Mã sinh viên dùng để vào phòng</p>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Mật khẩu
                      <span style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>TÙY CHỌN</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Để trống nếu không cần"
                      value={newRoom.passcode}
                      onChange={e => setNewRoom({...newRoom, passcode: e.target.value})}
                      style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Bảo vệ thêm nếu cần thiết</p>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lịch trình thi</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {/* Time & Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Khai mạc lúc <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newRoom.start_time}
                      onChange={e => setNewRoom({...newRoom, start_time: e.target.value})}
                      style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark', transition: 'border-color 0.2s', position: 'relative', zIndex: 10, cursor: 'pointer' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Thời gian thi <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newRoom.duration_minutes}
                        onChange={e => setNewRoom({...newRoom, duration_minutes: Number(e.target.value)})}
                        style={{ width: '100%', padding: '14px 52px 14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>phút</span>
                    </div>
                  </div>
                </div>

                {/* Quick duration chips */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[30, 45, 60, 90, 120].map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setNewRoom({...newRoom, duration_minutes: min})}
                      style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${newRoom.duration_minutes === min ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`, background: newRoom.duration_minutes === min ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', color: newRoom.duration_minutes === min ? '#a5b4fc' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}
                    >
                      {min} phút
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 8px 28px rgba(99,102,241,0.4), 0 0 0 1px rgba(99,102,241,0.3)', transition: 'all 0.2s', letterSpacing: '0.01em', textAlign: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 36px rgba(99,102,241,0.5), 0 0 0 1px rgba(99,102,241,0.4)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(99,102,241,0.4), 0 0 0 1px rgba(99,102,241,0.3)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    Khởi Tạo Phòng Thi
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
