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
                   is_active, livekit_room_name, created_at, updated_at
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
                   is_active, livekit_room_name, created_at, updated_at
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
                   is_active, livekit_room_name, created_at, updated_at
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
                   is_active, livekit_room_name, created_at, updated_at
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
    max_attempts: int
) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO ExamRooms (room_code, room_name, instructor_id, description,
                                   start_time, end_time, duration_minutes, max_attempts)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (room_code, room_name, instructor_id, description, 
              start_time, end_time, duration_minutes, max_attempts))
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
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
