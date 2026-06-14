import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config import get_sqlserver_connection

conn = get_sqlserver_connection()
cursor = conn.cursor()
try:
    cursor.execute('ALTER TABLE ExamRooms ADD passcode VARCHAR(50) NULL;')
    conn.commit()
    print('✅ Đã thêm cột passcode vào bảng ExamRooms thành công!')
except Exception as e:
    print('Bỏ qua lỗi (có thể cột đã tồn tại):', e)
finally:
    cursor.close()
    conn.close()
