'use client'

import { useState } from 'react'

const problems = [
  { id: 1, title: 'Two Sum', difficulty: 'easy', pts: 10, status: 'solved' },
  { id: 2, title: 'Binary Search', difficulty: 'medium', pts: 20, status: 'active' },
  { id: 3, title: 'Graph BFS', difficulty: 'hard', pts: 30, status: 'locked' },
]

const STARTER = `def binary_search(nums: list[int], target: int) -> int:
    """
    Tìm kiếm nhị phân trong mảng đã sắp xếp.
    Trả về index của target, hoặc -1 nếu không tìm thấy.
    
    Args:
        nums: Mảng số nguyên đã sắp xếp tăng dần
        target: Giá trị cần tìm
    
    Returns:
        Index của target trong nums, hoặc -1
    """
    left, right = 0, len(nums) - 1
    
    # TODO: Implement binary search
    
    return -1


# Test cases (không sửa)
if __name__ == "__main__":
    assert binary_search([-1, 0, 3, 5, 9, 12], 9) == 4
    assert binary_search([-1, 0, 3, 5, 9, 12], 2) == -1
    print("✓ All test cases passed!")
`

const difficultyStyle: Record<string, { label: string; badgeClass: string }> = {
  easy:   { label: 'Dễ',    badgeClass: 'badge-success' },
  medium: { label: 'Trung bình', badgeClass: 'badge-warning' },
  hard:   { label: 'Khó',   badgeClass: 'badge-danger' },
}

