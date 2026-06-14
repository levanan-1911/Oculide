import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config import get_sqlserver_connection

conn = get_sqlserver_connection()
cursor = conn.cursor()
try:
    cursor.execute("""
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
    """)
    tables = [row[0] for row in cursor.fetchall()]
    print("Tables:", tables)
finally:
    cursor.close()
    conn.close()
