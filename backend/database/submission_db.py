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
                SELECT submission_id, room_id, student_id, question_id, attempt_number,
                       code_content, language, submitted_at, status
                FROM StudentSubmissions 
                WHERE student_id = ? AND room_id = ?
                ORDER BY submitted_at DESC
            """, (student_id, room_id))
        else:
            cursor.execute("""
                SELECT submission_id, room_id, student_id, question_id, attempt_number,
                       code_content, language, submitted_at, status
                FROM StudentSubmissions 
                WHERE student_id = ?
                ORDER BY submitted_at DESC
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
            VALUES (?, ?, ?, ?, ?, ?)
        """, (room_id, student_id, question_id, attempt_number, code_content, language))
        conn.commit()
        
        # Get the created submission
        cursor.execute("""
            SELECT submission_id, room_id, student_id, question_id, attempt_number,
                   code_content, language, submitted_at, status
            FROM StudentSubmissions WHERE submission_id = SCOPE_IDENTITY()
        """)
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
