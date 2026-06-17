import httpx
import asyncio

async def test_login():
    async with httpx.AsyncClient() as client:
        email = "test_test_12345@example.com"
        print("Registering...")
        reg_res = await client.post("http://localhost:8000/api/auth/register", json={
            "username": "test_test_12345",
            "password": "password123",
            "email": email,
            "full_name": "Test Instructor",
            "role": "instructor"
        })
        print("Register:", reg_res.status_code, reg_res.text)

        print("Logging in...")
        login_res = await client.post("http://localhost:8000/api/auth/login", data={
            "username": email,
            "password": "password123"
        })
        print("Login:", login_res.status_code, login_res.text)

asyncio.run(test_login())
