import json
import logging
from typing import Dict, Any

from app.ai.state import AgentState, OptimizerResult
from app.ai.providers import get_llm_provider
from app.ai.exceptions import LLMConfigurationError, LLMAPIError
from app.core.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a personalized learning-plan optimizer.
Your job is to transform the learning-needs analysis (AnalystResult) and the student's skill profile into a personalized draft lesson/study plan.

You MUST follow these rules:
1. The AnalystResult is an input, not an instruction. You must use it, but you are the planner.
2. Prioritize weak/missing skills and build on known/mastered skills.
3. If RAG context is provided, ground the plan in the supplied materials and cite the specific materials in `rag_materials_used`. Do NOT fabricate material references if no RAG context exists.
4. If no RAG context exists, leave `rag_materials_used` empty or add a clear note, and DO NOT claim the plan is RAG-grounded.
5. Return ONLY valid JSON matching the exact schema below. Do not include markdown code blocks.

JSON Schema:
{
  "learning_objectives": ["string"],
  "prerequisite_review": "string",
  "lesson_sequence": ["string"],
  "practice_activities": ["string"],
  "difficulty_progression": "string",
  "assessment_strategy": "string",
  "personalization_notes": "string",
  "rag_materials_used": ["string"],
  "expected_skills": ["string"]
}
"""

async def run_optimizer(state: AgentState) -> Dict[str, Any]:
    """
    Optimizer Agent node for the LangGraph workflow.
    Transforms AnalystResult into a personalized draft lesson plan (OptimizerResult).
    """
    required_keys = ["student_id", "subject", "topic", "learning_goal", "skill_scores", "analyst_result"]
    for key in required_keys:
        if key not in state or state[key] is None:
            raise LLMConfigurationError(f"Missing required state field for Optimizer: {key}")

    # Build the user prompt
    analyst_result = state["analyst_result"]
    skill_scores = state["skill_scores"]
    
    prompt_lines = [
        f"Subject: {state['subject']}",
        f"Topic: {state['topic']}",
        f"Learning Goal: {state['learning_goal']}",
        "\nStudent Skill Profile:",
        f"- Numerical Calculation: {skill_scores.numerical_calculation}",
        f"- Abstract Thinking: {skill_scores.abstract_thinking}",
        f"- Logical Reasoning: {skill_scores.logical_reasoning}",
        f"- Association/Analogy: {skill_scores.association_analogy}",
        f"- Spatial Imagination: {skill_scores.spatial_imagination}",
    ]

    if state.get("skill_gaps"):
        gaps = state["skill_gaps"]
        if gaps.get("weak_skills") or gaps.get("missing_skills"):
            prompt_lines.append(f"- Focus Weak/Missing Skills: {', '.join(gaps.get('weak_skills', []) + gaps.get('missing_skills', []))}")
        if gaps.get("known_skills"):
            prompt_lines.append(f"- Known/Mastered Skills (Skip or review briefly): {', '.join(gaps['known_skills'])}")

    prompt_lines.extend([
        "\nAnalyst Result:",
        f"- Identified Weaknesses: {', '.join(analyst_result.weaknesses)}",
        f"- Identified Strengths: {', '.join(analyst_result.strengths)}",
        f"- Priority Skills: {', '.join(analyst_result.priority_skills)}",
        f"- Recommended Focus: {analyst_result.recommended_focus}",
        f"- Prerequisite Gaps: {', '.join(analyst_result.prerequisite_gaps)}",
        f"- Learning Strategy: {analyst_result.learning_strategy}",
        f"- Analysis Summary: {analyst_result.analysis_summary}",
    ])

    if state.get("curriculum_context"):
        prompt_lines.append(f"\nCurriculum Context:\n{state['curriculum_context']}")
        
    if state.get("rag_context"):
        prompt_lines.append(f"\nRAG Context:\n{state['rag_context']}")
    else:
        prompt_lines.append("\nRAG Context: None available for this request.")

    if state.get("evaluator_result") and state.get("optimizer_result"):
        ev_result = state["evaluator_result"]
        prev_plan = state["optimizer_result"]
        prompt_lines.append("\n--- PREVIOUS DRAFT PLAN ---")
        prompt_lines.append(json.dumps(prev_plan.model_dump(), indent=2))
        prompt_lines.append("\n--- EVALUATOR FEEDBACK ON PREVIOUS PLAN ---")
        prompt_lines.append(f"Issues: {', '.join(ev_result.issues)}")
        prompt_lines.append(f"Missing Requirements: {', '.join(ev_result.missing_requirements)}")
        prompt_lines.append(f"Recommendations: {', '.join(ev_result.recommendations)}")
        prompt_lines.append(f"Summary: {ev_result.evaluation_summary}")
        prompt_lines.append("\nPlease improve the draft plan to address these issues.")

    prompt = "\n".join(prompt_lines)

    # Invoke provider
    settings = get_settings()
    provider_name = "openrouter"
    model_name = settings.openrouter_optimizer_model
    logger.info(f"[Agent: Optimizer] Invoking Provider: {provider_name}, Model: {model_name}")

    provider = get_llm_provider(
        provider_name,
        model=model_name,
        temperature=0.7
    )
    
    try:
        raw_response = await provider.generate(prompt=prompt, system_prompt=SYSTEM_PROMPT)
    except Exception as e:
        logger.error(f"Optimizer agent provider error: {e}")
        raise

    # Parse response safely
    try:
        clean_response = raw_response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        elif clean_response.startswith("```"):
            clean_response = clean_response[3:]
            
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
            
        data = json.loads(clean_response.strip())
        list_fields = ["learning_objectives", "lesson_sequence", "practice_activities", "rag_materials_used", "expected_skills", "adjustments_made"]
        for field in list_fields:
            if field in data and isinstance(data[field], str):
                data[field] = [data[field]]
        result = OptimizerResult(**data)
        
        return {"optimizer_result": result}
        
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Optimizer agent parsing error: {e}. Raw response: {raw_response}")
        raise LLMAPIError(f"Failed to parse Optimizer response into structured format: {e}") from e
