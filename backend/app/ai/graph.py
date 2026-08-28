import logging
import json
from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, START, END

from app.ai.state import AgentState
from app.ai.agents.analyst import run_analyst
from app.ai.agents.optimizer import run_optimizer
from app.ai.agents.evaluator import run_evaluator
from app.core.config import get_settings

logger = logging.getLogger(__name__)

def get_max_iterations() -> int:
    # Use 3 as a safe default if missing or very large
    max_iters = get_settings().langgraph_max_iterations
    return max_iters if max_iters and max_iters > 0 else 3


async def analyst_node(state: AgentState) -> Dict[str, Any]:
    """Node wrapper for Analyst."""
    return await run_analyst(state)


async def optimizer_node(state: AgentState) -> Dict[str, Any]:
    """Node wrapper for Optimizer."""
    # Increment iteration count here, since it runs exactly once per cycle
    iteration_count = state.get("iteration_count", 0) + 1
    update = await run_optimizer(state)
    update["iteration_count"] = iteration_count
    return update


async def evaluator_node(state: AgentState) -> Dict[str, Any]:
    """Node wrapper for Evaluator."""
    update = await run_evaluator(state)
    ev_result = update["evaluator_result"]
    optimizer_result = state.get("optimizer_result") 
    
    # Check if this is the best score so far
    current_best_score = state.get("best_evaluation_score", -1)
    if ev_result.overall_score > current_best_score and optimizer_result:
        update["best_evaluation_score"] = ev_result.overall_score
        update["best_lesson_plan"] = optimizer_result
        update["best_evaluator_result"] = ev_result
        
    return update


def route_after_evaluation(state: AgentState) -> Literal["optimizer", "finalize"]:
    """Conditional routing after evaluation."""
    ev_result = state.get("evaluator_result")
    iteration_count = state.get("iteration_count", 1)
    max_iters = get_max_iterations()
    
    if ev_result and ev_result.is_approved:
        return "finalize"
        
    if iteration_count >= max_iters:
        return "finalize"
        
    return "optimizer"


async def finalize_node(state: AgentState) -> Dict[str, Any]:
    """Node to set the final_output using the best found plan."""
    # Get the best plan found during iterations
    best_plan = state.get("best_lesson_plan")
    best_ev = state.get("best_evaluator_result")
    
    if not best_plan or not best_ev:
        return {"final_output": "Error: No valid plan generated."}
        
    final_dict = {
        "status": "APPROVED" if best_ev.is_approved else "REJECTED",
        "score": best_ev.overall_score,
        "plan": best_plan.model_dump(),
        "evaluator_feedback": best_ev.feedback,
        "issues": best_ev.issues
    }
    return {"final_output": json.dumps(final_dict)}


def build_learning_graph() -> Any: # CompiledGraph
    """Compile the LangGraph workflow."""
    workflow = StateGraph(AgentState)
    
    workflow.add_node("analyst", analyst_node)
    workflow.add_node("optimizer", optimizer_node)
    workflow.add_node("evaluator", evaluator_node)
    workflow.add_node("finalize", finalize_node)
    
    workflow.add_edge(START, "analyst")
    workflow.add_edge("analyst", "optimizer")
    workflow.add_edge("optimizer", "evaluator")
    
    workflow.add_conditional_edges(
        "evaluator",
        route_after_evaluation,
        {
            "optimizer": "optimizer",
            "finalize": "finalize"
        }
    )
    workflow.add_edge("finalize", END)
    
    return workflow.compile()
