from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class StudentSkill(Base):
    __tablename__ = "student_skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    skill_category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    score: Mapped[float] = mapped_column(Integer, nullable=False, default=0)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class StudentSkillHistory(Base):
    __tablename__ = "student_skill_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    skill_category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    score: Mapped[float] = mapped_column(Integer, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class DiagnosticQuestion(Base):
    __tablename__ = "diagnostic_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    text: Mapped[str] = mapped_column(String, nullable=False)
    options: Mapped[list[str]] = mapped_column(JSON, nullable=False)  # Storing list of options
    correct_answer: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[str] = mapped_column(String, nullable=True)
    skill_category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class DiagnosticAssessment(Base):
    __tablename__ = "diagnostic_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class DiagnosticAttempt(Base):
    __tablename__ = "diagnostic_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_assessments.id", ondelete="CASCADE"), index=True, nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_questions.id", ondelete="CASCADE"), index=True, nullable=False)
    selected_answer: Mapped[str] = mapped_column(String, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=True)
