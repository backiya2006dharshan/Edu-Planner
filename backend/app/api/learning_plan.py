import logging
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.db.database import get_session_factory
from app.ai.providers import get_llm_provider
from app.core.config import get_settings
from app.models.user import User
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.dependencies.auth import require_role
from app.schemas.learning_plan import (
    LearningPlanResponse,
    LearningTaskResponse,
    VerificationQuestion,
    VerificationSubmitRequest,
    VerificationResultResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learning-plans", tags=["learning-plans"])

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session


@router.get("", response_model=List[LearningPlanResponse])
async def list_learning_plans(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    List all learning plans for the authenticated student.
    """
    plans = db.execute(
        select(LearningPlan)
        .where(LearningPlan.user_id == current_user.id)
        .order_by(LearningPlan.created_at.desc())
    ).scalars().unique().all()
    
    return plans


@router.get("/active", response_model=Optional[LearningPlanResponse])
async def get_active_learning_plan(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Get the student's currently active learning plan, or null if none exists.
    """
    plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.user_id == current_user.id)
        .where(LearningPlan.status == "active")
        .order_by(LearningPlan.created_at.desc())
    ).scalars().unique().first()
    
    if not plan:
        # Fallback to the most recent learning plan created by this student
        plan = db.execute(
            select(LearningPlan)
            .where(LearningPlan.user_id == current_user.id)
            .order_by(LearningPlan.created_at.desc())
        ).scalars().unique().first()

    return plan


