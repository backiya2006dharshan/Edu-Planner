import json
import pytest
from unittest.mock import AsyncMock, patch

from app.ai.state import AgentState, SkillScores, AnalystResult, OptimizerResult, EvaluatorResult
from app.ai.graph import build_learning_graph

@pytest.fixture
def initial_state() -> AgentState:
    return {
        "student_id": 42,
        "subject": "Mathematics",
        "topic": "Calculus",
        "learning_goal": "Understand derivatives",
        "skill_scores": SkillScores()
    }

def get_dummy_analyst_result():
    return AnalystResult(strengths=["numbers"])

def get_dummy_optimizer_result(iteration=1):
    return OptimizerResult(learning_objectives=[f"Objective {iteration}"])

def get_dummy_evaluator_result(approved=False, score=50):
    return EvaluatorResult(is_approved=approved, overall_score=score, feedback="Test")


def test_graph_compiles():
    """Verify the graph compiles successfully."""
    graph = build_learning_graph()
    assert graph is not None


@pytest.mark.anyio
async def test_graph_approval_path(initial_state):
    """Test successful 1-iteration path where evaluator approves."""
    graph = build_learning_graph()
    
    with patch("app.ai.graph.run_analyst", new_callable=AsyncMock) as mock_analyst, \
         patch("app.ai.graph.run_optimizer", new_callable=AsyncMock) as mock_optimizer, \
         patch("app.ai.graph.run_evaluator", new_callable=AsyncMock) as mock_evaluator:
         
        mock_analyst.return_value = {"analyst_result": get_dummy_analyst_result()}
        mock_optimizer.return_value = {"optimizer_result": get_dummy_optimizer_result()}
        mock_evaluator.return_value = {"evaluator_result": get_dummy_evaluator_result(approved=True, score=90)}
        
        final_state = await graph.ainvoke(initial_state)
        
        # Analyst should run exactly once
        mock_analyst.assert_called_once()
        # Optimizer and Evaluator exactly once because it was approved
        mock_optimizer.assert_called_once()
        mock_evaluator.assert_called_once()
        
        assert final_state["iteration_count"] == 1
        assert "final_output" in final_state
        final_data = json.loads(final_state["final_output"])
        assert final_data["status"] == "APPROVED"
        assert final_data["score"] == 90


@pytest.mark.anyio
async def test_graph_max_iterations(initial_state):
    """Test workflow hits iteration limits and preserves the best plan."""
    graph = build_learning_graph()
    
    with patch("app.ai.graph.run_analyst", new_callable=AsyncMock) as mock_analyst, \
         patch("app.ai.graph.run_optimizer", new_callable=AsyncMock) as mock_optimizer, \
         patch("app.ai.graph.run_evaluator", new_callable=AsyncMock) as mock_evaluator, \
         patch("app.ai.graph.get_max_iterations", return_value=2):
         
        mock_analyst.return_value = {"analyst_result": get_dummy_analyst_result()}
        
        # Optimizer provides different result per call
        mock_optimizer.side_effect = [
            {"optimizer_result": get_dummy_optimizer_result(1)},
            {"optimizer_result": get_dummy_optimizer_result(2)}
        ]
        
        # Evaluator always rejects but returns different scores.
        # Iteration 1 score: 60 (Best)
        # Iteration 2 score: 40 (Worse)
        mock_evaluator.side_effect = [
            {"evaluator_result": get_dummy_evaluator_result(approved=False, score=60)},
            {"evaluator_result": get_dummy_evaluator_result(approved=False, score=40)}
        ]
        
        final_state = await graph.ainvoke(initial_state)
        
        # Analyst exactly once (does not loop)
        mock_analyst.assert_called_once()
        
        # Optimizer and Evaluator called twice (max_iterations)
        assert mock_optimizer.call_count == 2
        assert mock_evaluator.call_count == 2
        
        assert final_state["iteration_count"] == 2
        assert final_state["best_evaluation_score"] == 60 # Preserved best score
        
        # Check final output
        final_data = json.loads(final_state["final_output"])
        assert final_data["status"] == "REJECTED"
        assert final_data["score"] == 60
        assert final_data["plan"]["learning_objectives"] == ["Objective 1"] # Preserved best plan
