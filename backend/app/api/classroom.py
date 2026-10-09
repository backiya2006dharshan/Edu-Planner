from datetime import datetime, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_

from app.db.database import get_session_factory
from app.models.user import User
from app.models.classroom import Classroom, ClassMember
from app.models.material import MaterialDocument
from app.models.curriculum import Subject, Unit, Topic, LearningObjective
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask
from app.models.assessment import StudentSkill, StudentSkillHistory, DiagnosticAssessment
from app.dependencies.auth import get_current_user, require_role
from app.services.class_code import generate_class_code
from app.services.material_indexing import search_chunks
from app.ai.providers import get_llm_provider
from app.schemas.material import MaterialDocumentRead
from app.schemas.learning_plan import LearningPlanResponse
from app.schemas.classroom import (
    ClassCreateRequest,
    ClassJoinRequest,
    ClassroomResponse,
    ClassMemberStudentResponse,
    ClassroomAskAIRequest,
    ClassroomAskAIResponse,
    ClassroomAskAISource,
    ClassroomOverviewResponse,
    ClassroomProgressResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/classes", tags=["classes"])


def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session


def _to_classroom_response(classroom: Classroom) -> ClassroomResponse:
    member_count = len(classroom.members) if classroom.members else 0
    teacher_name = classroom.teacher.full_name if classroom.teacher else None
    teacher_email = classroom.teacher.email if classroom.teacher else None
    return ClassroomResponse(
        id=classroom.id,
        teacher_id=classroom.teacher_id,
        teacher_name=teacher_name,
        teacher_email=teacher_email,
        name=classroom.name,
        code=classroom.code,
        college=classroom.college,
        year=str(classroom.year) if classroom.year is not None else None,
        semester=str(classroom.semester) if classroom.semester is not None else None,
        regulation=classroom.regulation,
        section=classroom.section,
        is_active=classroom.is_active,
        member_count=member_count,
        created_at=classroom.created_at,
    )


def _verify_classroom_access(class_id: int, current_user: User, db: Session) -> Classroom:
    classroom = db.get(Classroom, class_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found."
        )

    if current_user.role == "teacher":
        if classroom.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this classroom."
            )
    else:
        membership = db.execute(
            select(ClassMember).where(
                ClassMember.class_id == class_id,
                ClassMember.student_id == current_user.id
            )
        ).scalars().first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this classroom."
            )

    return classroom


@router.post("", response_model=ClassroomResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: ClassCreateRequest,
    current_user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db)
):
    """
    Teacher creates a new class. Automatically generates a unique 6-character class code.
    """
    code = generate_class_code(db)
    
    new_class = Classroom(
        teacher_id=current_user.id,
        name=payload.name.strip(),
        code=code,
        college=payload.college.strip() if payload.college else None,
        year=str(payload.year).strip() if payload.year is not None else None,
        semester=str(payload.semester).strip() if payload.semester is not None else None,
        regulation=payload.regulation.strip() if payload.regulation else None,
        section=payload.section.strip() if payload.section else None,
        is_active=True,
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    logger.info(f"[Class Created] Teacher {current_user.id} created Class '{new_class.name}' (Code: {new_class.code})")
    return _to_classroom_response(new_class)


@router.get("/teacher", response_model=List[ClassroomResponse])
async def get_teacher_classes(
    current_user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db)
):
    """
    List all classes created by the authenticated teacher.
    """
    classes = db.execute(
        select(Classroom)
        .where(Classroom.teacher_id == current_user.id)
        .order_by(Classroom.created_at.desc())
    ).scalars().unique().all()

    return [_to_classroom_response(c) for c in classes]


