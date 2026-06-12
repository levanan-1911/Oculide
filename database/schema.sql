-- =============================================
-- Database Schema for Online Exam System with AI Proctoring
-- SQL Server Compatible
-- =============================================

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'ExamSystem')
    DROP DATABASE ExamSystem;
GO

CREATE DATABASE ExamSystem;
GO

USE ExamSystem;
GO

-- =============================================
-- 1. USERS TABLE
-- Lưu trữ thông tin người dùng (Giảng viên, Sinh viên)
-- =============================================
CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('instructor', 'student', 'admin')),
    student_id NVARCHAR(20) NULL, -- Mã sinh viên (chỉ cho student)
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2 NULL
);
GO

CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);
GO

-- =============================================
-- 2. EXAM ROOMS TABLE
-- Lưu trữ thông tin phòng thi
-- =============================================
CREATE TABLE ExamRooms (
    room_id INT IDENTITY(1,1) PRIMARY KEY,
    room_code NVARCHAR(20) UNIQUE NOT NULL,
    room_name NVARCHAR(100) NOT NULL,
    instructor_id INT NOT NULL,
    description NVARCHAR(500) NULL,
    start_time DATETIME2 NOT NULL,
    end_time DATETIME2 NOT NULL,
    duration_minutes INT NOT NULL,
    max_attempts INT DEFAULT 1,
    is_active BIT DEFAULT 1,
    livekit_room_name NVARCHAR(100) NULL, -- Tên phòng LiveKit
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_examrooms_instructor FOREIGN KEY (instructor_id) 
        REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_examrooms_time CHECK (end_time > start_time)
);
GO

CREATE INDEX idx_examrooms_instructor ON ExamRooms(instructor_id);
CREATE INDEX idx_examrooms_code ON ExamRooms(room_code);
CREATE INDEX idx_examrooms_active ON ExamRooms(is_active);
GO

