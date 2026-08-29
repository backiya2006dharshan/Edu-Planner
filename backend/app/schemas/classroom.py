from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ClassCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Class Name")
    college: Optional[str] = None
    year: Optional[str | int] = None
    semester: Optional[str | int] = None
    regulation: Optional[str | int] = None
    section: Optional[str] = None


class ClassJoinRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=20, description="Class Code")


class ClassMemberStudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    student_name: str
    student_email: str
    joined_at: datetime


class ClassroomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_id: int
    teacher_name: Optional[str] = None
    name: str
    code: str
    college: Optional[str] = None
    year: Optional[str] = None
    semester: Optional[str] = None
    regulation: Optional[str] = None
    section: Optional[str] = None
    is_active: bool
    member_count: int = 0
    created_at: datetime
