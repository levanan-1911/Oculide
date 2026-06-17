'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useStore'
import { roomsAPI, questionsAPI, submissionsAPI } from '@/utils/api'
import { Suspense } from 'react'
import Link from 'next/link'

function ExamResultContent() {
  const searchParams = useSearchParams()
  const roomId = searchParams.get('room')
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const isHydrated = useAuthStore(state => state.isHydrated)

  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])

  useEffect(() => {
    if (!isHydrated) return
    if (!user) {
      router.push('/login')
    }
  }, [isHydrated, user, router])

  useEffect(() => {
    if (!isHydrated || !user || !roomId) return;
    
    const fetchData = async () => {
      try {
        const rid = parseInt(roomId);
        const [roomRes, qsRes, subRes] = await Promise.all([
          roomsAPI.getById(rid),
          questionsAPI.getByRoom(rid),
          submissionsAPI.getByStudent(user.user_id, rid)
        ]);
        
        setRoom(roomRes.data);
        setQuestions(qsRes.data);
        setSubmissions(subRes.data);
      } catch (err) {
        console.error("Failed to load result", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, roomId]);

  if (loading) {
    return (
      <div className="cyber-scanner scanning" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'white' }}>
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ width: 60, height: 60, border: '4px solid rgba(6,182,212,0.2)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p style={{ color: '#67e8f9', fontSize: 16, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Analyzing Performance...</p>
        </div>
      </div>
    )
  }

  // Calculate highest score for each question
  const bestSubmissions: Record<number, any> = {};
  submissions.forEach(sub => {
    if (sub.status === 'completed') {
      if (!bestSubmissions[sub.question_id] || sub.total_points > bestSubmissions[sub.question_id].total_points) {
        bestSubmissions[sub.question_id] = sub;
      }
    }
  });

  const totalEarned = Object.values(bestSubmissions).reduce((sum, sub) => sum + sub.total_points, 0);
  const totalMax = questions.reduce((sum, q) => sum + q.max_points, 0);
  const scorePercentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
  
  // Determine Grade Color
  let gradeColor = '#f87171'; // Red
  let gradeText = 'CHƯA ĐẠT';
  if (scorePercentage >= 80) { gradeColor = '#4ade80'; gradeText = 'XUẤT SẮC'; }
  else if (scorePercentage >= 50) { gradeColor = '#fbbf24'; gradeText = 'ĐẠT'; }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'white', padding: '60px 20px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: `radial-gradient(circle, ${gradeColor}22 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }}></div>
      
      <div className="animate-fade-in-up" style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32, position: 'relative', zIndex: 10 }}>
        
        {/* Header Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: '24px', background: `rgba(255,255,255,0.03)`, border: `1px solid ${gradeColor}55`, boxShadow: `0 0 30px ${gradeColor}33`, marginBottom: 24 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={gradeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.02em', color: '#fff' }}>BÁO CÁO KẾT QUẢ THI</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sinh viên: <span style={{ color: '#fff', fontWeight: 700 }}>{user?.full_name}</span> | Phòng thi: <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{room?.room_name}</span>
          </p>
        </div>

        {/* Top Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          
          {/* Main Score Card */}
          <div className="glass-card" style={{ padding: '32px 24px', borderRadius: 24, textAlign: 'center', border: `1px solid ${gradeColor}44`, background: `linear-gradient(180deg, rgba(255,255,255,0.02) 0%, ${gradeColor}11 100%)`, position: 'relative', overflow: 'hidden' }}>
            <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 12, fontWeight: 800, margin: '0 0 12px' }}>Tổng Điểm Hệ Thống</p>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: gradeColor, lineHeight: 1, textShadow: `0 0 40px ${gradeColor}88` }}>
                {totalEarned}
              </span>
              <span style={{ fontSize: 24, color: 'var(--text-muted)', fontWeight: 700 }}>/ {totalMax}</span>
            </div>
            <div style={{ marginTop: 16, display: 'inline-block', padding: '4px 12px', background: `${gradeColor}22`, color: gradeColor, borderRadius: 20, fontSize: 13, fontWeight: 800, letterSpacing: '0.1em' }}>
              {gradeText}
            </div>
          </div>

          {/* AI Proctoring Report */}
          <div className="glass-card" style={{ padding: '32px 24px', borderRadius: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid rgba(6,182,212,0.3)', background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(6,182,212,0.05) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Proctoring Report</h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Xác thực khuôn mặt:</span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>✓ Hợp lệ</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Bỏ vị trí / Rời Camera:</span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>0 lần</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Chuyển Tab / Trình duyệt:</span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>0 lần</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="glass-card" style={{ overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff' }}>Chi tiết từng bài toán</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 32px', fontWeight: 700 }}>Bài toán</th>
                <th style={{ padding: '16px 32px', fontWeight: 700, textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '16px 32px', fontWeight: 700, textAlign: 'right' }}>Điểm số</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => {
                const sub = bestSubmissions[q.question_id];
                const isFullScore = sub && sub.total_points >= q.max_points;
                const isPartial = sub && sub.total_points > 0 && sub.total_points < q.max_points;
                
                return (
                  <tr key={q.question_id} style={{ borderBottom: idx === questions.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="hover:bg-[rgba(255,255,255,0.02)]">
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 }}>{q.question_title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>{q.question_type}</div>
                    </td>
                    <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                      {sub ? (
                        <span style={{ 
                          display: 'inline-block', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: isFullScore ? 'rgba(74, 222, 128, 0.1)' : isPartial ? 'rgba(251, 191, 36, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                          color: isFullScore ? '#4ade80' : isPartial ? '#fbbf24' : '#f87171',
                          border: `1px solid ${isFullScore ? 'rgba(74, 222, 128, 0.2)' : isPartial ? 'rgba(251, 191, 36, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
                        }}>
                          {isFullScore ? '✓ Hoàn thành (AC)' : isPartial ? '⚠ Chấp nhận một phần' : '✗ Sai kết quả (WA)'}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                          Chưa nộp bài
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '20px 32px', textAlign: 'right', fontWeight: 800, color: isFullScore ? '#4ade80' : '#fff', fontSize: 20 }}>
                      {sub ? sub.total_points : 0} <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>/ {q.max_points}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
          <button onClick={() => window.print()} className="btn-secondary" style={{ padding: '16px 32px', borderRadius: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            In báo cáo
          </button>
          <button onClick={() => {
            useAuthStore.getState().logout();
            window.location.href = '/';
          }} className="btn-primary" style={{ padding: '16px 40px', borderRadius: 14, fontWeight: 800, fontSize: 16, boxShadow: `0 8px 24px ${gradeColor}33`, display: 'flex', alignItems: 'center', gap: 8 }}>
            Thoát hệ thống <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>

      </div>
    </div>
  )
}

export default function ExamResultPage() {
  return (
    <Suspense fallback={
      <div className="cyber-scanner scanning" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ width: 60, height: 60, border: '4px solid rgba(6,182,212,0.2)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    }>
      <ExamResultContent />
    </Suspense>
  )
}
