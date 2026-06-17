from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        context = browser.new_context(permissions=['camera', 'microphone'])
        page = context.new_page()
        
        # Monitor logs
        page.on('console', lambda msg: print(f'[Student Console]: {msg.text}'))
        
        print('Going to login...')
        page.goto('http://localhost:3001/login')
        page.fill('input[type="email"]', 'student1@gmail.com')
        page.fill('input[type="password"]', '123456')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)
        
        print('Going to exam room 8002...')
        page.goto('http://localhost:3001/exam?room=8002')
        page.wait_for_timeout(3000)
        
        # Click Start Exam if waiting
        try:
            start_btn = page.locator('button:has-text("CHIA SẺ MÀN HÌNH")')
            if start_btn.is_visible():
                start_btn.click()
                print('Clicked Start Screen Share')
                page.wait_for_timeout(5000)
        except Exception as e:
            print(f'Error clicking start: {e}')
        
        print('Done. Browser closing.')
        browser.close()

if __name__ == "__main__":
    run()
