from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

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

class AddCustomSkillRequest(BaseModel):
    skill_category: str
    initial_score: float = 0.0

class UpdateSkillScoreRequest(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0)

# New schemas for dynamic material assessment

class MaterialOption(BaseModel):
    id: int
    file_name: str
    subject: str
    chunk_count: int
    college: str
    semester: str

class GenerateQuestionsRequest(BaseModel):
    material_id: int
    num_questions: int = 10

class GeneratedQuestion(BaseModel):
    id: int
    question_text: str
    options: List[str]

class GeneratedQuestionsResponse(BaseModel):
    session_id: str
    material_name: str
    subject: str
    topic: str
    questions: List[GeneratedQuestion]

class DynamicAssessmentSubmitAnswer(BaseModel):
    question_id: int
    selected_option: str

class DynamicAssessmentSubmitRequest(BaseModel):
    session_id: str
    answers: List[DynamicAssessmentSubmitAnswer]

class DynamicAssessmentSubmitResponse(BaseModel):
    score_percent: float
    correct_count: int
    total_count: int
    skill_performance: Dict[str, float]
    weak_areas: List[str]
    strong_areas: List[str]
    learning_plan_id: Optional[int] = None
    learning_plan_summary: Optional[str] = None
    message: str
