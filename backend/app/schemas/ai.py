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
    skill_gaps: Optional[dict[str, Any]] = None
    rag_retrieval_status: Optional[str] = None
    rag_chunks_retrieved: Optional[int] = 0
