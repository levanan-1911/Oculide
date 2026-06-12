'use client'

import { useState } from 'react'

const students = [
  { id: 1, name: 'Nguyễn Văn An', code: '20210001', score: 85, status: 'active', violations: 0, progress: 2 },
  { id: 2, name: 'Trần Thị Bình', code: '20210002', score: 60, status: 'violation', violations: 2, progress: 1 },
  { id: 3, name: 'Lê Minh Châu', code: '20210003', score: 100, status: 'active', violations: 0, progress: 3 },
  { id: 4, name: 'Phạm Quốc Dũng', code: '20210004', score: 40, status: 'violation', violations: 5, progress: 1 },
  { id: 5, name: 'Hoàng Thị Em', code: '20210005', score: 70, status: 'active', violations: 1, progress: 2 },
  { id: 6, name: 'Vũ Đức Phong', code: '20210006', score: 90, status: 'active', violations: 0, progress: 3 },
  { id: 7, name: 'Đặng Thanh Giang', code: '20210007', score: 50, status: 'offline', violations: 0, progress: 1 },
  { id: 8, name: 'Bùi Hồng Hà', code: '20210008', score: 75, status: 'active', violations: 1, progress: 2 },
]

const violations = [
  { id: 1, student: 'Trần Thị Bình', type: 'Tab switch detected', time: '14:22:11', severity: 'medium' },
  { id: 2, student: 'Phạm Quốc Dũng', type: 'Phone detected by AI', time: '14:19:03', severity: 'high' },
  { id: 3, student: 'Phạm Quốc Dũng', type: 'Copy-paste attempt', time: '14:17:55', severity: 'high' },
  { id: 4, student: 'Hoàng Thị Em', type: 'Tab switch detected', time: '14:15:30', severity: 'medium' },
  { id: 5, student: 'Phạm Quốc Dũng', type: 'Face not visible', time: '14:12:01', severity: 'high' },
]

const statusConfig: Record<string, { label: string; dotClass: string; badge: string }> = {
  active:    { label: 'Đang thi',  dotClass: 'online',  badge: 'badge-success' },
  violation: { label: 'Gian lận',  dotClass: 'danger',  badge: 'badge-danger' },
  offline:   { label: 'Mất kết nối', dotClass: 'offline', badge: 'badge-warning' },
}

const severityStyle: Record<string, string> = {
  high:   'badge-danger',
  medium: 'badge-warning',
  low:    'badge-cyan',
}

