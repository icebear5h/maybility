from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"

class Priority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class OccurrenceType(str, Enum):
    SINGLE = "SINGLE"
    RRULE = "RRULE"

class CreateTaskInput(BaseModel):
    """Input schema for creating a task"""
    title: str = Field(description="Task title")
    description: Optional[str] = Field(default=None, description="Task description")
    priority: Priority = Field(default=Priority.MEDIUM, description="Task priority")
    color: str = Field(default="#3b82f6", description="Hex color code")
    goalId: Optional[str] = Field(default=None, description="Associated goal ID")

class UpdateTaskInput(BaseModel):
    """Input schema for updating a task"""
    taskId: str = Field(description="Task ID to update")
    title: Optional[str] = Field(default=None, description="Task title")
    description: Optional[str] = Field(default=None, description="Task description")
    priority: Optional[Priority] = Field(default=None, description="Task priority")
    color: Optional[str] = Field(default=None, description="Hex color code")
    goalId: Optional[str] = Field(default=None, description="Associated goal ID")
    status: Optional[TaskStatus] = Field(default=None, description="Task status")

class DeleteTaskInput(BaseModel):
    """Input schema for deleting a task"""
    taskId: str = Field(description="Task ID to delete")

class GetTasksInput(BaseModel):
    """Input schema for retrieving tasks"""
    status: Optional[TaskStatus] = Field(default=None, description="Filter by status")
    priority: Optional[Priority] = Field(default=None, description="Filter by priority")
    goalId: Optional[str] = Field(default=None, description="Filter by goal ID")
    keywords: Optional[List[str]] = Field(default=None, description="Search keywords")

class CreateEventInput(BaseModel):
    """Input schema for creating a timed event (task with required times)"""
    title: str = Field(description="Event title")
    description: Optional[str] = Field(default=None, description="Event description")
    startTime: datetime = Field(description="Start time in UTC")
    endTime: datetime = Field(description="End time in UTC")
    timezone: Optional[str] = Field(default=None, description="IANA timezone")
    occurrenceType: OccurrenceType = Field(default=OccurrenceType.SINGLE, description="Occurrence type")
    rrule: Optional[str] = Field(default=None, description="RRULE string for recurring events")
    priority: Priority = Field(default=Priority.MEDIUM, description="Event priority")
    color: str = Field(default="#3b82f6", description="Hex color code")
    goalId: Optional[str] = Field(default=None, description="Associated goal ID")

class UpdateEventInput(BaseModel):
    """Input schema for updating an event"""
    eventId: str = Field(description="Event ID to update")
    title: Optional[str] = Field(default=None, description="Event title")
    description: Optional[str] = Field(default=None, description="Event description")
    startTime: Optional[datetime] = Field(default=None, description="Start time in UTC")
    endTime: Optional[datetime] = Field(default=None, description="End time in UTC")
    timezone: Optional[str] = Field(default=None, description="IANA timezone")
    occurrenceType: Optional[OccurrenceType] = Field(default=None, description="Occurrence type")
    rrule: Optional[str] = Field(default=None, description="RRULE string for recurring events")
    priority: Optional[Priority] = Field(default=None, description="Event priority")
    color: Optional[str] = Field(default=None, description="Hex color code")
    goalId: Optional[str] = Field(default=None, description="Associated goal ID")
    status: Optional[TaskStatus] = Field(default=None, description="Event status")

class DeleteEventInput(BaseModel):
    """Input schema for deleting an event"""
    eventId: str = Field(description="Event ID to delete")

class GetEventsInput(BaseModel):
    """Input schema for retrieving events"""
    startTime: Optional[datetime] = Field(default=None, description="Start date for filtering")
    endTime: Optional[datetime] = Field(default=None, description="End date for filtering")
    status: Optional[TaskStatus] = Field(default=None, description="Filter by status")
    priority: Optional[Priority] = Field(default=None, description="Filter by priority")
    goalId: Optional[str] = Field(default=None, description="Filter by goal ID")
    occurrenceType: Optional[OccurrenceType] = Field(default=None, description="Filter by occurrence type")
    keywords: Optional[List[str]] = Field(default=None, description="Search keywords")

class AssessInfoInput(BaseModel):
    """Input schema for assessing information sufficiency for calendar operations"""
    intent: str = Field(description="What the user wants to do (e.g., 'create recurring meeting', 'move task')")
    title: Optional[str] = Field(default=None, description="Task title if applicable")
    description: Optional[str] = Field(default=None, description="Task description if applicable")
    startTime: Optional[datetime] = Field(default=None, description="Proposed start time (UTC)")
    endTime: Optional[datetime] = Field(default=None, description="Proposed end time (UTC)")
    timezone: Optional[str] = Field(default=None, description="IANA timezone")
    occurrenceType: Optional[OccurrenceType] = Field(default=None, description="SINGLE or RRULE")
    rrule: Optional[str] = Field(default=None, description="RRULE string for recurrence if occurrenceType=RRULE")
    conflictPolicy: Optional[str] = Field(default=None, description="How to handle conflicts: move | skip | reschedule | ask")
