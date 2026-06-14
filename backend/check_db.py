import sys
sys.path.append('/app')
from config import get_sqlserver_connection

conn = get_sqlserver_connection()
cursor = conn.cursor()
cursor.execute("SELECT test_case_id, question_id, input_data, expected_output FROM TestCases")
rows = cursor.fetchall()
for row in rows:
    print(f"TC ID: {row.test_case_id}, Q_ID: {row.question_id}")
    print(f"Input: {repr(row.input_data)}")
    print(f"Expected: {repr(row.expected_output)}")
    print("-" * 20)
conn.close()
