from typing import Literal, Optional

from pydantic import BaseModel, Field

EMAIL_PATTERN = r"^[^\@\s]+@[^\@\s]+\.[^\@\s]+$"


class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_PATTERN)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["student", "teacher"]


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_PATTERN)
    password: str


class UserPublic(BaseModel):
    id: int
    email: str
    full_name: str
    role: Literal["student", "teacher"]
    is_active: bool
    phone: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    regulation: Optional[str] = None
    semester: Optional[str] = None

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    """Fields a user may update on their own profile."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    department: Optional[str] = Field(None, max_length=100)
    year_of_study: Optional[str] = Field(None, max_length=20)
    bio: Optional[str] = Field(None, max_length=1000)
    college: Optional[str] = Field(None, max_length=255)
    regulation: Optional[str] = Field(None, max_length=50)
    semester: Optional[str] = Field(None, max_length=20)


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserPublic
