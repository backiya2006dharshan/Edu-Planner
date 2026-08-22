from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func, Boolean
from sqlalchemy.orm import mapped_column, relationship

from app.db.database import Base


class TimestampMixin:
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SourceMetadataMixin:
    document_id = mapped_column(Integer, nullable=True, index=True)
    source_type = mapped_column(String(100), nullable=True, index=True)
    page_number = mapped_column(Integer, nullable=True)
    source_reference = mapped_column(String(255), nullable=True)


class Department(Base, TimestampMixin):
    __tablename__ = "departments"
    __table_args__ = (Index("uq_departments_code", "code", unique=True),)

    id = mapped_column(Integer, primary_key=True, index=True)
    code = mapped_column(String(50), nullable=True, index=True)
    name = mapped_column(String(255), nullable=False, index=True)
    description = mapped_column(Text, nullable=True)
    is_active = mapped_column(Boolean, default=True, nullable=False)

    semesters = relationship("Semester", back_populates="department", cascade="all, delete-orphan")


class Semester(Base, TimestampMixin):
    __tablename__ = "semesters"
    __table_args__ = (Index("uq_semesters_department_number", "department_id", "number", unique=True),)

    id = mapped_column(Integer, primary_key=True, index=True)
    department_id = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    number = mapped_column(Integer, nullable=False)
    name = mapped_column(String(255), nullable=True)
    description = mapped_column(Text, nullable=True)

    department = relationship("Department", back_populates="semesters")
    subjects = relationship("Subject", back_populates="semester", cascade="all, delete-orphan")


class Subject(Base, TimestampMixin):
    __tablename__ = "subjects"
    __table_args__ = (Index("uq_subjects_semester_name", "semester_id", "name", unique=True),)

    id = mapped_column(Integer, primary_key=True, index=True)
    semester_id = mapped_column(ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False, index=True)
    name = mapped_column(String(255), nullable=False)
    code = mapped_column(String(50), nullable=True, index=True)
    description = mapped_column(Text, nullable=True)

    semester = relationship("Semester", back_populates="subjects")
    units = relationship("Unit", back_populates="subject", cascade="all, delete-orphan")


class Unit(Base, TimestampMixin):
    __tablename__ = "units"
    __table_args__ = (Index("uq_units_subject_name", "subject_id", "name", unique=True),)

    id = mapped_column(Integer, primary_key=True, index=True)
    subject_id = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = mapped_column(String(255), nullable=False)
    order_index = mapped_column(Integer, nullable=True, index=True)
    description = mapped_column(Text, nullable=True)

    subject = relationship("Subject", back_populates="units")
    topics = relationship("Topic", back_populates="unit", cascade="all, delete-orphan")


class Topic(Base, TimestampMixin, SourceMetadataMixin):
    __tablename__ = "topics"
    __table_args__ = (Index("uq_topics_unit_name", "unit_id", "name", unique=True),)

    id = mapped_column(Integer, primary_key=True, index=True)
    unit_id = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    name = mapped_column(String(255), nullable=False)
    order_index = mapped_column(Integer, nullable=True, index=True)
    description = mapped_column(Text, nullable=True)

    unit = relationship("Unit", back_populates="topics")
    learning_objectives = relationship("LearningObjective", back_populates="topic", cascade="all, delete-orphan")


class LearningObjective(Base, TimestampMixin, SourceMetadataMixin):
    __tablename__ = "learning_objectives"
    __table_args__ = (Index("uq_learning_objectives_topic_name", "topic_id", "name", unique=True),)

    id = mapped_column(Integer, primary_key=True, index=True)
    topic_id = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    name = mapped_column(String(255), nullable=False)
    order_index = mapped_column(Integer, nullable=True, index=True)
    description = mapped_column(Text, nullable=True)

    topic = relationship("Topic", back_populates="learning_objectives")
