import json
import logging
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.dependencies.auth import get_current_user
from app.db.database import get_session_factory
from app.models.user import User
from app.models.classroom import Classroom
from app.models.material import MaterialDocument
from app.models.assessment import (
    DiagnosticAssessment,
    DiagnosticAttempt,
    StudentSkill,
    StudentSkillHistory,
    DiagnosticQuestion
)
from app.schemas.assessment import (
    SkillScore,
    AddCustomSkillRequest,
    UpdateSkillScoreRequest,
    MaterialOption,
    GenerateQuestionsRequest,
    GeneratedQuestionsResponse,
    DynamicAssessmentSubmitRequest,
    DynamicAssessmentSubmitResponse
)
from app.ai.rag import retrieve_rag_context
from app.ai.providers import get_llm_provider
from app.ai.graph import build_learning_graph
from app.ai.state import SkillScores
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assessment", tags=["assessment"])

def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session

# Session Cache Pattern
_ASSESSMENT_SESSION_CACHE = {}

@router.get("/materials", response_model=List[MaterialOption])
def list_materials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List available uploaded materials for the student to select.
    Scoped by student's college/year/semester.
    """
    query = select(MaterialDocument).options(joinedload(MaterialDocument.classroom))
    
    if current_user.college:
        query = query.where(MaterialDocument.college == current_user.college)
    if current_user.semester:
        query = query.where(MaterialDocument.semester == current_user.semester)
    
    materials = db.execute(query).scalars().all()
    
    return [
        MaterialOption(
            id=m.id,
            file_name=m.file_name,
            subject=m.classroom.name if m.classroom else "General Subject",
            chunk_count=m.chunk_count,
            college=m.college,
            semester=m.semester
        ) for m in materials
    ]


@router.post("/generate-questions", response_model=GeneratedQuestionsResponse)
async def generate_questions(
    request: GenerateQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    material = db.get(MaterialDocument, request.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
        
    if material.chunk_count == 0:
        raise HTTPException(status_code=400, detail="This material has not been indexed yet. Please ask your teacher to re-upload it.")

    subject = material.classroom.name if material.classroom else "Course Content"
    topic = material.file_name
    
    rag_context, chunk_count = await retrieve_rag_context(
        subject=subject,
        topic=topic,
        college=material.college,
        semester=material.semester,
        regulation=material.regulation,
        n_results=10
    )
    
    if not rag_context:
        rag_context = "No content available. Use general knowledge for the subject."

    system_prompt = f"""You are an expert educational assessment designer.
Generate exactly {request.num_questions} multiple choice questions
based STRICTLY on the provided curriculum material content.
Rules:
1. Every question must be answerable from the provided text
2. Do not invent facts not present in the material
3. Each question has exactly 4 options (A, B, C, D)
4. Vary difficulty: 30% easy, 50% medium, 20% hard
5. Tag each question with a skill_category from:
   [Numerical Calculation, Abstract Thinking, Logical Reasoning, Association/Analogy, Spatial Imagination]
6. Return ONLY valid JSON, no markdown, no explanation

JSON Schema:
{{
  "questions": [
    {{
      "id": 1,
      "question_text": "string",
      "skill_category": "Logical Reasoning",
      "difficulty": "medium",
      "options": [
        "A. option text",
        "B. option text",
        "C. option text",
        "D. option text"
      ],
      "correct_answer": "A. option text",
      "explanation": "brief explanation"
    }}
  ]
}}"""

    user_prompt = f"""Material: {material.file_name}
Subject: {subject}
Content:
{rag_context}

