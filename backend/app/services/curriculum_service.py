from __future__ import annotations

import asyncio
from collections.abc import Iterable
from functools import lru_cache

from fastapi import HTTPException, status
from sqlalchemy import select

from app.db.database import get_session_factory
from app.models.curriculum import Department, LearningObjective, Semester, Subject, Topic, Unit
from app.schemas.curriculum import (
    CurriculumTreeResponse,
    DepartmentCreate,
    DepartmentRead,
    DepartmentTreeRead,
    DepartmentUpdate,
    LearningObjectiveCreate,
    LearningObjectiveRead,
    LearningObjectiveTreeRead,
    LearningObjectiveUpdate,
    SemesterCreate,
    SemesterRead,
    SemesterTreeRead,
    SemesterUpdate,
    SubjectCreate,
    SubjectRead,
    SubjectTreeRead,
    SubjectUpdate,
    TopicCreate,
    TopicRead,
    TopicTreeRead,
    TopicUpdate,
    UnitCreate,
    UnitRead,
    UnitTreeRead,
    UnitUpdate,
)


@lru_cache(maxsize=1)
def _get_session_factory():
    session_factory = get_session_factory()
    if session_factory is None:
        raise RuntimeError("DATABASE_URL is not configured")
    return session_factory


def _run_sync(func):
    return asyncio.to_thread(func)


def _session() -> object:
    return _get_session_factory()


def _normalized(value: str | None) -> str:
    return value.strip().lower() if value else ""


def _commit_and_refresh(session, entity):
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


def _require_entity(entity, message: str):
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
    return entity


def _apply_updates(entity, data: dict[str, object]) -> None:
    for key, value in data.items():
        setattr(entity, key, value)


def _ensure_unique(session, statement, message: str):
    existing = session.scalar(statement)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


async def list_departments() -> list[Department]:
    def query() -> list[Department]:
        with _session()() as session:
            return list(session.scalars(select(Department).order_by(Department.name)).all())

    return await _run_sync(query)


async def get_department(department_id: int) -> Department:
    def query() -> Department:
        with _session()() as session:
            return _require_entity(session.get(Department, department_id), "Department not found")

    return await _run_sync(query)


async def create_department(payload: DepartmentCreate) -> Department:
    def mutation() -> Department:
        with _session()() as session:
            if payload.code:
                _ensure_unique(
                    session,
                    select(Department).where(Department.code == payload.code),
                    "Department code already exists",
                )
            _ensure_unique(
                session,
                select(Department).where(Department.name == payload.name),
                "Department name already exists",
            )
            department = Department(
                name=payload.name.strip(),
                code=payload.code.strip() if payload.code else None,
                description=payload.description.strip() if payload.description else None,
                is_active=payload.is_active,
            )
            return _commit_and_refresh(session, department)

    return await _run_sync(mutation)


async def update_department(department_id: int, payload: DepartmentUpdate) -> Department:
    def mutation() -> Department:
        with _session()() as session:
            department = _require_entity(session.get(Department, department_id), "Department not found")
            updates = payload.model_dump(exclude_unset=True)
            if "code" in updates and updates["code"]:
                _ensure_unique(
                    session,
                    select(Department).where(Department.code == updates["code"], Department.id != department_id),
                    "Department code already exists",
                )
            if "name" in updates and updates["name"]:
                _ensure_unique(
                    session,
                    select(Department).where(Department.name == updates["name"], Department.id != department_id),
                    "Department name already exists",
                )
            if "name" in updates and updates["name"] is not None:
                updates["name"] = str(updates["name"]).strip()
            if "code" in updates and updates["code"] is not None:
                updates["code"] = str(updates["code"]).strip() or None
            if "description" in updates and updates["description"] is not None:
                updates["description"] = str(updates["description"]).strip() or None
            _apply_updates(department, updates)
            session.commit()
            session.refresh(department)
            return department

    return await _run_sync(mutation)


async def delete_department(department_id: int) -> None:
    def mutation() -> None:
        with _session()() as session:
            department = _require_entity(session.get(Department, department_id), "Department not found")
            session.delete(department)
            session.commit()

    await _run_sync(mutation)


