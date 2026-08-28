import json
import pytest
from unittest.mock import AsyncMock, patch

from app.ai.state import AgentState, SkillScores
from app.ai.agents.analyst import run_analyst
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
        "curriculum_context": "Chapter 3 covers basic differentiation.",
        "rag_context": "Found 3 relevant past questions."
    }

@pytest.mark.anyio
async def test_analyst_success(valid_state):
    """Test successful analyst execution with valid JSON from the mocked provider."""
    mock_provider = AsyncMock()
    mock_response = {
        "strengths": ["Numerical Calculation"],
        "weaknesses": ["Abstract Thinking", "Spatial Imagination"],
        "priority_skills": ["Abstract Thinking"],
        "recommended_focus": "Focus on the geometric meaning of the derivative.",
        "prerequisite_gaps": ["Functions and Graphs"],
        "learning_strategy": "Visual proofs followed by algebraic manipulation.",
        "analysis_summary": "Student excels at calculation but needs help visualizing concepts."
    }
    # Simulate the LLM returning a markdown json block
    mock_provider.generate.return_value = f"```json\n{json.dumps(mock_response)}\n```"
    
    with patch("app.ai.agents.analyst.get_llm_provider", return_value=mock_provider):
        result = await run_analyst(valid_state)
        
    assert "analyst_result" in result
    analyst_res = result["analyst_result"]
    assert analyst_res.strengths == ["Numerical Calculation"]
    assert analyst_res.recommended_focus == "Focus on the geometric meaning of the derivative."
    assert analyst_res.prerequisite_gaps == ["Functions and Graphs"]
    
    # Check that context and skills are in the prompt
    mock_provider.generate.assert_called_once()
    args, kwargs = mock_provider.generate.call_args
    prompt = kwargs.get("prompt", "")
    assert "Numerical Calculation: 0.9" in prompt
    assert "Abstract Thinking: 0.4" in prompt
    assert "Chapter 3 covers basic differentiation." in prompt
    assert "Found 3 relevant past questions." in prompt


@pytest.mark.anyio
async def test_analyst_missing_state():
    """Test that missing required state fields raise LLMConfigurationError."""
    # Missing subject, topic, etc.
    state: AgentState = {"student_id": 42} # type: ignore
    with pytest.raises(LLMConfigurationError, match="Missing required state field for Analyst: subject"):
        await run_analyst(state)


@pytest.mark.anyio
async def test_analyst_malformed_json(valid_state):
    """Test that malformed JSON from the provider raises LLMAPIError."""
    mock_provider = AsyncMock()
    mock_provider.generate.return_value = "Here is my analysis: The student needs to study more."
    
    with patch("app.ai.agents.analyst.get_llm_provider", return_value=mock_provider):
        with pytest.raises(LLMAPIError, match="Failed to parse Analyst response into structured format"):
            await run_analyst(valid_state)


@pytest.mark.anyio
async def test_analyst_provider_failure(valid_state):
    """Test that provider exceptions are propagated correctly."""
    mock_provider = AsyncMock()
    mock_provider.generate.side_effect = Exception("API down")
    
    with patch("app.ai.agents.analyst.get_llm_provider", return_value=mock_provider):
        with pytest.raises(Exception, match="API down"):
            await run_analyst(valid_state)
