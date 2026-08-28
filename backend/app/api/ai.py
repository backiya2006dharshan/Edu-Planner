import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.database import get_session_factory
from app.models.user import User
from app.models.assessment import StudentSkill
from app.models.curriculum import Subject, Topic, LearningObjective
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.dependencies.auth import require_role
from app.schemas.ai import LearningPlanRequest, LearningPlanResponse
from app.ai.state import AgentState, SkillScores
from app.ai.graph import build_learning_graph
from app.ai.exceptions import LLMConfigurationError, LLMAPIError
from app.services.material_indexing import search_chunks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session

@router.post("/learning-plan", response_model=LearningPlanResponse)
async def generate_learning_plan(
    request: LearningPlanRequest,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Generate a personalized learning plan using the multi-agent workflow.
    """
    # 1. Load skill scores for the current user
    skills = db.execute(select(StudentSkill).where(StudentSkill.user_id == current_user.id)).scalars().all()
    
    # Map DB records to the AI SkillScores object
    skill_kwargs = {}
    for skill in skills:
        category_normalized = skill.skill_category.lower().replace(" ", "_").replace("/", "_")
        if category_normalized in SkillScores.model_fields:
            skill_kwargs[category_normalized] = skill.score
            
    ai_skills = SkillScores(**skill_kwargs)
    
    # 2. Build Curriculum Context
    curriculum_parts = []
    subject_model = db.execute(
        select(Subject).where(Subject.name.ilike(f"%{request.subject}%"))
    ).scalars().first()
    
    if subject_model:
        curriculum_parts.append(f"Subject: {subject_model.name}")
        if subject_model.description:
            curriculum_parts.append(f"Description: {subject_model.description}")
            
    topic_model = db.execute(
        select(Topic).where(Topic.name.ilike(f"%{request.topic}%"))
    ).scalars().first()
    
    if topic_model:
        curriculum_parts.append(f"Topic: {topic_model.name}")
        if topic_model.description:
            curriculum_parts.append(f"Topic Description: {topic_model.description}")
            
        objectives = db.execute(
            select(LearningObjective).where(LearningObjective.topic_id == topic_model.id)
        ).scalars().all()
        if objectives:
            obj_list = "\n".join(f"- {obj.name}" for obj in objectives)
            curriculum_parts.append(f"Learning Objectives:\n{obj_list}")
            
    curriculum_context_str = "\n\n".join(curriculum_parts)

    # 3. Build RAG Context
    rag_parts = []
    search_query = f"{request.subject} {request.topic} {request.learning_goal}"
    
    try:
        results = search_chunks(
            query=search_query,
            college=request.college,
            semester=request.semester,
            regulation=request.regulation,
            limit=5
        )
        
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        
        for doc, meta in zip(documents, metadatas):
            page_info = f" (Page {meta.get('page_number', '?')})" if meta and meta.get("page_number") else ""
            rag_parts.append(f"--- Chunk{page_info} ---\n{doc}")
            
    except Exception as e:
        logger.warning(f"RAG Retrieval failed: {e}")
        
    rag_context_str = "\n\n".join(rag_parts)
    
    # 4. Build initial state
    initial_state: AgentState = {
        "student_id": current_user.id,
        "subject": request.subject,
        "topic": request.topic,
        "learning_goal": request.learning_goal,
        "skill_scores": ai_skills,
    }
    
    if curriculum_context_str:
        initial_state["curriculum_context"] = curriculum_context_str
    if rag_context_str:
        initial_state["rag_context"] = rag_context_str
        
    # 5. Execute Graph
    graph = build_learning_graph()
    
    try:
        final_state = await graph.ainvoke(initial_state)
    except LLMConfigurationError as e:
        logger.error(f"LLM Configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI Provider configuration error. Please check backend settings."
        )
    except LLMAPIError as e:
        logger.error(f"LLM API error: {e}")
        error_msg = str(e)
        detail = "AI Provider error."
        
        # Make error safe for frontend while being useful
        if "API Error 401" in error_msg or "API Error 403" in error_msg or "API_KEY_INVALID" in error_msg:
            detail = "AI Provider authentication failed. Please check the API key."
        elif "API Error 404" in error_msg or "not found" in error_msg:
            detail = "AI model not found or unavailable. Please check the configured model."
        elif "API Error 429" in error_msg or "quota" in error_msg.lower():
            detail = "AI Provider rate limit exceeded. Please try again later."
        elif "timeout" in error_msg.lower():
            detail = "AI Provider request timed out. Please try again."
        else:
            detail = "AI Provider encountered an error. Please try again."
            
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail
        )
    except Exception as e:
        logger.exception("Unexpected error in AI workflow")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during the AI workflow."
        )
        
    # 4. Parse output
    if "final_output" not in final_state:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Workflow completed without generating a final output."
        )
        
    try:
        final_data = json.loads(final_state["final_output"])
    except json.JSONDecodeError:
        logger.error("Failed to parse final_output JSON from graph.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Workflow produced invalid final output format."
        )

    # Database Persistence (Transaction)
    try:
        # Create Learning Plan
        db_plan = LearningPlan(
            user_id=current_user.id,
            subject=request.subject,
            topic=request.topic,
            learning_goal=request.learning_goal,
            status="active"
        )
        db.add(db_plan)
        db.flush() # get ID

        plan_content = final_data.get("plan", {})
        lesson_seq = plan_content.get("lesson_sequence", [])
        practices = plan_content.get("practice_activities", [])

        # Deterministic Mapping:
        # 1. Map each lesson_sequence item to a LearningModule containing 1 LearningTask (lesson).
        module_order = 0
        for lesson in lesson_seq:
            db_mod = LearningModule(
                learning_plan_id=db_plan.id,
                title=lesson[:250],
                order_index=module_order,
                status="pending"
            )
            db.add(db_mod)
            db.flush()
            
            db_task = LearningTask(
                module_id=db_mod.id,
                title=f"Study: {lesson[:200]}",
                task_type="lesson",
                order_index=0
            )
            db.add(db_task)
            module_order += 1

        # 2. Map all practice_activities to a final 'Practice & Assessment' Module
        if practices:
            prac_mod = LearningModule(
                learning_plan_id=db_plan.id,
                title="Practice & Assessment",
                order_index=module_order,
                status="pending"
            )
            db.add(prac_mod)
            db.flush()
            
            for i, prac in enumerate(practices):
                db_prac_task = LearningTask(
                    module_id=prac_mod.id,
                    title=prac[:250],
                    task_type="practice",
                    order_index=i
                )
                db.add(db_prac_task)
        
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to persist learning plan to database: {e}")
        # We can either fail the request or still return the plan. 
        # Requirement: "If: LearningPlan creation succeeds but module creation fails... the database transaction should roll back. Do not leave partially-created learning plans."
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist learning plan to the database."
        )

    return LearningPlanResponse(
        status=final_data.get("status", "ERROR"),
        score=final_data.get("score", 0),
        plan=final_data.get("plan", {}),
        evaluator_feedback=final_data.get("evaluator_feedback", ""),
        issues=final_data.get("issues", []),
        iteration_count=final_state.get("iteration_count", 0)
    )
