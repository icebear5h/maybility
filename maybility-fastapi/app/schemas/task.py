"""Task-related Pydantic schemas (unscheduled items)"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.schemas.enums import TaskStatus, Priority


class TaskBase(BaseModel):
    """Base task schema with common fields"""
    title: str = Field(..., description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    priority: Priority = Field(default=Priority.MEDIUM, description="Task priority")
    color: str = Field(default="#3b82f6", description="Hex color code")
    goalId: Optional[str] = Field(None, description="Associated goal ID")


class TaskCreate(TaskBase):
    """Schema for creating a new task"""
    pass


class TaskUpdate(BaseModel):
    """Schema for updating an existing task"""
    title: Optional[str] = Field(None, description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    priority: Optional[Priority] = Field(None, description="Task priority")
    color: Optional[str] = Field(None, description="Hex color code")
    goalId: Optional[str] = Field(None, description="Associated goal ID")
    status: Optional[TaskStatus] = Field(None, description="Task status")


class TaskResponse(TaskBase):
    """Schema for task response"""
    id: str
    status: TaskStatus
    userId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
