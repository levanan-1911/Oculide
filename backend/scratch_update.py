import os
path = r'd:\Oculide\backend\database\submission_db.py'
content = open(path, 'r', encoding='utf-8').read()

new_func = '''
def save_grading_results(submission_id: int, results: List[Dict]):
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        for r in results:
            cursor.execute("""
                INSERT INTO GradingResults (submission_id, test_case_id, is_passed, actual_output, execution_time_ms, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                submission_id,
                r['test_case_id'],
                1 if r['passed'] else 0,
                r.get('actual_output')[:1000] if r.get('actual_output') else None,
                r.get('execution_ms', 0),
                r.get('error')[:500] if r.get('error') else None
            ))
        conn.commit()
    except Exception as e:
        print("Failed to save grading results:", e)
    finally:
        cursor.close()
        conn.close()
'''

if 'def save_grading_results' not in content:
    content += new_func
    open(path, 'w', encoding='utf-8').write(content)
    print('Added save_grading_results')
