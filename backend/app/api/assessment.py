from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import datetime

from app.dependencies.auth import get_current_user
from app.db.database import get_session_factory
from app.models.user import User

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session

from app.models.assessment import (
    DiagnosticQuestion,
    DiagnosticAssessment,
    DiagnosticAttempt,
    StudentSkill,
    StudentSkillHistory,
)
from app.schemas.assessment import (
    DiagnosticQuestionPublic,
    AssessmentStartResponse,
    AssessmentSubmitRequest,
    SkillScore,
)

router = APIRouter(prefix="/assessment", tags=["assessment"])

REQUIRED_CATEGORIES = [
    "Numerical Calculation",
    "Abstract Thinking",
    "Logical Reasoning",
    "Association/Analogy",
    "Spatial Imagination",
]


@router.post("/start", response_model=AssessmentStartResponse)
def start_assessment(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only students can take assessments"
        )

    # Validate that we have active questions for all 5 categories
    for category in REQUIRED_CATEGORIES:
        count = (
            db.execute(
                select(DiagnosticQuestion).where(
                    DiagnosticQuestion.skill_category == category,
                    DiagnosticQuestion.is_active == True,
                )
            )
            .scalars()
            .all()
        )
        if not count:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Missing questions for category: {category}",
            )

    # Check if there is an uncompleted assessment
    existing = db.execute(
        select(DiagnosticAssessment).where(
            DiagnosticAssessment.user_id == current_user.id,
            DiagnosticAssessment.is_completed == False,
        )
    ).scalar_one_or_none()
    
    if existing:
        return {"assessment_id": existing.id}

    # Start a new assessment
    new_assessment = DiagnosticAssessment(user_id=current_user.id)
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    return {"assessment_id": new_assessment.id}


@router.get("/{assessment_id}/questions", response_model=list[DiagnosticQuestionPublic])
def get_assessment_questions(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.get(DiagnosticAssessment, assessment_id)
    if not assessment or assessment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found"
        )
    
    if assessment.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment already completed"
        )

    # Retrieve all active questions (in a real app, this might select a subset)
    questions = db.execute(
        select(DiagnosticQuestion).where(DiagnosticQuestion.is_active == True)
    ).scalars().all()
    
    return questions


@router.post("/{assessment_id}/submit")
def submit_assessment(
    assessment_id: int,
    request: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.get(DiagnosticAssessment, assessment_id)
    if not assessment or assessment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found"
        )
    
    if assessment.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment already completed"
        )

    # Fetch all active questions to evaluate answers
    all_questions = db.execute(
        select(DiagnosticQuestion).where(DiagnosticQuestion.is_active == True)
    ).scalars().all()
    question_map = {q.id: q for q in all_questions}

    category_correct = {cat: 0 for cat in REQUIRED_CATEGORIES}
    category_total = {cat: 0 for cat in REQUIRED_CATEGORIES}

    # Record attempts and evaluate
    for answer in request.answers:
        q = question_map.get(answer.question_id)
        if not q:
            continue
        
        is_correct = (answer.selected_answer == q.correct_answer)
        
        attempt = DiagnosticAttempt(
            assessment_id=assessment_id,
            question_id=q.id,
            selected_answer=answer.selected_answer,
            is_correct=is_correct,
        )
        db.add(attempt)
        
        category_total[q.skill_category] += 1
        if is_correct:
            category_correct[q.skill_category] += 1
            
    # Also we need to count questions that were not answered as incorrect
    for q in all_questions:
        if q.id not in [a.question_id for a in request.answers]:
            category_total[q.skill_category] += 1
            attempt = DiagnosticAttempt(
                assessment_id=assessment_id,
                question_id=q.id,
                selected_answer=None,
                is_correct=False,
            )
            db.add(attempt)

    # Calculate and update skills
    for category in REQUIRED_CATEGORIES:
        total = category_total[category]
        score = 0
        if total > 0:
            score = (category_correct[category] / total) * 100
        
        # Check existing skill
        student_skill = db.execute(
            select(StudentSkill).where(
                StudentSkill.user_id == current_user.id,
                StudentSkill.skill_category == category
            )
        ).scalar_one_or_none()
        
        if student_skill:
            # Record history
            history = StudentSkillHistory(
                user_id=current_user.id,
                skill_category=category,
                score=student_skill.score,
                recorded_at=student_skill.last_updated,
            )
            db.add(history)
            student_skill.score = score
            student_skill.last_updated = datetime.utcnow()
        else:
            student_skill = StudentSkill(
                user_id=current_user.id,
                skill_category=category,
                score=score,
            )
            db.add(student_skill)

    assessment.is_completed = True
    assessment.completed_at = datetime.utcnow()
    db.commit()

    return {"message": "Assessment submitted successfully"}


@router.get("/skills", response_model=list[SkillScore])
def get_skills(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    skills = db.execute(
        select(StudentSkill).where(StudentSkill.user_id == current_user.id)
    ).scalars().all()
    return skills
