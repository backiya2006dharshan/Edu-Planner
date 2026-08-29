from __future__ import annotations

import asyncio
from functools import lru_cache

from fastapi import HTTPException, status
from sqlalchemy import select

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.database import get_session_factory
from app.models.user import User


@lru_cache(maxsize=1)
def _get_session_factory():
    session_factory = get_session_factory()
    if session_factory is None:
        raise RuntimeError("DATABASE_URL is not configured")
    return session_factory


async def get_user_by_email(email: str) -> User | None:
    def query() -> User | None:
        session_factory = _get_session_factory()
        with session_factory() as session:
            statement = select(User).where(User.email == email.lower())
            return session.scalar(statement)

    return await asyncio.to_thread(query)


async def get_user_by_id(user_id: int) -> User | None:
    def query() -> User | None:
        session_factory = _get_session_factory()
        with session_factory() as session:
            return session.get(User, user_id)

    return await asyncio.to_thread(query)


async def create_user(email: str, full_name: str, password: str, role: str) -> User:
    existing_user = await get_user_by_email(email)
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    def insert_user() -> User:
        session_factory = _get_session_factory()
        with session_factory() as session:
            user = User(
                email=email.lower(),
                full_name=full_name.strip(),
                role=role,
                hashed_password=hash_password(password),
                is_active=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            return user

    return await asyncio.to_thread(insert_user)


async def authenticate_user(email: str, password: str) -> User:
    user = await get_user_by_email(email)
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    return user


def issue_token(user: User) -> str:
    return create_access_token(subject=str(user.id), role=user.role)


async def get_current_user_from_token(token: str) -> User:
    payload = decode_access_token(token)
    user_id = int(payload["sub"])
    user = await get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    return user


async def update_user_profile(user_id: int, payload) -> User:
    """Update mutable profile fields for a user. Only non-None fields are updated."""
    def _update() -> User:
        session_factory = _get_session_factory()
        with session_factory() as session:
            user = session.get(User, user_id)
            if user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            update_data = payload.model_dump(exclude_none=True)
            for field, value in update_data.items():
                if hasattr(user, field):
                    setattr(user, field, value)

            session.commit()
            session.refresh(user)
            return user

    return await asyncio.to_thread(_update)

