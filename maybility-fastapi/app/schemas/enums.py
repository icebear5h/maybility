"""Shared enums for the application"""

from enum import Enum


class TaskStatus(str, Enum):
    """Task/Event status enumeration"""
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class Priority(str, Enum):
    """Priority level enumeration"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class OccurrenceType(str, Enum):
    """Event occurrence type enumeration"""
    SINGLE = "SINGLE"
    RRULE = "RRULE"
