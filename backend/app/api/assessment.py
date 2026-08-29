import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.db.database import get_session_factory
from app.models.user import User
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
    AddCustomSkillRequest,
    UpdateSkillScoreRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assessment", tags=["assessment"])

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session

REQUIRED_CATEGORIES = [
    "Numerical Calculation",
    "Abstract Thinking",
    "Logical Reasoning",
    "Association/Analogy",
    "Spatial Imagination",
]

# Standard seed questions to ensure instant availability without external API delay
SEED_QUESTIONS_DATA = [
    {
        "skill_category": "Numerical Calculation",
        "text": "What is 15% of 240?",
        "options": ["A. 32", "B. 36", "C. 40", "D. 42"],
        "correct_answer": "B. 36",
        "explanation": "240 * 0.15 = 36",
        "difficulty": "Medium",
    },
    {
        "skill_category": "Abstract Thinking",
        "text": "Which pattern comes next in the sequence: 2, 4, 8, 16, ...?",
        "options": ["A. 24", "B. 30", "C. 32", "D. 64"],
        "correct_answer": "C. 32",
        "explanation": "Each term doubles the previous one.",
        "difficulty": "Easy",
    },
    {
        "skill_category": "Logical Reasoning",
        "text": "If all A are B, and all B are C, which statement MUST be true?",
        "options": ["A. All C are A", "B. All A are C", "C. No A is C", "D. Some A are not C"],
        "correct_answer": "B. All A are C",
        "explanation": "Transitive law of logic.",
        "difficulty": "Easy",
    },
    {
        "skill_category": "Association/Analogy",
        "text": "Doctor is to Hospital as Teacher is to ...?",
        "options": ["A. Student", "B. Book", "C. School", "D. Chalk"],
        "correct_answer": "C. School",
        "explanation": "A doctor works in a hospital; a teacher works in a school.",
        "difficulty": "Easy",
    },
    {
        "skill_category": "Spatial Imagination",
        "text": "How many total faces does a standard cube possess?",
        "options": ["A. 4", "B. 6", "C. 8", "D. 12"],
        "correct_answer": "B. 6",
        "explanation": "A cube has 6 faces.",
        "difficulty": "Easy",
    },
]


def _ensure_questions_exist_for_category(db: Session, category: str) -> None:
    """Ensure at least one active question exists for a given skill category."""
    existing = db.execute(
        select(DiagnosticQuestion).where(
            DiagnosticQuestion.skill_category == category,
            DiagnosticQuestion.is_active == True,
        )
    ).scalars().all()

    if existing:
        return

    # Check if we have pre-defined seed data for this category
    seed_match = next((q for q in SEED_QUESTIONS_DATA if q["skill_category"] == category), None)
    if seed_match:
        q = DiagnosticQuestion(
            text=seed_match["text"],
            options=seed_match["options"],
            correct_answer=seed_match["correct_answer"],
            explanation=seed_match["explanation"],
            skill_category=category,
            difficulty=seed_match["difficulty"],
            is_active=True,
        )
        db.add(q)
        db.commit()
        return

    # Generate a dynamic question for custom skill category
    q = DiagnosticQuestion(
        text=f"Demonstrate your core understanding of {category}: Which fundamental concept best defines this field?",
        options=[
            f"A. Applied principles and foundational theory of {category}",
            f"B. Unrelated arbitrary operations",
            f"C. Outdated historical context only",
            f"D. None of the above",
        ],
        correct_answer=f"A. Applied principles and foundational theory of {category}",
        explanation=f"Core concept of {category}.",
        skill_category=category,
        difficulty="Medium",
        is_active=True,
    )
    db.add(q)
    db.commit()


@router.post("/custom-skill", response_model=SkillScore)
def add_custom_skill(
    payload: AddCustomSkillRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allows a student to add a custom skill to their Skill Tree."""
    category = payload.skill_category.strip()
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill category cannot be empty")

    existing = db.execute(
        select(StudentSkill).where(
            StudentSkill.user_id == current_user.id,
            StudentSkill.skill_category == category,
        )
    ).scalar_one_or_none()

    if existing:
        return existing

    skill = StudentSkill(
        user_id=current_user.id,
        skill_category=category,
        score=payload.initial_score,
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)

    # Ensure dynamic questions exist for this custom skill
    _ensure_questions_exist_for_category(db, category)

    return skill


@router.post("/start", response_model=AssessmentStartResponse)
def start_assessment(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only students can take assessments"
        )

    # Fetch user's skills or default categories
    user_skills = db.execute(
        select(StudentSkill.skill_category).where(StudentSkill.user_id == current_user.id)
    ).scalars().all()

    categories_to_check = list(set(REQUIRED_CATEGORIES + user_skills))

    # Ensure active questions exist for all categories
    for category in categories_to_check:
        _ensure_questions_exist_for_category(db, category)

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

    user_skills = db.execute(
        select(StudentSkill.skill_category).where(StudentSkill.user_id == current_user.id)
    ).scalars().all()

    target_categories = list(set(REQUIRED_CATEGORIES + user_skills))
    for cat in target_categories:
        _ensure_questions_exist_for_category(db, cat)

    questions = db.execute(
        select(DiagnosticQuestion).where(
            DiagnosticQuestion.is_active == True,
            DiagnosticQuestion.skill_category.in_(target_categories),
        )
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

    user_skills = db.execute(
        select(StudentSkill.skill_category).where(StudentSkill.user_id == current_user.id)
    ).scalars().all()
    target_categories = list(set(REQUIRED_CATEGORIES + user_skills))

    all_questions = db.execute(
        select(DiagnosticQuestion).where(
            DiagnosticQuestion.is_active == True,
            DiagnosticQuestion.skill_category.in_(target_categories),
        )
    ).scalars().all()
    question_map = {q.id: q for q in all_questions}

    category_correct = {cat: 0 for cat in target_categories}
    category_total = {cat: 0 for cat in target_categories}

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
    for category in target_categories:
        total = category_total[category]
        score = 0
        if total > 0:
            score = (category_correct[category] / total) * 100
        
        student_skill = db.execute(
            select(StudentSkill).where(
                StudentSkill.user_id == current_user.id,
                StudentSkill.skill_category == category
            )
        ).scalar_one_or_none()
        
        if student_skill:
            history = StudentSkillHistory(
                user_id=current_user.id,
                skill_category=category,
                score=student_skill.score,
                recorded_at=student_skill.last_updated or datetime.utcnow(),
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


@router.patch("/skills/{skill_id}", response_model=SkillScore)
def update_skill_score(
    skill_id: int,
    payload: UpdateSkillScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skill = db.get(StudentSkill, skill_id)
    if not skill or skill.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Skill record not found"
        )

    history = StudentSkillHistory(
        user_id=current_user.id,
        skill_category=skill.skill_category,
        score=skill.score,
        recorded_at=skill.last_updated or datetime.utcnow(),
    )
    db.add(history)

    skill.score = payload.score
    skill.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(skill)
    return skill
