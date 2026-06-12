from config import get_sqlserver_connection
from datetime import datetime
from typing import Optional, List, Dict

def create_message(
    room_id: int,
    sender_id: int,
    recipient_id: Optional[int],
    message: str
) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO ChatMessages (room_id, sender_id, recipient_id, message)
            VALUES (?, ?, ?, ?)
        """, (room_id, sender_id, recipient_id, message))
        conn.commit()
        
        # Get the created message
        cursor.execute("""
            SELECT message_id, room_id, sender_id, recipient_id, message, sent_at
            FROM ChatMessages WHERE message_id = SCOPE_IDENTITY()
        """)
        row = cursor.fetchone()
        columns = [column[0] for column in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()

def get_messages_by_room(room_id: int, limit: int = 50) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT TOP (?) message_id, room_id, sender_id, recipient_id, message, sent_at
            FROM ChatMessages 
            WHERE room_id = ?
            ORDER BY sent_at DESC
        """, (limit, room_id))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_messages_between_users(
    user_id_1: int,
    user_id_2: int,
    room_id: int,
    limit: int = 50
) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT TOP (?) message_id, room_id, sender_id, recipient_id, message, sent_at
            FROM ChatMessages 
            WHERE room_id = ?
            AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
            ORDER BY sent_at DESC
        """, (limit, room_id, user_id_1, user_id_2, user_id_2, user_id_1))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()