@router.get("/{plan_id}", response_model=LearningPlanResponse)
async def get_learning_plan(
    plan_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Get a specific learning plan by ID. 
    Must belong to the authenticated user.
    """
    plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.id == plan_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().unique().first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning plan not found or not authorized."
        )
        
    return plan


@router.patch("/tasks/{task_id}/start", response_model=LearningTaskResponse)
async def start_task(
    task_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Mark a learning task as in_progress.
    """
    task = db.execute(
        select(LearningTask)
        .join(LearningModule, LearningTask.module_id == LearningModule.id)
        .join(LearningPlan, LearningModule.learning_plan_id == LearningPlan.id)
        .where(LearningTask.id == task_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or not authorized."
        )
        
    task.status = "in_progress"
    db.commit()
    db.refresh(task)
    
    return task


@router.patch("/tasks/{task_id}/complete", response_model=LearningTaskResponse)
async def complete_task(
    task_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Mark a learning task as completed.
    Validates that the task belongs to the authenticated user's plan.
    """
    task = db.execute(
        select(LearningTask)
        .join(LearningModule, LearningTask.module_id == LearningModule.id)
        .join(LearningPlan, LearningModule.learning_plan_id == LearningPlan.id)
        .where(LearningTask.id == task_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or not authorized."
        )
        
    task.is_completed = True
    task.status = "completed"
    db.commit()
    db.refresh(task)
    
    return task


# Store generated verification tests in-memory per plan for verification evaluation
_VERIFICATION_TESTS_CACHE = {}


@router.get("/{plan_id}/verification-questions", response_model=List[VerificationQuestion])
async def get_verification_questions(
    plan_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Generates a 5-MCQ test to verify the student's mastery of the learning path.
    """
    plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.id == plan_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().unique().first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning plan not found."
        )

    topic = plan.topic or "Course Content"
    subject = plan.subject or "General Knowledge"

    # Extract module titles to give context to the LLM
    module_titles = [m.title for m in plan.modules] if plan.modules else []
    modules_context = "\n".join(f"- {title}" for title in module_titles)

    system_prompt = """You are an expert educational assessor.
Generate exactly 5 multiple-choice questions to test a student's mastery of their learning plan content.
The questions must cover the provided modules, topic, and subject.
Each question must have exactly 4 options labeled A, B, C, D.
Return ONLY valid JSON matching this exact schema, with no markdown code blocks or extra text:
[
  {
    "id": 1,
    "question_text": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "A. ..."
  }
]"""

    prompt = f"Subject: {subject}\nTopic: {topic}\nModules:\n{modules_context}"

    settings = get_settings()
    questions_data = None

    try:
        provider_name = "openrouter"
        model_name = settings.openrouter_analyst_model
        provider = get_llm_provider(provider_name, model=model_name, temperature=0.7)
        raw_response = await provider.generate(prompt=prompt, system_prompt=system_prompt)
        
        clean_response = raw_response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        elif clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
            
        questions_data = json.loads(clean_response.strip())
    except Exception as e:
        logger.warning(f"OpenRouter verification questions failed: {e}. Falling back to gemini...")
        try:
            provider_name = "gemini"
            model_name = settings.gemini_model
            provider = get_llm_provider(provider_name)
            raw_response = await provider.generate(prompt=prompt, system_prompt=system_prompt)
            
            clean_response = raw_response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            elif clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
                
            questions_data = json.loads(clean_response.strip())
        except Exception as e2:
            logger.error(f"Gemini fallback failed: {e2}. Using hardcoded templates.")
            questions_data = None

    if not questions_data or not isinstance(questions_data, list) or len(questions_data) < 5:
        questions_data = [
            {
                "id": 1,
                "question_text": f"What is the primary core concept taught in {topic} ({subject})?",
                "options": [
                    f"A. Fundamental theories and operational principles of {topic}",
                    f"B. Arbitrary ungrounded calculations",
                    f"C. Historical non-technical trivia",
                    f"D. None of the above",
                ],
                "correct_answer": f"A. Fundamental theories and operational principles of {topic}",
            },
            {
                "id": 2,
                "question_text": f"Which methodology is key to applying {topic} effectively?",
                "options": [
                    f"A. Random guesswork",
                    f"B. Systematic analysis and structured problem-solving in {topic}",
                    f"C. Ignoring foundational prerequisites",
                    f"D. Manual brute-force without validation",
                ],
                "correct_answer": f"B. Systematic analysis and structured problem-solving in {topic}",
            },
            {
                "id": 3,
                "question_text": f"What is a major advantage of mastering {topic}?",
                "options": [
                    f"A. Decreased efficiency in subject application",
                    f"B. Higher analytical clarity and accurate domain execution",
                    f"C. Complete elimination of all logical reasoning",
                    f"D. No practical benefit",
                ],
                "correct_answer": f"B. Higher analytical clarity and accurate domain execution",
            },
            {
                "id": 4,
                "question_text": f"When evaluating a complex scenario in {subject}, what step should be taken first?",
                "options": [
                    f"A. Jump directly to final output without verification",
                    f"B. Define core constraints and inspect input domain principles",
                    f"C. Disregard topic boundaries",
                    f"D. Rely entirely on intuition",
                ],
                "correct_answer": f"B. Define core constraints and inspect input domain principles",
            },
            {
                "id": 5,
                "question_text": f"How do the components of {topic} interact within {subject}?",
                "options": [
                    f"A. Through integrated pathways that optimize learning outcomes",
                    f"B. Independently with zero correlation",
                    f"C. Exclusively in isolated theoretical environments",
                    f"D. In an unpredictable random manner",
                ],
                "correct_answer": f"A. Through integrated pathways that optimize learning outcomes",
            },
        ]

    _VERIFICATION_TESTS_CACHE[plan_id] = {q["id"]: q["correct_answer"] for q in questions_data}

    return [
        VerificationQuestion(
            id=q["id"],
            question_text=q["question_text"],
            options=q["options"]
        ) for q in questions_data
    ]


@router.post("/{plan_id}/verify-submit", response_model=VerificationResultResponse)
async def submit_verification_test(
    plan_id: int,
    payload: VerificationSubmitRequest,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Submits the 5-MCQ verification test.
    If score >= 60% (3/5), updates the learning plan status to 'completed'.
    """
    plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.id == plan_id)
        .where(LearningPlan.user_id == current_user.id)
    ).scalars().unique().first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning plan not found."
        )

    correct_answers = _VERIFICATION_TESTS_CACHE.get(plan_id, {})
    
    correct_count = 0
    total_count = 5

    for ans in payload.answers:
        expected = correct_answers.get(ans.question_id)
        if expected and ans.selected_option == expected:
            correct_count += 1

    score_percent = (correct_count / total_count) * 100.0
    passed = score_percent >= 60.0

    if passed:
        plan.status = "completed"
        db.commit()
        msg = "Congratulations! You passed the 5-MCQ verification test. Learning plan marked as COMPLETED! 🎉"
    else:
        # Bulk-reset all tasks belonging to this plan directly via subquery.
        # Using a direct UPDATE avoids lazy-loading issues with plan.modules.
        module_ids_subquery = (
            select(LearningModule.id)
            .where(LearningModule.learning_plan_id == plan_id)
            .scalar_subquery()
        )
        db.execute(
            update(LearningTask)
            .where(LearningTask.module_id.in_(module_ids_subquery))
            .values(is_completed=False, status="not_started")
        )
        db.commit()
        msg = f"You scored {score_percent:.0f}%. You need at least 60% (3/5 correct) to verify completion. Your tasks have been restored so you can review them and try again!"

    return VerificationResultResponse(
        passed=passed,
        score_percent=score_percent,
        correct_count=correct_count,
        total_count=total_count,
        message=msg
    )