async def list_semesters(department_id: int | None = None) -> list[Semester]:
    def query() -> list[Semester]:
        with _session()() as session:
            statement = select(Semester)
            if department_id is not None:
                statement = statement.where(Semester.department_id == department_id)
            statement = statement.order_by(Semester.number)
            return list(session.scalars(statement).all())

    return await _run_sync(query)


async def get_semester(semester_id: int) -> Semester:
    def query() -> Semester:
        with _session()() as session:
            return _require_entity(session.get(Semester, semester_id), "Semester not found")

    return await _run_sync(query)


async def create_semester(payload: SemesterCreate) -> Semester:
    def mutation() -> Semester:
        with _session()() as session:
            _require_entity(session.get(Department, payload.department_id), "Department not found")
            _ensure_unique(
                session,
                select(Semester).where(
                    Semester.department_id == payload.department_id,
                    Semester.number == payload.number,
                ),
                "Semester already exists for this department",
            )
            semester = Semester(
                department_id=payload.department_id,
                number=payload.number,
                name=payload.name.strip() if payload.name else None,
                description=payload.description.strip() if payload.description else None,
            )
            return _commit_and_refresh(session, semester)

    return await _run_sync(mutation)


async def update_semester(semester_id: int, payload: SemesterUpdate) -> Semester:
    def mutation() -> Semester:
        with _session()() as session:
            semester = _require_entity(session.get(Semester, semester_id), "Semester not found")
            updates = payload.model_dump(exclude_unset=True)
            if "number" in updates and updates["number"] is not None:
                _ensure_unique(
                    session,
                    select(Semester).where(
                        Semester.department_id == semester.department_id,
                        Semester.number == updates["number"],
                        Semester.id != semester_id,
                    ),
                    "Semester already exists for this department",
                )
            if "name" in updates and updates["name"] is not None:
                updates["name"] = str(updates["name"]).strip() or None
            if "description" in updates and updates["description"] is not None:
                updates["description"] = str(updates["description"]).strip() or None
            _apply_updates(semester, updates)
            session.commit()
            session.refresh(semester)
            return semester

    return await _run_sync(mutation)


async def delete_semester(semester_id: int) -> None:
    def mutation() -> None:
        with _session()() as session:
            semester = _require_entity(session.get(Semester, semester_id), "Semester not found")
            session.delete(semester)
            session.commit()

    await _run_sync(mutation)


async def list_subjects(semester_id: int | None = None) -> list[Subject]:
    def query() -> list[Subject]:
        with _session()() as session:
            statement = select(Subject)
            if semester_id is not None:
                statement = statement.where(Subject.semester_id == semester_id)
            statement = statement.order_by(Subject.name)
            return list(session.scalars(statement).all())

    return await _run_sync(query)


async def get_subject(subject_id: int) -> Subject:
    def query() -> Subject:
        with _session()() as session:
            return _require_entity(session.get(Subject, subject_id), "Subject not found")

    return await _run_sync(query)


async def create_subject(payload: SubjectCreate) -> Subject:
    def mutation() -> Subject:
        with _session()() as session:
            _require_entity(session.get(Semester, payload.semester_id), "Semester not found")
            _ensure_unique(
                session,
                select(Subject).where(
                    Subject.semester_id == payload.semester_id,
                    Subject.name == payload.name,
                ),
                "Subject already exists for this semester",
            )
            subject = Subject(
                semester_id=payload.semester_id,
                name=payload.name.strip(),
                code=payload.code.strip() if payload.code else None,
                description=payload.description.strip() if payload.description else None,
            )
            return _commit_and_refresh(session, subject)

    return await _run_sync(mutation)


async def update_subject(subject_id: int, payload: SubjectUpdate) -> Subject:
    def mutation() -> Subject:
        with _session()() as session:
            subject = _require_entity(session.get(Subject, subject_id), "Subject not found")
            updates = payload.model_dump(exclude_unset=True)
            if "name" in updates and updates["name"] is not None:
                _ensure_unique(
                    session,
                    select(Subject).where(
                        Subject.semester_id == subject.semester_id,
                        Subject.name == updates["name"],
                        Subject.id != subject_id,
                    ),
                    "Subject already exists for this semester",
                )
                updates["name"] = str(updates["name"]).strip()
            if "code" in updates and updates["code"] is not None:
                updates["code"] = str(updates["code"]).strip() or None
            if "description" in updates and updates["description"] is not None:
                updates["description"] = str(updates["description"]).strip() or None
            _apply_updates(subject, updates)
            session.commit()
            session.refresh(subject)
            return subject

    return await _run_sync(mutation)


