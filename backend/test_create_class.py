import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Register a teacher
        res = await client.post("http://localhost:8000/api/auth/register", json={
            "email": "testteacher@example.com",
            "full_name": "Test Teacher",
            "password": "password123",
            "role": "teacher"
        })
        if res.status_code == 409:
            # Login if exists
            res = await client.post("http://localhost:8000/api/auth/login", json={
                "email": "testteacher@example.com",
                "password": "password123"
            })
        print("Auth response:", res.status_code, res.text)
        token = res.json()["access_token"]
        
        # 2. Try to create a class
        res = await client.post(
            "http://localhost:8000/api/classes",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Testing 1",
                "college": "kongu engineering college",
                "year": "4",
                "semester": "7",
                "regulation": "2022",
                "section": "A"
            }
        )
        print("Create class response:", res.status_code, res.text)

if __name__ == "__main__":
    asyncio.run(main())
