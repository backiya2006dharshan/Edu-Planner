from datetime import datetime
from pydantic import BaseModel


class MilestoneItem(BaseModel):
    id: str
    title: str
    description: str
    timestamp: datetime
    type: str  # 'assessment', 'plan_created', 'plan_completed', 'skill_mastered'


class StudentProgressSummary(BaseModel):
    streak_days: int
    plans_completed: int
    skills_mastered: int
    total_tasks: int
    completed_tasks: int
    materials_count: int
    average_skill_score: float
    recent_milestones: list[MilestoneItem]
