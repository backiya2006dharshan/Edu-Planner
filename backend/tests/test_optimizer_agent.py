import json
import pytest
from unittest.mock import AsyncMock, patch

from app.ai.state import AgentState, SkillScores, AnalystResult
from app.ai.agents.optimizer import run_optimizer
from app.ai.exceptions import LLMConfigurationError, LLMAPIError

@pytest.fixture
def valid_state() -> AgentState:
    return {
        "student_id": 42,
        "subject": "Mathematics",
        "topic": "Calculus",
        "learning_goal": "Understand derivatives",
        "skill_scores": SkillScores(
            numerical_calculation=0.9,
            abstract_thinking=0.4,
            logical_reasoning=0.6,
            association_analogy=0.5,
            spatial_imagination=0.3
        ),
        "analyst_result": AnalystResult(
            strengths=["Numerical Calculation"],
            weaknesses=["Abstract Thinking"],
            priority_skills=["Abstract Thinking"],
            recommended_focus="Geometric interpretations",
            prerequisite_gaps=["Graph reading"],
            learning_strategy="Visual-first approach",
            analysis_summary="Student needs visual scaffolding."
        ),
        "curriculum_context": "Chapter 3 covers basic differentiation.",
        "rag_context": "Found 3 relevant past questions."
    }

@pytest.mark.anyio
async def test_optimizer_success(valid_state):
    """Test successful optimizer execution with valid JSON from the mocked provider."""
    mock_provider = AsyncMock()
    mock_response = {
        "learning_objectives": ["Understand geometric derivative"],
        "prerequisite_review": "Review reading graphs",
        "lesson_sequence": ["Intro", "Visuals", "Calculations"],
        "practice_activities": ["Graph matching", "Calculations"],
        "difficulty_progression": "Start visual, move to algebraic",
        "assessment_strategy": "Quiz on geometric meanings",
        "personalization_notes": "Leverage numerical skills at the end."
    }
    mock_provider.generate.return_value = f"```json\n{json.dumps(mock_response)}\n```"
    
    with patch("app.ai.agents.optimizer.get_llm_provider", return_value=mock_provider):
        result = await run_optimizer(valid_state)
        
    assert "optimizer_result" in result
    optimizer_res = result["optimizer_result"]
    assert optimizer_res.learning_objectives == ["Understand geometric derivative"]
    assert optimizer_res.personalization_notes == "Leverage numerical skills at the end."
    
    # Check that context, skills, and analyst results are in the prompt
    mock_provider.generate.assert_called_once()
    args, kwargs = mock_provider.generate.call_args
    prompt = kwargs.get("prompt", "")
    assert "Numerical Calculation: 0.9" in prompt
    assert "Visual-first approach" in prompt # From AnalystResult
    assert "Chapter 3 covers basic differentiation." in prompt


@pytest.mark.anyio
async def test_optimizer_missing_state():
    """Test that missing required state fields raise LLMConfigurationError."""
    # Missing analyst_result
    state: AgentState = {
        "student_id": 42,
        "subject": "Math",
        "topic": "Calc",
        "learning_goal": "Learn",
        "skill_scores": SkillScores()
    }
    with pytest.raises(LLMConfigurationError, match="Missing required state field for Optimizer: analyst_result"):
        await run_optimizer(state)


@pytest.mark.anyio
async def test_optimizer_malformed_json(valid_state):
    """Test that malformed JSON from the provider raises LLMAPIError."""
    mock_provider = AsyncMock()
    mock_provider.generate.return_value = "Here is my plan: Study hard."
    
    with patch("app.ai.agents.optimizer.get_llm_provider", return_value=mock_provider):
        with pytest.raises(LLMAPIError, match="Failed to parse Optimizer response into structured format"):
            await run_optimizer(valid_state)


@pytest.mark.anyio
async def test_optimizer_provider_failure(valid_state):
    """Test that provider exceptions are propagated correctly."""
    mock_provider = AsyncMock()
    mock_provider.generate.side_effect = Exception("API down")
    
    with patch("app.ai.agents.optimizer.get_llm_provider", return_value=mock_provider):
        with pytest.raises(Exception, match="API down"):
            await run_optimizer(valid_state)
