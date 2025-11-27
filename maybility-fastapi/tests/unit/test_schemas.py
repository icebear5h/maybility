"""
Unit tests for Pydantic schemas
"""

import pytest
from datetime import datetime, timedelta
from pydantic import ValidationError

from app.schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    EventCreate, EventUpdate, EventResponse,
    TaskStatus, Priority, OccurrenceType,
    CreateTaskInput, CreateEventInput,
    Token, UserCreate
)


# ============================================================================
# Enum Tests
# ============================================================================

class TestEnums:
    """Test enum values and behavior"""

    def test_task_status_values(self):
        """Test TaskStatus enum has correct values"""
        assert TaskStatus.TODO == "TODO"
        assert TaskStatus.IN_PROGRESS == "IN_PROGRESS"
        assert TaskStatus.DONE == "DONE"

    def test_priority_values(self):
        """Test Priority enum has correct values"""
        assert Priority.LOW == "LOW"
        assert Priority.MEDIUM == "MEDIUM"
        assert Priority.HIGH == "HIGH"

    def test_occurrence_type_values(self):
        """Test OccurrenceType enum has correct values"""
        assert OccurrenceType.SINGLE == "SINGLE"
        assert OccurrenceType.RRULE == "RRULE"


# ============================================================================
# Task Schema Tests
# ============================================================================

class TestTaskSchemas:
    """Test task-related schemas"""

    def test_task_create_minimal(self):
        """Test TaskCreate with minimal required fields"""
        task = TaskCreate(title="Test Task")

        assert task.title == "Test Task"
        assert task.description is None
        assert task.priority == Priority.MEDIUM  # Default
        assert task.color == "#3b82f6"  # Default
        assert task.goalId is None

    def test_task_create_full(self):
        """Test TaskCreate with all fields"""
        task = TaskCreate(
            title="Test Task",
            description="Test description",
            priority=Priority.HIGH,
            color="#ff0000",
            goalId="goal-123"
        )

        assert task.title == "Test Task"
        assert task.description == "Test description"
        assert task.priority == Priority.HIGH
        assert task.color == "#ff0000"
        assert task.goalId == "goal-123"

    def test_task_create_invalid_priority(self):
        """Test TaskCreate rejects invalid priority"""
        with pytest.raises(ValidationError) as exc:
            TaskCreate(title="Test", priority="INVALID")

        assert "priority" in str(exc.value)

    def test_task_update_partial(self):
        """Test TaskUpdate allows partial updates"""
        update = TaskUpdate(title="Updated Title")

        assert update.title == "Updated Title"
        assert update.description is None
        assert update.priority is None

    def test_task_response_structure(self, sample_task_response):
        """Test TaskResponse has required fields"""
        task = sample_task_response

        assert task.id is not None
        assert task.title is not None
        assert task.status in TaskStatus
        assert task.userId is not None
        assert isinstance(task.createdAt, datetime)
        assert isinstance(task.updatedAt, datetime)


# ============================================================================
# Event Schema Tests
# ============================================================================

class TestEventSchemas:
    """Test event-related schemas"""

    def test_event_create_minimal(self):
        """Test EventCreate with minimal required fields"""
        now = datetime.utcnow()
        start = now + timedelta(hours=1)
        end = now + timedelta(hours=2)

        event = EventCreate(
            title="Test Event",
            startTime=start,
            endTime=end
        )

        assert event.title == "Test Event"
        assert event.startTime == start
        assert event.endTime == end
        assert event.occurrenceType == OccurrenceType.SINGLE  # Default
        assert event.priority == Priority.MEDIUM  # Default

    def test_event_create_recurring(self):
        """Test EventCreate with RRULE"""
        now = datetime.utcnow()
        start = now + timedelta(hours=1)
        end = now + timedelta(hours=2)

        event = EventCreate(
            title="Weekly Meeting",
            startTime=start,
            endTime=end,
            occurrenceType=OccurrenceType.RRULE,
            rrule="FREQ=WEEKLY;COUNT=10"
        )

        assert event.occurrenceType == OccurrenceType.RRULE
        assert event.rrule == "FREQ=WEEKLY;COUNT=10"

    def test_event_requires_times(self):
        """Test EventCreate requires startTime and endTime"""
        with pytest.raises(ValidationError) as exc:
            EventCreate(title="Test Event")

        error_str = str(exc.value)
        assert "startTime" in error_str or "endTime" in error_str

    def test_event_update_partial(self):
        """Test EventUpdate allows partial updates"""
        update = EventUpdate(title="Updated Event")

        assert update.title == "Updated Event"
        assert update.startTime is None
        assert update.endTime is None


# ============================================================================
# Agent Schema Tests
# ============================================================================

class TestAgentSchemas:
    """Test agent-specific input schemas"""

    def test_create_task_input(self):
        """Test CreateTaskInput for agent tools"""
        task_input = CreateTaskInput(
            title="Agent Task",
            priority=Priority.HIGH
        )

        assert task_input.title == "Agent Task"
        assert task_input.priority == Priority.HIGH

    def test_create_event_input(self):
        """Test CreateEventInput for agent tools"""
        now = datetime.utcnow()
        start = now + timedelta(hours=1)
        end = now + timedelta(hours=2)

        event_input = CreateEventInput(
            title="Agent Event",
            startTime=start,
            endTime=end,
            timezone="America/New_York"
        )

        assert event_input.title == "Agent Event"
        assert event_input.timezone == "America/New_York"


# ============================================================================
# Auth Schema Tests
# ============================================================================

class TestAuthSchemas:
    """Test authentication schemas"""

    def test_token_schema(self):
        """Test Token schema"""
        token = Token(
            access_token="test-token-123",
            token_type="bearer"
        )

        assert token.access_token == "test-token-123"
        assert token.token_type == "bearer"

    def test_user_create_validation(self):
        """Test UserCreate validates email and password"""
        user = UserCreate(
            email="test@example.com",
            password="securepassword123"
        )

        assert user.email == "test@example.com"
        assert user.password == "securepassword123"

    def test_user_create_invalid_email(self):
        """Test UserCreate rejects invalid email"""
        with pytest.raises(ValidationError) as exc:
            UserCreate(
                email="not-an-email",
                password="password123"
            )

        assert "email" in str(exc.value).lower()

    def test_user_create_short_password(self):
        """Test UserCreate rejects short password"""
        with pytest.raises(ValidationError) as exc:
            UserCreate(
                email="test@example.com",
                password="short"
            )

        assert "password" in str(exc.value).lower()


# ============================================================================
# Schema Serialization Tests
# ============================================================================

class TestSchemaSerialization:
    """Test schema serialization/deserialization"""

    def test_task_json_serialization(self, sample_task):
        """Test TaskCreate can be serialized to JSON"""
        json_data = sample_task.model_dump()

        assert isinstance(json_data, dict)
        assert json_data["title"] == sample_task.title
        assert json_data["priority"] == sample_task.priority.value

    def test_task_json_deserialization(self):
        """Test TaskCreate can be created from JSON"""
        json_data = {
            "title": "JSON Task",
            "description": "From JSON",
            "priority": "HIGH",
            "color": "#00ff00"
        }

        task = TaskCreate(**json_data)

        assert task.title == "JSON Task"
        assert task.priority == Priority.HIGH

    def test_event_datetime_serialization(self, sample_event):
        """Test EventCreate serializes datetime correctly"""
        json_data = sample_event.model_dump()

        # Datetimes should be serialized
        assert "startTime" in json_data
        assert "endTime" in json_data