async def delete_subject(subject_id: int) -> None:
    def mutation() -> None:
        with _session()() as session:
            subject = _require_entity(session.get(Subject, subject_id), "Subject not found")
            session.delete(subject)
            session.commit()

    await _run_sync(mutation)


async def list_units(subject_id: int | None = None) -> list[Unit]:
    def query() -> list[Unit]:
        with _session()() as session:
            statement = select(Unit)
            if subject_id is not None:
                statement = statement.where(Unit.subject_id == subject_id)
            statement = statement.order_by(Unit.order_index.nullslast(), Unit.name)
            return list(session.scalars(statement).all())

    return await _run_sync(query)


async def get_unit(unit_id: int) -> Unit:
    def query() -> Unit:
        with _session()() as session:
            return _require_entity(session.get(Unit, unit_id), "Unit not found")

    return await _run_sync(query)


async def create_unit(payload: UnitCreate) -> Unit:
    def mutation() -> Unit:
        with _session()() as session:
            _require_entity(session.get(Subject, payload.subject_id), "Subject not found")
            _ensure_unique(
                session,
                select(Unit).where(Unit.subject_id == payload.subject_id, Unit.name == payload.name),
                "Unit already exists for this subject",
            )
            unit = Unit(
                subject_id=payload.subject_id,
                name=payload.name.strip(),
                order_index=payload.order_index,
                description=payload.description.strip() if payload.description else None,
            )
            return _commit_and_refresh(session, unit)

    return await _run_sync(mutation)


async def update_unit(unit_id: int, payload: UnitUpdate) -> Unit:
    def mutation() -> Unit:
        with _session()() as session:
            unit = _require_entity(session.get(Unit, unit_id), "Unit not found")
            updates = payload.model_dump(exclude_unset=True)
            if "name" in updates and updates["name"] is not None:
                _ensure_unique(
                    session,
                    select(Unit).where(Unit.subject_id == unit.subject_id, Unit.name == updates["name"], Unit.id != unit_id),
                    "Unit already exists for this subject",
                )
                updates["name"] = str(updates["name"]).strip()
            if "description" in updates and updates["description"] is not None:
                updates["description"] = str(updates["description"]).strip() or None
            _apply_updates(unit, updates)
            session.commit()
            session.refresh(unit)
            return unit

    return await _run_sync(mutation)


async def delete_unit(unit_id: int) -> None:
    def mutation() -> None:
        with _session()() as session:
            unit = _require_entity(session.get(Unit, unit_id), "Unit not found")
            session.delete(unit)
            session.commit()

    await _run_sync(mutation)


async def list_topics(unit_id: int | None = None) -> list[Topic]:
    def query() -> list[Topic]:
        with _session()() as session:
            statement = select(Topic)
            if unit_id is not None:
                statement = statement.where(Topic.unit_id == unit_id)
            statement = statement.order_by(Topic.order_index.nullslast(), Topic.name)
            return list(session.scalars(statement).all())

    return await _run_sync(query)


async def get_topic(topic_id: int) -> Topic:
    def query() -> Topic:
        with _session()() as session:
            return _require_entity(session.get(Topic, topic_id), "Topic not found")

    return await _run_sync(query)


async def create_topic(payload: TopicCreate) -> Topic:
    def mutation() -> Topic:
        with _session()() as session:
            _require_entity(session.get(Unit, payload.unit_id), "Unit not found")
            _ensure_unique(
                session,
                select(Topic).where(Topic.unit_id == payload.unit_id, Topic.name == payload.name),
                "Topic already exists for this unit",
            )
            topic = Topic(
                unit_id=payload.unit_id,
                name=payload.name.strip(),
                order_index=payload.order_index,
                description=payload.description.strip() if payload.description else None,
                document_id=payload.document_id,
                source_type=payload.source_type.strip() if payload.source_type else None,
                page_number=payload.page_number,
                source_reference=payload.source_reference.strip() if payload.source_reference else None,
            )
            return _commit_and_refresh(session, topic)

    return await _run_sync(mutation)


