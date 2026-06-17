import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Phase 2 - 2. Cập nhật trạng thái thời gian thực (Real-time Status Transition)', () => {
  test.setTimeout(60000);

  let instructorEmail = '';
  
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const randomId = Math.floor(Math.random() * 1000000);
    instructorEmail = `gv.realtime${randomId}@university.edu.vn`;
    const password = 'Password123@!';

    await page.goto(`${BASE_URL}/register`);
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('Giảng Viên Test Thời Gian');
    await page.getByPlaceholder('email@university.edu.vn').fill(instructorEmail);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();
    await page.waitForURL('**/login?msg=*', { timeout: 15000 });
    
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await page.getByPlaceholder('Nhập tên đăng nhập').fill(instructorEmail);
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL('**/instructor', { timeout: 20000 });
  });

  test('TC1: Chuyển đổi trạng thái từ CHƯA MỞ (Scheduled) sang ĐANG MỞ (Active) tự động', async ({ page }) => {
    // 1. Cài đặt đồng hồ giả lập (mock clock) cho trang web để có thể tua nhanh thời gian
    // Không dùng time tĩnh để tránh lỗi khi server và trình duyệt lệch giây lúc test chạy
    await page.clock.install();
    
    // 2. Tính toán thời gian khai mạc là 1 phút sau thời điểm hiện tại
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    
    // Format YYYY-MM-DDThh:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const startTimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    const roomCode = `RT${Math.floor(Math.random() * 1000)}`;
    const roomName = `Phòng Thi Realtime ${roomCode}`;

    await page.getByRole('button', { name: 'TẠO PHÒNG THI MỚI' }).click();
    await page.getByPlaceholder('VD: Cấu trúc Dữ liệu & Giải thuật — Cuối kỳ 2026').fill(roomName);
    await page.getByPlaceholder('CTDL2026').fill(roomCode);
    
    // Ghi đè Start Time
    await page.locator('input[type="datetime-local"]').fill(startTimeStr);

    await page.getByRole('button', { name: 'Khởi Tạo Phòng Thi', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Khởi Tạo Phòng Thi' })).not.toBeVisible({ timeout: 15000 });
    
    // Tìm khung chứa phòng thi vừa tạo
    const roomCard = page.locator('.glass-card').filter({ hasText: roomName });
    await expect(roomCard).toBeVisible({ timeout: 15000 });

    // Trạng thái ban đầu PHẢI LÀ "CHƯA MỞ" vì thời gian hiện tại vẫn nhỏ hơn startTimeStr
    await expect(roomCard.getByText('CHƯA MỞ')).toBeVisible();

    // 3. Tua nhanh thời gian đi qua mốc bắt đầu (thêm 65 giây)
    await page.clock.fastForward(65000);

    // Kiểm tra xem UI có tự động chuyển đổi sang "ĐANG MỞ" hay không mà không cần refresh
    await expect(roomCard.getByText('ĐANG MỞ')).toBeVisible({ timeout: 10000 });
  });

  test('TC2: Chuyển đổi trạng thái từ ĐANG MỞ (Active) sang ĐÃ ĐÓNG (Ended) tự động', async ({ page }) => {
    await page.clock.install();

    const roomCode = `END${Math.floor(Math.random() * 1000)}`;
    const roomName = `Phòng Thi Nhanh ${roomCode}`;

    await page.getByRole('button', { name: 'TẠO PHÒNG THI MỚI' }).click();
    await page.getByPlaceholder('VD: Cấu trúc Dữ liệu & Giải thuật — Cuối kỳ 2026').fill(roomName);
    await page.getByPlaceholder('CTDL2026').fill(roomCode);
    
    // Set thời lượng là 1 phút
    const durationInput = page.locator('input[type="number"]');
    await durationInput.fill('1');

    await page.getByRole('button', { name: 'Khởi Tạo Phòng Thi', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Khởi Tạo Phòng Thi' })).not.toBeVisible({ timeout: 15000 });
    
    const roomCard = page.locator('.glass-card').filter({ hasText: roomName });
    await expect(roomCard).toBeVisible({ timeout: 15000 });

    // Vì thời gian bắt đầu mặc định là ngày mai, ta tua đi 1 ngày (86400000 ms)
    await page.clock.fastForward(86400000);
    
    // Phòng đã mở
    await expect(roomCard.getByText('ĐANG MỞ')).toBeVisible({ timeout: 10000 });

    // Hết giờ thi (1 phút thi = 60000 ms) -> Tua thêm 65 giây nữa
    await page.clock.fastForward(65000);

    // Phòng phải tự đóng
    await expect(roomCard.getByText('ĐÃ ĐÓNG', { exact: true })).toBeVisible({ timeout: 10000 });
  });
});
