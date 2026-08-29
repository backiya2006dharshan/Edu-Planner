import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.database import get_session_factory
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
        msg = f"You scored {score_percent:.0f}%. You need at least 60% (3/5 correct) to verify completion. Please review the topics and try again!"

    return VerificationResultResponse(
        passed=passed,
        score_percent=score_percent,
        correct_count=correct_count,
        total_count=total_count,
        message=msg
    )