async def update_topic(topic_id: int, payload: TopicUpdate) -> Topic:
    def mutation() -> Topic:
        with _session()() as session:
            topic = _require_entity(session.get(Topic, topic_id), "Topic not found")
            updates = payload.model_dump(exclude_unset=True)
            if "name" in updates and updates["name"] is not None:
                _ensure_unique(
                    session,
                    select(Topic).where(Topic.unit_id == topic.unit_id, Topic.name == updates["name"], Topic.id != topic_id),
                    "Topic already exists for this unit",
                )
                updates["name"] = str(updates["name"]).strip()
            if "description" in updates and updates["description"] is not None:
                updates["description"] = str(updates["description"]).strip() or None
            if "source_type" in updates and updates["source_type"] is not None:
                updates["source_type"] = str(updates["source_type"]).strip() or None
            if "source_reference" in updates and updates["source_reference"] is not None:
                updates["source_reference"] = str(updates["source_reference"]).strip() or None
            _apply_updates(topic, updates)
            session.commit()
            session.refresh(topic)
            return topic

    return await _run_sync(mutation)


async def delete_topic(topic_id: int) -> None:
    def mutation() -> None:
        with _session()() as session:
            topic = _require_entity(session.get(Topic, topic_id), "Topic not found")
            session.delete(topic)
            session.commit()

    await _run_sync(mutation)


async def list_learning_objectives(topic_id: int | None = None) -> list[LearningObjective]:
    def query() -> list[LearningObjective]:
        with _session()() as session:
            statement = select(LearningObjective)
            if topic_id is not None:
                statement = statement.where(LearningObjective.topic_id == topic_id)
            statement = statement.order_by(LearningObjective.order_index.nullslast(), LearningObjective.name)
            return list(session.scalars(statement).all())

    return await _run_sync(query)


async def get_learning_objective(learning_objective_id: int) -> LearningObjective:
    def query() -> LearningObjective:
        with _session()() as session:
            return _require_entity(session.get(LearningObjective, learning_objective_id), "Learning objective not found")

    return await _run_sync(query)


async def create_learning_objective(payload: LearningObjectiveCreate) -> LearningObjective:
    def mutation() -> LearningObjective:
        with _session()() as session:
            _require_entity(session.get(Topic, payload.topic_id), "Topic not found")
            _ensure_unique(
                session,
                select(LearningObjective).where(
                    LearningObjective.topic_id == payload.topic_id,
                    LearningObjective.name == payload.name,
                ),
                "Learning objective already exists for this topic",
            )
            objective = LearningObjective(
                topic_id=payload.topic_id,
                name=payload.name.strip(),
                order_index=payload.order_index,
                description=payload.description.strip() if payload.description else None,
                document_id=payload.document_id,
                source_type=payload.source_type.strip() if payload.source_type else None,
                page_number=payload.page_number,
                source_reference=payload.source_reference.strip() if payload.source_reference else None,
            )
            return _commit_and_refresh(session, objective)

    return await _run_sync(mutation)


async def update_learning_objective(learning_objective_id: int, payload: LearningObjectiveUpdate) -> LearningObjective:
    def mutation() -> LearningObjective:
        with _session()() as session:
            objective = _require_entity(session.get(LearningObjective, learning_objective_id), "Learning objective not found")
            updates = payload.model_dump(exclude_unset=True)
            if "name" in updates and updates["name"] is not None:
                _ensure_unique(
                    session,
                    select(LearningObjective).where(
                        LearningObjective.topic_id == objective.topic_id,
                        LearningObjective.name == updates["name"],
                        LearningObjective.id != learning_objective_id,
                    ),
                    "Learning objective already exists for this topic",
                )
                updates["name"] = str(updates["name"]).strip()
            if "description" in updates and updates["description"] is not None:
                updates["description"] = str(updates["description"]).strip() or None
            if "source_type" in updates and updates["source_type"] is not None:
                updates["source_type"] = str(updates["source_type"]).strip() or None
            if "source_reference" in updates and updates["source_reference"] is not None:
                updates["source_reference"] = str(updates["source_reference"]).strip() or None
            _apply_updates(objective, updates)
            session.commit()
            session.refresh(objective)
            return objective

    return await _run_sync(mutation)


