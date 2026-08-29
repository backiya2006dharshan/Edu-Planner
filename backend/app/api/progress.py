import logging
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.database import get_session_factory
from app.models.user import User
from app.models.assessment import StudentSkill, StudentSkillHistory, DiagnosticAssessment
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.models.material import MaterialDocument
from app.dependencies.auth import require_role
from app.schemas.progress import StudentProgressSummary, MilestoneItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/student", tags=["student-progress"])

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session

@router.get("/progress", response_model=StudentProgressSummary)
async def get_student_progress_summary(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    # 1. Skills
    skills = db.execute(
        select(StudentSkill).where(StudentSkill.user_id == current_user.id)
    ).scalars().all()
    
    skills_mastered = sum(1 for s in skills if s.score >= 80.0)
    avg_score = (sum(s.score for s in skills) / len(skills)) if skills else 0.0

    # 2. Learning Plans & Tasks
    plans = db.execute(
        select(LearningPlan).where(LearningPlan.user_id == current_user.id)
    ).scalars().unique().all()
    
    plans_completed = sum(1 for p in plans if p.status == "completed")
    
    total_tasks = 0
    completed_tasks = 0
    activity_dates = set()

    for plan in plans:
        if plan.created_at:
            activity_dates.add(plan.created_at.date())
        for module in plan.modules:
            for task in module.tasks:
                total_tasks += 1
                if task.is_completed:
                    completed_tasks += 1
                    if task.updated_at:
                        activity_dates.add(task.updated_at.date())

    # 3. Assessment activity
    assessments = db.execute(
        select(DiagnosticAssessment).where(
            DiagnosticAssessment.user_id == current_user.id,
            DiagnosticAssessment.is_completed == True
        )
    ).scalars().all()

    for ass in assessments:
        if ass.completed_at:
            activity_dates.add(ass.completed_at.date())

    # 4. Compute streak
    today = datetime.now(timezone.utc).date()
    streak = 0
    check_date = today
    
    if check_date not in activity_dates and (check_date - timedelta(days=1)) in activity_dates:
        check_date = check_date - timedelta(days=1)
        
    while check_date in activity_dates:
        streak += 1
        check_date -= timedelta(days=1)

    # 5. Materials count
    mat_query = select(MaterialDocument)
    if current_user.college:
        mat_query = mat_query.where(MaterialDocument.college == current_user.college)
    materials_count = len(db.execute(mat_query).scalars().all())

    # 6. Milestones
    milestones: List[MilestoneItem] = []
    
    for ass in assessments:
        if ass.completed_at:
            milestones.append(MilestoneItem(
                id=f"ass-{ass.id}",
                title="Completed Diagnostic Assessment",
                description="Evaluated core cognitive & technical competencies.",
                timestamp=ass.completed_at,
                type="assessment"
            ))

    for plan in plans:
        if plan.created_at:
            milestones.append(MilestoneItem(
                id=f"plan-create-{plan.id}",
                title=f"Started Plan: {plan.topic}",
                description=f"Generated learning plan for {plan.subject}.",
                timestamp=plan.created_at,
                type="plan_created"
            ))
        if plan.status == "completed" and plan.updated_at:
            milestones.append(MilestoneItem(
                id=f"plan-done-{plan.id}",
                title=f"Mastered Path: {plan.topic}",
                description="Passed verification test and completed all modules.",
                timestamp=plan.updated_at,
                type="plan_completed"
            ))

    for sk in skills:
        if sk.score >= 80.0 and sk.last_updated:
            milestones.append(MilestoneItem(
                id=f"skill-{sk.id}",
                title=f"Mastered Skill: {sk.skill_category}",
                description=f"Achieved high competence score ({sk.score:.0f}%).",
                timestamp=sk.last_updated,
                type="skill_mastered"
            ))

    def get_sort_key(m: MilestoneItem):
        ts = m.timestamp
        if ts.tzinfo is None:
            return ts.replace(tzinfo=timezone.utc)
        return ts

    milestones.sort(key=get_sort_key, reverse=True)

    return StudentProgressSummary(
        streak_days=streak,
        plans_completed=plans_completed,
        skills_mastered=skills_mastered,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        materials_count=materials_count,
        average_skill_score=round(avg_score, 1),
        recent_milestones=milestones[:10]
    )
