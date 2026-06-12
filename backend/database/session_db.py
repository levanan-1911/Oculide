from config import get_sqlserver_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_session_by_id(session_id: int) -> Optional[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT session_id, room_id, student_id, started_at, ended_at,
                   ip_address, user_agent, browser_fingerprint, status
            FROM ExamSessions WHERE session_id = ?
        """, (session_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_sessions_by_room(room_id: int, active_only: bool = False) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        if active_only:
            cursor.execute("""
                SELECT session_id, room_id, student_id, started_at, ended_at,
                       ip_address, user_agent, browser_fingerprint, status
                FROM ExamSessions 
                WHERE room_id = ? AND status = 'active'
                ORDER BY started_at DESC
            """, (room_id,))
        else:
            cursor.execute("""
                SELECT session_id, room_id, student_id, started_at, ended_at,
                       ip_address, user_agent, browser_fingerprint, status
                FROM ExamSessions 
                WHERE room_id = ?
                ORDER BY started_at DESC
            """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_sessions_by_student(student_id: int, room_id: Optional[int] = None, active_only: bool = False) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        if room_id and active_only:
            cursor.execute("""
                SELECT session_id, room_id, student_id, started_at, ended_at,
                       ip_address, user_agent, browser_fingerprint, status
                FROM ExamSessions 
                WHERE student_id = ? AND room_id = ? AND status = 'active'
                ORDER BY started_at DESC
            """, (student_id, room_id))
        elif room_id:
            cursor.execute("""
                SELECT session_id, room_id, student_id, started_at, ended_at,
                       ip_address, user_agent, browser_fingerprint, status
                FROM ExamSessions 
                WHERE student_id = ? AND room_id = ?
                ORDER BY started_at DESC
            """, (student_id, room_id))
        elif active_only:
            cursor.execute("""
                SELECT session_id, room_id, student_id, started_at, ended_at,
                       ip_address, user_agent, browser_fingerprint, status
                FROM ExamSessions 
                WHERE student_id = ? AND status = 'active'
                ORDER BY started_at DESC
            """, (student_id,))
        else:
            cursor.execute("""
                SELECT session_id, room_id, student_id, started_at, ended_at,
                       ip_address, user_agent, browser_fingerprint, status
                FROM ExamSessions 
                WHERE student_id = ?
                ORDER BY started_at DESC
            """, (student_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def create_session(
    room_id: int,
    student_id: int,
    ip_address: Optional[str],
    user_agent: Optional[str],
    browser_fingerprint: Optional[str]
) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO ExamSessions (room_id, student_id, ip_address, user_agent, browser_fingerprint)
            VALUES (?, ?, ?, ?, ?)
        """, (room_id, student_id, ip_address, user_agent, browser_fingerprint))
        conn.commit()
        
        # Get the created session
        cursor.execute("""
            SELECT session_id, room_id, student_id, started_at, ended_at,
                   ip_address, user_agent, browser_fingerprint, status
            FROM ExamSessions WHERE session_id = SCOPE_IDENTITY()
        """)
        row = cursor.fetchone()
        columns = [column[0] for column in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()

def update_session_status(session_id: int, status: str) -> bool:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE ExamSessions SET status = ? WHERE session_id = ?
        """, (status, session_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def end_session(session_id: int) -> bool:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE ExamSessions SET ended_at = ?, status = 'completed' WHERE session_id = ?
        """, (datetime.utcnow(), session_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
