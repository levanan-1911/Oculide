import pyodbc
from config import settings, get_sqlserver_connection
from database.user_db import create_user, get_password_hash
import datetime

def seed_database():
    try:
        conn = get_sqlserver_connection()
        cursor = conn.cursor()
        print("Connected to DB. Seeding data...")

        # 1. Create Users
        instructor_hash = get_password_hash("password123")
        student_hash = get_password_hash("password123")

        # Clear existing
        cursor.execute("DELETE FROM Users")
        cursor.execute("DELETE FROM ExamRooms")
        cursor.execute("DELETE FROM ExamQuestions")
        cursor.execute("DELETE FROM TestCases")
        cursor.execute("DBCC CHECKIDENT ('Users', RESEED, 0)")
        cursor.execute("DBCC CHECKIDENT ('ExamRooms', RESEED, 0)")
        cursor.execute("DBCC CHECKIDENT ('ExamQuestions', RESEED, 0)")
        cursor.execute("DBCC CHECKIDENT ('TestCases', RESEED, 0)")

        # Insert Instructor
        cursor.execute("""
            INSERT INTO Users (username, password_hash, email, full_name, role)
            OUTPUT INSERTED.user_id
            VALUES (?, ?, ?, ?, ?)
        """, ('instructor', instructor_hash, 'instructor@truong.edu.vn', 'Giang Vien A', 'instructor'))
        instructor_id = cursor.fetchone()[0]

        # Insert Student
        cursor.execute("""
            INSERT INTO Users (username, password_hash, email, full_name, role, student_id)
            OUTPUT INSERTED.user_id
            VALUES (?, ?, ?, ?, ?, ?)
        """, ('student', student_hash, 'student@truong.edu.vn', 'Sinh Vien B', 'student', 'SV123456'))
        student_id = cursor.fetchone()[0]

        # 2. Create Exam Room
        start = datetime.datetime.now()
        end = start + datetime.timedelta(days=1)
        cursor.execute("""
            INSERT INTO ExamRooms (room_code, room_name, instructor_id, description, start_time, end_time, duration_minutes, is_active)
            OUTPUT INSERTED.room_id
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ('CTDL2025', 'Kỳ thi: CTDL & GT - HK2 2025', instructor_id, 'Thi cuối kỳ', start, end, 120, 1))
        room_id = cursor.fetchone()[0]

        # 3. Create Questions (ID=1 -> Two Sum, ID=2 -> Binary Search)
        cursor.execute("""
            INSERT INTO ExamQuestions (room_id, question_order, question_title, question_description, question_type, programming_language, max_points)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (room_id, 1, 'Two Sum', 'Dễ', 'coding', 'python', 10.0))
        
        cursor.execute("""
            INSERT INTO ExamQuestions (room_id, question_order, question_title, question_description, question_type, programming_language, max_points)
            OUTPUT INSERTED.question_id
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (room_id, 2, 'Binary Search', 'Viết thuật toán Binary Search...', 'coding', 'python', 20.0))
        question_id = cursor.fetchone()[0]

        # 4. Create Test Cases for Question 2
        # Because the starter code hardcodes the assertions and prints "✓ All test cases passed!",
        # our simple test case will just expect that exact string as output.
        cursor.execute("""
            INSERT INTO TestCases (question_id, input_data, expected_output, is_hidden, points)
            VALUES (?, ?, ?, ?, ?)
        """, (question_id, '', '✓ All test cases passed!\n', 0, 20.0))

        # 5. Enroll Student
        cursor.execute("""
            INSERT INTO StudentEnrollments (room_id, student_id, enrolled_by)
            VALUES (?, ?, ?)
        """, (room_id, student_id, instructor_id))

        conn.commit()
        print("Database seeded successfully!")
        print("-------------------------------")
        print("Tài khoản sinh viên: student@truong.edu.vn / password123")
        print("Tài khoản giảng viên: instructor@truong.edu.vn / password123")
        
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Error seeding DB: {e}")

if __name__ == "__main__":
    seed_database()
