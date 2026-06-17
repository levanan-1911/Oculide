from database.user_db import get_sqlserver_connection
conn = get_sqlserver_connection()
cursor = conn.cursor()
cursor.execute("SELECT TOP 5 username, email, role FROM Users ORDER BY created_at DESC")
for row in cursor.fetchall():
    print(row)
