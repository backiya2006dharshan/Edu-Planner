from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UpdateProfileRequest, UserPublic
from app.services.auth_service import (
    authenticate_user,
    create_user,
    get_current_user_from_token,
    issue_token,
    update_user_profile,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


def _to_public_user(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        phone=user.phone,
        department=user.department,
        year_of_study=user.year_of_study,
        bio=user.bio,
        college=user.college,
        regulation=user.regulation,
        semester=user.semester,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest) -> AuthResponse:
    user = await create_user(payload.email, payload.full_name, payload.password, payload.role)
    token = issue_token(user)
    return AuthResponse(access_token=token, user=_to_public_user(user))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    user = await authenticate_user(payload.email, payload.password)
    token = issue_token(user)
    return AuthResponse(access_token=token, user=_to_public_user(user))


@router.get("/me", response_model=UserPublic)
async def me(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> UserPublic:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    user = await get_current_user_from_token(credentials.credentials)
    return _to_public_user(user)


@router.patch("/profile", response_model=UserPublic)
async def update_profile(
    payload: UpdateProfileRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserPublic:
    """Update the authenticated user's profile details."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    user = await get_current_user_from_token(credentials.credentials)
    updated_user = await update_user_profile(user.id, payload)
    return _to_public_user(updated_user)
