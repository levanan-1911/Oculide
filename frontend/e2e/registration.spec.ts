import { test, expect } from '@playwright/test';

test.describe('1. Luồng Đăng ký (Registration)', () => {
  const BASE_URL = 'http://localhost:3000/register';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('TC1: Đăng ký thành công Student (Happy Path)', async ({ page }) => {
    await page.getByRole('button', { name: '👨‍🎓 Sinh viên' }).click();
    
    // Dùng ID ngẫu nhiên để tránh lỗi trùng lặp user đã tồn tại
    const randomId = `20${Math.floor(Math.random() * 1000000)}`;
    await page.getByPlaceholder('Nguyễn Văn A').fill('Sinh Vien Test 1');
    await page.getByPlaceholder('VD: 20123456').fill(randomId);
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();

    // Thay vì check cứng URL URL encoded, ta có thể dùng expect.stringContaining
    await page.waitForURL('**/login?msg=*', { timeout: 15000 });
  });

  test('TC2: Đăng ký thành công Instructor (Happy Path)', async ({ page }) => {
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    
    const randomEmail = `gv.test${Math.floor(Math.random() * 1000000)}@university.edu.vn`;
    await page.getByPlaceholder('Nguyễn Văn A').fill('Giang Vien Test 1');
    await page.getByPlaceholder('email@university.edu.vn').fill(randomEmail);
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();
    await page.waitForURL('**/login?msg=*', { timeout: 15000 });
  });

  test('TC3: Trùng lặp Email/MSSV (Negative Case)', async ({ page }) => {
    // 1. Tạo một ID ngẫu nhiên và đăng ký lần 1 để đảm bảo user này tồn tại
    const duplicateId = `20${Math.floor(Math.random() * 1000000)}`;
    await page.getByRole('button', { name: '👨‍🎓 Sinh viên' }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('Sinh Vien Tao Truoc');
    await page.getByPlaceholder('VD: 20123456').fill(duplicateId);
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();
    await page.waitForURL('**/login?msg=*', { timeout: 15000 });

    // 2. Quay lại trang đăng ký
    await page.goto('http://localhost:3000/register');

    // 3. Đăng ký lại chính ID đó
    await page.getByRole('button', { name: '👨‍🎓 Sinh viên' }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('Sinh Vien Trung Lap');
    await page.getByPlaceholder('VD: 20123456').fill(duplicateId);
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();

    // Hệ thống API phải trả về lỗi "Username already registered" hoặc "Email already registered"
    const errorMessage = page.getByText(/already registered|tồn tại/i);
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('TC4: Validate Format Email Instructor', async ({ page }) => {
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    
    // Nhập email sai định dạng
    await page.getByPlaceholder('Nguyễn Văn A').fill('Giang Vien Email Sai');
    await page.getByPlaceholder('email@university.edu.vn').fill('invalid-email.com');
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();

    // Do input là type="email", trình duyệt sẽ tự chặn submit.
    // Kiểm tra UI không bị chuyển trang
    await expect(page).toHaveURL(BASE_URL);
  });

  test('TC5: Tấn công XSS / SQL Injection qua Full Name', async ({ page }) => {
    await page.getByRole('button', { name: '👨‍🎓 Sinh viên' }).click();
    
    // Cố tình chèn thẻ script hoặc nháy đơn
    await page.getByPlaceholder('Nguyễn Văn A').fill("<script>alert('XSS')</script> OR 1=1");
    await page.getByPlaceholder('VD: 20123456').fill(`20${Math.floor(Math.random() * 100000)}`);
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();

    // Nếu đăng ký thành công, chúng ta sẽ viết thêm test ở luồng Login để xem thẻ script có bị render ra HTML (gây XSS) hay không.
  });
});
