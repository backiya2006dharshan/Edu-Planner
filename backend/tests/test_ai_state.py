import pytest
from app.ai.state import (
    AgentState,
    SkillScores,
    AnalystResult,
    OptimizerResult,
    EvaluatorResult,
    add_errors
)

def test_state_creation_initial_data():
    """Test that state can be created with only the required initial data."""
    skills = SkillScores(
        numerical_calculation=0.8,
        logical_reasoning=0.9
    )
    
    # Optional/NotRequired fields can be omitted
    state: AgentState = {
        "student_id": 101,
        "subject": "Math",
        "topic": "Algebra",
        "learning_goal": "Master linear equations",
        "skill_scores": skills
    }
    
    assert state["student_id"] == 101
    assert state["subject"] == "Math"
    assert state["learning_goal"] == "Master linear equations"
    
    # Verify skill scores
    assert state["skill_scores"].numerical_calculation == 0.8
    assert state["skill_scores"].logical_reasoning == 0.9
    # Check default was set
    assert state["skill_scores"].abstract_thinking == 0.0

def test_state_progressive_population():
    """Test that state can be progressively populated as agents run."""
    state: AgentState = {
        "student_id": 1,
        "subject": "Physics",
        "topic": "Kinematics",
        "learning_goal": "Understand velocity",
        "skill_scores": SkillScores()
    }
    
    # Simulate Analyst running
    state["analyst_result"] = AnalystResult(
        strengths=["Basic math"],
        weaknesses=["Graph reading"],
        recommended_focus="Focus on position-time graphs"
    )
    
    # Simulate Optimizer running
    state["optimizer_result"] = OptimizerResult(
        adjustments_made=["Added more graph exercises"],
        optimization_rationale="Address weakness"
    )
    
    # Simulate Evaluator running
    state["evaluator_result"] = EvaluatorResult(
        is_approved=True,
        feedback="Looks good"
    )
    
    state["iteration_count"] = 1
    state["final_output"] = "Complete Lesson Plan"
    
    assert state["analyst_result"].strengths == ["Basic math"]
    assert state["optimizer_result"].adjustments_made == ["Added more graph exercises"]
    assert state["evaluator_result"].is_approved is True
    assert state["iteration_count"] == 1
    assert state["final_output"] == "Complete Lesson Plan"

def test_error_reducer():
    """Test the add_errors reducer logic."""
    assert add_errors(None, ["Error 1"]) == ["Error 1"]
    assert add_errors(["Error 1"], ["Error 2"]) == ["Error 1", "Error 2"]
    assert add_errors(["Error 1"], None) == ["Error 1"]

def test_no_secrets_in_state():
    """Verify state structure does not contain obvious secret fields."""
    state_annotations = AgentState.__annotations__
    forbidden_keys = ["api_key", "password", "token", "secret", "jwt"]
    
    for key in state_annotations.keys():
        for forbidden in forbidden_keys:
            assert forbidden not in key.lower(), f"Forbidden key '{forbidden}' found in state"
