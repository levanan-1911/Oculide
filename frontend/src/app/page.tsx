import Link from 'next/link'

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    ),
    color: 'var(--brand-primary)',
    glow: 'var(--glow-primary)',
    label: 'Panoptic Grid View',
    desc: 'Màn hình giám sát giảng viên thời gian thực. Quan sát tất cả sinh viên trong một giao diện duy nhất với WebRTC & LiveKit SFU.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.4)',
    label: 'AI Proctoring',
    desc: 'YOLOv8 & MediaPipe phát hiện gian lận tự động: rời tab, sử dụng điện thoại, có người lạ trong khung hình.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    color: 'var(--brand-accent)',
    glow: 'var(--glow-accent)',
    label: 'Zero-Setup IDE',
    desc: 'Monaco Editor tích hợp sẵn trong trình duyệt — hỗ trợ syntax highlighting, auto-complete cho 10+ ngôn ngữ lập trình.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path strokeLinecap="round" d="M8 21h8M12 17v4" />
      </svg>
    ),
    color: 'var(--brand-success)',
    glow: 'var(--glow-success)',
    label: 'Secure Auto-Grader',
    desc: 'Docker sandbox cô lập tuyệt đối — chạy và chấm code sinh viên an toàn với Celery workers & Redis queue.',
  },
]

const stats = [
  { value: '< 200ms', label: 'Độ trễ phát hiện gian lận' },
  { value: '10+', label: 'Ngôn ngữ lập trình hỗ trợ' },
  { value: '99.9%', label: 'Uptime đảm bảo' },
  { value: '0', label: 'Cài đặt phía sinh viên' },
]

export default function Home() {
  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div className="logo-glyph">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em', color: '#f1f5f9' }}>
            Ocu<span className="gradient-text">lide</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/login" className="btn-secondary" style={{ padding: '8px 18px', fontSize: 13 }}>
            Đăng nhập
          </Link>
          <Link href="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>
            Bắt đầu miễn phí →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 140, paddingBottom: 80, textAlign: 'center', padding: '140px 24px 80px', position: 'relative' }}>
        {/* Glow backdrop */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <div className="badge badge-primary animate-fade-in-up" style={{ marginBottom: 20 }}>
          <span className="status-dot online" />
          AI-Powered Exam Platform
        </div>

        <h1
          className="animate-fade-in-up animate-delay-100"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 20 }}
        >
          Code with <span className="gradient-text">Clarity</span>,<br />
          Test with <span className="gradient-text">Integrity</span>
        </h1>

        <p
          className="animate-fade-in-up animate-delay-200"
          style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}
        >
          Nền tảng thi lập trình trực tuyến thế hệ mới. Viết code ngay trên trình duyệt — AI giám sát liên tục, chấm điểm tự động tức thì.
        </p>

        <div className="animate-fade-in-up animate-delay-300" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn-primary" style={{ fontSize: 15, padding: '12px 30px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Tạo kỳ thi ngay
          </Link>
          <Link href="/login" className="btn-secondary" style={{ fontSize: 15, padding: '12px 30px' }}>
            Xem demo →
          </Link>
        </div>

        {/* Mini stats row */}
        <div
          className="animate-fade-in-up animate-delay-400"
          style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 64, flexWrap: 'wrap' }}
        >
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="badge badge-cyan" style={{ marginBottom: 12 }}>Tính năng</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
            Mọi thứ bạn cần cho kỳ thi <span className="gradient-text">hoàn hảo</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
            Được xây dựng cho giảng viên, giám thị và sinh viên — từ thiết lập đề thi đến chấm điểm tự động.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`glass-card animate-fade-in-up animate-delay-${(i + 1) * 100}`}
              style={{ padding: '28px 24px' }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, marginBottom: 18,
                background: `rgba(${f.color === 'var(--brand-primary)' ? '99,102,241' : f.color === '#8b5cf6' ? '139,92,246' : f.color === 'var(--brand-accent)' ? '6,182,212' : '16,185,129'},0.15)`,
                border: `1px solid rgba(${f.color === 'var(--brand-primary)' ? '99,102,241' : f.color === '#8b5cf6' ? '139,92,246' : f.color === 'var(--brand-accent)' ? '6,182,212' : '16,185,129'},0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.color,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{f.label}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 960, margin: '0 auto' }}>
        <div className="glass-card" style={{ padding: '32px 40px', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <div className="badge badge-warning" style={{ marginBottom: 10 }}>Tech Stack</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Được xây dựng trên nền tảng vững chắc</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Công nghệ hiện đại, đã được kiểm chứng ở quy mô production.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Next.js', 'FastAPI', 'LiveKit', 'YOLOv8', 'Redis', 'Docker', 'SQL Server', 'WebSockets'].map(tech => (
              <span key={tech} className="badge badge-primary" style={{ fontSize: 12, padding: '5px 12px' }}>{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section style={{ padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 600, margin: '0 auto', padding: '48px 32px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20,
        }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
            Sẵn sàng triển khai kỳ thi đầu tiên?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 15 }}>
            Thiết lập trong vài phút. Không cần cài đặt phía sinh viên.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn-primary" style={{ padding: '12px 28px', fontSize: 15 }}>
              Bắt đầu ngay — miễn phí
            </Link>
            <Link href="/login" className="btn-secondary" style={{ padding: '12px 28px', fontSize: 15 }}>
              Đăng nhập →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        © 2025 Oculide · Code with Clarity, Test with Integrity
      </footer>
    </div>
  )
}