@router.post("/join", response_model=ClassroomResponse)
async def join_class(
    payload: ClassJoinRequest,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Student joins a class using a unique class code.
    """
    code_clean = payload.code.strip().upper()
    
    classroom = db.execute(
        select(Classroom).where(Classroom.code == code_clean)
    ).scalars().first()

    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid class code. Class not found."
        )

    if not classroom.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This class is inactive."
        )

    existing_membership = db.execute(
        select(ClassMember).where(
            ClassMember.class_id == classroom.id,
            ClassMember.student_id == current_user.id
        )
    ).scalars().first()

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already joined this class."
        )

    member = ClassMember(
        class_id=classroom.id,
        student_id=current_user.id
    )
    db.add(member)
    db.commit()
    db.refresh(classroom)

    logger.info(f"[Class Joined] Student {current_user.id} joined Class '{classroom.name}' ({classroom.code})")
    return _to_classroom_response(classroom)


@router.get("/student", response_model=List[ClassroomResponse])
async def get_student_classes(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    List all classes joined by the authenticated student.
    """
    memberships = db.execute(
        select(ClassMember)
        .where(ClassMember.student_id == current_user.id)
        .order_by(ClassMember.joined_at.desc())
    ).scalars().all()

    classes = [m.classroom for m in memberships if m.classroom]
    return [_to_classroom_response(c) for c in classes]


@router.get("/{class_id}", response_model=ClassroomResponse)
async def get_class_details(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get information for a specific class.
    Allowed if user is the class teacher or an enrolled student member.
    """
    classroom = _verify_classroom_access(class_id, current_user, db)
    return _to_classroom_response(classroom)


@router.get("/{class_id}/overview", response_model=ClassroomOverviewResponse)
async def get_classroom_overview(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get full classroom overview data: metrics, active learning plan, required skills, and recent materials.
    """
    classroom = _verify_classroom_access(class_id, current_user, db)

    # 1. Materials count & recent
    mat_query = select(MaterialDocument).where(MaterialDocument.class_id == class_id)
    
    materials = db.execute(mat_query.order_by(MaterialDocument.created_at.desc())).scalars().all()
    materials_count = len(materials)
    recent_materials = [
        {
            "id": m.id,
            "file_name": m.file_name,
            "chunk_count": m.chunk_count,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in materials[:5]
    ]

    # 2. Student Skills
    skills = db.execute(
        select(StudentSkill).where(StudentSkill.user_id == current_user.id)
    ).scalars().all()
    
    student_skills = [
        {
            "id": s.id,
            "skill_category": s.skill_category,
            "score": round(s.score, 1),
            "last_updated": s.last_updated.isoformat() if s.last_updated else None,
        }
        for s in skills
    ]

    # Required skills inferred from subject / curriculum
    required_skills = [
        f"{classroom.name} Core Principles",
        f"{classroom.name} Practical Application",
        "Logical Reasoning",
        "Abstract Thinking",
        "Numerical Calculation",
    ]

    # 3. Active Learning Plan for this classroom's subject
    plan_query = (
        select(LearningPlan)
        .where(LearningPlan.user_id == current_user.id)
        .where(
            or_(
                LearningPlan.subject.ilike(f"%{classroom.name}%"),
                LearningPlan.topic.ilike(f"%{classroom.name}%")
            )
        )
        .order_by(LearningPlan.created_at.desc())
    )
    plans = db.execute(plan_query).scalars().unique().all()
    active_plan = None
    if plans:
        p = plans[0]
        total_p_tasks = sum(len(m.tasks) for m in p.modules)
        done_p_tasks = sum(sum(1 for t in m.tasks if t.is_completed) for m in p.modules)
        active_plan = {
            "id": p.id,
            "subject": p.subject,
            "topic": p.topic,
            "learning_goal": p.learning_goal,
            "status": p.status,
            "total_tasks": total_p_tasks,
            "completed_tasks": done_p_tasks,
            "progress_percent": round((done_p_tasks / total_p_tasks) * 100) if total_p_tasks > 0 else 0,
            "modules": [
                {
                    "id": mod.id,
                    "title": mod.title,
                    "tasks": [
                        {"id": t.id, "title": t.title, "task_type": t.task_type, "is_completed": t.is_completed}
                        for t in mod.tasks
                    ]
                }
                for mod in p.modules
            ]
        } if False else {
            "id": p.id,
            "subject": p.subject,
            "topic": p.topic,
            "learning_goal": p.learning_goal,
            "status": p.status,
            "total_tasks": total_p_tasks,
            "completed_tasks": done_p_tasks,
            "progress_percent": int((done_p_tasks / total_p_tasks) * 100) if total_p_tasks > 0 else 0,
            "modules": [
                {
                    "id": mod.id,
                    "title": mod.title,
                    "tasks": [
                        {"id": t.id, "title": t.title, "task_type": t.task_type, "is_completed": t.is_completed}
                        for t in mod.tasks
                    ]
                }
                for mod in p.modules
            ]
        }

    # 4. Progress calculation
    total_tasks = 0
    completed_tasks = 0
    plans_completed = 0
    for p in plans:
        if p.status == "completed":
            plans_completed += 1
        for mod in p.modules:
            for task in mod.tasks:
                total_tasks += 1
                if task.is_completed:
                    completed_tasks += 1

    overall_pct = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else (100 if plans_completed > 0 else 0)
    avg_score = (sum(s.score for s in skills) / len(skills)) if skills else 0.0

    # Assessment completed count
    ass_count = len(db.execute(
        select(DiagnosticAssessment).where(
            DiagnosticAssessment.user_id == current_user.id,
            DiagnosticAssessment.is_completed == True
        )
    ).scalars().all())

    progress_resp = ClassroomProgressResponse(
        class_id=classroom.id,
        overall_progress_percent=overall_pct,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        plans_completed=plans_completed,
        total_plans=len(plans),
        skills_assessed=len(skills),
        average_skill_score=round(avg_score, 1),
        topics_completed_count=plans_completed,
        assessments_completed_count=ass_count,
    )

    return ClassroomOverviewResponse(
        classroom=_to_classroom_response(classroom),
        materials_count=materials_count,
        enrolled_count=len(classroom.members) if classroom.members else 0,
        active_plan=active_plan,
        progress=progress_resp,
        required_skills=required_skills,
        student_skills=student_skills,
        recent_materials=recent_materials,
    )


@router.get("/{class_id}/materials", response_model=List[MaterialDocumentRead])
async def get_classroom_materials(
    class_id: int,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all learning materials belonging to this classroom.
    Restricted strictly to the current classroom's scope.
    """
    classroom = _verify_classroom_access(class_id, current_user, db)

    query = select(MaterialDocument)
    filters = [MaterialDocument.class_id == class_id]

    if search and search.strip():
        filters.append(MaterialDocument.file_name.ilike(f"%{search.strip()}%"))

    if filters:
        query = query.where(*filters)

    docs = db.execute(query.order_by(MaterialDocument.created_at.desc())).scalars().all()
    return [MaterialDocumentRead.model_validate(d) for d in docs]


@router.get("/{class_id}/skills")
async def get_classroom_skills(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get student skill competencies and history relevant to this classroom.
    """
    classroom = _verify_classroom_access(class_id, current_user, db)

    skills = db.execute(
        select(StudentSkill).where(StudentSkill.user_id == current_user.id)
    ).scalars().all()

    history = db.execute(
        select(StudentSkillHistory)
        .where(StudentSkillHistory.user_id == current_user.id)
        .order_by(StudentSkillHistory.recorded_at.desc())
        .limit(20)
    ).scalars().all()

    required_skills = [
        f"{classroom.name} Core Principles",
        f"{classroom.name} Practical Application",
        "Logical Reasoning",
        "Abstract Thinking",
        "Numerical Calculation",
        "Spatial Imagination",
        "Association/Analogy",
    ]

    return {
        "class_id": classroom.id,
        "subject": classroom.name,
        "required_skills": required_skills,
        "skills": [
            {
                "id": s.id,
                "skill_category": s.skill_category,
                "score": round(s.score, 1),
                "last_updated": s.last_updated.isoformat() if s.last_updated else None,
            }
            for s in skills
        ],
        "history": [
            {
                "id": h.id,
                "skill_category": h.skill_category,
                "score": round(h.score, 1),
                "recorded_at": h.recorded_at.isoformat() if h.recorded_at else None,
            }
            for h in history
        ]
    }


@router.get("/{class_id}/curriculum")
async def get_classroom_curriculum(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get curriculum units and topics matching this classroom's subject.
    """
    classroom = _verify_classroom_access(class_id, current_user, db)

    # Search for matching subject in curriculum
    subject = db.execute(
        select(Subject).where(Subject.name.ilike(f"%{classroom.name}%"))
    ).scalars().first()

    units_data = []
    if subject:
        for u in subject.units:
            topics_list = [
                {
                    "id": top.id,
                    "name": top.name,
                    "description": top.description,
                    "objectives": [obj.name for obj in top.learning_objectives]
                }
                for top in u.topics
            ]
            units_data.append({
                "id": u.id,
                "name": u.name,
                "description": u.description,
                "order_index": u.order_index,
                "topics": topics_list
            })

    # If no curriculum units found, provide default structured unit topics based on subject name
    if not units_data:
        units_data = [
            {
                "id": 1,
                "name": f"Unit 1: Introduction to {classroom.name}",
                "description": f"Foundational concepts and principles of {classroom.name}",
                "topics": [
                    {"id": 101, "name": f"Core Foundations of {classroom.name}", "description": "Key theories and architecture"},
                    {"id": 102, "name": "Fundamental Principles & Notation", "description": "Standard rules, methods and models"},
                ]
            },
            {
                "id": 2,
                "name": f"Unit 2: Applied {classroom.name} Techniques",
                "description": "Core algorithms, methods and practical patterns",
                "topics": [
                    {"id": 201, "name": "Design & Implementation Patterns", "description": "Structured methodology and execution"},
                    {"id": 202, "name": "Optimization & Problem Solving", "description": "Efficiency analysis and practical exercises"},
                ]
            },
            {
                "id": 3,
                "name": f"Unit 3: Advanced Topics & Case Studies",
                "description": "Complex scenarios and domain integration",
                "topics": [
                    {"id": 301, "name": f"Advanced {classroom.name} Paradigms", "description": "Modern industry standards and extensions"},
                    {"id": 302, "name": "Comprehensive Assessment & Capstone", "description": "End-to-end problem analysis"},
                ]
            }
        ]

    return {
        "class_id": classroom.id,
        "subject_name": classroom.name,
        "units": units_data
    }


@router.get("/{class_id}/learning-plans", response_model=List[LearningPlanResponse])
async def get_classroom_learning_plans(
    class_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Get learning plans created by the student for this classroom.
    """
    classroom = _verify_classroom_access(class_id, current_user, db)

    plans = db.execute(
        select(LearningPlan)
        .where(LearningPlan.user_id == current_user.id)
        .where(
            or_(
                LearningPlan.subject.ilike(f"%{classroom.name}%"),
                LearningPlan.topic.ilike(f"%{classroom.name}%")
            )
        )
        .order_by(LearningPlan.created_at.desc())
    ).scalars().unique().all()

    # Fallback to all student plans if none match subject strictly
    if not plans:
        plans = db.execute(
            select(LearningPlan)
            .where(LearningPlan.user_id == current_user.id)
            .order_by(LearningPlan.created_at.desc())
        ).scalars().unique().all()

    return plans


@router.get("/{class_id}/progress", response_model=ClassroomProgressResponse)
async def get_classroom_progress(
    class_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Get aggregated progress metrics for the student in this classroom.
    """
    classroom = _verify_classroom_access(class_id, current_user, db)

    plans = db.execute(
        select(LearningPlan)
        .where(LearningPlan.user_id == current_user.id)
        .where(
            or_(
                LearningPlan.subject.ilike(f"%{classroom.name}%"),
                LearningPlan.topic.ilike(f"%{classroom.name}%")
            )
        )
    ).scalars().unique().all()

    total_tasks = 0
    completed_tasks = 0
    plans_completed = 0

    for p in plans:
        if p.status == "completed":
            plans_completed += 1
        for mod in p.modules:
            for task in mod.tasks:
                total_tasks += 1
                if task.is_completed:
                    completed_tasks += 1

    skills = db.execute(
        select(StudentSkill).where(StudentSkill.user_id == current_user.id)
    ).scalars().all()
    avg_score = (sum(s.score for s in skills) / len(skills)) if skills else 0.0

    ass_count = len(db.execute(
        select(DiagnosticAssessment).where(
            DiagnosticAssessment.user_id == current_user.id,
            DiagnosticAssessment.is_completed == True
        )
    ).scalars().all())

    overall_pct = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else (100 if plans_completed > 0 else 0)

    return ClassroomProgressResponse(
        class_id=classroom.id,
        overall_progress_percent=overall_pct,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        plans_completed=plans_completed,
        total_plans=len(plans),
        skills_assessed=len(skills),
        average_skill_score=round(avg_score, 1),
        topics_completed_count=plans_completed,
        assessments_completed_count=ass_count,
    )


@router.post("/{class_id}/ask-ai", response_model=ClassroomAskAIResponse)
async def classroom_ask_ai(
    class_id: int,
    payload: ClassroomAskAIRequest,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Classroom-specific Ask AI interface grounded strictly on this classroom's materials from ChromaDB.
    """
    classroom = _verify_classroom_access(class_id, current_user, db)

    query_text = payload.question.strip()
    sources: List[ClassroomAskAISource] = []
    rag_context = ""
    retrieved_chunk_count = 0
    rag_grounded = False

    try:
        results = search_chunks(
            query=f"{classroom.name} {query_text}",
            college=classroom.college or "",
            semester=classroom.semester or "",
            regulation=classroom.regulation or "",
            year=classroom.year or "",
            limit=4
        )
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        retrieved_chunk_count = len(documents)

        if documents:
            rag_grounded = True
            rag_parts = []
            for doc, meta in zip(documents, metadatas):
                fname = (meta.get("file_name") if meta else None) or (meta.get("college") if meta else None) or "Classroom Material"
                pnum = meta.get("page_number") if meta else None
                snippet = doc[:220] + "..." if len(doc) > 220 else doc
                sources.append(ClassroomAskAISource(
                    file_name=str(fname),
                    page_number=pnum,
                    content_snippet=snippet
                ))
                rag_parts.append(f"Document [{fname}] (Page {pnum or 'N/A'}):\n{doc}")
            rag_context = "\n\n".join(rag_parts)
    except Exception as e:
        logger.warning(f"Classroom Ask AI RAG retrieval error: {e}")

    teacher_name = classroom.teacher.full_name if classroom.teacher else "the course instructor"
    system_prompt = (
        f"You are the AI Academic Assistant for the classroom '{classroom.name}', taught by {teacher_name}.\n"
        f"Academic Scope: College: {classroom.college or 'N/A'}, Semester: {classroom.semester or 'N/A'}, Regulation: {classroom.regulation or 'N/A'}.\n"
        f"Answer the student's question clearly, thoroughly, and pedagogically.\n"
        f"Ground your answer on the retrieved classroom materials whenever provided, and cite document names or concepts directly."
    )

    user_prompt = f"Student Question: {query_text}\n"
    if rag_context:
        user_prompt += f"\n--- Retrieved Classroom Material Excerpts ---\n{rag_context}\n\nPlease explain the concept using these classroom materials."
    else:
        user_prompt += f"\nNote: No direct matching uploaded material chunks were found. Provide core theoretical guidance for {classroom.name}."

    answer = ""
    try:
        provider = get_llm_provider("gemini")
        answer = await provider.generate(prompt=user_prompt, system_prompt=system_prompt)
    except Exception as e:
        logger.warning(f"Gemini provider failed for Ask AI ({e}), trying OpenRouter...")
        try:
            provider = get_llm_provider("openrouter")
            answer = await provider.generate(prompt=user_prompt, system_prompt=system_prompt)
        except Exception as e2:
            logger.error(f"OpenRouter also failed for Ask AI: {e2}")
            if rag_context:
                answer = (
                    f"**Classroom Material Guidance for {classroom.name}:**\n\n"
                    f"Based on the course materials retrieved from ChromaDB for your classroom:\n\n"
                    f"{documents[0][:600]}\n\n"
                    f"*(Refer to the cited materials in the Materials tab for full chapter context.)*"
                )
            else:
                answer = f"To master this concept in {classroom.name}, review the foundational principles and consult your course notes."

    return ClassroomAskAIResponse(
        answer=answer,
        sources=sources,
        rag_grounded=rag_grounded,
        retrieved_chunks=retrieved_chunk_count
    )


@router.get("/{class_id}/members", response_model=List[ClassMemberStudentResponse])
async def get_class_members(
    class_id: int,
    current_user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db)
):
    """
    Teacher views list of students enrolled in their class.
    """
    classroom = db.get(Classroom, class_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found."
        )

    if classroom.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view members of your own class."
        )

    members = db.execute(
        select(ClassMember).where(ClassMember.class_id == class_id).order_by(ClassMember.joined_at.desc())
    ).scalars().all()

    result = []
    for m in members:
        if m.student:
            result.append(ClassMemberStudentResponse(
                id=m.id,
                student_id=m.student_id,
                student_name=m.student.full_name,
                student_email=m.student.email,
                joined_at=m.joined_at
            ))
    return result


@router.delete("/{class_id}/leave", status_code=status.HTTP_200_OK)
async def leave_class(
    class_id: int,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """
    Student leaves a class they joined.
    """
    membership = db.execute(
        select(ClassMember).where(
            ClassMember.class_id == class_id,
            ClassMember.student_id == current_user.id
        )
    ).scalars().first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of this class."
        )

    db.delete(membership)
    db.commit()
    return {"message": "Successfully left the class."}


@router.delete("/{class_id}", status_code=status.HTTP_200_OK)
async def delete_class(
    class_id: int,
    current_user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db)
):
    """
    Teacher deletes a classroom entirely.
    """
    classroom = db.get(Classroom, class_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found."
        )

    if classroom.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own class."
        )

    # Delete materials for this class
    filters = [MaterialDocument.class_id == classroom.id]
    
    materials_to_delete = db.execute(select(MaterialDocument).where(*filters)).scalars().all()
    
    # We should delete them using the service to clean up ChromaDB
    from app.services.material_service import delete_material_document
    for mat in materials_to_delete:
        await delete_material_document(mat.id)

    db.delete(classroom)
    db.commit()
    logger.info(f"[Class Deleted] Teacher {current_user.id} deleted Class '{classroom.name}' ({classroom.code}) along with {len(materials_to_delete)} materials")
    return {"message": "Classroom deleted successfully."}

