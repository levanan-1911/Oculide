import { test, expect } from '@playwright/test';

test.describe('2. Luồng Đăng nhập (Login)', () => {
  test.setTimeout(60000); // Tăng timeout lên 60s vì phải chạy cả luồng đăng ký rồi mới đăng nhập
  const BASE_URL = 'http://localhost:3000/login';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('TC1: Đăng nhập Instructor thành công (Happy Path)', async ({ page }) => {
    // 1. Dùng API trực tiếp hoặc đăng ký 1 user trước (giả lập) để đảm bảo có data
    // Ở đây ta cứ thử đăng ký nhanh 1 tài khoản rồi login
    const randomId = Math.floor(Math.random() * 1000000);
    const email = `instructor${randomId}@university.edu.vn`;
    const password = 'Password123@!';

    await page.goto('http://localhost:3000/register');
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('Giang Vien Login');
    await page.getByPlaceholder('email@university.edu.vn').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();
    await page.waitForURL('**/login?msg=*');

    // 2. Bắt đầu test đăng nhập
    await page.goto(BASE_URL);

    // Lắng nghe API login để xem lỗi thật sự từ backend là gì
    page.on('response', async (response) => {
      if (response.url().includes('/api/auth/login') && response.request().method() === 'POST') {
        const status = response.status();
        const text = await response.text();
        console.log(`[DEBUG] API Login Response: ${status} ${text}`);
      }
    });

    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    
    await page.getByPlaceholder('Nhập tên đăng nhập').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    // Kiểm tra chuyển hướng đúng về trang quản lý của Instructor
    await expect(page).toHaveURL(/.*\/instructor/, { timeout: 15000 });
  });

  test('TC2: Đăng nhập với tài khoản chưa đăng ký', async ({ page }) => {
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    
    await page.getByPlaceholder('Nhập tên đăng nhập').fill('not_exist_user@university.edu.vn');
    await page.getByPlaceholder('••••••••').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    // Hệ thống báo lỗi
    // Lưu ý: trang Login không có class .glass-card bọc form, ta nên tìm trực tiếp bằng text
    await expect(page.getByText(/Sai tài khoản hoặc mật khẩu/i)).toBeVisible({ timeout: 10000 });
  });

  test('TC3: Đăng nhập sai mật khẩu', async ({ page }) => {
    // 1. Đăng ký trước để có dữ liệu
    const randomId = Math.floor(Math.random() * 1000000);
    const email = `instructor${randomId}@university.edu.vn`;
    const password = 'Password123@!';

    await page.goto('http://localhost:3000/register');
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('Giang Vien Login');
    await page.getByPlaceholder('email@university.edu.vn').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();
    await page.waitForURL('**/login?msg=*', { timeout: 15000 });

    // 2. Test đăng nhập sai mật khẩu
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    
    await page.getByPlaceholder('Nhập tên đăng nhập').fill(email);
    await page.getByPlaceholder('••••••••').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    // Hệ thống báo lỗi
    await expect(page.getByText(/Sai tài khoản hoặc mật khẩu/i)).toBeVisible({ timeout: 10000 });
  });

  test('TC4: Luồng Đăng nhập Sinh viên (Student Route)', async ({ page }) => {
    // Theo thiết kế của Oculide, Sinh viên KHÔNG đăng nhập bằng mật khẩu mà dùng mã phòng (Join Room)
    await page.getByRole('button', { name: '🎓 Sinh viên' }).click();
    
    // Kiểm tra UI hiển thị đúng thông báo
    await expect(page.getByText('Sinh viên không cần tài khoản!')).toBeVisible();
    
    // Bấm nút chuyển hướng sang trang Join
    await page.getByRole('button', { name: 'Đến trang Nhập Mã Phòng' }).click();
    await expect(page).toHaveURL(/.*\/join/, { timeout: 15000 });
  });
});
