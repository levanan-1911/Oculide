from config import get_sqlserver_connection
from datetime import datetime
from typing import Optional, List, Dict

def create_violation(
    session_id: int,
    student_id: int,
    violation_type: str,
    severity: str,
    description: Optional[str],
    snapshot_url: Optional[str]
) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO ViolationLogs (session_id, student_id, violation_type, severity, description, snapshot_url)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (session_id, student_id, violation_type, severity, description, snapshot_url))
        conn.commit()
        
        # Get the created violation
        cursor.execute("""
            SELECT violation_id, session_id, student_id, violation_type, severity,
                   description, snapshot_url, detected_at, is_reviewed, reviewed_by, reviewed_at
            FROM ViolationLogs WHERE violation_id = SCOPE_IDENTITY()
        """)
        row = cursor.fetchone()
        columns = [column[0] for column in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()

def get_violations_by_session(session_id: int) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT violation_id, session_id, student_id, violation_type, severity,
                   description, snapshot_url, detected_at, is_reviewed, reviewed_by, reviewed_at
            FROM ViolationLogs 
            WHERE session_id = ?
            ORDER BY detected_at DESC
        """, (session_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_violations_by_student(student_id: int, room_id: Optional[int] = None) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        if room_id:
            cursor.execute("""
                SELECT vl.violation_id, vl.session_id, vl.student_id, vl.violation_type, vl.severity,
                       vl.description, vl.snapshot_url, vl.detected_at, vl.is_reviewed, vl.reviewed_by, vl.reviewed_at
                FROM ViolationLogs vl
                JOIN ExamSessions es ON vl.session_id = es.session_id
                WHERE vl.student_id = ? AND es.room_id = ?
                ORDER BY vl.detected_at DESC
            """, (student_id, room_id))
        else:
            cursor.execute("""
                SELECT violation_id, session_id, student_id, violation_type, severity,
                       description, snapshot_url, detected_at, is_reviewed, reviewed_by, reviewed_at
                FROM ViolationLogs 
                WHERE student_id = ?
                ORDER BY detected_at DESC
            """, (student_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def update_violation_review(violation_id: int, reviewed_by: int) -> bool:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE ViolationLogs 
            SET is_reviewed = 1, reviewed_by = ?, reviewed_at = ?
            WHERE violation_id = ?
        """, (reviewed_by, datetime.utcnow(), violation_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
