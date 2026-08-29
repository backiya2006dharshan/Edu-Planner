from datetime import datetime
from pydantic import BaseModel
from app.schemas.auth import UserPublic


class TeacherStatsResponse(BaseModel):
    total_students: int
    active_plans: int
    avg_completion_rate: float
    students_needing_attention: int


class StudentProgressRead(BaseModel):
    user: UserPublic
    skills_assessed: int
    topics_completed: int
    average_score: float
    last_active: datetime


class StudentAttentionRead(BaseModel):
    name: str
    reason: str


class TeacherActivityItem(BaseModel):
    name: str
    action: str
    time: str
