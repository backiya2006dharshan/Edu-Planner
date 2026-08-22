from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CurriculumSourcePayload(BaseModel):
    document_id: int | None = Field(default=None, ge=1)
    source_type: str | None = Field(default=None, max_length=100)
    page_number: int | None = Field(default=None, ge=1)
    source_reference: str | None = Field(default=None, max_length=255)


class DepartmentBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class DepartmentRead(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class SemesterBase(BaseModel):
    department_id: int = Field(ge=1)
    number: int = Field(ge=1)
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class SemesterCreate(SemesterBase):
    pass


class SemesterUpdate(BaseModel):
    number: int | None = Field(default=None, ge=1)
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class SemesterRead(SemesterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class SubjectBase(BaseModel):
    semester_id: int = Field(ge=1)
    name: str = Field(min_length=2, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=2000)


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=2000)


class SubjectRead(SubjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class UnitBase(BaseModel):
    subject_id: int = Field(ge=1)
    name: str = Field(min_length=2, max_length=255)
    order_index: int | None = Field(default=None, ge=1)
    description: str | None = Field(default=None, max_length=2000)


class UnitCreate(UnitBase):
    pass


class UnitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    order_index: int | None = Field(default=None, ge=1)
    description: str | None = Field(default=None, max_length=2000)


class UnitRead(UnitBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class TopicBase(CurriculumSourcePayload):
    unit_id: int = Field(ge=1)
    name: str = Field(min_length=2, max_length=255)
    order_index: int | None = Field(default=None, ge=1)
    description: str | None = Field(default=None, max_length=2000)


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    order_index: int | None = Field(default=None, ge=1)
    description: str | None = Field(default=None, max_length=2000)
    document_id: int | None = Field(default=None, ge=1)
    source_type: str | None = Field(default=None, max_length=100)
    page_number: int | None = Field(default=None, ge=1)
    source_reference: str | None = Field(default=None, max_length=255)


class TopicRead(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class LearningObjectiveBase(CurriculumSourcePayload):
    topic_id: int = Field(ge=1)
    name: str = Field(min_length=2, max_length=255)
    order_index: int | None = Field(default=None, ge=1)
    description: str | None = Field(default=None, max_length=2000)


class LearningObjectiveCreate(LearningObjectiveBase):
    pass


class LearningObjectiveUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    order_index: int | None = Field(default=None, ge=1)
    description: str | None = Field(default=None, max_length=2000)
    document_id: int | None = Field(default=None, ge=1)
    source_type: str | None = Field(default=None, max_length=100)
    page_number: int | None = Field(default=None, ge=1)
    source_reference: str | None = Field(default=None, max_length=255)


class LearningObjectiveRead(LearningObjectiveBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class LearningObjectiveTreeRead(LearningObjectiveRead):
    pass


class TopicTreeRead(TopicRead):
    learning_objectives: list[LearningObjectiveTreeRead] = Field(default_factory=list)


class UnitTreeRead(UnitRead):
    topics: list[TopicTreeRead] = Field(default_factory=list)


class SubjectTreeRead(SubjectRead):
    units: list[UnitTreeRead] = Field(default_factory=list)


class SemesterTreeRead(SemesterRead):
    subjects: list[SubjectTreeRead] = Field(default_factory=list)


class DepartmentTreeRead(DepartmentRead):
    semesters: list[SemesterTreeRead] = Field(default_factory=list)


class CurriculumTreeResponse(BaseModel):
    departments: list[DepartmentTreeRead]
