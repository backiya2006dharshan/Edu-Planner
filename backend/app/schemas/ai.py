from typing import Optional, Any
from pydantic import BaseModel

class LearningPlanRequest(BaseModel):
    subject: str
    topic: str
    learning_goal: str
    semester: str
    regulation: str
    year: str
    college: str

class LearningPlanResponse(BaseModel):
    status: str
    score: int
    plan: dict[str, Any]
    evaluator_feedback: str
    issues: list[str]
    iteration_count: int
