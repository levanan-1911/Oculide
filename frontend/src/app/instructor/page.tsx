'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useStore'
import { roomsAPI } from '@/utils/api'
import Link from 'next/link'

export default function InstructorDashboard() {
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoom, setNewRoom] = useState({
    room_code: '',
    room_name: '',
    passcode: '',
    duration_minutes: 60,
    start_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Tomorrow
    end_time: new Date(Date.now() + 86400000 + 7200000).toISOString().slice(0, 16),
  })

  useEffect(() => {
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
  }, [user, router])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const res = await roomsAPI.getAll()
      // Optional: filter rooms created by this instructor if backend doesn't
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
      await roomsAPI.create({
        room_code: newRoom.room_code,
        room_name: newRoom.room_name,
        passcode: newRoom.passcode || undefined,
        start_time: new Date(newRoom.start_time).toISOString(),
        end_time: new Date(newRoom.end_time).toISOString(),
        duration_minutes: Number(newRoom.duration_minutes),
        max_attempts: 1
      })
      setShowCreateModal(false)
      fetchRooms() // Refresh list
    } catch (error: any) {
      alert("Lỗi tạo phòng: " + (error.response?.data?.detail || "Mã phòng đã tồn tại hoặc dữ liệu sai"))
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    alert(`Đã copy mã phòng: ${code}. Gửi mã này cho sinh viên để vào thi nhé!`)
  }

  if (loading) {
    return (
      <div className="cyber-scanner scanning" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ width: 60, height: 60, border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'white', padding: '40px 20px', position: 'relative', overflowX: 'hidden' }}>
      
      {/* BACKGROUND EFFECTS */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>
      
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
                const isActive = room.is_active;
                return (
                  <div key={room.room_id} className="glass-card hover-glow" style={{ padding: 24, borderRadius: 20, border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}`, background: 'rgba(15,15,42,0.6)', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}>
                    
                    {/* Active Indicator Line */}
                    {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div>}

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
                        background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                        color: isActive ? '#34d399' : 'var(--text-muted)',
                        border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)'}`
                      }}>
                        {isActive ? 'ĐANG MỞ' : 'ĐÃ ĐÓNG'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Thời gian làm bài: <strong style={{ color: '#fff' }}>{room.duration_minutes} phút</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Mở: <strong style={{ color: '#fff' }}>{new Date(room.start_time).toLocaleString('vi-VN')}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Link href={`/instructor/room/${room.room_id}`} className="btn-secondary" style={{ padding: '12px 0', fontSize: 13, fontWeight: 700, borderRadius: 10, textAlign: 'center', textDecoration: 'none' }}>
                        Tạo / Sửa Đề Thi
                      </Link>
                      <Link href={`/proctor?room=${room.room_id}`} className={isActive ? "btn-primary" : "btn-secondary"} style={{ padding: '12px 0', fontSize: 13, fontWeight: 700, borderRadius: 10, textAlign: 'center', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        Vào Giám Sát
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,5,16,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div className="glass-card animate-fade-in-up" style={{ width: '100%', maxWidth: 540, padding: 40, borderRadius: 24, border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Khởi Tạo Phòng Thi</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Nhập thông tin để tạo không gian thi trực tuyến an toàn.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }} className="hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                  Tên Môn Thi / Phòng Thi
                </label>
                <input 
                  type="text" 
                  required
                  className="input-field" 
                  placeholder="VD: Cấu trúc Dữ liệu & Giải thuật Cuối kỳ"
                  value={newRoom.room_name}
                  onChange={e => setNewRoom({...newRoom, room_name: e.target.value})}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', fontSize: 15 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Mã Tham Gia (Code)
                  </label>
                  <input 
                    type="text" 
                    required
                    className="input-field font-code" 
                    placeholder="VD: CTDL2026"
                    value={newRoom.room_code}
                    onChange={e => setNewRoom({...newRoom, room_code: e.target.value.toUpperCase()})}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', fontSize: 15 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Mật khẩu (Tùy chọn)
                  </label>
                  <input 
                    type="text" 
                    className="input-field font-code" 
                    placeholder="Để trống nếu công khai"
                    value={newRoom.passcode}
                    onChange={e => setNewRoom({...newRoom, passcode: e.target.value})}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', fontSize: 15 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Mở Phòng Lúc
                  </label>
                  <input 
                    type="datetime-local" 
                    required
                    className="input-field" 
                    value={newRoom.start_time}
                    onChange={e => setNewRoom({...newRoom, start_time: e.target.value})}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Thời Gian Thi (Phút)
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    className="input-field" 
                    value={newRoom.duration_minutes}
                    onChange={e => setNewRoom({...newRoom, duration_minutes: Number(e.target.value)})}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', fontSize: 15 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ flex: 1, padding: '14px 0', fontSize: 15, fontWeight: 700, borderRadius: 12 }}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, padding: '14px 0', fontSize: 15, fontWeight: 800, borderRadius: 12, boxShadow: '0 8px 20px rgba(99,102,241,0.3)' }}>
                  Khởi Tạo Ngay
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
