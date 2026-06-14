'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useStore'
import { questionsAPI, roomsAPI } from '@/utils/api'

interface TestCase {
  input_data: string
  expected_output: string
  is_hidden: boolean
  points: number
}

export default function RoomEditorPage() {
  const params = useParams()
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  
  const roomId = Number(params.id)
  
  const [room, setRoom] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form State
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [maxPoints, setMaxPoints] = useState(10)
  const [timeLimit, setTimeLimit] = useState(10)
  const [memoryLimit, setMemoryLimit] = useState(128)
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input_data: '', expected_output: '', is_hidden: false, points: 10 }
  ])

  useEffect(() => {
    if (!user) return
    fetchRoomData()
  }, [user, roomId])

  const fetchRoomData = async () => {
    try {
      if (!room) setLoading(true)
      const [roomRes, questionsRes] = await Promise.all([
        roomsAPI.getById(roomId),
        questionsAPI.getByRoom(roomId)
      ])
      setRoom(roomRes.data)
      setQuestions(questionsRes.data)
    } catch (err) {
      console.error(err)
      alert("Lỗi tải dữ liệu phòng thi")
    } finally {
      setLoading(false)
    }
  }

  const distributePoints = (tcs: TestCase[], maxPts: number) => {
    if (tcs.length === 0) return tcs
    const avg = Math.floor((maxPts / tcs.length) * 100) / 100
    let remainder = maxPts - (avg * (tcs.length - 1))
    remainder = Math.round(remainder * 100) / 100
    
    return tcs.map((tc, idx) => ({
      ...tc,
      points: idx === tcs.length - 1 ? remainder : avg
    }))
  }

  const handleAddTestCase = () => {
    const newTc = [...testCases, { input_data: '', expected_output: '', is_hidden: true, points: 0 }]
    setTestCases(distributePoints(newTc, maxPoints))
  }

  const handleRemoveTestCase = (index: number) => {
    const newTc = testCases.filter((_, i) => i !== index)
    setTestCases(distributePoints(newTc, maxPoints))
  }

  const handleTestCaseChange = (index: number, field: keyof TestCase, value: any) => {
    const newTc = [...testCases]
    newTc[index] = { ...newTc[index], [field]: value }
    setTestCases(newTc)
  }

  const handleEdit = async (q: any) => {
    try {
      const tcRes = await questionsAPI.getTestCases(q.question_id)
      setTitle(q.question_title)
      setDescription(q.question_description)
      setMaxPoints(q.max_points)
      setTimeLimit(q.time_limit_minutes || 10)
      setMemoryLimit(q.memory_limit_mb || 128)
      
      if (tcRes.data && tcRes.data.length > 0) {
        setTestCases(tcRes.data)
      } else {
        setTestCases([{ input_data: '', expected_output: '', is_hidden: false, points: q.max_points }])
      }
      
      setEditingId(q.question_id)
      setShowForm(true)
    } catch (err) {
      alert("Lỗi tải Test Cases")
    }
  }

  const handleDelete = async (questionId: number) => {
    if (!confirm("Hành động này không thể hoàn tác! Bạn có chắc chắn xóa bài toán này?")) return
    try {
      await questionsAPI.delete(questionId)
      fetchRoomData()
    } catch (err) {
      alert("Lỗi khi xóa bài toán")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const totalTcPoints = testCases.reduce((sum, tc) => sum + Number(tc.points), 0)
    if (Math.abs(totalTcPoints - maxPoints) > 0.05) {
      alert(`Vui lòng kiểm tra lại: Tổng điểm các Test Cases (${totalTcPoints.toFixed(2)}) phải bằng Điểm tối đa của bài toán (${maxPoints}).`)
      return
    }

    try {
      if (editingId) {
        await questionsAPI.update(editingId, {
          question_title: title,
          question_description: description,
          max_points: maxPoints,
          time_limit_minutes: timeLimit,
          memory_limit_mb: memoryLimit,
          test_cases: testCases
        })
      } else {
        await questionsAPI.create({
          room_id: roomId,
          question_order: questions.length + 1,
          question_title: title,
          question_description: description,
          question_type: 'coding',
          max_points: maxPoints,
          time_limit_minutes: timeLimit,
          memory_limit_mb: memoryLimit,
          test_cases: testCases
        })
      }
      
      setShowForm(false)
      setEditingId(null)
      setTitle('')
      setDescription('')
      setMaxPoints(10)
      setTimeLimit(10)
      setMemoryLimit(128)
      setTestCases([{ input_data: '', expected_output: '', is_hidden: false, points: 10 }])
      fetchRoomData()
    } catch (err: any) {
      alert("Lỗi hệ thống: " + (err.response?.data?.detail || "Vui lòng kiểm tra lại"))
    }
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
      
      {/* Background Decor */}
      <div style={{ position: 'fixed', top: 0, right: 0, width: '40vw', height: '100vh', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.03) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>
      
      <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <button onClick={() => router.push('/instructor')} className="btn-secondary" style={{ width: 44, height: 44, padding: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quản lý Đề thi</span>
              <span className="font-code" style={{ fontSize: 12, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: 6 }}>ROOM: {room?.room_code}</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
              {room?.room_name}
            </h1>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: showForm ? '400px 1fr' : '1fr', gap: 32, alignItems: 'flex-start', transition: 'all 0.3s ease' }}>
          
          {/* Lits of Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#e2e8f0' }}>Danh sách Đề thi ({questions.length})</h2>
              <button onClick={() => {
                if (showForm && !editingId) {
                  setShowForm(false)
                } else {
                  setEditingId(null)
                  setTitle('')
                  setDescription('')
                  setMaxPoints(10)
                  setTimeLimit(10)
                  setMemoryLimit(128)
                  setTestCases([{ input_data: '', expected_output: '', is_hidden: false, points: 10 }])
                  setShowForm(true)
                }
              }} className={showForm && !editingId ? "btn-secondary" : "btn-primary"} style={{ padding: '8px 16px', fontSize: 13, borderRadius: 10 }}>
                {showForm && !editingId ? 'Đóng form' : '+ Tạo Bài Toán Mới'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {questions.length === 0 && !showForm && (
                <div style={{ padding: 60, textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Chưa có bài toán nào. Hãy tạo bài toán đầu tiên!</p>
                </div>
              )}
              {questions.map((q, idx) => (
                <div key={q.question_id} className="glass-card hover-glow" style={{ padding: 24, borderRadius: 20, border: editingId === q.question_id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.05)', background: editingId === q.question_id ? 'rgba(99,102,241,0.05)' : 'rgba(15,15,42,0.6)', transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => handleEdit(q)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Bài {idx + 1}</div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{q.question_title}</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '4px 10px', borderRadius: 8 }}>{q.max_points} PTS</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(q.question_id); }} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Xóa bài toán">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                    {q.question_description}
                  </p>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {q.time_limit_minutes} phút</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg> {q.memory_limit_mb} MB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EDITOR FORM */}
          {showForm && (
            <div className="glass-card animate-fade-in-up" style={{ padding: 40, borderRadius: 24, border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', background: 'linear-gradient(180deg, rgba(15,15,42,0.9) 0%, rgba(5,5,16,0.95) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 20 }}>
                <div>
                  <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: '#fff' }}>{editingId ? 'Sửa Đề Thi' : 'Soạn Thảo Bài Toán Mới'}</h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Điền thông tin mô tả và cấu hình test case để hệ thống chấm điểm tự động.</p>
                </div>
                {editingId && (
                  <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Đóng</button>
                )}
              </div>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Tên Bài Toán</label>
                  <input type="text" required className="input-field" placeholder="VD: Tìm kiếm nhị phân" value={title} onChange={e => setTitle(e.target.value)} style={{ background: 'rgba(0,0,0,0.4)', fontSize: 16, padding: '14px 16px' }} />
                </div>

                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    <span>Nội Dung Đề Bài</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'none' }}>Hỗ trợ Markdown</span>
                  </label>
                  <textarea required className="input-field" style={{ minHeight: 200, resize: 'vertical', background: 'rgba(0,0,0,0.4)', fontSize: 15, lineHeight: 1.6, padding: 16 }} placeholder="Nhập chi tiết yêu cầu bài toán, input/output format..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Điểm Tối Đa</label>
                    <input type="number" required min="1" className="input-field" value={maxPoints} onChange={e => {
                      const newMax = Number(e.target.value)
                      setMaxPoints(newMax)
                      setTestCases(distributePoints(testCases, newMax))
                    }} style={{ background: 'rgba(0,0,0,0.4)', textAlign: 'center', fontWeight: 800, color: '#34d399' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Thời Gian (Phút)</label>
                    <input type="number" required min="1" className="input-field" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} style={{ background: 'rgba(0,0,0,0.4)', textAlign: 'center' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Bộ Nhớ (MB)</label>
                    <input type="number" required min="1" className="input-field" value={memoryLimit} onChange={e => setMemoryLimit(Number(e.target.value))} style={{ background: 'rgba(0,0,0,0.4)', textAlign: 'center' }} />
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Cases</h3>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                        Tổng điểm chia đều tự động
                      </span>
                    </div>
                    <button type="button" onClick={handleAddTestCase} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8 }}>+ Thêm Test Case</button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {testCases.map((tc, idx) => (
                      <div key={idx} style={{ padding: 20, background: 'rgba(0,0,0,0.3)', borderRadius: 16, border: tc.is_hidden ? '1px dashed rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: tc.is_hidden ? '#fbbf24' : 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: tc.is_hidden ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                            Test Case #{idx + 1} {tc.is_hidden ? '(Hidden)' : ''}
                          </span>
                          {testCases.length > 1 && (
                            <button type="button" onClick={() => handleRemoveTestCase(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Xóa</button>
                          )}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Input Data</label>
                            <textarea placeholder="vd: 5 10" className="input-field font-code" style={{ fontSize: 13, minHeight: 80, resize: 'vertical' }} value={tc.input_data} onChange={e => handleTestCaseChange(idx, 'input_data', e.target.value)} required />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Expected Output</label>
                            <textarea placeholder="vd: 15" className="input-field font-code" style={{ fontSize: 13, minHeight: 80, resize: 'vertical' }} value={tc.expected_output} onChange={e => handleTestCaseChange(idx, 'expected_output', e.target.value)} required />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 16px', borderRadius: 10 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={tc.is_hidden} onChange={e => handleTestCaseChange(idx, 'is_hidden', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
                            Ẩn đối với Sinh viên (Chỉ dùng lúc chấm)
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Điểm:</span>
                            <input type="number" className="input-field" style={{ width: 80, padding: '6px 12px', fontSize: 14, fontWeight: 700, color: '#34d399', textAlign: 'right', background: 'rgba(0,0,0,0.5)' }} value={tc.points} onChange={e => handleTestCaseChange(idx, 'points', Number(e.target.value))} required step="0.01" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ position: 'sticky', bottom: 20, zIndex: 20 }}>
                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '18px', fontSize: 16, fontWeight: 800, borderRadius: 16, boxShadow: '0 10px 30px rgba(99,102,241,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    {editingId ? 'Lưu Thay Đổi Bài Toán' : 'Lưu Bài Toán Mới Vào Hệ Thống'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