-- =============================================
-- 3. EXAM QUESTIONS TABLE
-- Lưu trữ đề bài/câu hỏi trong phòng thi
-- =============================================
CREATE TABLE ExamQuestions (
    question_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    question_order INT NOT NULL,
    question_title NVARCHAR(200) NOT NULL,
    question_description NVARCHAR(MAX) NOT NULL,
    question_type NVARCHAR(20) NOT NULL CHECK (question_type IN ('coding', 'multiple_choice', 'essay')),
    programming_language NVARCHAR(20) NULL, -- Python, Java, C++, etc.
    max_points DECIMAL(5,2) DEFAULT 10.00,
    time_limit_minutes INT NULL,
    memory_limit_mb INT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_examquestions_room FOREIGN KEY (room_id) 
        REFERENCES ExamRooms(room_id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_examquestions_room ON ExamQuestions(room_id);
CREATE INDEX idx_examquestions_order ON ExamQuestions(room_id, question_order);
GO

-- =============================================
-- 4. TEST CASES TABLE
-- Lưu trữ test case cho chấm bài tự động (coding questions)
-- =============================================
CREATE TABLE TestCases (
    test_case_id INT IDENTITY(1,1) PRIMARY KEY,
    question_id INT NOT NULL,
    input_data NVARCHAR(MAX) NOT NULL,
    expected_output NVARCHAR(MAX) NOT NULL,
    is_hidden BIT DEFAULT 0, -- Test case ẩn (sinh viên không thấy)
    points DECIMAL(5,2) DEFAULT 0.00,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_testcases_question FOREIGN KEY (question_id) 
        REFERENCES ExamQuestions(question_id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_testcases_question ON TestCases(question_id);
GO

-- =============================================
-- 5. STUDENT ENROLLMENTS TABLE
-- Lưu trữ danh sách sinh viên được phép tham gia phòng thi
-- =============================================
CREATE TABLE StudentEnrollments (
    enrollment_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    enrolled_at DATETIME2 DEFAULT GETDATE(),
    enrolled_by INT NOT NULL, -- Giảng viên thêm sinh viên
    
    CONSTRAINT fk_enrollments_room FOREIGN KEY (room_id) 
        REFERENCES ExamRooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT fk_enrollments_by FOREIGN KEY (enrolled_by) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT uq_enrollment UNIQUE (room_id, student_id)
);
GO

CREATE INDEX idx_enrollments_room ON StudentEnrollments(room_id);
CREATE INDEX idx_enrollments_student ON StudentEnrollments(student_id);
GO

-- =============================================
-- 6. STUDENT SUBMISSIONS TABLE
-- Lưu trữ bài nộp của sinh viên
-- =============================================
CREATE TABLE StudentSubmissions (
    submission_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    question_id INT NOT NULL,
    attempt_number INT DEFAULT 1,
    code_content NVARCHAR(MAX) NOT NULL,
    language NVARCHAR(20) NOT NULL,
    submitted_at DATETIME2 DEFAULT GETDATE(),
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'grading', 'completed', 'failed')),
    
    CONSTRAINT fk_submissions_room FOREIGN KEY (room_id) 
        REFERENCES ExamRooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT fk_submissions_question FOREIGN KEY (question_id) 
        REFERENCES ExamQuestions(question_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_submissions_room_student ON StudentSubmissions(room_id, student_id);
CREATE INDEX idx_submissions_status ON StudentSubmissions(status);
CREATE INDEX idx_submissions_question ON StudentSubmissions(question_id);
GO

-- =============================================
-- 7. GRADING RESULTS TABLE
-- Lưu trữ kết quả chấm điểm tự động
-- =============================================
CREATE TABLE GradingResults (
    result_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    test_case_id INT NOT NULL,
    is_passed BIT DEFAULT 0,
    actual_output NVARCHAR(MAX) NULL,
    execution_time_ms DECIMAL(10,2) NULL,
    memory_used_mb DECIMAL(10,2) NULL,
    error_message NVARCHAR(MAX) NULL,
    graded_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_grading_submission FOREIGN KEY (submission_id) 
        REFERENCES StudentSubmissions(submission_id) ON DELETE CASCADE,
    CONSTRAINT fk_grading_testcase FOREIGN KEY (test_case_id) 
        REFERENCES TestCases(test_case_id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_grading_submission ON GradingResults(submission_id);
GO

-- =============================================
-- 8. EXAM SESSIONS TABLE
-- Lưu trữ phiên thi của sinh viên
-- =============================================
CREATE TABLE ExamSessions (
    session_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    started_at DATETIME2 DEFAULT GETDATE(),
    ended_at DATETIME2 NULL,
    ip_address NVARCHAR(45) NULL,
    user_agent NVARCHAR(500) NULL,
    browser_fingerprint NVARCHAR(100) NULL,
    status NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated', 'abandoned')),
    
    CONSTRAINT fk_sessions_room FOREIGN KEY (room_id) 
        REFERENCES ExamRooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_sessions_room_student ON ExamSessions(room_id, student_id);
CREATE INDEX idx_sessions_status ON ExamSessions(status);
GO

-- =============================================
-- 9. VIOLATION LOGS TABLE
-- Lưu trữ log hành vi vi phạm của sinh viên
-- =============================================
CREATE TABLE ViolationLogs (
    violation_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    violation_type NVARCHAR(50) NOT NULL CHECK (violation_type IN (
        'tab_switch', 'copy_paste', 'no_face_detected', 
        'multiple_faces', 'phone_detected', 'suspicious_object',
        'fullscreen_exit', 'camera_blocked', 'time_exceeded'
    )),
    severity NVARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description NVARCHAR(500) NULL,
    snapshot_url NVARCHAR(500) NULL, -- URL ảnh chụp webcam khi vi phạm
    detected_at DATETIME2 DEFAULT GETDATE(),
    is_reviewed BIT DEFAULT 0,
    reviewed_by INT NULL,
    reviewed_at DATETIME2 NULL,
    
    CONSTRAINT fk_violations_session FOREIGN KEY (session_id) 
        REFERENCES ExamSessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_violations_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT fk_violations_reviewer FOREIGN KEY (reviewed_by) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_violations_session ON ViolationLogs(session_id);
CREATE INDEX idx_violations_student ON ViolationLogs(student_id);
CREATE INDEX idx_violations_type ON ViolationLogs(violation_type);
CREATE INDEX idx_violations_severity ON ViolationLogs(severity);
CREATE INDEX idx_violations_reviewed ON ViolationLogs(is_reviewed);
GO

-- =============================================
-- 10. WEBCAM SNAPSHOTS TABLE
-- Lưu trữ ảnh chụp webcam định kỳ
-- =============================================
CREATE TABLE WebcamSnapshots (
    snapshot_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    image_url NVARCHAR(500) NOT NULL,
    face_detected BIT DEFAULT 0,
    face_count INT DEFAULT 0,
    looking_at_screen BIT DEFAULT 1,
    confidence_score DECIMAL(5,2) NULL,
    captured_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_snapshots_session FOREIGN KEY (session_id) 
        REFERENCES ExamSessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_snapshots_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_snapshots_session ON WebcamSnapshots(session_id);
CREATE INDEX idx_snapshots_captured ON WebcamSnapshots(captured_at);
GO

-- =============================================
-- 11. CHAT MESSAGES TABLE
-- Lưu trữ tin nhắn chat trong phòng thi
-- =============================================
CREATE TABLE ChatMessages (
    message_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_content NVARCHAR(1000) NOT NULL,
    message_type NVARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'announcement')),
    is_private BIT DEFAULT 0,
    recipient_id INT NULL, -- Nếu là tin nhắn riêng
    sent_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_chat_room FOREIGN KEY (room_id) 
        REFERENCES ExamRooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_sender FOREIGN KEY (sender_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT fk_chat_recipient FOREIGN KEY (recipient_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_chat_room ON ChatMessages(room_id);
CREATE INDEX idx_chat_sender ON ChatMessages(sender_id);
CREATE INDEX idx_chat_sent ON ChatMessages(sent_at);
GO

-- =============================================
-- 12. SYSTEM LOGS TABLE
-- Lưu trữ log hệ thống chung
-- =============================================
CREATE TABLE SystemLogs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    log_level NVARCHAR(20) NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'debug')),
    module NVARCHAR(50) NOT NULL, -- API, WebSocket, AI, Grader, etc.
    message NVARCHAR(MAX) NOT NULL,
    user_id INT NULL,
    extra_data NVARCHAR(MAX) NULL, -- JSON data
    created_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) ON DELETE SET NULL
);
GO

CREATE INDEX idx_logs_level ON SystemLogs(log_level);
CREATE INDEX idx_logs_module ON SystemLogs(module);
CREATE INDEX idx_logs_created ON SystemLogs(created_at);
GO

-- =============================================
-- 13. LIVEKIT TOKENS TABLE
-- Lưu trữ token LiveKit cho video streaming
-- =============================================
CREATE TABLE LiveKitTokens (
    token_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    token NVARCHAR(500) NOT NULL,
    participant_identity NVARCHAR(100) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    is_revoked BIT DEFAULT 0,
    
    CONSTRAINT fk_livekit_room FOREIGN KEY (room_id) 
        REFERENCES ExamRooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_livekit_user FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_livekit_room_user ON LiveKitTokens(room_id, user_id);
CREATE INDEX idx_livekit_expires ON LiveKitTokens(expires_at);
GO

-- =============================================
-- STORED PROCEDURES
-- =============================================

-- Lấy thống kê vi phạm của sinh viên trong phòng thi
CREATE PROCEDURE sp_GetStudentViolationStats
    @room_id INT,
    @student_id INT
AS
BEGIN
    SELECT 
        violation_type,
        severity,
        COUNT(*) as violation_count,
        MIN(detected_at) as first_occurrence,
        MAX(detected_at) as last_occurrence
    FROM ViolationLogs vl
    JOIN ExamSessions es ON vl.session_id = es.session_id
    WHERE es.room_id = @room_id 
        AND vl.student_id = @student_id
    GROUP BY violation_type, severity
    ORDER BY severity DESC, violation_count DESC;
END;
GO

-- Lấy kết quả thi tổng hợp của sinh viên
CREATE PROCEDURE sp_GetStudentExamResults
    @room_id INT,
    @student_id INT
AS
BEGIN
    SELECT 
        eq.question_id,
        eq.question_title,
        eq.max_points,
        ss.submission_id,
        ss.submitted_at,
        ss.status,
        SUM(CASE WHEN gr.is_passed = 1 THEN tc.points ELSE 0 END) as earned_points,
        AVG(gr.execution_time_ms) as avg_execution_time
    FROM ExamQuestions eq
    LEFT JOIN StudentSubmissions ss ON eq.question_id = ss.question_id AND ss.student_id = @student_id
    LEFT JOIN GradingResults gr ON ss.submission_id = gr.submission_id
    LEFT JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
    WHERE eq.room_id = @room_id
    GROUP BY eq.question_id, eq.question_title, eq.max_points, ss.submission_id, ss.submitted_at, ss.status
    ORDER BY eq.question_order;
END;
GO

-- Lấy danh sách sinh viên đang online trong phòng thi
CREATE PROCEDURE sp_GetOnlineStudents
    @room_id INT
AS
BEGIN
    SELECT 
        u.user_id,
        u.username,
        u.full_name,
        u.student_id,
        es.session_id,
        es.started_at,
        DATEDIFF(MINUTE, es.started_at, GETDATE()) as duration_minutes,
        (SELECT COUNT(*) FROM ViolationLogs WHERE session_id = es.session_id) as violation_count
    FROM ExamSessions es
    JOIN Users u ON es.student_id = u.user_id
    WHERE es.room_id = @room_id 
        AND es.status = 'active'
    ORDER BY es.started_at;
END;
GO

-- =============================================
-- VIEWS
-- =============================================

-- View: Tổng quan phòng thi
CREATE VIEW vw_ExamRoomOverview AS
SELECT 
    er.room_id,
    er.room_code,
    er.room_name,
    u.full_name as instructor_name,
    er.start_time,
    er.end_time,
    er.duration_minutes,
    COUNT(DISTINCT se.student_id) as enrolled_students,
    COUNT(DISTINCT CASE WHEN es.status = 'active' THEN es.student_id END) as active_students,
    COUNT(DISTINCT CASE WHEN es.status = 'completed' THEN es.student_id END) as completed_students,
    COUNT(DISTINCT eq.question_id) as total_questions
FROM ExamRooms er
JOIN Users u ON er.instructor_id = u.user_id
LEFT JOIN StudentEnrollments se ON er.room_id = se.room_id
LEFT JOIN ExamSessions es ON er.room_id = es.room_id
LEFT JOIN ExamQuestions eq ON er.room_id = eq.room_id
GROUP BY er.room_id, er.room_code, er.room_name, u.full_name, 
         er.start_time, er.end_time, er.duration_minutes;
GO

-- View: Báo cáo vi phạm theo phòng thi
CREATE VIEW vw_ViolationReport AS
SELECT 
    er.room_id,
    er.room_code,
    er.room_name,
    u.user_id,
    u.username,
    u.full_name,
    u.student_id,
    vl.violation_type,
    vl.severity,
    COUNT(*) as violation_count,
    MAX(vl.detected_at) as last_violation
FROM ViolationLogs vl
JOIN ExamSessions es ON vl.session_id = es.session_id
JOIN ExamRooms er ON es.room_id = er.room_id
JOIN Users u ON vl.student_id = u.user_id
GROUP BY er.room_id, er.room_code, er.room_name, 
         u.user_id, u.username, u.full_name, u.student_id,
         vl.violation_type, vl.severity;
GO

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger: Cập nhật updated_at khi record được sửa
CREATE TRIGGER tr_Users_UpdateTimestamp
ON Users
AFTER UPDATE
AS
BEGIN
    UPDATE Users
    SET updated_at = GETDATE()
    WHERE user_id IN (SELECT user_id FROM inserted);
END;
GO

CREATE TRIGGER tr_ExamRooms_UpdateTimestamp
ON ExamRooms
AFTER UPDATE
AS
BEGIN
    UPDATE ExamRooms
    SET updated_at = GETDATE()
    WHERE room_id IN (SELECT room_id FROM inserted);
END;
GO

CREATE TRIGGER tr_ExamQuestions_UpdateTimestamp
ON ExamQuestions
AFTER UPDATE
AS
BEGIN
    UPDATE ExamQuestions
    SET updated_at = GETDATE()
    WHERE question_id IN (SELECT question_id FROM inserted);
END;
GO

-- =============================================
-- SAMPLE DATA (OPTIONAL)
-- =============================================

-- Insert sample admin user
INSERT INTO Users (username, password_hash, email, full_name, role, is_active)
VALUES ('admin', '$2b$12$hashed_password_here', 'admin@exam.com', 'System Admin', 'admin', 1);
GO

PRINT 'Database schema created successfully!';
GO
