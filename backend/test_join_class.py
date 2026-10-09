import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Register a student
        res = await client.post("http://localhost:8000/api/auth/register", json={
            "email": "teststudent2@example.com",
            "full_name": "Test Student 2",
            "password": "password123",
            "role": "student"
        })
        if res.status_code == 409:
            # Login if exists
            res = await client.post("http://localhost:8000/api/auth/login", json={
                "email": "teststudent2@example.com",
                "password": "password123"
            })
        print("Auth response:", res.status_code, res.text)
        token = res.json()["access_token"]
        
        # 2. Try to join a class
        res = await client.post(
            "http://localhost:8000/api/classes/join",
            headers={"Authorization": f"Bearer {token}"},
            json={"code": "8AEA84"}
        )
        print("Join class response:", res.status_code, res.text)

if __name__ == "__main__":
    asyncio.run(main())
