from config import get_sqlserver_connection
from passlib.context import CryptContext
from datetime import datetime
from typing import Optional, Dict

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_user_by_username(username: str) -> Optional[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id, username, password_hash, email, full_name, role, 
                   student_id, is_active, created_at, updated_at, last_login
            FROM Users WHERE username = ?
        """, (username,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_user_by_email(email: str) -> Optional[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id, username, password_hash, email, full_name, role, 
                   student_id, is_active, created_at, updated_at, last_login
            FROM Users WHERE email = ?
        """, (email,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_user_by_id(user_id: int) -> Optional[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id, username, password_hash, email, full_name, role, 
                   student_id, is_active, created_at, updated_at, last_login
            FROM Users WHERE user_id = ?
        """, (user_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def create_user(
    username: str,
    password_hash: str,
    email: str,
    full_name: str,
    role: str,
    student_id: Optional[str] = None
) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO Users (username, password_hash, email, full_name, role, student_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        """, (username, password_hash, email, full_name, role, student_id))
        conn.commit()
        
        # Get the created user
        cursor.execute("""
            SELECT user_id, username, password_hash, email, full_name, role, 
                   student_id, is_active, created_at, updated_at, last_login
            FROM Users WHERE username = ?
        """, (username,))
        row = cursor.fetchone()
        columns = [column[0] for column in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()

def update_last_login(user_id: int):
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE Users SET last_login = ? WHERE user_id = ?
        """, (datetime.utcnow(), user_id))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

def update_user(user_id: int, **kwargs):
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        set_clause = ", ".join([f"{key} = ?" for key in kwargs.keys()])
        values = list(kwargs.values()) + [user_id]
        cursor.execute(f"""
            UPDATE Users SET {set_clause} WHERE user_id = ?
        """, values)
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()
