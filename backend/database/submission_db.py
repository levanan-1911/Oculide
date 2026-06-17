from config import get_sqlserver_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_submission_by_id(submission_id: int) -> Optional[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT submission_id, room_id, student_id, question_id, attempt_number,
                   code_content, language, submitted_at, status
            FROM StudentSubmissions WHERE submission_id = ?
        """, (submission_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_submissions_by_student(student_id: int, room_id: Optional[int] = None) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        if room_id:
            cursor.execute("""
                SELECT s.submission_id, s.room_id, s.student_id, s.question_id, s.attempt_number,
                       s.code_content, s.language, s.submitted_at, s.status,
                       COALESCE((
                           SELECT SUM(tc.points)
                           FROM GradingResults gr
                           JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                           WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                       ), 0) as total_points
                FROM StudentSubmissions s
                WHERE s.student_id = ? AND s.room_id = ?
                ORDER BY s.submitted_at DESC
            """, (student_id, room_id))
        else:
            cursor.execute("""
                SELECT s.submission_id, s.room_id, s.student_id, s.question_id, s.attempt_number,
                       s.code_content, s.language, s.submitted_at, s.status,
                       COALESCE((
                           SELECT SUM(tc.points)
                           FROM GradingResults gr
                           JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                           WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                       ), 0) as total_points
                FROM StudentSubmissions s
                WHERE s.student_id = ?
                ORDER BY s.submitted_at DESC
            """, (student_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_submissions_by_question(question_id: int) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT submission_id, room_id, student_id, question_id, attempt_number,
                   code_content, language, submitted_at, status
            FROM StudentSubmissions 
            WHERE question_id = ?
            ORDER BY submitted_at DESC
        """, (question_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def create_submission(
    room_id: int,
    student_id: int,
    question_id: int,
    attempt_number: int,
    code_content: str,
    language: str
) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO StudentSubmissions (room_id, student_id, question_id, attempt_number, code_content, language)
            OUTPUT INSERTED.submission_id
            VALUES (?, ?, ?, ?, ?, ?)
        """, (room_id, student_id, question_id, attempt_number, code_content, language))
        
        submission_id = cursor.fetchone()[0]
        conn.commit()
        
        cursor.execute("""
            SELECT submission_id, room_id, student_id, question_id, attempt_number,
                   code_content, language, submitted_at, status
            FROM StudentSubmissions WHERE submission_id = ?
        """, (submission_id,))
        row = cursor.fetchone()
        columns = [column[0] for column in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()

def update_submission_status(submission_id: int, status: str) -> bool:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE StudentSubmissions SET status = ? WHERE submission_id = ?
        """, (status, submission_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_submission_grading_results(submission_id: int) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT tc.test_case_id, tc.is_hidden, tc.input_data, tc.expected_output, tc.points,
                   gr.result_id, gr.actual_output, gr.is_passed, gr.error_message, gr.execution_ms
            FROM GradingResults gr
            JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
            WHERE gr.submission_id = ?
            ORDER BY tc.is_hidden ASC, tc.test_case_id ASC
        """, (submission_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def save_grading_results(submission_id: int, results: List[Dict]):
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        for r in results:
            cursor.execute("""
                INSERT INTO GradingResults (submission_id, test_case_id, is_passed, actual_output, execution_time_ms, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                submission_id,
                r['test_case_id'],
                1 if r['passed'] else 0,
                r.get('actual_output')[:1000] if r.get('actual_output') else None,
                r.get('execution_ms', 0),
                r.get('error')[:500] if r.get('error') else None
            ))
        conn.commit()
    except Exception as e:
        print("Failed to save grading results:", e)
    finally:
        cursor.close()
        conn.close()
