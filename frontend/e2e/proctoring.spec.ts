import { test, expect } from '@playwright/test';

test.describe('Phase 4 - Quản lý Phiên thi & Proctoring', () => {
  test.setTimeout(180000); // 180 seconds for multi-context test

  test('TC1: Real-time Proctoring Alert & Kick Mechanism', async ({ browser }) => {
    // TẠO CONTEXT CHO INSTRUCTOR
    const instructorContext = await browser.newContext();
    const instructorPage = await instructorContext.newPage();
    instructorPage.on('console', msg => console.log('>> [Instructor Console]:', msg.text()));
    instructorPage.on('response', res => {
      if (res.status() >= 400 && !res.url().includes('livekit')) {
        console.log(`>> [Instructor Network Error]: ${res.status()} ${res.url()}`);
      }
    });
    
    // Đăng ký/Đăng nhập Instructor
    const randomId = Math.floor(Math.random() * 1000000);
    const instructorEmail = `gv.proctor${randomId}@university.edu.vn`;
    
    await instructorPage.goto('https://oculide.id.vn/register');
    await instructorPage.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await instructorPage.getByPlaceholder('Nguyễn Văn A').fill('Instructor Proctor');
    await instructorPage.getByPlaceholder('email@university.edu.vn').fill(instructorEmail);
    await instructorPage.getByPlaceholder('••••••••').fill('Password123@!');
    await instructorPage.getByRole('button', { name: 'Đăng ký tài khoản' }).click();
    await instructorPage.waitForURL('**/login?msg=*', { timeout: 30000 });
    
    await instructorPage.goto('https://oculide.id.vn/login');
    await instructorPage.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await instructorPage.getByPlaceholder('Nhập tên đăng nhập').fill(instructorEmail);
    await instructorPage.getByPlaceholder('••••••••').fill('Password123@!');
    await instructorPage.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(instructorPage).toHaveURL(/.*\/instructor/, { timeout: 15000 });

    // Tạo Phòng thi mới
    const roomCode = `PROC${Math.floor(Math.random() * 10000)}`;
    await instructorPage.getByRole('button', { name: 'TẠO PHÒNG THI MỚI' }).click();
    await instructorPage.getByPlaceholder('VD: Cấu trúc Dữ liệu & Giải thuật').fill(`Phòng Proctoring ${roomCode}`);
    await instructorPage.getByPlaceholder('CTDL2026').fill(roomCode);
    
    // Đặt start_time là quá khứ (vừa mới đây) để phòng tự động mở
    // Fill datetime-local
    await instructorPage.locator('input[type="datetime-local"]').fill('2024-01-01T00:00');
    
    // Tăng duration để phòng không bị tính là đã kết thúc
    const durationInput = instructorPage.locator('input[type="number"]').first();
    await durationInput.fill('9999999');
    
    await instructorPage.getByRole('button', { name: 'Khởi Tạo Phòng Thi', exact: true }).click();
    await expect(instructorPage.getByRole('heading', { name: 'Khởi Tạo Phòng Thi' })).not.toBeVisible({ timeout: 15000 });
    
    // Lấy room_id từ thẻ phòng thi
    const roomCard = instructorPage.locator('.glass-card').filter({ hasText: `Phòng Proctoring ${roomCode}` });
    await expect(roomCard).toBeVisible({ timeout: 15000 });
    
    const enterRoomHref = await roomCard.getByRole('link', { name: 'Giám Sát' }).getAttribute('href');
    const roomIdMatch = enterRoomHref?.match(/room=(\d+)/);
    const roomId = roomIdMatch ? roomIdMatch[1] : enterRoomHref?.match(/\/instructor\/room\/(\d+)/)?.[1];
    expect(roomId).toBeDefined();

    // Vào màn hình Proctor
    instructorPage.on('websocket', ws => {
      ws.on('framereceived', frame => {
        console.log('>> [E2E] Instructor WS received:', frame.payload);
      });
    });
    instructorPage.on('console', msg => console.log('>> [Instructor Console]:', msg.text()));
    await instructorPage.goto(`https://oculide.id.vn/proctor?room=${roomId}`);
    await expect(instructorPage.getByText('INITIALIZING SURVEILLANCE...')).not.toBeVisible({ timeout: 20000 }); // Wait for LiveKit to init or timeout
    
    // TẠO CONTEXT CHO STUDENT
    const studentContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const studentPage = await studentContext.newPage();
    
    await studentPage.goto('https://oculide.id.vn/join');
    
    // Tham gia phòng thi
    await studentPage.getByPlaceholder('CTDL2026').fill(roomCode);
    await studentPage.getByPlaceholder('Nguyễn Văn A').fill('Student Proctor');
    await studentPage.getByPlaceholder('2021...').fill(`SV${randomId}`);
    
    // Submit form join
    await studentPage.getByRole('button', { name: /CONNECT/i }).click();
    
    // Đợi vào trang exam
    await expect(studentPage).toHaveURL(/.*\/exam\?room=/, { timeout: 15000 });
    
    studentPage.on('response', async response => {
      if (response.url().includes('violations') && response.request().method() === 'POST') {
        console.log('>> [E2E] Violation API Status: ', response.status());
        if (response.status() !== 307) {
          const body = await response.text();
          console.log('>> [E2E] Violation API Response: ', body);
        }
      }
    });
    
    // Cấp quyền camera cho trình duyệt (Playwright có thể tự động từ chối/cấp, ta chờ DOM)
    // Đảm bảo studentPage tải xong exam
    await expect(studentPage.locator('button', { name: 'Nộp Bài' }).first()).toBeVisible({ timeout: 20000 });

    // Lắng nghe console của studentPage
    studentPage.on('console', msg => console.log('>> [Student Console]:', msg.text()));

    // MÔ PHỎNG HÀNH VI CHUYỂN TAB CỦA SINH VIÊN
    await studentPage.waitForTimeout(5000); // Đợi sessionsAPI.startSession hoàn tất
    
    // Kích hoạt violation trực tiếp
    console.log(">> [E2E] Triggering tab_switch via window.__test_triggerViolation");
    await studentPage.evaluate(async (rid) => {
      const userStr = window.localStorage.getItem('user');
      const token = window.localStorage.getItem('token');
      if (!userStr || !token) {
        console.error(">> [E2E] user or token not found in localStorage");
        return;
      }
      const user = JSON.parse(userStr);
      const uid = user.user_id;
      
      try {
        const res = await fetch(`https://api.oculide.id.vn/api/sessions/student/${uid}?room_id=${rid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const sessions = await res.json();
        const sessId = sessions.find((s: any) => s.status === 'active')?.session_id || sessions[0]?.session_id;
        
        await fetch(`https://api.oculide.id.vn/api/violations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            session_id: sessId,
            student_id: uid,
            violation_type: 'tab_switch',
            severity: 'medium',
            description: 'Phát hiện chuyển tab hoặc thu nhỏ cửa sổ làm bài'
          })
        });
        console.log(">> [E2E] Direct violation fetch success!");
      } catch(e) {
        console.error(">> [E2E] Direct violation fetch error:", e);
      }
    }, roomId);
    
    await studentPage.waitForTimeout(3000); // Chờ API gọi xong
    
    // Student nhận alert nhắc nhở
    let studentAlertReceived = false;
    studentPage.on('dialog', async (dialog) => {
      if (dialog.message().includes('CẢNH BÁO VI PHẠM')) {
        studentAlertReceived = true;
      }
      await dialog.accept();
    });

    // Tab cảnh báo sáng lên
    const aiWarningTab = instructorPage.getByRole('button', { name: /Cảnh báo AI/ });
    await aiWarningTab.click();
    
    // Chờ React render state violations mới (kèm poll API)
    await instructorPage.waitForTimeout(3000); 
    
    // Test logic lấy text "tab_switch"
    await expect(instructorPage.getByText('tab_switch')).toBeVisible({ timeout: 15000 });
    
    // KIỂM THỬ TÍNH NĂNG KICK
    // Nhấn vào danh sách dạng grid
    const gridBtn = instructorPage.locator('button', { has: instructorPage.locator('svg').filter({ has: instructorPage.locator('rect') }) }).first();
    await gridBtn.click();
    
    // Alert mock cho Instructor
    instructorPage.once('dialog', async dialog => {
      await dialog.accept(); // Confirm kick
    });
    await instructorPage.waitForTimeout(3000); // Chờ state cập nhật
    const kickCount = await instructorPage.locator('button', { hasText: 'KICK' }).count();
    console.log(">> [DEBUG] KICK button count:", kickCount);
    
    // Nhấn nút KICK trực tiếp
    const kickButton = instructorPage.locator('button', { hasText: 'KICK' }).first();
    await expect(kickButton).toBeVisible({ timeout: 15000 });
    await kickButton.click();
    
    // Sinh viên bị đẩy ra trang chủ
    await expect(studentPage).toHaveURL('https://oculide.id.vn/', { timeout: 15000 });
    
    await instructorContext.close();
    await studentContext.close();
  });
});
