import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.database import get_session_factory
from app.models.user import User
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.dependencies.auth import require_role
from app.schemas.learning_plan import LearningPlanResponse, LearningTaskResponse

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


@router.get("/active", response_model=LearningPlanResponse)
async def get_active_learning_plan(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Get the student's currently active learning plan.
    """
    plan = db.execute(
        select(LearningPlan)
        .where(LearningPlan.user_id == current_user.id)
        .where(LearningPlan.status == "active")
        .order_by(LearningPlan.created_at.desc())
    ).scalars().unique().first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active learning plan found for the current user."
        )
        
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
    # Verify ownership through joins
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
    
    # Simple logic to check if module/plan is complete could go here.
    
    return task
