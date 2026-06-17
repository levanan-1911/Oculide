import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Phase 2 - 1. Luồng Tạo Kỳ Thi Mới (Exam Room Creation)', () => {
  // Tăng thời gian tối đa để các hook có đủ thời gian chạy
  test.setTimeout(60000);

  // Setup: Đăng ký một tài khoản Giáo viên mới
  let instructorEmail = '';
  
  test.beforeAll(async ({ browser }) => {
    // Tạo 1 trình duyệt riêng để đăng ký
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const randomId = Math.floor(Math.random() * 1000000);
    instructorEmail = `gv.room${randomId}@university.edu.vn`;
    const password = 'Password123@!';

    // Đăng ký
    await page.goto(`${BASE_URL}/register`);
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('Giảng Viên Tạo Phòng');
    await page.getByPlaceholder('email@university.edu.vn').fill(instructorEmail);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();
    
    // Đợi đăng ký thành công
    await page.waitForURL('**/login?msg=*', { timeout: 15000 });
    
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Đăng nhập lại với tài khoản đã tạo trước mỗi test
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await page.getByPlaceholder('Nhập tên đăng nhập').fill(instructorEmail);
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL('**/instructor', { timeout: 20000 });
  });

  test('TC1: Tạo phòng thi thành công (Happy Path)', async ({ page }) => {
    const roomCode = `TEST${Math.floor(Math.random() * 10000)}`;
    const roomName = `Phòng Thi Chuẩn ${roomCode}`;

    await page.getByRole('button', { name: 'TẠO PHÒNG THI MỚI' }).click();
    
    await page.getByPlaceholder('VD: Cấu trúc Dữ liệu & Giải thuật — Cuối kỳ 2026').fill(roomName);
    await page.getByPlaceholder('CTDL2026').fill(roomCode);
    
    // Thời lượng mặc định đang là 60 phút, đổi thành 45 phút
    await page.getByRole('button', { name: '45 phút' }).click();

    await page.getByRole('button', { name: 'Khởi Tạo Phòng Thi', exact: true }).click();

    // Hệ thống ẩn Modal và hiển thị phòng thi mới tạo trên UI với trạng thái "CHƯA MỞ" (Scheduled)
    await expect(page.getByRole('heading', { name: 'Khởi Tạo Phòng Thi' })).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText(roomName)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('CHƯA MỞ').first()).toBeVisible();
  });

  test('TC2: Cảnh báo khi thời gian thi (Duration) quá ngắn hoặc sai logic', async ({ page }) => {
    await page.getByRole('button', { name: 'TẠO PHÒNG THI MỚI' }).click();
    
    await page.getByPlaceholder('VD: Cấu trúc Dữ liệu & Giải thuật — Cuối kỳ 2026').fill('Phòng Thi Lỗi Thời Gian');
    await page.getByPlaceholder('CTDL2026').fill(`ERR${Math.floor(Math.random() * 1000)}`);
    
    // Đặt thời lượng thi = 0 (Lỗi)
    const durationInput = page.locator('input[type="number"]');
    await durationInput.fill('0');

    await page.getByRole('button', { name: 'Khởi Tạo Phòng Thi', exact: true }).click();

    // Hệ thống phải chặn lại và hiển thị cảnh báo (Backend hoặc HTML5 Validation)
    // Tùy thuộc vào việc frontend đã xử lý thế nào, Modal KHÔNG ĐƯỢC tắt
    await expect(page.getByRole('heading', { name: 'Khởi Tạo Phòng Thi' })).toBeVisible();
  });

  test('TC3: Lỗi Validation - Bỏ trống tiêu đề hoặc mã phòng', async ({ page }) => {
    await page.getByRole('button', { name: 'TẠO PHÒNG THI MỚI' }).click();
    
    // Cố tình không nhập Tên phòng và Mã phòng
    await page.getByPlaceholder('VD: Cấu trúc Dữ liệu & Giải thuật — Cuối kỳ 2026').fill('');
    await page.getByPlaceholder('CTDL2026').fill('');

    await page.getByRole('button', { name: 'Khởi Tạo Phòng Thi', exact: true }).click();

    // Trình duyệt HTML5 sẽ chặn hoặc Backend sẽ chặn
    await expect(page.getByRole('heading', { name: 'Khởi Tạo Phòng Thi' })).toBeVisible();
  });

  test('TC4: Kiểm tra bảo mật cơ bản XSS khi nhập Tên Phòng', async ({ page }) => {
    const xssPayload = "<script>alert('XSS Hack')</script>";
    const roomCode = `XSS${Math.floor(Math.random() * 10000)}`;

    await page.getByRole('button', { name: 'TẠO PHÒNG THI MỚI' }).click();
    
    await page.getByPlaceholder('VD: Cấu trúc Dữ liệu & Giải thuật — Cuối kỳ 2026').fill(xssPayload);
    await page.getByPlaceholder('CTDL2026').fill(roomCode);

    await page.getByRole('button', { name: 'Khởi Tạo Phòng Thi', exact: true }).click();

    // Hệ thống ẩn Modal
    await expect(page.getByRole('heading', { name: 'Khởi Tạo Phòng Thi' })).not.toBeVisible({ timeout: 15000 });
    
    // UI không được hiển thị thẻ HTML, mà phải hiển thị dạng text an toàn
    // Playwright sẽ throw error nếu có một popup alert thật sự hiện lên (có thể handle dialog nhưng React mặc định sanitize XSS)
    await expect(page.getByText(xssPayload)).toBeVisible({ timeout: 10000 });
  });

});