async def delete_learning_objective(learning_objective_id: int) -> None:
    def mutation() -> None:
        with _session()() as session:
            objective = _require_entity(session.get(LearningObjective, learning_objective_id), "Learning objective not found")
            session.delete(objective)
            session.commit()

    await _run_sync(mutation)


def _build_curriculum_tree(
    departments: Iterable[Department],
    semesters: Iterable[Semester],
    subjects: Iterable[Subject],
    units: Iterable[Unit],
    topics: Iterable[Topic],
    objectives: Iterable[LearningObjective],
) -> CurriculumTreeResponse:
    objective_map: dict[int, list[LearningObjectiveTreeRead]] = {}
    for objective in objectives:
        objective_map.setdefault(objective.topic_id, []).append(LearningObjectiveTreeRead.model_validate(objective))

    topic_map: dict[int, list[TopicTreeRead]] = {}
    for topic in topics:
        topic_read = TopicTreeRead.model_validate(topic)
        topic_read.learning_objectives = objective_map.get(topic.id, [])
        topic_map.setdefault(topic.unit_id, []).append(topic_read)

    unit_map: dict[int, list[UnitTreeRead]] = {}
    for unit in units:
        unit_read = UnitTreeRead.model_validate(unit)
        unit_read.topics = topic_map.get(unit.id, [])
        unit_map.setdefault(unit.subject_id, []).append(unit_read)

    subject_map: dict[int, list[SubjectTreeRead]] = {}
    for subject in subjects:
        subject_read = SubjectTreeRead.model_validate(subject)
        subject_read.units = unit_map.get(subject.id, [])
        subject_map.setdefault(subject.semester_id, []).append(subject_read)

    semester_map: dict[int, list[SemesterTreeRead]] = {}
    for semester in semesters:
        semester_read = SemesterTreeRead.model_validate(semester)
        semester_read.subjects = subject_map.get(semester.id, [])
        semester_map.setdefault(semester.department_id, []).append(semester_read)

    department_reads: list[DepartmentTreeRead] = []
    for department in departments:
        department_read = DepartmentTreeRead.model_validate(department)
        department_read.semesters = semester_map.get(department.id, [])
        department_reads.append(department_read)

    return CurriculumTreeResponse(departments=department_reads)


async def get_curriculum_tree() -> CurriculumTreeResponse:
    def query() -> CurriculumTreeResponse:
        with _session()() as session:
            departments = list(session.scalars(select(Department).order_by(Department.name)).all())
            semesters = list(session.scalars(select(Semester).order_by(Semester.number)).all())
            subjects = list(session.scalars(select(Subject).order_by(Subject.name)).all())
            units = list(session.scalars(select(Unit).order_by(Unit.order_index.nullslast(), Unit.name)).all())
            topics = list(session.scalars(select(Topic).order_by(Topic.order_index.nullslast(), Topic.name)).all())
            objectives = list(session.scalars(select(LearningObjective).order_by(LearningObjective.order_index.nullslast(), LearningObjective.name)).all())
            return _build_curriculum_tree(departments, semesters, subjects, units, topics, objectives)

    return await _run_sync(query)


def as_read_department(entity: Department) -> DepartmentRead:
    return DepartmentRead.model_validate(entity)


def as_read_semester(entity: Semester) -> SemesterRead:
    return SemesterRead.model_validate(entity)


def as_read_subject(entity: Subject) -> SubjectRead:
    return SubjectRead.model_validate(entity)


def as_read_unit(entity: Unit) -> UnitRead:
    return UnitRead.model_validate(entity)


def as_read_topic(entity: Topic) -> TopicRead:
    return TopicRead.model_validate(entity)


def as_read_learning_objective(entity: LearningObjective) -> LearningObjectiveRead:
    return LearningObjectiveRead.model_validate(entity)
