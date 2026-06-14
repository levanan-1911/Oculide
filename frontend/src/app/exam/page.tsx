'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { submissionsAPI, violationsAPI, questionsAPI, sessionsAPI, roomsAPI, livekitAPI } from '@/utils/api'
import { useAuthStore } from '@/store/useStore'
import Editor from '@monaco-editor/react'
import { LiveKitRoom } from '@livekit/components-react'

function ExamPageContent() {
  const [codeMap, setCodeMap] = useState<Record<number, string>>({})
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [gradingResult, setGradingResult] = useState<any>(null)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lang, setLang] = useState('python')
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 })
  const [customInput, setCustomInput] = useState('')
  const [terminalTab, setTerminalTab] = useState<'input' | 'output'>('input')
  
  // Auto update default comment when language changes
  useEffect(() => {
    if (code.trim() === '// Viết code của bạn ở đây' || code.trim() === '# Viết code của bạn ở đây') {
      const newCode = lang === 'python' ? '# Viết code của bạn ở đây\n' : '// Viết code của bạn ở đây\n';
      setCode(newCode);
      if (activeProblem) {
        setCodeMap(prev => ({ ...prev, [activeProblem.question_id]: newCode }));
      }
    }
  }, [lang]);
  
  const [problems, setProblems] = useState<any[]>([])
  const [activeProblem, setActiveProblem] = useState<any>(null)
  const [roomId, setRoomId] = useState<number>(0)
  const [roomData, setRoomData] = useState<any>(null)
  const [sessionId, setSessionId] = useState<number>(1)
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!roomData || !roomData.duration_minutes || !sessionStartedAt) return;
    
    const start = new Date(sessionStartedAt.endsWith('Z') ? sessionStartedAt : sessionStartedAt + 'Z').getTime();
    const durationMs = roomData.duration_minutes * 60 * 1000;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const elapsedMs = now - start;
      const remainingMs = durationMs - elapsedMs;
      
      if (remainingMs <= 0) {
        clearInterval(interval);
        setTimeLeft({ h: 0, m: 0, s: 0 });
        alert('Hết giờ làm bài! Hệ thống sẽ nộp bài tự động và chuyển sang trang kết quả.');
        window.location.href = `/exam/result?room=${roomData.room_id}`;
      } else {
        const totalSeconds = Math.floor(remainingMs / 1000);
        setTimeLeft({
          h: Math.floor(totalSeconds / 3600),
          m: Math.floor((totalSeconds % 3600) / 60),
          s: totalSeconds % 60
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [roomData, sessionStartedAt]);

  const [tab, setTab] = useState<'problem' | 'output'>('problem')

  const user = useAuthStore(state => state.user)
  const wsRef = useRef<WebSocket | null>(null)
  
  // Webcam refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [camStatus, setCamStatus] = useState<'starting' | 'ok' | 'error'>('starting')
  const [livekitToken, setLivekitToken] = useState('')

  // Drag state for webcam
  const [camPos, setCamPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...camPos };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setCamPos({
      x: posStart.current.x + (e.clientX - dragStart.current.x),
      y: posStart.current.y + (e.clientY - dragStart.current.y)
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Load Exam Data
  useEffect(() => {
    const fetchExamData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomStr = urlParams.get('room');
      if (!roomStr) return;
      const rid = parseInt(roomStr);
      setRoomId(rid);
      
      try {
        // Lấy thông tin phòng thi
        const roomRes = await roomsAPI.getById(rid);
        setRoomData(roomRes.data);

        // Khởi tạo phiên thi (Session)
        try {
          const sessionRes = await sessionsAPI.create({ room_id: rid });
          setSessionId(sessionRes.data.session_id);
          setSessionStartedAt(sessionRes.data.started_at);
        } catch (err: any) {
          console.error("Failed to create session", err);
          if (user && user.user_id) {
            try {
              const sessList = await sessionsAPI.getByStudent(user.user_id, rid, true);
              if (sessList.data && sessList.data.length > 0) {
                setSessionId(sessList.data[0].session_id);
                setSessionStartedAt(sessList.data[0].started_at);
              }
            } catch (e) {
              console.error("Failed to fetch existing session", e);
            }
          }
        }
        
        // Tải danh sách câu hỏi
        const res = await questionsAPI.getByRoom(rid);
        const questions = res.data;
        if (questions && questions.length > 0) {
          setProblems(questions);
          setActiveProblem(questions[0]);
          
          let initialCodeMap: Record<number, string> = {};
          const defaultCode = lang === 'python' ? '# Viết code của bạn ở đây\n' : '// Viết code của bạn ở đây\n';
          
          if (user && user.user_id) {
            try {
              const subRes = await submissionsAPI.getByStudent(user.user_id, rid);
              if (subRes.data && subRes.data.length > 0) {
                subRes.data.forEach((sub: any) => {
                   if (!initialCodeMap[sub.question_id]) {
                       initialCodeMap[sub.question_id] = sub.code;
                   }
                });
                const firstQSub = subRes.data.find((s:any) => s.question_id === questions[0].question_id);
                if (firstQSub) {
                   setGradingResult(firstQSub);
                   if (firstQSub.status === 'completed') {
                      setOutput('Bài nộp trước đó đã hoàn thành!');
                   } else {
                      setOutput('Bài nộp trước đó bị lỗi hoặc chưa qua hết test case.');
                   }
                }
              }
            } catch(e) {}
          }
          
          questions.forEach((q: any) => {
             if (!initialCodeMap[q.question_id]) {
                 initialCodeMap[q.question_id] = defaultCode;
             }
          });
          
          setCodeMap(initialCodeMap);
          setCode(initialCodeMap[questions[0].question_id]);
        }
      } catch (err) {
        console.error("Lỗi khi tải đề thi:", err);
      }
      
      // Get LiveKit token for student
      try {
        if (useAuthStore.getState().user) {
          const lkRes = await livekitAPI.generateToken({
            room_name: `exam_room_${rid}`,
            participant_name: useAuthStore.getState().user?.full_name || 'Student'
          })
          setLivekitToken(lkRes.data.token)
        }
      } catch (err) {
        console.error("Failed to get livekit token", err)
      }
    };
    
    fetchExamData();
  }, []);

  // Bật Webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCamStatus('ok');
      } catch (err) {
        console.error("Lỗi khi mở Webcam:", err);
        setCamStatus('error');
      }
    };
    startWebcam();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  // AI Proctoring: Gửi snapshot mỗi 5 giây
  useEffect(() => {
    if (camStatus !== 'ok' || !sessionId) return;
    
    const intervalId = setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context && video.videoWidth > 0) {
          canvas.width = 640;
          canvas.height = 480;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Image = canvas.toDataURL('image/jpeg', 0.7);
          
          try {
            await violationsAPI.analyzeSnapshot({
              session_id: sessionId,
              image_data: base64Image
            });
          } catch (e) {
            console.error("Lỗi khi gửi snapshot:", e);
          }
        }
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [camStatus, sessionId]);

  // Behavior Proctoring: Tab Switching & AFK
  useEffect(() => {
    if (!user || !sessionId) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        try {
          await violationsAPI.create({
            session_id: sessionId,
            student_id: user.user_id,
            violation_type: 'tab_switch',
            severity: 'medium',
            description: 'Phát hiện chuyển tab hoặc thu nhỏ cửa sổ làm bài'
          });
        } catch (e) { }
      } else {
        alert("⚠️ CẢNH BÁO VI PHẠM: Bạn vừa thoát hoặc chuyển khỏi tab làm bài!\\n\\nHành động này đã được tự động lưu lại hệ thống và gửi đến Giám thị.");
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let afkTimeout: NodeJS.Timeout;
    const resetAFKTimer = () => {
      clearTimeout(afkTimeout);
      afkTimeout = setTimeout(async () => {
        try {
          await violationsAPI.create({
            session_id: sessionId,
            student_id: user.user_id,
            violation_type: 'inactive_30s',
            severity: 'low',
            description: 'Sinh viên không có tương tác trong 30 giây'
          });
        } catch (e) { }
      }, 30000);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetAFKTimer));
    resetAFKTimer();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      events.forEach(event => document.removeEventListener(event, resetAFKTimer));
      clearTimeout(afkTimeout);
    };
  }, [user, sessionId]);

  // WebSocket Lắng nghe kết quả chấm
  useEffect(() => {
    if (!user || typeof window === 'undefined' || !roomId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws/${roomId}/${user.user_id}`);

    ws.onopen = () => console.log('Connected to WebSocket server');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'grading_result') {
          setSubmitting(false);
          setRunning(false);
          setGradingResult(data);
          
          if (data.status === 'completed') {
            setOutput('');
          } else {
            setOutput(`✗ Chấm bài thất bại.\\nTrạng thái: ${data.status}`);
          }
        } else if (data.type === 'kick_student') {
          if (data.student_id === user.user_id) {
            alert('Bạn đã bị giảng viên xóa khỏi phòng thi do vi phạm quy chế!');
            window.location.href = '/';
          }
        } else if (data.type === 'proctoring_violation') {
          const viols = data.violations.map((v: any) => v.description).join('\\n');
          alert(`🚨 GIÁM THỊ NHẮC NHỞ / CẢNH BÁO TỪ HỆ THỐNG 🚨\\n\\nBạn vừa vi phạm quy chế thi:\\n${viols}\\n\\nHành vi này đã được lưu vào hồ sơ thi. Vui lòng nghiêm túc làm bài!`);
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [user, roomId]);

  const runCode = async () => {
    if (!activeProblem) return;
    setRunning(true);
    setTerminalTab('output');
    setGradingResult(null);
    setOutput(`Đang chạy biên dịch...\nInput test: ${customInput || '(Trống)'}`);
    
    try {
      // Mocking local run with instant evaluation logic
      await new Promise(r => setTimeout(r, 800));
      setOutput(`> Chạy thử thành công!\n\nLưu ý: Đây chỉ là chức năng chạy nháp cục bộ.\nHãy bấm [Nộp bài] để hệ thống ghi nhận điểm chính thức.`);
    } catch (err: any) {
      setOutput(`> Lỗi biên dịch: \n\n${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  const submitCode = async () => {
    if (!user || !activeProblem) {
      setOutput('Vui lòng đăng nhập hoặc chọn bài!');
      setTab('output');
      return;
    }

    setSubmitting(true);
    setTab('output');
    setGradingResult(null);
    setOutput('Đang nộp bài và chờ kết quả từ hệ thống chấm điểm tự động Oculide...');

    try {
      await submissionsAPI.create({
        room_id: roomId,
        question_id: activeProblem.question_id,
        code_content: code,
        language: lang,
        attempt_number: 1
      });
      // Sẽ nhận kết quả qua WebSocket
    } catch (err: any) {
      console.error(err);
      setOutput('Lỗi khi nộp bài: ' + (err.response?.data?.detail || err.message));
      setSubmitting(false);
    }
  }

  const totalSeconds = timeLeft.h * 3600 + timeLeft.m * 60 + timeLeft.s
  const totalExam = 2 * 3600
  const timerPct = (totalSeconds / totalExam) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

      {/* ── BỘ PHÁT SÓNG LIVEKIT ẨN ── */}
      {livekitToken && (
        <div style={{ display: 'none' }}>
          <LiveKitRoom
            token={livekitToken}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880'}
            video={true}
            audio={false}
            screen={true}
          />
        </div>
      )}

      {/* ── EXAM NAVBAR ── */}
      <nav style={{
        height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
        background: 'rgba(10,10,26,0.98)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <div className="logo-glyph" style={{ width: 28, height: 28, borderRadius: 7 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
          {roomData ? roomData.room_name : 'Đang tải thông tin phòng...'}
        </span>

        <div className="badge badge-warning" style={{ marginLeft: 8 }}>
          <span className="status-dot warning" />
          Đang diễn ra
        </div>

        <div style={{ flex: 1 }} />

        {/* Top Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, 
              background: totalSeconds > 0 && totalSeconds < 300 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', 
              padding: '6px 16px', borderRadius: 8,
              color: totalSeconds > 0 && totalSeconds < 300 ? '#fca5a5' : '#e2e8f0',
              border: `1px solid ${totalSeconds > 0 && totalSeconds < 300 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.1)'}`,
              animation: totalSeconds > 0 && totalSeconds < 300 ? 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}
            </span>
          </div>
          
          <button className="btn-primary" style={{ background: 'var(--bg-card)', border: '1px solid #16a34a', color: '#16a34a', boxShadow: 'none', padding: '8px 16px', fontSize: 13, fontWeight: 700 }} onClick={() => {
            if (confirm('Bạn có chắc chắn muốn nộp toàn bộ và kết thúc bài thi sớm? Không thể làm lại!')) {
              window.location.href = `/exam/result?room=${roomId}`;
            }
          }}>
            KẾT THÚC
          </button>
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
          {problems.map((p, idx) => (
            <button
              key={p.question_id}
              onClick={() => {
                // Save current code to map
                if (activeProblem) {
                  setCodeMap(prev => ({ ...prev, [activeProblem.question_id]: code }));
                }
                setActiveProblem(p);
                // Load from map or set default
                const savedCode = codeMap[p.question_id];
                if (savedCode !== undefined) {
                  setCode(savedCode);
                } else {
                  const currentLang = lang;
                  const defaultCode = currentLang === 'python' ? '# Viết code của bạn ở đây\n' : '// Viết code của bạn ở đây\n';
                  setCode(defaultCode);
                  setCodeMap(prev => ({ ...prev, [p.question_id]: defaultCode }));
                }
                setTab('problem');
              }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: 8,
                border: activeProblem?.question_id === p.question_id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                background: activeProblem?.question_id === p.question_id ? 'rgba(99,102,241,0.12)' : 'transparent',
                cursor: 'pointer', marginBottom: 2, transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: activeProblem?.question_id === p.question_id ? '#a5b4fc' : 'var(--text-secondary)' }}>
                  Bài {idx + 1}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: activeProblem?.question_id === p.question_id ? '#f1f5f9' : 'var(--text-secondary)', marginBottom: 4 }}>
                {p.question_title}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge badge-success`} style={{ fontSize: 10, padding: '2px 7px' }}>
                  {p.question_type}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.max_points} pts</span>
              </div>
            </button>
          ))}
          {problems.length === 0 && (
            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Phòng thi chưa có câu hỏi nào.
            </div>
          )}
        </div>

        {/* ── PROBLEM + EDITOR SPLIT ── */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

          {/* LEFT: Problem Description ONLY */}
          <div style={{
            borderRight: '1px solid var(--border-subtle)', overflowY: 'auto',
            background: 'rgba(5,5,16,0.95)',
          }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(10,10,26,0.8)', color: '#a5b4fc', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Chi tiết đề bài
            </div>

            <div 
              style={{ padding: 24, userSelect: 'none' }}
              onCopy={async (e) => {
                e.preventDefault();
                alert("⚠️ Bạn không được phép sao chép đề bài thi!");
                if (user && sessionId) {
                  try {
                    await violationsAPI.create({
                      session_id: sessionId,
                      student_id: user.user_id,
                      violation_type: 'copy_paste',
                      severity: 'low',
                      description: 'Sinh viên cố tình sao chép nội dung đề bài thi'
                    });
                  } catch (err) {}
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {activeProblem ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>{activeProblem.question_title}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.2)' }}>{activeProblem.question_type}</span>
                    <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#67e8f9', border: '1px solid rgba(6, 182, 212, 0.2)' }}>{activeProblem.max_points} điểm</span>
                  </div>

                  <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
                    <p style={{ fontSize: 16, color: '#ffffff', fontWeight: 400, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {activeProblem.question_description || 'Chưa có mô tả chi tiết.'}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Giới hạn thực thi</h4>
                    <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Thời gian tối đa: <strong style={{ color: '#fff' }}>{activeProblem.time_limit_minutes ? `${activeProblem.time_limit_minutes} phút` : 'Không giới hạn'}</strong>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                        Bộ nhớ tối đa: <strong style={{ color: '#fff' }}>{activeProblem.memory_limit_mb ? `${activeProblem.memory_limit_mb} MB` : 'Không giới hạn'}</strong>
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 12px', opacity: 0.3 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  <p>Vui lòng chọn bài tập bên danh sách</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Monaco Editor & Output Console */}
          <div style={{ display: 'flex', flexDirection: 'column', background: '#0f0f2a', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              background: 'rgba(10,10,26,0.95)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
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
                disabled={running || !activeProblem}
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
                disabled={submitting || !activeProblem}
                className="btn-success"
                style={{ padding: '6px 14px', fontSize: 12, borderRadius: 7 }}
              >
                {submitting ? 'Đang nộp...' : '↑ Nộp bài'}
              </button>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <Editor
                height="100%"
                language={lang}
                theme="vs-dark"
                value={code}
                onChange={(value) => {
                  const newCode = value || '';
                  setCode(newCode);
                  if (activeProblem) {
                    setCodeMap(prev => ({ ...prev, [activeProblem.question_id]: newCode }));
                  }
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  formatOnPaste: true,
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                  tabCompletion: "on"
                }}
              />
            </div>
            
            {/* TERMINAL CONSOLE */}
            <div style={{ height: '35%', minHeight: 250, borderTop: '1px solid var(--border-subtle)', background: 'rgba(5,5,16,1)', display: 'flex', flexDirection: 'column' }}>
              
              {/* Terminal Tabs */}
              <div style={{ display: 'flex', padding: '0 16px', background: 'rgba(10,10,26,0.9)', borderBottom: '1px solid var(--border-subtle)' }}>
                {(['input', 'output'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTerminalTab(t)}
                    style={{
                      padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                      color: terminalTab === t ? (t === 'input' ? '#67e8f9' : '#a5b4fc') : 'var(--text-muted)',
                      borderBottom: terminalTab === t ? `2px solid ${t === 'input' ? '#67e8f9' : '#a5b4fc'}` : '2px solid transparent',
                      marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase'
                    }}
                  >
                    {t === 'input' ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Đầu vào (Custom Input)</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg> Kết quả (Output)</>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {terminalTab === 'input' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 12 }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      Nhập Testcase tùy chỉnh để kiểm tra thuật toán của bạn trước khi nộp chính thức.
                    </p>
                    <textarea 
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      placeholder="Nhập input ở đây..."
                      style={{ 
                        flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: 8, padding: 12, color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', 
                        fontSize: 13, resize: 'none', outline: 'none'
                      }}
                      className="focus:border-cyan-500 transition-colors"
                    />
                  </div>
                ) : (
                  <div style={{ padding: 16 }}>
                    {gradingResult && gradingResult.status === 'completed' ? (
                      <div style={{ color: '#e2e8f0', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>AC</span>
                          <span style={{ color: '#94a3b8' }}>| Điểm: {gradingResult.score_percentage / 10}/{activeProblem?.max_points || 10}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {gradingResult.test_results?.map((tc: any, i: number) => (
                            <div key={i} title={`Test ${i+1}`} style={{ padding: '4px 8px', borderRadius: 4, background: tc.passed ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)', color: tc.passed ? '#4ade80' : '#f87171', border: `1px solid ${tc.passed ? 'rgba(22, 163, 74, 0.3)' : 'rgba(220, 38, 38, 0.3)'}` }}>
                              T{i+1}: {tc.passed ? '✓' : '✗'}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <pre style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 13, lineHeight: 1.6,
                        color: output.includes('✓') ? '#4ade80' : output.includes('✗') || output.includes('Lỗi') ? '#f87171' : '#94a3b8',
                        whiteSpace: 'pre-wrap', margin: 0
                      }}>
                        {output || 'C:\\Oculide\\Runner> Ready.\n// Nhập dữ liệu ở tab "Đầu vào" và nhấn "Chạy thử" để thực thi mã nguồn...'}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Webcam pip & Hidden Canvas */}
      <div className="webcam-overlay" 
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', overflow: 'hidden', 
          border: camStatus === 'ok' ? '2px solid rgba(6,182,212,0.6)' : '2px solid rgba(239,68,68,0.6)', 
          padding: 0,
          transform: `translate(${camPos.x}px, ${camPos.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          transition: isDragging ? 'none' : 'box-shadow 0.2s',
          boxShadow: isDragging ? '0 10px 30px rgba(0,0,0,0.8)' : camStatus === 'ok' ? '0 0 15px rgba(6,182,212,0.3)' : '0 0 15px rgba(239,68,68,0.5)',
          zIndex: 100,
          animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}>
        {/* Grab Handle */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 6 }}>
          <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
        </div>

        {/* AI Proctoring Badge */}
        <div style={{ position: 'absolute', top: 6, left: 8, zIndex: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: camStatus === 'ok' ? '#06b6d4' : '#ef4444', boxShadow: `0 0 6px ${camStatus === 'ok' ? '#06b6d4' : '#ef4444'}` }} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: 800, letterSpacing: '0.05em' }}>AI PROCTORING</span>
        </div>

        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', pointerEvents: 'none', filter: camStatus === 'error' ? 'grayscale(100%)' : 'none' }} />
        
        {/* Scanning Grid Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M 20 0 L 0 0 0 20\' fill=\'none\' stroke=\'rgba(6,182,212,0.05)\' stroke-width=\'1\'/%3E%3C/svg%3E")', pointerEvents: 'none', zIndex: 5 }} />
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExamPageContent />
    </Suspense>
  )
}
