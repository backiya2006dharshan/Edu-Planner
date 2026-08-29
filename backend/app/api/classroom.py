import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.database import get_session_factory
from app.models.user import User
from app.models.classroom import Classroom, ClassMember
from app.dependencies.auth import get_current_user, require_role
from app.services.class_code import generate_class_code
from app.schemas.classroom import (
    ClassCreateRequest,
    ClassJoinRequest,
    ClassroomResponse,
    ClassMemberStudentResponse,
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
    return ClassroomResponse(
        id=classroom.id,
        teacher_id=classroom.teacher_id,
        teacher_name=teacher_name,
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
    Allowed if user is the class teacher or a joined student member.
    """
    classroom = db.get(Classroom, class_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found."
        )

    if current_user.role == "teacher":
        if classroom.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this class."
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
                detail="You are not a member of this class."
            )

    return _to_classroom_response(classroom)


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
