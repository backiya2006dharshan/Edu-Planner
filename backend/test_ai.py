import asyncio
import httpx
import json

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Login student
        res = await client.post("http://localhost:8000/api/auth/login", json={
            "email": "teststudent2@example.com",
            "password": "password123"
        })
        token = res.json()["access_token"]
        
        # 2. Generate plan
        res = await client.post(
            "http://localhost:8000/api/ai/learning-plan",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "subject": "Testing 3",
                "topic": "Unit 1: Introduction to Testing 3: Core Foundations",
                "learning_goal": "RAG",
                "semester": "7",
                "regulation": "2022",
                "year": "4",
                "college": "kongu engineering college"
            },
            timeout=120.0
        )
        print(f"Status: {res.status_code}")
        try:
            print(json.dumps(res.json(), indent=2))
        except:
            print(res.text)

if __name__ == "__main__":
    asyncio.run(main())
