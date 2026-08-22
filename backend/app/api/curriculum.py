from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.schemas.curriculum import (
    CurriculumTreeResponse,
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
    LearningObjectiveCreate,
    LearningObjectiveRead,
    LearningObjectiveUpdate,
    SemesterCreate,
    SemesterRead,
    SemesterUpdate,
    SubjectCreate,
    SubjectRead,
    SubjectUpdate,
    TopicCreate,
    TopicRead,
    TopicUpdate,
    UnitCreate,
    UnitRead,
    UnitUpdate,
)
from app.services.curriculum_service import (
    as_read_department,
    as_read_learning_objective,
    as_read_semester,
    as_read_subject,
    as_read_topic,
    as_read_unit,
    create_department,
    create_learning_objective,
    create_semester,
    create_subject,
    create_topic,
    create_unit,
    delete_department,
    delete_learning_objective,
    delete_semester,
    delete_subject,
    delete_topic,
    delete_unit,
    get_curriculum_tree,
    get_department,
    get_learning_objective,
    get_semester,
    get_subject,
    get_topic,
    get_unit,
    list_departments,
    list_learning_objectives,
    list_semesters,
    list_subjects,
    list_topics,
    list_units,
    update_department,
    update_learning_objective,
    update_semester,
    update_subject,
    update_topic,
    update_unit,
)

router = APIRouter(prefix="/curriculum", tags=["curriculum"])


@router.get("/tree", response_model=CurriculumTreeResponse)
async def curriculum_tree(_: User = Depends(get_current_user)) -> CurriculumTreeResponse:
    return await get_curriculum_tree()


@router.get("/departments", response_model=list[DepartmentRead])
async def departments(_: User = Depends(get_current_user)) -> list[DepartmentRead]:
    return [as_read_department(item) for item in await list_departments()]


@router.get("/departments/{department_id}", response_model=DepartmentRead)
async def department_detail(department_id: int, _: User = Depends(get_current_user)) -> DepartmentRead:
    return as_read_department(await get_department(department_id))


