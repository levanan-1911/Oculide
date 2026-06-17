import { test, expect } from '@playwright/test';

test.describe('Phase 3 - Quản lý Đề thi và Test Cases', () => {
  test.setTimeout(60000);
  let roomId = 0;
  let instructorEmail = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const randomId = Math.floor(Math.random() * 1000000);
    instructorEmail = `gv.ques${randomId}@university.edu.vn`;
    
    await page.goto('http://localhost:3000/register');
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('Giảng Viên QMS');
    await page.getByPlaceholder('email@university.edu.vn').fill(instructorEmail);
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click();
    await page.waitForURL('**/login?msg=*', { timeout: 15000 });
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Đăng nhập với tư cách instructor
    await page.goto('http://localhost:3000/login');
    await page.getByRole('button', { name: '👨‍🏫 Giảng viên' }).click();
    await page.getByPlaceholder('Nhập tên đăng nhập').fill(instructorEmail);
    await page.getByPlaceholder('••••••••').fill('Password123@!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/.*\/instructor/, { timeout: 15000 });

    // Tạo một phòng thi mới để test
    const roomCode = `Q${Math.floor(Math.random() * 10000)}`;
    const roomName = `Phòng Thi Câu Hỏi ${roomCode}`;

    await page.getByRole('button', { name: 'TẠO PHÒNG THI MỚI' }).click();
    await page.getByPlaceholder('VD: Cấu trúc Dữ liệu & Giải thuật — Cuối kỳ 2026').fill(roomName);
    await page.getByPlaceholder('CTDL2026').fill(roomCode);
    
    // Set thời lượng là 60 phút
    const durationInput = page.locator('input[type="number"]');
    await durationInput.fill('60');

    await page.getByRole('button', { name: 'Khởi Tạo Phòng Thi', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Khởi Tạo Phòng Thi' })).not.toBeVisible({ timeout: 15000 });
    
    // Lấy URL hoặc Click vào nút "Tạo / Sửa Đề Thi" của phòng thi vừa tạo
    const roomCard = page.locator('.glass-card').filter({ hasText: roomName });
    await expect(roomCard).toBeVisible({ timeout: 15000 });
    
    // Nhấn vào nút "Tạo / Sửa Đề Thi"
    await roomCard.getByRole('link', { name: 'Tạo / Sửa Đề Thi' }).click();
    
    // Xác nhận đã vào trang quản lý đề thi
    await expect(page.getByRole('heading', { name: 'Danh sách Đề thi (0)' })).toBeVisible({ timeout: 15000 });
    
    // Extract roomId from URL
    const url = page.url();
    const match = url.match(/\/instructor\/room\/(\d+)/);
    if (match) {
      roomId = parseInt(match[1]);
    }
  });

  test('TC1: Tạo bài toán với điểm số thập phân và Test Case ẩn', async ({ page }) => {
    await page.getByRole('button', { name: '+ Tạo Bài Toán Mới' }).click();
    
    // Điền thông tin cơ bản
    await page.getByPlaceholder('VD: Tìm kiếm nhị phân').fill('Bài toán Test 1');
    await page.getByPlaceholder('Nhập chi tiết yêu cầu bài toán').fill('**Yêu cầu:** Viết thuật toán tìm kiếm nhị phân.');
    
    // Cấu hình ràng buộc
    // Lấy các ô input type=number
    // maxPoints, timeLimit, memoryLimit
    const maxPointsInput = page.locator('div').filter({ hasText: /^Điểm Tối Đa$/ }).locator('input[type="number"]');
    await maxPointsInput.fill('15');
    
    const timeLimitInput = page.locator('div').filter({ hasText: /^Thời Gian \(Phút\)$/ }).locator('input[type="number"]');
    await timeLimitInput.fill('2'); // tiny time limit
    
    const memoryLimitInput = page.locator('div').filter({ hasText: /^Bộ Nhớ \(MB\)$/ }).locator('input[type="number"]');
    await memoryLimitInput.fill('16'); // tiny memory limit
    
    // Thêm Test case thứ 2
    await page.getByRole('button', { name: '+ Thêm Test Case' }).click();
    
    // Điền Test Case 1 (Hiển thị cho sinh viên)
    const tc1 = page.locator('div', { hasText: 'Test Case #1' }).nth(2); // due to nesting
    // Tìm thẻ textarea input_data và expected_output của Test Case 1
    const inputs = page.locator('textarea[placeholder="vd: 5 10"]');
    const outputs = page.locator('textarea[placeholder="vd: 15"]');
    
    await inputs.nth(0).fill('1 2 3 4 5\\n3');
    await outputs.nth(0).fill('2');
    
    // Điền Test Case 2 (Ẩn)
    await inputs.nth(1).fill('1 2 3 4 5\\n6');
    await outputs.nth(1).fill('-1');
    
    // Đánh dấu ẩn cho TC 2
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(1).check();
    
    // Lưu ý: Hệ thống đang tự động chia điểm (tổng điểm 15 -> 7.5 và 7.5)
    // Sửa điểm của TC1 thành 7.00 và TC2 thành 8.00 (Điểm thập phân)
    
    // Wait for the UI to render the points inputs
    await page.waitForTimeout(500); // give React time to render
    
    const numberInputs = page.locator('input[type="number"]');
    
    // Lắng nghe API
    page.on('response', async response => {
      if (response.url().includes('/api/questions') && response.request().method() === 'POST') {
        console.log('CREATE QUESTION STATUS:', response.status());
        const body = await response.text();
        console.log('CREATE QUESTION BODY:', body);
      }
    });

    // maxPoints(0), timeLimit(1), memoryLimit(2), TC1 points(3), TC2 points(4)
    await numberInputs.nth(3).fill('7.25');
    await numberInputs.nth(4).fill('7.75');
    
    // Lắng nghe sự kiện alert (dialog) để debug
    page.once('dialog', dialog => {
      console.log('TC1 Alert:', dialog.message());
      dialog.accept();
    });
    
    // Nhấn Lưu
    await page.getByRole('button', { name: 'Lưu Bài Toán Mới Vào Hệ Thống' }).click();
    
    // Evaluate if any form field is invalid
    const invalidElements = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return 'No form';
      if (form.checkValidity()) return 'Form is valid';
      const invalid = Array.from(form.elements).filter((el: any) => !el.validity.valid);
      return invalid.map((el: any) => `${el.tagName} - ${el.placeholder || el.name || el.type} - ${el.validationMessage}\\n${el.outerHTML}`).join('\\n\\n');
    });
    console.log('FORM VALIDATION STATUS:', invalidElements);
    
    // Xác nhận đã lưu thành công
    await expect(page.getByRole('heading', { name: 'Danh sách Đề thi (1)' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Bài toán Test 1')).toBeVisible();
    await expect(page.getByText('15 PTS')).toBeVisible();
    await expect(page.getByText('2 phút')).toBeVisible();
    await expect(page.getByText('16 MB')).toBeVisible();
  });

  test('TC2: Validation Tổng điểm Test Case bằng Tổng điểm tối đa', async ({ page }) => {
    await page.getByRole('button', { name: '+ Tạo Bài Toán Mới' }).click();
    
    await page.getByPlaceholder('VD: Tìm kiếm nhị phân').fill('Bài toán Validation');
    await page.getByPlaceholder('Nhập chi tiết yêu cầu bài toán').fill('Test logic tính điểm');
    
    const maxPointsInput = page.locator('div').filter({ hasText: /^Điểm Tối Đa$/ }).locator('input[type="number"]');
    await maxPointsInput.fill('10');
    
    // Phải điền các trường required của Test Case
    const inputs = page.locator('textarea[placeholder="vd: 5 10"]');
    const outputs = page.locator('textarea[placeholder="vd: 15"]');
    await inputs.nth(0).fill('1');
    await outputs.nth(0).fill('2');
    
    const numberInputs = page.locator('input[type="number"]');
    // Cố tình điền sai tổng điểm
    await numberInputs.nth(3).fill('9.99'); // Lệch 0.01 so với 10, ngưỡng cho phép là 0.05
    
    // Lệch 0.01 vẫn hợp lệ vì ngưỡng là 0.05. Thử lệch 0.2
    await numberInputs.nth(3).fill('9.8');
    
    // Lắng nghe sự kiện alert (dialog)
    let alertMessage = '';
    page.once('dialog', dialog => {
      alertMessage = dialog.message();
      dialog.accept();
    });
    
    // Nhấn Lưu
    await page.getByRole('button', { name: 'Lưu Bài Toán Mới Vào Hệ Thống' }).click();
    
    // Xác nhận Alert hiện lên báo lỗi
    expect(alertMessage).toContain('Tổng điểm các Test Cases (9.80) phải bằng Điểm tối đa của bài toán (10)');
    
    // Form vẫn mở
    await expect(page.getByRole('button', { name: 'Lưu Bài Toán Mới Vào Hệ Thống' })).toBeVisible();
  });

  test('TC3: Cấu hình Test Case dữ liệu lớn (Big Data)', async ({ page }) => {
    await page.getByRole('button', { name: '+ Tạo Bài Toán Mới' }).click();
    
    await page.getByPlaceholder('VD: Tìm kiếm nhị phân').fill('Bài toán Big Data');
    await page.getByPlaceholder('Nhập chi tiết yêu cầu bài toán').fill('Kiểm tra khả năng chịu tải của trình duyệt khi nạp Test Case kích thước lớn');
    
    // Sinh ra chuỗi input lớn (khoảng 5MB)
    // Để test nhanh và không làm treo Playwright, ta dùng khoảng 500KB - 1MB
    const largeInput = 'A'.repeat(500000); 
    const largeOutput = 'B'.repeat(500000);
    
    const inputs = page.locator('textarea[placeholder="vd: 5 10"]');
    const outputs = page.locator('textarea[placeholder="vd: 15"]');
    
    // Playwright fill() cho chuỗi siêu dài có thể mất vài giây
    await inputs.nth(0).fill(largeInput);
    await outputs.nth(0).fill(largeOutput);
    
    // Nhấn Lưu
    await page.getByRole('button', { name: 'Lưu Bài Toán Mới Vào Hệ Thống' }).click();
    
    // Xác nhận đã lưu thành công
    await expect(page.getByRole('heading', { name: 'Danh sách Đề thi (1)' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Bài toán Big Data')).toBeVisible();
  });
});
