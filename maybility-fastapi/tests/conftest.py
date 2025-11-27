"""
Pytest configuration and shared fixtures
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from typing import Generator, Dict, Any

# Import app components
from app.main import app
from app.schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    EventCreate, EventUpdate, EventResponse,
    TaskStatus, Priority, OccurrenceType
)


# ============================================================================
# API Test Client
# ============================================================================

@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI test client"""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers() -> Dict[str, str]:
    """Mock authentication headers"""
    return {
        "Authorization": "Bearer mock-jwt-token-for-testing"
    }


# ============================================================================
# Mock External Services
# ============================================================================

@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    mock = MagicMock()

    # Mock table responses
    mock.table.return_value.select.return_value.execute.return_value.data = []
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "test-id-123", "userId": "user-123"}
    ]
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {"id": "test-id-123"}
    ]
    mock.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [
        {"id": "test-id-123"}
    ]

    return mock


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    mock = MagicMock()
    mock.get.return_value = None
    mock.setex.return_value = True
    mock.ping.return_value = True
    return mock


@pytest.fixture
def mock_llm():
    """Mock LLM for agent testing"""
    mock = MagicMock()
    mock.invoke.return_value.content = "Mocked LLM response"
    return mock


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_user() -> Dict[str, Any]:
    """Sample user data"""
    return {
        "id": "user-123",
        "email": "test@example.com",
        "name": "Test User",
        "timezone": "America/New_York",
        "calendarType": "INTERNAL"
    }


@pytest.fixture
def sample_task() -> TaskCreate:
    """Sample task creation data"""
    return TaskCreate(
        title="Test Task",
        description="This is a test task",
        priority=Priority.MEDIUM,
        color="#3b82f6",
        goalId=None
    )


@pytest.fixture
def sample_task_response() -> TaskResponse:
    """Sample task response"""
    return TaskResponse(
        id="task-123",
        title="Test Task",
        description="This is a test task",
        priority=Priority.MEDIUM,
        color="#3b82f6",
        goalId=None,
        status=TaskStatus.TODO,
        userId="user-123",
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )


@pytest.fixture
def sample_event() -> EventCreate:
    """Sample event creation data"""
    now = datetime.utcnow()
    return EventCreate(
        title="Test Meeting",
        description="This is a test meeting",
        startTime=now + timedelta(days=1, hours=14),
        endTime=now + timedelta(days=1, hours=15),
        timezone="America/New_York",
        occurrenceType=OccurrenceType.SINGLE,
        priority=Priority.HIGH,
        color="#ef4444"
    )


@pytest.fixture
def sample_event_response() -> EventResponse:
    """Sample event response"""
    now = datetime.utcnow()
    return EventResponse(
        id="event-123",
        title="Test Meeting",
        description="This is a test meeting",
        startTime=now + timedelta(days=1, hours=14),
        endTime=now + timedelta(days=1, hours=15),
        timezone="America/New_York",
        occurrenceType=OccurrenceType.SINGLE,
        rrule=None,
        priority=Priority.HIGH,
        color="#ef4444",
        goalId=None,
        status=TaskStatus.TODO,
        userId="user-123",
        createdAt=now,
        updatedAt=now
    )


# ============================================================================
# Agent Testing Fixtures
# ============================================================================

@pytest.fixture
def sample_agent_state() -> Dict[str, Any]:
    """Sample agent state for testing"""
    return {
        "messages": [{"role": "user", "content": "What's on my calendar today?"}],
        "context": "",
        "goal": "",
        "route_decision": "",
        "tasks": [],
        "agent_results": [],
        "final_response": "",
        "user_timezone": "America/New_York",
        "user_id": "user-123"
    }


@pytest.fixture
def sample_calendar_tasks() -> list:
    """Sample tasks for calendar agent"""
    return [
        {
            "description": "Get events for today",
            "assigned_agent": "calendar_agent",
            "dependencies": [],
            "order": 1
        }
    ]


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest.fixture
def db_task_record() -> Dict[str, Any]:
    """Sample database task record"""
    now = datetime.utcnow()
    return {
        "id": "task-123",
        "title": "Test Task",
        "description": "Test description",
        "priority": "MEDIUM",
        "color": "#3b82f6",
        "goalId": None,
        "status": "TODO",
        "userId": "user-123",
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat(),
        "startTime": None,
        "endTime": None
    }


@pytest.fixture
def db_event_record() -> Dict[str, Any]:
    """Sample database event record"""
    now = datetime.utcnow()
    start = now + timedelta(days=1, hours=14)
    end = now + timedelta(days=1, hours=15)

    return {
        "id": "event-123",
        "title": "Test Meeting",
        "description": "Test meeting description",
        "startTime": start.isoformat(),
        "endTime": end.isoformat(),
        "timezone": "America/New_York",
        "occurrenceType": "SINGLE",
        "rrule": None,
        "priority": "HIGH",
        "color": "#ef4444",
        "goalId": None,
        "status": "TODO",
        "userId": "user-123",
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat()
    }


# ============================================================================
# Utility Functions
# ============================================================================

@pytest.fixture
def freeze_time():
    """Fixture to freeze time for consistent datetime testing"""
    frozen = datetime(2025, 1, 15, 12, 0, 0)

    def _freeze():
        return frozen

    return _freeze
