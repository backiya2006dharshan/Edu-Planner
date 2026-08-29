import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.database import get_session_factory
from app.models.user import User
from app.models.assessment import StudentSkill, DiagnosticAssessment
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.dependencies.auth import require_role
from app.schemas.teacher import (
    TeacherStatsResponse,
    StudentProgressRead,
    StudentAttentionRead,
    TeacherActivityItem,
)
from app.schemas.auth import UserPublic

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teacher", tags=["teacher"])

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session


@router.get("/stats", response_model=TeacherStatsResponse)
async def get_teacher_stats(
    current_user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db)
):
    # Total students count
    students = db.execute(
        select(User).where(User.role == "student")
    ).scalars().all()
    total_students = len(students)

    # Active plans count
    active_plans = db.execute(
        select(func.count(LearningPlan.id)).where(LearningPlan.status == "active")
    ).scalar() or 0

    # Calculate average completion across all tasks
    all_tasks = db.execute(select(LearningTask)).scalars().all()
    if all_tasks:
        completed = sum(1 for t in all_tasks if t.is_completed)
        avg_completion = (completed / len(all_tasks)) * 100.0
    else:
        avg_completion = 0.0

    # Students needing attention (avg skill score < 50% or no skills assessed)
    needing_attention = 0
    for student in students:
        s_skills = db.execute(
            select(StudentSkill).where(StudentSkill.user_id == student.id)
        ).scalars().all()
        if not s_skills:
            needing_attention += 1
        else:
            avg_s = sum(sk.score for sk in s_skills) / len(s_skills)
            if avg_s < 50.0:
                needing_attention += 1

    return TeacherStatsResponse(
        total_students=total_students,
        active_plans=active_plans,
        avg_completion_rate=round(avg_completion, 1),
        students_needing_attention=needing_attention,
    )


@router.get("/students", response_model=List[StudentProgressRead])
async def get_teacher_students(
    current_user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db)
):
    students = db.execute(
        select(User).where(User.role == "student").order_by(User.full_name.asc())
    ).scalars().all()

    result = []
    for student in students:
        s_skills = db.execute(
            select(StudentSkill).where(StudentSkill.user_id == student.id)
        ).scalars().all()
        
        skills_assessed = len(s_skills)
        avg_score = (sum(sk.score for sk in s_skills) / len(s_skills)) if s_skills else 0.0

        completed_plans_count = db.execute(
            select(func.count(LearningPlan.id)).where(
                LearningPlan.user_id == student.id,
                LearningPlan.status == "completed"
            )
        ).scalar() or 0

        # Last active calculation
        latest = student.created_at
        if s_skills:
            latest_skill = max((sk.last_updated for sk in s_skills if sk.last_updated), default=latest)
            if latest_skill and latest_skill > latest:
                latest = latest_skill

        result.append(StudentProgressRead(
            user=UserPublic.model_validate(student),
            skills_assessed=skills_assessed,
            topics_completed=completed_plans_count,
            average_score=round(avg_score, 1),
            last_active=latest or datetime.now(timezone.utc),
        ))

    return result


@router.get("/activity", response_model=List[TeacherActivityItem])
async def get_teacher_activity(
    current_user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db)
):
    activities = []
    
    # Recent completed assessments
    ass_list = db.execute(
        select(DiagnosticAssessment, User)
        .join(User, DiagnosticAssessment.user_id == User.id)
        .where(DiagnosticAssessment.is_completed == True)
        .order_by(DiagnosticAssessment.completed_at.desc())
        .limit(5)
    ).all()

    for ass, user in ass_list:
        if ass.completed_at:
            activities.append(TeacherActivityItem(
                name=user.full_name,
                action="Completed Diagnostic Assessment",
                time=ass.completed_at.isoformat()
            ))

    # Recent generated plans
    plan_list = db.execute(
        select(LearningPlan, User)
        .join(User, LearningPlan.user_id == User.id)
        .order_by(LearningPlan.created_at.desc())
        .limit(5)
    ).all()

    for plan, user in plan_list:
        if plan.created_at:
            activities.append(TeacherActivityItem(
                name=user.full_name,
                action=f"Generated Learning Plan for {plan.topic}",
                time=plan.created_at.isoformat()
            ))

    activities.sort(key=lambda a: a.time, reverse=True)
    return activities[:10]
