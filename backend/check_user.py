import pprint
from database.user_db import get_sqlserver_connection

conn = get_sqlserver_connection()
cursor = conn.cursor()
cursor.execute("SELECT * FROM Users WHERE email LIKE '%levanan13%'")
columns = [column[0] for column in cursor.description]
rows = cursor.fetchall()
print(f"Found {len(rows)} users")
for row in rows:
    pprint.pprint(dict(zip(columns, row)))
