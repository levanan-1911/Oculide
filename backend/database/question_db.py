from config import get_sqlserver_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_question_by_id(question_id: int) -> Optional[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT question_id, room_id, question_order, question_title, question_description,
                   question_type, programming_language, max_points, time_limit_minutes,
                   memory_limit_mb, is_active, created_at, updated_at
            FROM ExamQuestions WHERE question_id = ?
        """, (question_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_questions_by_room(room_id: int) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT question_id, room_id, question_order, question_title, question_description,
                   question_type, programming_language, max_points, time_limit_minutes,
                   memory_limit_mb, is_active, created_at, updated_at
            FROM ExamQuestions 
            WHERE room_id = ? AND is_active = 1
            ORDER BY question_order
        """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def create_question(
    room_id: int,
    question_order: int,
    question_title: str,
    question_description: str,
    question_type: str,
    programming_language: Optional[str],
    max_points: float,
    time_limit_minutes: Optional[int],
    memory_limit_mb: Optional[int]
) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO ExamQuestions (room_id, question_order, question_title, question_description,
                                      question_type, programming_language, max_points, 
                                      time_limit_minutes, memory_limit_mb)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (room_id, question_order, question_title, question_description,
              question_type, programming_language, max_points,
              time_limit_minutes, memory_limit_mb))
        conn.commit()
        
        # Get the created question
        cursor.execute("""
            SELECT question_id, room_id, question_order, question_title, question_description,
                   question_type, programming_language, max_points, time_limit_minutes,
                   memory_limit_mb, is_active, created_at, updated_at
            FROM ExamQuestions WHERE question_id = SCOPE_IDENTITY()
        """)
        row = cursor.fetchone()
        columns = [column[0] for column in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()

def update_question(question_id: int, **kwargs) -> Dict:
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
            return get_question_by_id(question_id)
        
        values.append(question_id)
        query = f"""
            UPDATE ExamQuestions 
            SET {', '.join(update_fields)}
            WHERE question_id = ?
        """
        cursor.execute(query, values)
        conn.commit()
        
        return get_question_by_id(question_id)
    finally:
        cursor.close()
        conn.close()

def delete_question(question_id: int) -> bool:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM ExamQuestions WHERE question_id = ?", (question_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_test_cases_by_question(question_id: int, hidden_only: Optional[bool] = None) -> List[Dict]:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        if hidden_only is None:
            cursor.execute("""
                SELECT test_case_id, question_id, input_data, expected_output, is_hidden, points, created_at
                FROM TestCases WHERE question_id = ?
            """, (question_id,))
        elif hidden_only:
            cursor.execute("""
                SELECT test_case_id, question_id, input_data, expected_output, is_hidden, points, created_at
                FROM TestCases WHERE question_id = ? AND is_hidden = 1
            """, (question_id,))
        else:
            cursor.execute("""
                SELECT test_case_id, question_id, input_data, expected_output, is_hidden, points, created_at
                FROM TestCases WHERE question_id = ? AND is_hidden = 0
            """, (question_id,))
        
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def create_test_case(
    question_id: int,
    input_data: str,
    expected_output: str,
    is_hidden: bool,
    points: float
) -> Dict:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO TestCases (question_id, input_data, expected_output, is_hidden, points)
            VALUES (?, ?, ?, ?, ?)
        """, (question_id, input_data, expected_output, is_hidden, points))
        conn.commit()
        
        # Get the created test case
        cursor.execute("""
            SELECT test_case_id, question_id, input_data, expected_output, is_hidden, points, created_at
            FROM TestCases WHERE test_case_id = SCOPE_IDENTITY()
        """)
        row = cursor.fetchone()
        columns = [column[0] for column in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()

def delete_test_case(test_case_id: int) -> bool:
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM TestCases WHERE test_case_id = ?", (test_case_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
