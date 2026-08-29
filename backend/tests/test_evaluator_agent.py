import json
import pytest
from unittest.mock import AsyncMock, patch

from app.ai.state import AgentState, SkillScores, AnalystResult, OptimizerResult
from app.ai.agents.evaluator import run_evaluator, EVALUATOR_APPROVAL_THRESHOLD
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
        "optimizer_result": OptimizerResult(
            learning_objectives=["Understand geometric derivative"],
            prerequisite_review="Review reading graphs",
            lesson_sequence=["Intro", "Visuals", "Calculations"],
            practice_activities=["Graph matching", "Calculations"],
            difficulty_progression="Start visual, move to algebraic",
            assessment_strategy="Quiz on geometric meanings",
            personalization_notes="Leverage numerical skills at the end.",
            adjustments_made=["Added visual aids"]
        ),
        "curriculum_context": "Chapter 3 covers basic differentiation.",
        "rag_context": "Found 3 relevant past questions."
    }

@pytest.mark.anyio
async def test_evaluator_success_approval(valid_state):
    """Test evaluator returns approved when score >= threshold."""
    mock_provider = AsyncMock()
    # 9/9 criteria passed -> 100%
    mock_response = {
        "skill_alignment": True,
        "prerequisite_coverage": True,
        "goal_alignment": True,
        "topic_alignment": True,
        "curriculum_alignment": True,
        "rag_grounding": True,
        "difficulty_appropriateness": True,
        "actionability": True,
        "coherence": True,
        "strengths": ["Matches all criteria"],
        "issues": [],
        "missing_requirements": [],
        "recommendations": [],
        "evaluation_summary": "Perfect plan."
    }
    mock_provider.generate.return_value = f"```json\n{json.dumps(mock_response)}\n```"
    
    with patch("app.ai.agents.evaluator.get_llm_provider", return_value=mock_provider) as mock_get_provider:
        result = await run_evaluator(valid_state)
        
    mock_get_provider.assert_called_once()
    
    assert "evaluator_result" in result
    evaluator_res = result["evaluator_result"]
    assert evaluator_res.overall_score == 100
    assert evaluator_res.is_approved is True
    assert "Approved" in evaluator_res.feedback
    
    # Check prompt contains optimizer dump
    args, kwargs = mock_provider.generate.call_args
    prompt = kwargs.get("prompt", "")
    assert "Understand geometric derivative" in prompt


@pytest.mark.anyio
async def test_evaluator_success_rejection(valid_state):
    """Test evaluator returns not approved when score < threshold."""
    mock_provider = AsyncMock()
    # 4/9 criteria passed -> 44% < 80%
    mock_response = {
        "skill_alignment": False,
        "prerequisite_coverage": False,
        "goal_alignment": False,
        "topic_alignment": False,
        "curriculum_alignment": False,
        "rag_grounding": True,
        "difficulty_appropriateness": True,
        "actionability": True,
        "coherence": True,
        "strengths": ["Actionable"],
        "issues": ["Misses the goal"],
        "missing_requirements": ["Goal alignment"],
        "recommendations": ["Fix the goal"],
        "evaluation_summary": "Plan is off track."
    }
    mock_provider.generate.return_value = json.dumps(mock_response)
    
    with patch("app.ai.agents.evaluator.get_llm_provider", return_value=mock_provider):
        result = await run_evaluator(valid_state)
        
    evaluator_res = result["evaluator_result"]
    assert evaluator_res.overall_score == 44
    assert evaluator_res.is_approved is False
    assert "Needs revision" in evaluator_res.feedback


@pytest.mark.anyio
async def test_evaluator_missing_state(valid_state):
    """Test that missing required state fields raise LLMConfigurationError."""
    # Missing optimizer_result
    del valid_state["optimizer_result"]
    
    with pytest.raises(LLMConfigurationError, match="Missing required state field for Evaluator: optimizer_result"):
        await run_evaluator(valid_state)


@pytest.mark.anyio
async def test_evaluator_malformed_json(valid_state):
    """Test that malformed JSON from the provider raises LLMAPIError."""
    mock_provider = AsyncMock()
    mock_provider.generate.return_value = "I evaluate this as good."
    
    with patch("app.ai.agents.evaluator.get_llm_provider", return_value=mock_provider):
        with pytest.raises(LLMAPIError, match="Failed to parse Evaluator response into structured format"):
            await run_evaluator(valid_state)


@pytest.mark.anyio
async def test_evaluator_provider_failure(valid_state):
    """Test that provider exceptions are propagated correctly."""
    mock_provider = AsyncMock()
    mock_provider.generate.side_effect = Exception("OpenRouter down")
    
    with patch("app.ai.agents.evaluator.get_llm_provider", return_value=mock_provider):
        with pytest.raises(Exception, match="OpenRouter down"):
            await run_evaluator(valid_state)
