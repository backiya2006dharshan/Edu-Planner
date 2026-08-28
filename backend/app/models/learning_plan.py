from datetime import datetime
from sqlalchemy import Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

class LearningPlan(Base):
    __tablename__ = "learning_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    subject: Mapped[str] = mapped_column(String(255), index=True)
    topic: Mapped[str] = mapped_column(String(255))
    learning_goal: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="active", index=True)  # active, completed, archived
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", backref="learning_plans")  # type: ignore
    modules: Mapped[list["LearningModule"]] = relationship("LearningModule", back_populates="learning_plan", cascade="all, delete-orphan", order_by="LearningModule.order_index")


class LearningModule(Base):
    __tablename__ = "learning_modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    learning_plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("learning_plans.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, in_progress, completed
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    learning_plan: Mapped["LearningPlan"] = relationship("LearningPlan", back_populates="modules")
    tasks: Mapped[list["LearningTask"]] = relationship("LearningTask", back_populates="module", cascade="all, delete-orphan", order_by="LearningTask.order_index")


class LearningTask(Base):
    __tablename__ = "learning_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey("learning_modules.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(String(50), default="lesson")  # lesson, practice, assessment
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    module: Mapped["LearningModule"] = relationship("LearningModule", back_populates="tasks")
