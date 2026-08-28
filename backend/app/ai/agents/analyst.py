import json
import logging
from typing import Dict, Any

from app.ai.state import AgentState, AnalystResult
from app.ai.providers import get_llm_provider
from app.ai.exceptions import LLMConfigurationError, LLMAPIError

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert learning-needs analyst.
Your job is to analyze a student's cognitive skill scores, learning goals, and context to produce a structured learning-needs analysis.

You MUST follow these rules:
1. Identify skill gaps strictly based on the supplied cognitive skill scores.
2. The five cognitive skill categories are: Numerical Calculation, Abstract Thinking, Logical Reasoning, Association/Analogy, and Spatial Imagination.
3. Distinguish clearly between strengths (high scores) and weaknesses (low scores).
4. Respect any provided curriculum and RAG context; do NOT invent curriculum facts.
5. Identify prerequisite knowledge gaps based on the requested topic and the student's weaknesses.
6. Recommend learning priorities and a high-level learning strategy.
7. Return ONLY valid JSON matching the exact schema below. Do not include markdown code blocks. Do not produce the final lesson plan.

JSON Schema:
{
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "priority_skills": ["string", "string"],
  "recommended_focus": "string",
  "prerequisite_gaps": ["string", "string"],
  "learning_strategy": "string",
  "analysis_summary": "string"
}
"""

async def run_analyst(state: AgentState) -> Dict[str, Any]:
    """
    Analyst Agent node for the LangGraph workflow.
    Analyzes the student's current state and generates a structured AnalystResult.
    """
    # Validate required state
    required_keys = ["student_id", "subject", "topic", "learning_goal", "skill_scores"]
    for key in required_keys:
        if key not in state:
            raise LLMConfigurationError(f"Missing required state field for Analyst: {key}")

    # Build the user prompt
    prompt_lines = [
        f"Subject: {state['subject']}",
        f"Topic: {state['topic']}",
        f"Learning Goal: {state['learning_goal']}",
        "Skill Scores:",
        f"- Numerical Calculation: {state['skill_scores'].numerical_calculation}",
        f"- Abstract Thinking: {state['skill_scores'].abstract_thinking}",
        f"- Logical Reasoning: {state['skill_scores'].logical_reasoning}",
        f"- Association/Analogy: {state['skill_scores'].association_analogy}",
        f"- Spatial Imagination: {state['skill_scores'].spatial_imagination}"
    ]

    if state.get("curriculum_context"):
        prompt_lines.append(f"\nCurriculum Context:\n{state['curriculum_context']}")
        
    if state.get("rag_context"):
        prompt_lines.append(f"\nRAG Context:\n{state['rag_context']}")

    prompt = "\n".join(prompt_lines)

    # Invoke provider
    provider = get_llm_provider("gemini")
    
    try:
        raw_response = await provider.generate(prompt=prompt, system_prompt=SYSTEM_PROMPT)
    except Exception as e:
        logger.error(f"Analyst agent provider error: {e}")
        raise

    # Parse response safely
    try:
        # Strip potential markdown formatting that LLMs sometimes hallucinate
        clean_response = raw_response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        elif clean_response.startswith("```"):
            clean_response = clean_response[3:]
            
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
            
        data = json.loads(clean_response.strip())
        
        # Validate through Pydantic
        result = AnalystResult(**data)
        
        return {"analyst_result": result}
        
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Analyst agent parsing error: {e}. Raw response: {raw_response}")
        raise LLMAPIError(f"Failed to parse Analyst response into structured format: {e}") from e
