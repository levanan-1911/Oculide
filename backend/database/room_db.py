from config import get_sqlserver_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_room_by_id(room_id: int) -> Optional[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT room_id, room_code, room_name, instructor_id, description,
                   start_time, end_time, duration_minutes, max_attempts,
                   is_active, passcode, livekit_room_name, created_at, updated_at
            FROM ExamRooms WHERE room_id = ?
        """, (room_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_room_by_code(room_code: str) -> Optional[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT room_id, room_code, room_name, instructor_id, description,
                   start_time, end_time, duration_minutes, max_attempts,
                   is_active, passcode, livekit_room_name, created_at, updated_at
            FROM ExamRooms WHERE room_code = ?
        """, (room_code,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_rooms_by_instructor(instructor_id: int, skip: int = 0, limit: int = 100) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT room_id, room_code, room_name, instructor_id, description,
                   start_time, end_time, duration_minutes, max_attempts,
                   is_active, passcode, livekit_room_name, created_at, updated_at
            FROM ExamRooms 
            WHERE instructor_id = ?
            ORDER BY created_at DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """, (instructor_id, skip, limit))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_all_rooms(skip: int = 0, limit: int = 100) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT room_id, room_code, room_name, instructor_id, description,
                   start_time, end_time, duration_minutes, max_attempts,
                   is_active, passcode, livekit_room_name, created_at, updated_at
            FROM ExamRooms 
            ORDER BY created_at DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """, (skip, limit))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def create_room(
    room_code: str,
    room_name: str,
    instructor_id: int,
    description: Optional[str],
    start_time: datetime,
    end_time: datetime,
    duration_minutes: int,
    max_attempts: int,
    passcode: Optional[str] = None
) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO ExamRooms (room_code, room_name, instructor_id, description,
                                   start_time, end_time, duration_minutes, max_attempts, passcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (room_code, room_name, instructor_id, description, 
              start_time, end_time, duration_minutes, max_attempts, passcode))
        conn.commit()
        
        # Get the created room
        return get_room_by_code(room_code)
    finally:
        cursor.close()
        conn.close()

def update_room(room_id: int, **kwargs) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        # Build dynamic update query
        update_fields = []
        values = []
        for key, value in kwargs.items():
            if value is not None:
                update_fields.append(f"{key} = ?")
                values.append(value)
        
        if not update_fields:
            return get_room_by_id(room_id)
        
        values.append(room_id)
        query = f"""
            UPDATE ExamRooms 
            SET {', '.join(update_fields)}
            WHERE room_id = ?
        """
        cursor.execute(query, values)
        conn.commit()
        
        return get_room_by_id(room_id)
    finally:
        cursor.close()
        conn.close()

def delete_room(room_id: int) -> bool:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM ExamRooms WHERE room_id = ?", (room_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

def get_room_dashboard_data(room_id: int) -> List[Dict]:
    """Get aggregated dashboard data for the Proctor view."""
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT 
                u.user_id as id,
                u.full_name as name,
                u.student_id as code,
                COALESCE((
                    SELECT TOP 1 status 
                    FROM ExamSessions 
                    WHERE student_id = u.user_id AND room_id = ?
                    ORDER BY started_at DESC
                ), 'offline') as status,
                (
                    SELECT COUNT(*) 
                    FROM ViolationLogs 
                    WHERE session_id IN (SELECT session_id FROM ExamSessions WHERE room_id = ? AND student_id = u.user_id)
                ) as violations,
                COALESCE((
                    SELECT SUM(max_score) FROM (
                        SELECT MAX(sub_score) as max_score
                        FROM (
                            SELECT s.question_id, s.submission_id, 
                                   COALESCE(SUM(tc.points), 0) as sub_score
                            FROM StudentSubmissions s
                            LEFT JOIN GradingResults gr ON s.submission_id = gr.submission_id AND gr.is_passed = 1
                            LEFT JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                            WHERE s.room_id = ? AND s.student_id = u.user_id
                            GROUP BY s.question_id, s.submission_id
                        ) t1
                        GROUP BY question_id
                    ) t2
                ), 0) as score,
                (
                    SELECT COUNT(DISTINCT question_id) 
                    FROM StudentSubmissions 
                    WHERE room_id = ? AND student_id = u.user_id
                ) as progress
            FROM Users u
            INNER JOIN StudentEnrollments e ON u.user_id = e.student_id
            WHERE e.room_id = ?
        """
        cursor.execute(query, (room_id, room_id, room_id, room_id, room_id))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()
