from datetime import datetime
from pydantic import BaseModel


class DiagnosticQuestionPublic(BaseModel):
    id: int
    text: str
    options: list[str]
    skill_category: str
    difficulty: str

    class Config:
        from_attributes = True


class AssessmentStartResponse(BaseModel):
    assessment_id: int


class AssessmentSubmitAnswer(BaseModel):
    question_id: int
    selected_answer: str


class AssessmentSubmitRequest(BaseModel):
    answers: list[AssessmentSubmitAnswer]


class SkillScore(BaseModel):
    skill_category: str
    score: float
    last_updated: datetime

    class Config:
        from_attributes = True
