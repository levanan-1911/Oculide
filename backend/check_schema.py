import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config import get_sqlserver_connection

conn = get_sqlserver_connection()
cursor = conn.cursor()
try:
    cursor.execute("""
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'GradingResults'
    """)
    columns = [row[0] for row in cursor.fetchall()]
    print("Columns in GradingResults:", columns)
finally:
    cursor.close()
    conn.close()
