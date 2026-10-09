import asyncio
from app.services.auth_service import create_user, authenticate_user
from app.db.database import get_session_factory
from app.models.user import User

async def main():
    email = "testlogin@example.com"
    password = "password123"
    
    # create user
    print("Creating user...")
    try:
        user = await create_user(email, "Test User", password, "student")
        print(f"Created user {user.id}")
    except Exception as e:
        print(f"Failed to create: {e}")
        
    # attempt login
    print("Attempting login...")
    try:
        user = await authenticate_user(email, password)
        print("Login successful!")
    except Exception as e:
        print(f"Login failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