export default function ExamPage() {
  const [code, setCode] = useState(STARTER)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lang, setLang] = useState('python')
  const [timeLeft] = useState({ h: 1, m: 23, s: 47 })
  const [activeProblem, setActiveProblem] = useState(2)
  const [tab, setTab] = useState<'problem' | 'output'>('problem')

  const runCode = async () => {
    setRunning(true)
    setTab('output')
    await new Promise(r => setTimeout(r, 1200))
    setOutput(`> Running binary_search...

Test 1: binary_search([-1, 0, 3, 5, 9, 12], 9)
  → Expected: 4  |  Got: -1  ✗

Test 2: binary_search([-1, 0, 3, 5, 9, 12], 2)
  → Expected: -1  |  Got: -1  ✓

Result: 1/2 tests passed
Execution time: 0.003s  |  Memory: 3.2 MB`)
    setRunning(false)
  }

  const submitCode = async () => {
    setSubmitting(true)
    setTab('output')
    await new Promise(r => setTimeout(r, 2000))
    setOutput(`✓ Submission accepted!

Score: 18/20
Passed: 9/10 test cases
Execution: 0.003s avg  |  Memory: 3.2 MB peak

Graded by Oculide Auto-Grader v2
`)
    setSubmitting(false)
  }

  const totalSeconds = timeLeft.h * 3600 + timeLeft.m * 60 + timeLeft.s
  const totalExam = 2 * 3600
  const timerPct = (totalSeconds / totalExam) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

      {/* ── EXAM NAVBAR ── */}
      <nav style={{
        height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
        background: 'rgba(10,10,26,0.98)', borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div className="logo-glyph" style={{ width: 28, height: 28, borderRadius: 7 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Kỳ thi: CTDL &amp; GT - HK2 2025</span>

        <div className="badge badge-warning" style={{ marginLeft: 8 }}>
          <span className="status-dot warning" />
          Đang diễn ra
        </div>

        <div style={{ flex: 1 }} />

        {/* Timer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 8,
          background: timerPct < 20 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${timerPct < 20 ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={timerPct < 20 ? '#fca5a5' : 'var(--text-secondary)'} strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600,
            color: timerPct < 20 ? '#fca5a5' : 'var(--text-primary)',
            letterSpacing: '0.08em',
          }}>
            {String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
          </span>
        </div>

        {/* Webcam indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <span className="status-dot online" />
          <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 600 }}>Camera OK</span>
        </div>
      </nav>

      {/* ── MAIN LAYOUT ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── PROBLEM LIST SIDEBAR ── */}
        <div style={{
          width: 200, borderRight: '1px solid var(--border-subtle)', padding: '12px 8px',
          background: 'rgba(10,10,26,0.98)', flexShrink: 0, overflowY: 'auto',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', padding: '4px 8px 8px', textTransform: 'uppercase' }}>
            Bài tập ({problems.length})
          </div>
          {problems.map(p => (
            <button
              key={p.id}
              onClick={() => p.status !== 'locked' && setActiveProblem(p.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: 8,
                border: activeProblem === p.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                background: activeProblem === p.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                cursor: p.status === 'locked' ? 'not-allowed' : 'pointer',
                opacity: p.status === 'locked' ? 0.4 : 1,
                marginBottom: 2, transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: activeProblem === p.id ? '#a5b4fc' : 'var(--text-secondary)' }}>
                  #{p.id}
                </span>
                {p.status === 'solved' && <span style={{ marginLeft: 'auto' }}>✓</span>}
                {p.status === 'locked' && <span style={{ marginLeft: 'auto', fontSize: 10 }}>🔒</span>}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: activeProblem === p.id ? '#f1f5f9' : 'var(--text-secondary)', marginBottom: 4 }}>
                {p.title}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${difficultyStyle[p.difficulty].badgeClass}`} style={{ fontSize: 10, padding: '2px 7px' }}>
                  {difficultyStyle[p.difficulty].label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.pts} pts</span>
              </div>
            </button>
          ))}

          {/* Progress */}
          <div style={{ padding: '12px 8px 4px', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tiến độ</span>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>1/3</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '33%' }} />
            </div>
          </div>
        </div>

        {/* ── PROBLEM + EDITOR SPLIT ── */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

          {/* LEFT: Problem Description */}
          <div style={{
            borderRight: '1px solid var(--border-subtle)', overflowY: 'auto',
            background: 'rgba(5,5,16,0.95)',
          }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', padding: '0 16px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(10,10,26,0.8)' }}>
              {(['problem', 'output'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                    color: tab === t ? '#a5b4fc' : 'var(--text-muted)',
                    borderBottom: tab === t ? '2px solid var(--brand-primary)' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {t === 'problem' ? '📄 Đề bài' : '⚡ Output'}
                </button>
              ))}
            </div>

            {tab === 'problem' ? (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>2. Binary Search</h2>
                  <span className="badge badge-warning">Trung bình</span>
                  <span className="badge badge-cyan" style={{ marginLeft: 'auto' }}>20 điểm</span>
                </div>

                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 20 }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                    Cho một mảng số nguyên <code style={{ fontFamily: 'JetBrains Mono', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>nums</code> được sắp xếp theo thứ tự tăng dần, và một số nguyên <code style={{ fontFamily: 'JetBrains Mono', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>target</code>. Hãy viết hàm tìm kiếm <code style={{ fontFamily: 'JetBrains Mono', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>target</code> trong <code style={{ fontFamily: 'JetBrains Mono', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>nums</code>.
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Ví dụ</h4>
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(15,15,42,0.8)', border: '1px solid var(--border-subtle)', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}># Input</div>
                    <div style={{ color: '#a5b4fc' }}>nums = [-1, 0, 3, 5, 9, 12]</div>
                    <div style={{ color: '#a5b4fc', marginBottom: 10 }}>target = 9</div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}># Output</div>
                    <div style={{ color: '#6ee7b7' }}>4</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Ràng buộc</h4>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {['1 ≤ nums.length ≤ 10⁴', '-10⁴ < nums[i], target < 10⁴', 'Tất cả phần tử trong nums là duy nhất', 'Bắt buộc dùng giải thuật O(log n)'].map(c => (
                      <li key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>·</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                <pre style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, lineHeight: 1.7,
                  color: output.includes('✓') ? '#6ee7b7' : output.includes('✗') ? '#fca5a5' : 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap', margin: 0,
                  padding: '16px', borderRadius: 10,
                  background: 'rgba(15,15,42,0.8)', border: '1px solid var(--border-subtle)',
                  minHeight: 200,
                }}>
                  {output || '// Chạy code để xem kết quả...'}
                </pre>
              </div>
            )}
          </div>

          {/* RIGHT: Monaco Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', background: '#0f0f2a' }}>
            {/* Editor Toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              background: 'rgba(10,10,26,0.95)', borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}>
              <select
                className="input-field"
                value={lang}
                onChange={e => setLang(e.target.value)}
                style={{ width: 130, padding: '5px 10px', fontSize: 12, borderRadius: 7 }}
              >
                <option value="python">🐍 Python 3.11</option>
                <option value="javascript">📜 JavaScript</option>
                <option value="java">☕ Java 17</option>
                <option value="cpp">⚙️ C++17</option>
              </select>

              <div style={{ flex: 1 }} />

              <button
                onClick={runCode}
                disabled={running}
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: 12, borderRadius: 7 }}
              >
                {running ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
                Chạy thử
              </button>

              <button
                onClick={submitCode}
                disabled={submitting}
                className="btn-success"
                style={{ padding: '6px 14px', fontSize: 12, borderRadius: 7 }}
              >
                {submitting ? 'Đang nộp...' : '↑ Nộp bài'}
              </button>
            </div>

            {/* Fake Monaco Editor */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              <div style={{
                display: 'flex', height: '100%',
                fontFamily: 'JetBrains Mono, Fira Code, monospace', fontSize: 13.5, lineHeight: '22px',
              }}>
                {/* Line numbers */}
                <div style={{
                  padding: '16px 0', minWidth: 44, textAlign: 'right', paddingRight: 12,
                  background: 'rgba(10,10,26,0.5)', color: 'var(--text-muted)', fontSize: 12,
                  userSelect: 'none', borderRight: '1px solid var(--border-subtle)', flexShrink: 0,
                }}>
                  {code.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* Editor content */}
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  style={{
                    flex: 1, padding: '16px', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 13.5, lineHeight: '22px',
                    color: '#e2e8f0', caretColor: 'var(--brand-primary)',
                    tabSize: 4,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Webcam pip */}
      <div className="webcam-overlay" style={{
        background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 4,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5">
          <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        <span style={{ fontSize: 9, color: 'rgba(99,102,241,0.7)', fontWeight: 600 }}>LIVE</span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
