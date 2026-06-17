import { useState, useEffect } from 'react';
import { submissionsAPI, questionsAPI } from '@/utils/api';
import Editor from '@monaco-editor/react';

interface StudentCodeModalProps {
  studentId: number;
  studentName: string;
  roomId: number;
  onClose: () => void;
}

export default function StudentCodeModal({ studentId, studentName, roomId, onClose }: StudentCodeModalProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, sRes] = await Promise.all([
          questionsAPI.getByRoom(roomId),
          submissionsAPI.getByStudent(studentId, roomId)
        ]);
        setQuestions(qRes.data);
        setSubmissions(sRes.data);
        if (qRes.data.length > 0) {
          setSelectedQuestion(qRes.data[0].question_id);
        }
      } catch (err) {
        console.error("Failed to fetch student data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId, roomId]);

  const currentSubmission = selectedQuestion 
    ? submissions.find(s => s.question_id === selectedQuestion)
    : null;

  useEffect(() => {
    if (currentSubmission) {
      setLoadingTests(true);
      submissionsAPI.getResults(currentSubmission.submission_id)
        .then(res => setTestResults(res.data.results || []))
        .catch(console.error)
        .finally(() => setLoadingTests(false));
    } else {
      setTestResults([]);
    }
  }, [currentSubmission]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        width: '90%', maxWidth: 1200, height: '85vh',
        background: '#0a0a1a', border: '1px solid #06b6d4', borderRadius: 16,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 0 50px rgba(6,182,212,0.2)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid rgba(6,182,212,0.3)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(6,182,212,0.05)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#fff', fontWeight: 800 }}>Code Sinh Viên: <span style={{ color: '#67e8f9' }}>{studentName}</span></h2>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 8
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#67e8f9' }}>Đang tải dữ liệu...</div>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Sidebar (Questions) */}
            <div style={{ width: 250, borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
              {questions.map((q, idx) => {
                const sub = submissions.find(s => s.question_id === q.question_id);
                return (
                  <button
                    key={q.question_id}
                    onClick={() => setSelectedQuestion(q.question_id)}
                    style={{
                      padding: '16px 20px', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: selectedQuestion === q.question_id ? 'rgba(6,182,212,0.2)' : 'transparent',
                      color: '#fff', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                      borderLeft: selectedQuestion === q.question_id ? '3px solid #06b6d4' : '3px solid transparent'
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Bài {idx + 1}</div>
                    <div style={{ fontSize: 12, color: sub ? (sub.status === 'completed' ? '#34d399' : '#f59e0b') : '#ef4444' }}>
                      {sub ? (sub.status === 'completed' ? 'Đã chấm (Có code)' : 'Đang chấm') : 'Chưa nộp bài'}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Main Content (Editor & Tests) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '60%', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {currentSubmission ? (
                  <Editor
                    height="100%"
                    language={currentSubmission.language.toLowerCase()}
                    theme="vs-dark"
                    value={currentSubmission.code_content}
                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14 }}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Sinh viên chưa nộp bài này.</div>
                )}
              </div>
              
              <div style={{ height: '40%', background: '#050505', overflowY: 'auto', padding: 16 }}>
                <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 14, textTransform: 'uppercase' }}>Kết quả Test Cases</h3>
                {loadingTests ? (
                  <div style={{ color: '#aaa', fontSize: 13 }}>Đang tải test cases...</div>
                ) : testResults.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                    {testResults.map((tr, i) => (
                      <div key={i} style={{
                        padding: 12, borderRadius: 8, background: tr.is_passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${tr.is_passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>Test {i + 1} {tr.is_hidden && '(Ẩn)'}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: tr.is_passed ? '#10b981' : '#ef4444', color: '#fff' }}>
                            {tr.is_passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: 'var(--text-muted)' }}>
                          <div style={{ marginBottom: 4 }}><b>Input:</b> {tr.is_hidden ? '***' : tr.input_data}</div>
                          <div style={{ marginBottom: 4 }}><b>Output chuẩn:</b> {tr.is_hidden ? '***' : tr.expected_output}</div>
                          <div><b>Code SV in ra:</b> <span style={{ color: tr.is_passed ? '#34d399' : '#fca5a5' }}>{tr.actual_output || '(Rỗng)'}</span></div>
                          {tr.error_message && <div style={{ color: '#ef4444', marginTop: 4 }}>{tr.error_message}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#666', fontSize: 13 }}>Không có dữ liệu test cases.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
