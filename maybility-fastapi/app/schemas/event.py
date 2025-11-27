"""Event-related Pydantic schemas (scheduled items with times)"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.schemas.enums import TaskStatus, Priority, OccurrenceType


class EventBase(BaseModel):
    """Base event schema with common fields"""
    title: str = Field(..., description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    startTime: datetime = Field(..., description="Start time in UTC")
    endTime: datetime = Field(..., description="End time in UTC")
    timezone: Optional[str] = Field(None, description="IANA timezone")
    occurrenceType: OccurrenceType = Field(default=OccurrenceType.SINGLE, description="Occurrence type")
    rrule: Optional[str] = Field(None, description="RRULE string for recurring events")
    priority: Priority = Field(default=Priority.MEDIUM, description="Event priority")
    color: str = Field(default="#3b82f6", description="Hex color code")
    goalId: Optional[str] = Field(None, description="Associated goal ID")


class EventCreate(EventBase):
    """Schema for creating a new event"""
    pass


class EventUpdate(BaseModel):
    """Schema for updating an existing event"""
    title: Optional[str] = Field(None, description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    startTime: Optional[datetime] = Field(None, description="Start time in UTC")
    endTime: Optional[datetime] = Field(None, description="End time in UTC")
    timezone: Optional[str] = Field(None, description="IANA timezone")
    occurrenceType: Optional[OccurrenceType] = Field(None, description="Occurrence type")
    rrule: Optional[str] = Field(None, description="RRULE string for recurring events")
    priority: Optional[Priority] = Field(None, description="Event priority")
    color: Optional[str] = Field(None, description="Hex color code")
    goalId: Optional[str] = Field(None, description="Associated goal ID")
    status: Optional[TaskStatus] = Field(None, description="Event status")


class EventResponse(EventBase):
    """Schema for event response"""
    id: str
    status: TaskStatus
    userId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class RecurrenceException(BaseModel):
    """Schema for recurrence exceptions"""
    event_id: str
    occurrence_date: datetime
    reason: Optional[str] = None


class RecurringOverride(BaseModel):
    """Schema for recurring overrides"""
    event_id: str
    occurrence_date: datetime
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    title: Optional[str] = None
    description: Optional[str] = None
