from typing import TypedDict, Optional, NotRequired, Annotated
import operator
from pydantic import BaseModel, Field

class SkillScores(BaseModel):
    """Runtime representation of a student's current skill mastery levels."""
    numerical_calculation: float = 0.0
    abstract_thinking: float = 0.0
    logical_reasoning: float = 0.0
    association_analogy: float = 0.0
    spatial_imagination: float = 0.0


class AnalystResult(BaseModel):
    """Structured output from the Analyst agent."""
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    priority_skills: list[str] = Field(default_factory=list)
    recommended_focus: str = ""
    prerequisite_gaps: list[str] = Field(default_factory=list)
    learning_strategy: str = ""
    analysis_summary: str = ""


class OptimizerResult(BaseModel):
    """Structured output from the Optimizer agent."""
    adjustments_made: list[str] = Field(default_factory=list)
    optimization_rationale: str = ""
    learning_objectives: list[str] = Field(default_factory=list)
    prerequisite_review: str = ""
    lesson_sequence: list[str] = Field(default_factory=list)
    practice_activities: list[str] = Field(default_factory=list)
    difficulty_progression: str = ""
    assessment_strategy: str = ""
    personalization_notes: str = ""


class EvaluatorResult(BaseModel):
    """Structured output from the Evaluator agent."""
    is_approved: bool = False
    feedback: str = ""
    overall_score: int = 0
    strengths: list[str] = Field(default_factory=list)
    issues: list[str] = Field(default_factory=list)
    missing_requirements: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    evaluation_summary: str = ""


def add_errors(existing: list[str], new: list[str]) -> list[str]:
    """Reducer to append new errors to the state."""
    if existing is None:
        existing = []
    if new is None:
        new = []
    return existing + new


class AgentState(TypedDict):
    """
    LangGraph typed state for the multi-agent EduPlanner workflow.
    
    Uses NotRequired and Optional for fields that are populated 
    progressively during the graph execution.
    """
    # Core identity and goal context
    student_id: int
    subject: str
    topic: str
    learning_goal: str
    
    # Skill assessment context
    skill_scores: SkillScores
    
    # External retrieved context
    curriculum_context: NotRequired[Optional[str]]
    rag_context: NotRequired[Optional[str]]
    
    # Agent Results (Populated progressively)
    analyst_result: NotRequired[Optional[AnalystResult]]
    optimizer_result: NotRequired[Optional[OptimizerResult]]
    evaluator_result: NotRequired[Optional[EvaluatorResult]]
    
    # Artifacts / Output
    draft_lesson_plan: NotRequired[Optional[str]]
    optimized_lesson_plan: NotRequired[Optional[str]]
    final_output: NotRequired[Optional[str]]
    
    # Workflow Control
    iteration_count: NotRequired[int]
    
    # Best-plan tracking
    best_evaluation_score: NotRequired[int]
    best_lesson_plan: NotRequired[Optional[OptimizerResult]]
    best_evaluator_result: NotRequired[Optional[EvaluatorResult]]
    
    # Errors (using a reducer to accumulate errors rather than overwrite)
    errors: NotRequired[Annotated[list[str], add_errors]]