Generate {request.num_questions} MCQ questions from this material."""

    settings = get_settings()
    questions_data = None
    
    try:
        provider = get_llm_provider("groq", model=settings.groq_model, temperature=0.7)
        raw_response = await provider.generate(prompt=user_prompt, system_prompt=system_prompt)
    except Exception as e:
        logger.warning(f"Groq failed: {e}. Falling back to OpenRouter...")
        try:
            provider = get_llm_provider("openrouter", model=settings.openrouter_analyst_model, temperature=0.7)
            raw_response = await provider.generate(prompt=user_prompt, system_prompt=system_prompt)
        except Exception as e2:
            logger.warning(f"OpenRouter failed: {e2}. Falling back to Gemini...")
            provider = get_llm_provider("gemini", model=settings.gemini_model, temperature=0.7)
            raw_response = await provider.generate(prompt=user_prompt, system_prompt=system_prompt)

    try:
        clean_response = raw_response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        elif clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        
        parsed = json.loads(clean_response)
        questions_data = parsed.get("questions", [])
    except Exception as e:
        logger.error(f"Failed to parse LLM response: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate valid questions.")
        
    session_id = str(uuid.uuid4())
    
    _ASSESSMENT_SESSION_CACHE[session_id] = {
        "questions": questions_data,
        "material_id": material.id,
        "subject": subject,
        "topic": topic,
        "rag_context": rag_context,
        "chunk_count": chunk_count,
        "created_at": datetime.utcnow()
    }
    
    return_questions = []
    for q in questions_data:
        return_questions.append({
            "id": q["id"],
            "question_text": q["question_text"],
            "options": q["options"]
        })
        
    return GeneratedQuestionsResponse(
        session_id=session_id,
        material_name=material.file_name,
        subject=subject,
        topic=topic,
        questions=return_questions
    )


async def run_plan_generation(
    current_user: User,
    subject: str,
    topic: str,
    skill_performance: dict,
    strong_areas: list,
    weak_areas: list,
    rag_context: str,
    chunk_count: int,
    file_name: str
):
    try:
        workflow = build_learning_graph()
        initial_state = {
            "student_id": current_user.id,
            "subject": subject,
            "topic": topic,
            "learning_goal": f"Master {subject} based on assessment results",
            "skill_scores": SkillScores(
                numerical_calculation=skill_performance.get("Numerical Calculation", 0),
                abstract_thinking=skill_performance.get("Abstract Thinking", 0),
                logical_reasoning=skill_performance.get("Logical Reasoning", 0),
                association_analogy=skill_performance.get("Association/Analogy", 0),
                spatial_imagination=skill_performance.get("Spatial Imagination", 0),
            ),
            "skill_gaps": {
                "known_skills": strong_areas,
                "weak_skills": weak_areas,
                "missing_skills": [],
                "prerequisites": []
            },
            "rag_context": rag_context,
            "rag_chunks_retrieved": chunk_count,
            "curriculum_context": f"Material: {file_name}"
        }
        await workflow.ainvoke(initial_state)
    except Exception as e:
        logger.error(f"Background plan generation failed: {e}")


@router.post("/submit", response_model=DynamicAssessmentSubmitResponse)
def submit_assessment(
    request: DynamicAssessmentSubmitRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session_data = _ASSESSMENT_SESSION_CACHE.get(request.session_id)
    if not session_data:
        raise HTTPException(status_code=400, detail="Invalid or expired session.")
        
    cached_questions = {q["id"]: q for q in session_data["questions"]}
    
    skill_scores = {}
    correct_count = 0
    total_count = len(cached_questions)
    
    assessment = DiagnosticAssessment(
        user_id=current_user.id,
        is_completed=True,
        completed_at=datetime.utcnow()
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    
    for ans in request.answers:
        q = cached_questions.get(ans.question_id)
        if not q:
            continue
            
        cat = q.get("skill_category", "Logical Reasoning")
        if cat not in skill_scores:
            skill_scores[cat] = {"correct": 0, "total": 0}
            
        skill_scores[cat]["total"] += 1
        
        expected = q.get("correct_answer", "")
        
        answer_is_correct = ans.selected_option.strip() == expected.strip()
        
        if answer_is_correct:
            skill_scores[cat]["correct"] += 1
            correct_count += 1
            
    skill_performance = {
        cat: (v["correct"] / v["total"]) * 100 if v["total"] > 0 else 0
        for cat, v in skill_scores.items()
    }
    
    weak_areas = [cat for cat, score in skill_performance.items() if score < 70]
    strong_areas = [cat for cat, score in skill_performance.items() if score >= 70]
    
    # Update StudentSkill in DB
    for cat, score in skill_performance.items():
        skill = db.execute(select(StudentSkill).where(StudentSkill.user_id == current_user.id, StudentSkill.skill_category == cat)).scalar_one_or_none()
        if skill:
            history = StudentSkillHistory(
                user_id=current_user.id,
                skill_category=cat,
                score=skill.score,
                recorded_at=skill.last_updated or datetime.utcnow()
            )
            db.add(history)
            skill.score = score
            skill.last_updated = datetime.utcnow()
        else:
            skill = StudentSkill(
                user_id=current_user.id,
                skill_category=cat,
                score=score
            )
            db.add(skill)
            
    db.commit()
    
    score_percent = (correct_count / total_count) * 100 if total_count > 0 else 0
    
    material = db.get(MaterialDocument, session_data["material_id"])
    
    # Trigger async learning plan generation
    background_tasks.add_task(
        run_plan_generation,
        current_user,
        session_data["subject"],
        session_data["topic"],
        skill_performance,
        strong_areas,
        weak_areas,
        session_data["rag_context"],
        session_data["chunk_count"],
        material.file_name if material else session_data["topic"]
    )
    
    return DynamicAssessmentSubmitResponse(
        score_percent=score_percent,
        correct_count=correct_count,
        total_count=total_count,
        skill_performance=skill_performance,
        weak_areas=weak_areas,
        strong_areas=strong_areas,
        learning_plan_id=None,
        learning_plan_summary=f"Plan generation in progress based on {len(weak_areas)} weak areas identified.",
        message="Assessment submitted successfully! Your personalized learning plan is being generated."
    )

@router.get("/skills")
def get_user_skills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current user's latest skill scores.
    """
    skills = db.execute(select(StudentSkill).where(StudentSkill.user_id == current_user.id)).scalars().all()
    
    # Map DB skill categories to frontend expected keys
    skill_map = {
        "Numerical Calculation": "numerical_calculation",
        "Abstract Thinking": "abstract_thinking",
        "Logical Reasoning": "logical_reasoning",
        "Association/Analogy": "association_analogy",
        "Spatial Imagination": "spatial_imagination"
    }
    
    # Default scores
    response = {
        "numerical_calculation": 0.0,
        "abstract_thinking": 0.0,
        "logical_reasoning": 0.0,
        "association_analogy": 0.0,
        "spatial_imagination": 0.0
    }
    
    for skill in skills:
        key = skill_map.get(skill.skill_category)
        if key:
            response[key] = skill.score
            
    return response

@router.post("/custom-skill")
def add_custom_skill(
    request: AddCustomSkillRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allow students to add a custom skill manually to their profile.
    """
    # Check if skill already exists
    existing = db.execute(
        select(StudentSkill).where(
            StudentSkill.user_id == current_user.id,
            StudentSkill.skill_category == request.skill_category
        )
    ).scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Skill already exists in your profile.")
        
    skill = StudentSkill(
        user_id=current_user.id,
        skill_category=request.skill_category,
        score=request.initial_score
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    
    return {
        "id": skill.id,
        "skill_category": skill.skill_category,
        "score": skill.score,
        "last_updated": skill.last_updated
    }

