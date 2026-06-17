from config import get_sqlserver_connection

def fix_roles():
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Users SET role = 'instructor' WHERE student_id IS NULL AND role = 'student'")
    conn.commit()
    print(f"Updated {cursor.rowcount} users.")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    fix_roles()