@router.post("/departments", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
async def department_create(payload: DepartmentCreate, _: User = Depends(require_role("teacher"))) -> DepartmentRead:
    return as_read_department(await create_department(payload))


@router.patch("/departments/{department_id}", response_model=DepartmentRead)
async def department_update(department_id: int, payload: DepartmentUpdate, _: User = Depends(require_role("teacher"))) -> DepartmentRead:
    return as_read_department(await update_department(department_id, payload))


@router.delete("/departments/{department_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def department_delete(department_id: int, _: User = Depends(require_role("teacher"))) -> None:
    await delete_department(department_id)


@router.get("/semesters", response_model=list[SemesterRead])
async def semesters(department_id: int | None = None, _: User = Depends(get_current_user)) -> list[SemesterRead]:
    return [as_read_semester(item) for item in await list_semesters(department_id)]


@router.get("/semesters/{semester_id}", response_model=SemesterRead)
async def semester_detail(semester_id: int, _: User = Depends(get_current_user)) -> SemesterRead:
    return as_read_semester(await get_semester(semester_id))


@router.post("/semesters", response_model=SemesterRead, status_code=status.HTTP_201_CREATED)
async def semester_create(payload: SemesterCreate, _: User = Depends(require_role("teacher"))) -> SemesterRead:
    return as_read_semester(await create_semester(payload))


@router.patch("/semesters/{semester_id}", response_model=SemesterRead)
async def semester_update(semester_id: int, payload: SemesterUpdate, _: User = Depends(require_role("teacher"))) -> SemesterRead:
    return as_read_semester(await update_semester(semester_id, payload))


@router.delete("/semesters/{semester_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def semester_delete(semester_id: int, _: User = Depends(require_role("teacher"))) -> None:
    await delete_semester(semester_id)


@router.get("/subjects", response_model=list[SubjectRead])
async def subjects(semester_id: int | None = None, _: User = Depends(get_current_user)) -> list[SubjectRead]:
    return [as_read_subject(item) for item in await list_subjects(semester_id)]


@router.get("/subjects/{subject_id}", response_model=SubjectRead)
async def subject_detail(subject_id: int, _: User = Depends(get_current_user)) -> SubjectRead:
    return as_read_subject(await get_subject(subject_id))


@router.post("/subjects", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
async def subject_create(payload: SubjectCreate, _: User = Depends(require_role("teacher"))) -> SubjectRead:
    return as_read_subject(await create_subject(payload))


@router.patch("/subjects/{subject_id}", response_model=SubjectRead)
async def subject_update(subject_id: int, payload: SubjectUpdate, _: User = Depends(require_role("teacher"))) -> SubjectRead:
    return as_read_subject(await update_subject(subject_id, payload))


@router.delete("/subjects/{subject_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def subject_delete(subject_id: int, _: User = Depends(require_role("teacher"))) -> None:
    await delete_subject(subject_id)


@router.get("/units", response_model=list[UnitRead])
async def units(subject_id: int | None = None, _: User = Depends(get_current_user)) -> list[UnitRead]:
    return [as_read_unit(item) for item in await list_units(subject_id)]


@router.get("/units/{unit_id}", response_model=UnitRead)
async def unit_detail(unit_id: int, _: User = Depends(get_current_user)) -> UnitRead:
    return as_read_unit(await get_unit(unit_id))


@router.post("/units", response_model=UnitRead, status_code=status.HTTP_201_CREATED)
async def unit_create(payload: UnitCreate, _: User = Depends(require_role("teacher"))) -> UnitRead:
    return as_read_unit(await create_unit(payload))


@router.patch("/units/{unit_id}", response_model=UnitRead)
async def unit_update(unit_id: int, payload: UnitUpdate, _: User = Depends(require_role("teacher"))) -> UnitRead:
    return as_read_unit(await update_unit(unit_id, payload))


@router.delete("/units/{unit_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def unit_delete(unit_id: int, _: User = Depends(require_role("teacher"))) -> None:
    await delete_unit(unit_id)


@router.get("/topics", response_model=list[TopicRead])
async def topics(unit_id: int | None = None, _: User = Depends(get_current_user)) -> list[TopicRead]:
    return [as_read_topic(item) for item in await list_topics(unit_id)]


@router.get("/topics/{topic_id}", response_model=TopicRead)
async def topic_detail(topic_id: int, _: User = Depends(get_current_user)) -> TopicRead:
    return as_read_topic(await get_topic(topic_id))


@router.post("/topics", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
async def topic_create(payload: TopicCreate, _: User = Depends(require_role("teacher"))) -> TopicRead:
    return as_read_topic(await create_topic(payload))


@router.patch("/topics/{topic_id}", response_model=TopicRead)
async def topic_update(topic_id: int, payload: TopicUpdate, _: User = Depends(require_role("teacher"))) -> TopicRead:
    return as_read_topic(await update_topic(topic_id, payload))


@router.delete("/topics/{topic_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def topic_delete(topic_id: int, _: User = Depends(require_role("teacher"))) -> None:
    await delete_topic(topic_id)


@router.get("/learning-objectives", response_model=list[LearningObjectiveRead])
async def learning_objectives(topic_id: int | None = None, _: User = Depends(get_current_user)) -> list[LearningObjectiveRead]:
    return [as_read_learning_objective(item) for item in await list_learning_objectives(topic_id)]


@router.get("/learning-objectives/{learning_objective_id}", response_model=LearningObjectiveRead)
async def learning_objective_detail(learning_objective_id: int, _: User = Depends(get_current_user)) -> LearningObjectiveRead:
    return as_read_learning_objective(await get_learning_objective(learning_objective_id))


@router.post("/learning-objectives", response_model=LearningObjectiveRead, status_code=status.HTTP_201_CREATED)
async def learning_objective_create(payload: LearningObjectiveCreate, _: User = Depends(require_role("teacher"))) -> LearningObjectiveRead:
    return as_read_learning_objective(await create_learning_objective(payload))


@router.patch("/learning-objectives/{learning_objective_id}", response_model=LearningObjectiveRead)
async def learning_objective_update(
    learning_objective_id: int,
    payload: LearningObjectiveUpdate,
    _: User = Depends(require_role("teacher")),
) -> LearningObjectiveRead:
    return as_read_learning_objective(await update_learning_objective(learning_objective_id, payload))


@router.delete("/learning-objectives/{learning_objective_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def learning_objective_delete(learning_objective_id: int, _: User = Depends(require_role("teacher"))) -> None:
    await delete_learning_objective(learning_objective_id)
