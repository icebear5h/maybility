"""Pydantic schemas for request/response validation"""

from app.schemas.enums import TaskStatus, Priority, OccurrenceType
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskBase,
)
from app.schemas.event import (
    EventCreate,
    EventUpdate,
    EventResponse,
    EventBase,
    RecurrenceException,
    RecurringOverride,
)
from app.schemas.agent import (
    CreateTaskInput,
    UpdateTaskInput,
    DeleteTaskInput,
    GetTasksInput,
    CreateEventInput,
    UpdateEventInput,
    DeleteEventInput,
    GetEventsInput,
    AssessInfoInput,
)
from app.schemas.auth import (
    Token,
    TokenData,
    UserCreate,
    UserResponse,
)
from app.schemas.chat import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
)

__all__ = [
    # Enums
    "TaskStatus",
    "Priority",
    "OccurrenceType",
    # Tasks
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "TaskBase",
    # Events
    "EventCreate",
    "EventUpdate",
    "EventResponse",
    "EventBase",
    "RecurrenceException",
    "RecurringOverride",
    # Agent schemas
    "CreateTaskInput",
    "UpdateTaskInput",
    "DeleteTaskInput",
    "GetTasksInput",
    "CreateEventInput",
    "UpdateEventInput",
    "DeleteEventInput",
    "GetEventsInput",
    "AssessInfoInput",
    # Auth
    "Token",
    "TokenData",
    "UserCreate",
    "UserResponse",
    # Chat
    "ChatMessage",
    "ChatRequest",
    "ChatResponse",
]
