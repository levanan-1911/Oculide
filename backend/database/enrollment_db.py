from config import get_sqlserver_connection
from datetime import datetime
from typing import Optional, List, Dict

def is_student_enrolled(room_id: int, student_id: int) -> bool:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT COUNT(*) FROM StudentEnrollments 
            WHERE room_id = ? AND student_id = ?
        """, (room_id, student_id))
        count = cursor.fetchone()[0]
        return count > 0
    finally:
        cursor.close()
        conn.close()

def enroll_student(room_id: int, student_id: int, enrolled_by: int) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO StudentEnrollments (room_id, student_id, enrolled_by)
            OUTPUT INSERTED.enrollment_id
            VALUES (?, ?, ?)
        """, (room_id, student_id, enrolled_by))
        
        enrollment_id = cursor.fetchone()[0]
        conn.commit()
        
        cursor.execute("""
            SELECT enrollment_id, room_id, student_id, enrolled_at, enrolled_by
            FROM StudentEnrollments WHERE enrollment_id = ?
        """, (enrollment_id,))
        row = cursor.fetchone()
        columns = [column[0] for column in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()

def get_enrollments_by_room(room_id: int) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT se.enrollment_id, se.room_id, se.student_id, se.enrolled_at, se.enrolled_by,
                   u.username, u.full_name, u.student_id as student_code
            FROM StudentEnrollments se
            JOIN Users u ON se.student_id = u.user_id
            WHERE se.room_id = ?
        """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def remove_enrollment(room_id: int, student_id: int) -> bool:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM StudentEnrollments 
            WHERE room_id = ? AND student_id = ?
        """, (room_id, student_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