export default function ProctorDashboard() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selected, setSelected] = useState<number | null>(null)
  const [sidebar, setSidebar] = useState<'violations' | 'chat'>('violations')

  const activeCount   = students.filter(s => s.status === 'active').length
  const violationCount = students.filter(s => s.status === 'violation').length
  const offlineCount  = students.filter(s => s.status === 'offline').length
  const avgScore = Math.round(students.reduce((a, s) => a + s.score, 0) / students.length)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
        background: 'rgba(10,10,26,0.98)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <div className="logo-glyph" style={{ width: 30, height: 30, borderRadius: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Oculide</span>
        <span style={{ color: 'var(--border-default)', fontSize: 16 }}>/</span>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Giám sát · CTDL &amp; GT HK2-2025</span>

        <div style={{ flex: 1 }} />

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="badge badge-success" style={{ gap: 5, padding: '4px 10px' }}>
            <span className="status-dot online" /> {activeCount} đang thi
          </div>
          {violationCount > 0 && (
            <div className="badge badge-danger" style={{ gap: 5, padding: '4px 10px' }}>
              <span className="status-dot danger" /> {violationCount} vi phạm
            </div>
          )}
          {offlineCount > 0 && (
            <div className="badge badge-warning" style={{ gap: 5, padding: '4px 10px' }}>
              {offlineCount} offline
            </div>
          )}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          {(['grid', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 10px', border: 'none', cursor: 'pointer', background: view === v ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: view === v ? '#a5b4fc' : 'var(--text-muted)', transition: 'all 0.15s',
              }}
            >
              {v === 'grid' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Tổng sinh viên', value: students.length, color: '#a5b4fc', icon: '👥' },
              { label: 'Đang làm bài',  value: activeCount,     color: '#6ee7b7', icon: '✍️' },
              { label: 'Vi phạm',        value: violationCount,  color: '#fca5a5', icon: '⚠️' },
              { label: 'Điểm TB',        value: `${avgScore}/100`, color: '#fcd34d', icon: '📊' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Grid / List view */}
          {view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {students.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelected(selected === s.id ? null : s.id)}
                  className={`proctor-cell ${s.status === 'violation' ? 'violation' : ''}`}
                  style={{
                    border: selected === s.id ? '2px solid var(--brand-primary)' : undefined,
                    boxShadow: selected === s.id ? '0 0 20px var(--glow-primary)' : undefined,
                  }}
                >
                  {/* Fake webcam feed */}
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, rgba(${s.status === 'violation' ? '239,68,68' : s.status === 'offline' ? '71,85,105' : '99,102,241'},0.08) 0%, rgba(15,15,42,1) 100%)`,
                    fontSize: 32, userSelect: 'none',
                  }}>
                    {s.status === 'offline' ? '📡' : '🧑‍💻'}
                  </div>

                  {/* Overlay info */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9' }}>{s.name.split(' ').slice(-1)[0]}</span>
                      <span className={`badge ${statusConfig[s.status].badge}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                        {statusConfig[s.status].label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <div style={{ flex: 1 }}>
                        <div className="progress-bar" style={{ height: 3 }}>
                          <div className="progress-fill" style={{ width: `${(s.progress / 3) * 100}%` }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{s.progress}/3</span>
                    </div>
                  </div>

                  {/* Violation badge */}
                  {s.violations > 0 && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%',
                      background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: 'white',
                    }}>
                      {s.violations}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sinh viên</th>
                    <th>MSSV</th>
                    <th>Trạng thái</th>
                    <th>Điểm</th>
                    <th>Tiến độ</th>
                    <th>Vi phạm</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.name}</td>
                      <td className="font-code" style={{ fontSize: 12 }}>{s.code}</td>
                      <td>
                        <span className={`badge ${statusConfig[s.status].badge}`} style={{ gap: 5 }}>
                          <span className={`status-dot ${statusConfig[s.status].dotClass}`} />
                          {statusConfig[s.status].label}
                        </span>
                      </td>
                      <td style={{ color: s.score >= 80 ? '#6ee7b7' : s.score >= 50 ? '#fcd34d' : '#fca5a5', fontWeight: 700 }}>
                        {s.score}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${(s.progress / 3) * 100}%` }} />
                          </div>
                          <span style={{ fontSize: 11, flexShrink: 0 }}>{s.progress}/3</span>
                        </div>
                      </td>
                      <td>
                        {s.violations > 0 ? (
                          <span className="badge badge-danger">{s.violations} lần</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6 }}>
                          Cảnh cáo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{
          width: 300, borderLeft: '1px solid var(--border-subtle)', flexShrink: 0,
          display: 'flex', flexDirection: 'column', background: 'rgba(10,10,26,0.98)', overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
            {(['violations', 'chat'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSidebar(t)}
                style={{
                  flex: 1, padding: '10px', border: 'none', cursor: 'pointer', background: 'none',
                  fontSize: 12, fontWeight: 600,
                  color: sidebar === t ? '#a5b4fc' : 'var(--text-muted)',
                  borderBottom: sidebar === t ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 0.15s',
                }}
              >
                {t === 'violations' ? `⚠️ Vi phạm (${violations.length})` : '💬 Chat'}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {sidebar === 'violations' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {violations.map(v => (
                  <div key={v.id} className="violation-banner" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${severityStyle[v.severity]}`} style={{ fontSize: 9 }}>
                        {v.severity.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.time}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#f1f5f9' }}>{v.student}</span>
                    <span style={{ fontSize: 12, color: '#fca5a5' }}>{v.type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 13 }}>
                  <span style={{ color: '#a5b4fc', fontWeight: 600, fontSize: 11 }}>Hệ thống</span>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Kỳ thi bắt đầu lúc 13:00. Chúc các bạn làm bài tốt!</p>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11 }}>Nguyễn Văn An</span>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Thầy ơi, câu 2 có được dùng thư viện không ạ?</p>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 13 }}>
                  <span style={{ color: '#a5b4fc', fontWeight: 600, fontSize: 11 }}>Giảng viên</span>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Không được dùng thư viện, chỉ dùng standard library.</p>
                </div>
              </div>
            )}
          </div>

          {sidebar === 'chat' && (
            <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input-field" placeholder="Nhắn tin tới cả lớp..." style={{ fontSize: 12, padding: '8px 12px' }} />
                <button className="btn-primary" style={{ padding: '8px 12px', flexShrink: 0, borderRadius: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
