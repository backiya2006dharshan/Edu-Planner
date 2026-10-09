import asyncio
from app.db.database import get_session_factory
from app.models.user import User
from sqlalchemy import select

async def main():
    session_factory = get_session_factory()
    with session_factory() as session:
        users = session.execute(select(User)).scalars().all()
        for u in users:
            print(f"ID: {u.id} | Email: '{u.email}' | PassHash: {u.hashed_password[:20]}... | Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(main())
