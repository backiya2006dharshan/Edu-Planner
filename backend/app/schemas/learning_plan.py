from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class LearningTaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str = "lesson"
    order_index: int = 0
    is_completed: bool = False

class LearningTaskResponse(LearningTaskBase):
    id: int
    module_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LearningModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int = 0
    status: str = "pending"

class LearningModuleResponse(LearningModuleBase):
    id: int
    learning_plan_id: int
    tasks: List[LearningTaskResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LearningPlanBase(BaseModel):
    subject: str
    topic: str
    learning_goal: str
    status: str = "active"

class LearningPlanResponse(LearningPlanBase):
    id: int
    user_id: int
    modules: List[LearningModuleResponse] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
