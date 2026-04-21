from enum import Enum, IntEnum
from datetime import datetime
from typing import Any, Dict, Optional, Callable, Coroutine
from pydantic import BaseModel, Field, validator
import uuid

class TaskPriority(IntEnum):
    LOW = 3
    MEDIUM = 2
    HIGH = 1
    CRITICAL = 0

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.now)
    retries: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None

    class Config:
        use_enum_values = True

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Task name cannot be empty')
        return v
