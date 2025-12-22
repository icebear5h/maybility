from langgraph.prebuilt import create_react_agent
from langchain_groq import ChatGroq
from langchain_core.tools import tool
import os
import logging
from dotenv import load_dotenv
from contextvars import ContextVar

logger = logging.getLogger(__name__)

# Load environment variables before initializing ChatGroq models
load_dotenv()
try:
    from app.schemas import (
        CreateTaskInput,
        UpdateTaskInput,
        DeleteTaskInput,
        GetTasksInput,
        TaskStatus,
        Priority,
        OccurrenceType,
        AssessInfoInput,
        CreateEventInput,
        UpdateEventInput,
        DeleteEventInput,
        GetEventsInput,
    )
    from .utils import validate_event_times
except ImportError:
    import sys
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    if CURRENT_DIR not in sys.path:
        sys.path.append(CURRENT_DIR)
    # Fallback for standalone script execution
    sys.path.insert(0, os.path.join(CURRENT_DIR, '..', '..'))
    from app.schemas import (
        CreateTaskInput,
        UpdateTaskInput,
        DeleteTaskInput,
        GetTasksInput,
        TaskStatus,
        Priority,
        OccurrenceType,
        AssessInfoInput,
        CreateEventInput,
        UpdateEventInput,
        DeleteEventInput,
        GetEventsInput,
    )
    from utils import validate_event_times
from datetime import datetime
from typing import Optional
import json
import time
import random
import string


def generate_cuid():
    """Generate a cuid-like ID for Prisma compatibility"""
    timestamp = hex(int(time.time() * 1000))[2:]
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
    return f"c{timestamp}{random_part}"

# Context variables to hold per-request data
# This allows tools to access the authenticated client and user info
supabase_context: ContextVar = ContextVar('supabase_context', default=None)
user_id_context: ContextVar = ContextVar('user_id_context', default=None)

# Import default Supabase client (fallback - uses service role to bypass RLS)
default_supabase = None
try:
    from app.db import service_client as default_supabase
except ImportError:
    # Fallback: create client directly when running as script
    try:
        from supabase import create_client
        from dotenv import load_dotenv
        import os

        # Load environment variables
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
        load_dotenv(env_path)

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key to bypass RLS

        if url and key:
            default_supabase = create_client(url, key)
        else:
            print("Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in environment")
    except Exception as e:
        print(f"Warning: Could not create Supabase client: {e}")

def get_supabase():
    """Get the current Supabase client from context or use default"""
    client = supabase_context.get()
    if client is None:
        logger.debug("[GET_SUPABASE] Context is None, using default_supabase")
        client = default_supabase
    else:
        logger.debug("[GET_SUPABASE] Using client from context")
    return client


def get_user_id():
    """Get the current user ID from context"""
    return user_id_context.get()


fastModel = ChatGroq(model = "llama-3.1-8b-instant")
reasoningModel = ChatGroq(model = "openai/gpt-oss-120b")

 

# Tool implementations
@tool(args_schema=CreateTaskInput)
def create_task(
    title: str,
    description: Optional[str] = None,
    priority: Optional[Priority] = None,
    color: Optional[str] = None,
    goalId: Optional[str] = None
) -> dict:
    """Create an UNSCHEDULED task (no start/end time). Use create_event for scheduled items.

    Args:
        title: Task title (required)
        description: Task description
        priority: LOW, MEDIUM, or HIGH (default: MEDIUM)
        color: Hex color code (default: #3b82f6)
        goalId: Associated goal ID

    Returns:
        Dict containing the created task data or error information
    """
    try:
        # Apply defaults for None values
        actual_priority = priority if priority is not None else Priority.MEDIUM
        actual_color = color if color is not None else "#3b82f6"

        # Get user ID from context
        user_id = get_user_id()
        if not user_id:
            return {"error": "User ID not available - authentication required", "status": "failed"}

        # Create task via Supabase
        task_data = {
            "id": generate_cuid(),
            "userId": user_id,
            "title": title,
            "description": description,
            "priority": actual_priority.value,
            "color": actual_color,
            "goalId": goalId,
            "updatedAt": datetime.utcnow().isoformat()
        }

        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        result = supabase.table("events").insert(task_data).execute()
        
        if result.data:
            return {"task": result.data[0], "status": "created"}
        else:
            return {"error": "Failed to create task", "status": "failed"}
            
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@tool(args_schema=UpdateTaskInput)
def update_task(
    taskId: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    priority: Optional[Priority] = None,
    color: Optional[str] = None,
    goalId: Optional[str] = None,
    status: Optional[TaskStatus] = None
) -> dict:
    """Update an existing task/event.
    
    Args:
        taskId: Task ID to update
        title: Task title
        description: Task description
        startTime: Start time in UTC
        endTime: End time in UTC
        timezone: IANA timezone
        occurrenceType: SINGLE or RRULE
        rrule: RRULE string for recurring events
        priority: LOW, MEDIUM, or HIGH
        color: Hex color code
        goalId: Associated goal ID
        status: Task status
    
    Returns:
        Dict containing the updated task data or error information
    """
    try:
        # Build update data with only provided fields
        update_data = {}
        
        if title is not None:
            update_data["title"] = title
        if description is not None:
            update_data["description"] = description
        if priority is not None:
            update_data["priority"] = priority.value
        if color is not None:
            update_data["color"] = color
        if goalId is not None:
            update_data["goalId"] = goalId
        if status is not None:
            update_data["status"] = status.value
        
        # Update task via Supabase
        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        result = supabase.table("events").update(update_data).eq("id", taskId).execute()
        
        if result.data:
            return {"task": result.data[0], "status": "updated"}
        else:
            return {"error": "Task not found or update failed", "status": "failed"}
            
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@tool(args_schema=DeleteTaskInput)
def delete_task(taskId: str) -> dict:
    """Delete a task/event.
    
    Args:
        taskId: Task ID to delete
    
    Returns:
        Dict containing the deletion result or error information
    """
    try:
        # Delete task via Supabase
        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        result = supabase.table("events").delete().eq("id", taskId).execute()
        
        if result.data:
            return {"task": result.data[0], "status": "deleted"}
        else:
            return {"error": "Task not found or deletion failed", "status": "failed"}
            
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@tool(args_schema=GetTasksInput)
def get_tasks(
    status: Optional[TaskStatus] = None,
    priority: Optional[Priority] = None,
    goalId: Optional[str] = None,
    keywords: Optional[list] = None
) -> dict:
    """Retrieve UNSCHEDULED tasks (items without startTime/endTime). Use get_events for scheduled items.

    Args:
        status: Filter by status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
        priority: Filter by priority (LOW, MEDIUM, HIGH)
        goalId: Filter by associated goal ID
        keywords: Search keywords to match in title/description

    Returns:
        Dict containing the list of tasks or error information
    """
    try:
        # Build query
        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        query = supabase.table("events").select("*")
        
        # Apply filters
        if status:
            query = query.eq("status", status.value)
        if priority:
            query = query.eq("priority", priority.value)
        if goalId:
            query = query.eq("goalId", goalId)
        
        # Execute query
        result = query.order("startTime").execute()
        
        # Client-side filtering: only unscheduled tasks (no startTime and no endTime)
        items = result.data or []
        tasks = [t for t in items if not t.get("startTime") and not t.get("endTime")]
        
        # Filter by keywords if provided (client-side filtering)
        if keywords:
            filtered_tasks = []
            for task in tasks:
                task_text = f"{task.get('title', '')} {task.get('description', '')}".lower()
                if any(keyword.lower() in task_text for keyword in keywords):
                    filtered_tasks.append(task)
            tasks = filtered_tasks
        
        return {"tasks": tasks, "status": "found"}
            
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@tool(args_schema=CreateEventInput)
def create_event(
    title: str,
    description: Optional[str] = None,
    startTime: datetime = None,
    endTime: datetime = None,
    timezone: Optional[str] = None,
    occurrenceType: Optional[OccurrenceType] = None,
    rrule: Optional[str] = None,
    priority: Optional[Priority] = None,
    color: Optional[str] = None,
    goalId: Optional[str] = None
) -> dict:
    """Create a SCHEDULED event with start/end time. Use create_task for unscheduled items.

    Args:
        title: Event title (required)
        startTime: Start time in UTC (required)
        endTime: End time in UTC (required)
        description: Event description
        timezone: IANA timezone (e.g., America/New_York)
        occurrenceType: SINGLE or RRULE (default: SINGLE)
        rrule: RRULE string for recurring events (required if occurrenceType=RRULE)
        priority: LOW, MEDIUM, or HIGH (default: MEDIUM)
        color: Hex color code (default: #3b82f6)
        goalId: Associated goal ID

    Returns:
        Dict containing the created event data or error information
    """
    try:
        # Apply defaults for None values
        actual_occurrence = occurrenceType if occurrenceType is not None else OccurrenceType.SINGLE
        actual_priority = priority if priority is not None else Priority.MEDIUM
        actual_color = color if color is not None else "#3b82f6"

        is_valid, error = validate_event_times(
            startTime.isoformat() if startTime else "",
            endTime.isoformat() if endTime else ""
        )
        if not is_valid:
            return {"error": error, "status": "validation_failed"}

        # Get user ID from context
        user_id = get_user_id()
        if not user_id:
            return {"error": "User ID not available - authentication required", "status": "failed"}

        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        data = {
            "id": generate_cuid(),
            "userId": user_id,
            "title": title,
            "description": description,
            "startTime": startTime.isoformat(),
            "endTime": endTime.isoformat(),
            "timezone": timezone,
            "occurrenceType": actual_occurrence.value,
            "rrule": rrule,
            "priority": actual_priority.value,
            "color": actual_color,
            "goalId": goalId,
            "updatedAt": datetime.utcnow().isoformat()
        }
        result = supabase.table("events").insert(data).execute()
        if result.data:
            return {"event": result.data[0], "status": "created"}
        return {"error": "Failed to create event", "status": "failed"}
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@tool(args_schema=UpdateEventInput)
def update_event(
    eventId: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    startTime: Optional[datetime] = None,
    endTime: Optional[datetime] = None,
    timezone: Optional[str] = None,
    occurrenceType: Optional[OccurrenceType] = None,
    rrule: Optional[str] = None,
    priority: Optional[Priority] = None,
    color: Optional[str] = None,
    goalId: Optional[str] = None,
    status: Optional[TaskStatus] = None
) -> dict:
    try:
        update_data = {}
        if title is not None:
            update_data["title"] = title
        if description is not None:
            update_data["description"] = description
        if startTime is not None:
            update_data["startTime"] = startTime.isoformat()
        if endTime is not None:
            update_data["endTime"] = endTime.isoformat()
        if timezone is not None:
            update_data["timezone"] = timezone
        if occurrenceType is not None:
            update_data["occurrenceType"] = occurrenceType.value
        if rrule is not None:
            update_data["rrule"] = rrule
        if priority is not None:
            update_data["priority"] = priority.value
        if color is not None:
            update_data["color"] = color
        if goalId is not None:
            update_data["goalId"] = goalId
        if status is not None:
            update_data["status"] = status.value

        if ("startTime" in update_data) and ("endTime" in update_data):
            is_valid, error = validate_event_times(
                update_data["startTime"], update_data["endTime"]
            )
            if not is_valid:
                return {"error": error, "status": "validation_failed"}
        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        result = supabase.table("events").update(update_data).eq("id", eventId).execute()
        if result.data:
            return {"event": result.data[0], "status": "updated"}
        return {"error": "Event not found or update failed", "status": "failed"}
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@tool(args_schema=DeleteEventInput)
def delete_event(eventId: str) -> dict:
    try:
        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        result = supabase.table("events").delete().eq("id", eventId).execute()
        if result.data:
            return {"event": result.data[0], "status": "deleted"}
        return {"error": "Event not found or deletion failed", "status": "failed"}
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@tool(args_schema=GetEventsInput)
def get_events(
    startTime: Optional[datetime] = None,
    endTime: Optional[datetime] = None,
    status: Optional[TaskStatus] = None,
    priority: Optional[Priority] = None,
    goalId: Optional[str] = None,
    occurrenceType: Optional[OccurrenceType] = None,
    keywords: Optional[list] = None
) -> dict:
    """Retrieve SCHEDULED events (items with startTime/endTime). Use get_tasks for unscheduled items.

    Args:
        startTime: Filter events starting on or after this time (UTC)
        endTime: Filter events ending on or before this time (UTC)
        status: Filter by status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
        priority: Filter by priority (LOW, MEDIUM, HIGH)
        goalId: Filter by associated goal ID
        occurrenceType: Filter by SINGLE or RRULE
        keywords: Search keywords to match in title/description

    Returns:
        Dict containing the list of events or error information
    """
    try:
        logger.debug("[GET_EVENTS] Starting get_events tool")
        supabase = get_supabase()
        if supabase is None:
            logger.error("[GET_EVENTS] Supabase client is None!")
            return {"error": "Supabase client unavailable", "status": "failed"}
        logger.debug("[GET_EVENTS] Got supabase client, building query...")
        query = supabase.table("events").select("*")
        if startTime:
            query = query.gte("startTime", startTime.isoformat())
        if endTime:
            query = query.lte("endTime", endTime.isoformat())
        if status:
            query = query.eq("status", status.value)
        if priority:
            query = query.eq("priority", priority.value)
        if goalId:
            query = query.eq("goalId", goalId)
        if occurrenceType:
            query = query.eq("occurrenceType", occurrenceType.value)
        result = query.order("startTime").execute()
        items = result.data or []
        events = [t for t in items if t.get("startTime") and t.get("endTime")]
        if keywords:
            filtered = []
            for ev in events:
                text = f"{ev.get('title', '')} {ev.get('description', '')}".lower()
                if any(k.lower() in text for k in keywords):
                    filtered.append(ev)
            events = filtered
        logger.debug(f"[GET_EVENTS] Found {len(events)} events")
        return {"events": events, "status": "found"}
    except Exception as e:
        logger.error(f"[GET_EVENTS] Exception: {type(e).__name__}: {e}")
        return {"error": str(e), "status": "failed"}

@tool(args_schema=AssessInfoInput)
def assess_information(
    intent: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    startTime: Optional[datetime] = None,
    endTime: Optional[datetime] = None,
    timezone: Optional[str] = None,
    occurrenceType: Optional[OccurrenceType] = None,
    rrule: Optional[str] = None,
    conflictPolicy: Optional[str] = None,
) -> dict:
    missing = []
    notes = []
    needs_conflict_policy = False

    normalized_intent = (intent or "").strip().lower()
    # Heuristics: classify as event if recurring, explicitly mentions event/schedule, or times provided
    is_event_intent = (
        (occurrenceType == OccurrenceType.RRULE)
        or ("recurr" in normalized_intent)
        or ("event" in normalized_intent)
        or ("schedule" in normalized_intent)
        or (startTime is not None or endTime is not None)
    )

    if is_event_intent:
        # For events, require title and both times. If recurring, also require rrule and ask conflict policy.
        for field_name, val in [
            ("title", title),
            ("startTime", startTime),
            ("endTime", endTime),
        ]:
            if not val:
                missing.append(field_name)
        if occurrenceType == OccurrenceType.RRULE or "recurr" in normalized_intent:
            if not rrule:
                missing.append("rrule")
            needs_conflict_policy = conflictPolicy is None
        # timezone is helpful but optional unless provided times are local; we can request it as a nice-to-have
        if not timezone:
            notes.append("timezone not provided; assuming UTC if times are UTC")
    else:
        # For unscheduled tasks, require only title
        if not title:
            missing.append("title")

    if startTime and endTime and startTime >= endTime:
        notes.append("startTime must be before endTime")

    clarifying = None
    if missing:
        clarifying = (
            f"Before I proceed with {intent}, I need: " + ", ".join(missing) + "."
        )
    elif needs_conflict_policy:
        clarifying = (
            "For recurring events, how should I handle conflicts with existing tasks? "
            "Options: move earlier, move later, skip conflicting instance, reschedule, or ask each time."
        )
    else:
        if occurrenceType == OccurrenceType.RRULE or "recurr" in normalized_intent:
            clarifying = (
                "This may create recurrence conflicts. If I detect a conflict with an existing task, "
                "do you want me to move the conflicting task before I do that, skip that instance, or ask first?"
            )

    sufficient = len(missing) == 0 and (not needs_conflict_policy)
    return {
        "sufficient": sufficient,
        "missing": missing,
        "clarifyingQuestion": clarifying,
        "notes": notes,
        "intent": intent,
    }

# System prompt for calendar agent
CALENDAR_SYSTEM_PROMPT = """You are a helpful calendar assistant. Use the available tools to manage calendar tasks and events.

IMPORTANT: You will receive current time information (UTC and local timezone).
Use this to interpret relative times like 'tomorrow', 'next week', 'in 2 hours', etc.

WORKFLOW RULES:
1. Call assess_information FIRST if you need to verify missing information
2. After getting tool results, ALWAYS interpret and synthesize them before responding
3. DO NOT retry the same tool with different parameters unless the first call failed
4. For date queries, use the full day range (00:00:00Z to 23:59:59Z)

When creating events:
- Convert all times to UTC format: YYYY-MM-DDTHH:MM:SSZ
- Use the provided current time to calculate relative dates

CRITICAL: When calling assess_information, extract and pass concrete values:
- For 'today', use the current local date from the time context
- For 'tomorrow', calculate the next day
- For 'next Monday', calculate the date based on current day
- DO NOT pass relative terms like 'today' to assess_information - use actual dates

RESPONSE FORMAT:
- After tool calls, provide a clear interpretation of results
- Synthesize multiple events into a readable summary
- Include relevant details (times, locations, attendees)
"""

# Calendar tools list
calendar_tools = [
    create_task,
    update_task,
    delete_task,
    get_tasks,
    create_event,
    update_event,
    delete_event,
    get_events,
    assess_information,
]

# Create the base LangGraph react agent with tools
_base_calendar_agent = create_react_agent(
    model=reasoningModel,
    tools=calendar_tools,
    prompt=CALENDAR_SYSTEM_PROMPT,
)

class CalendarAgent:
    """Wrapper for calendar agent that handles orchestrator state format"""
    
    def __init__(self, base_agent):
        self.agent = base_agent
    
    def invoke(self, state: dict, config: dict = None):
        """
        Handle orchestrator state format with task list.

        Args:
            state: {
                "messages": [...],
                "context": "...",
                "tasks": [{"description": "...", "order": 1, ...}, ...],
                "user_id": "...",  # User ID for RLS
                ...
            }
            config: {
                "configurable": {
                    "supabase": <client>,  # Authenticated Supabase client
                    ...
                }
            }

        Returns:
            Results from executing all tasks
        """
        from langchain_core.messages import HumanMessage
        from datetime import datetime
        import pytz

        logger.debug("=" * 50)
        logger.debug("[CALENDAR_AGENT] invoke() called")
        logger.debug(f"[CALENDAR_AGENT] Config received: {config is not None}")

        # Extract Supabase client and user_id from config and set in context
        supabase_client = None
        user_id = None
        if config and "configurable" in config:
            supabase_client = config["configurable"].get("supabase")
            user_id = config["configurable"].get("user_id")
            logger.debug(f"[CALENDAR_AGENT] Supabase client from config: {supabase_client is not None}")
            logger.debug(f"[CALENDAR_AGENT] User ID from config: {user_id}")
        else:
            logger.debug("[CALENDAR_AGENT] No config or configurable - will use default_supabase")

        # Also check state for user_id (fallback)
        if not user_id:
            user_id = state.get("user_id")
            if user_id:
                logger.debug(f"[CALENDAR_AGENT] User ID from state: {user_id}")

        if supabase_client is None:
            logger.debug(f"[CALENDAR_AGENT] Falling back to default_supabase: {default_supabase is not None}")

        # Set context variables for tools to use
        supabase_token = supabase_context.set(supabase_client)
        user_id_token = user_id_context.set(user_id)

        try:
            tasks = state.get("tasks", [])
            context = state.get("context", "")
        
            # Get current time in UTC and user's timezone (if available)
            now_utc = datetime.now(pytz.UTC)
            user_timezone = state.get("user_timezone", "America/New_York")  # Default to EST
            
            try:
                user_tz = pytz.timezone(user_timezone)
                now_local = now_utc.astimezone(user_tz)
                time_context = f"""
Current time information:
- UTC: {now_utc.strftime('%Y-%m-%d %H:%M:%S %Z')}
- Local ({user_timezone}): {now_local.strftime('%Y-%m-%d %H:%M:%S %Z')}
- Day of week: {now_local.strftime('%A')}

Use this to interpret relative times like "tomorrow", "next Monday", "in 2 hours", etc.
"""
            except:
                time_context = f"""
Current time (UTC): {now_utc.strftime('%Y-%m-%d %H:%M:%S %Z')}
"""
            
            # Sort tasks by order
            sorted_tasks = sorted(tasks, key=lambda t: t.get("order", 0))
            
            # Build a comprehensive message with all tasks
            task_descriptions = "\n".join([
                f"{i+1}. {task.get('description', '')}" 
                for i, task in enumerate(sorted_tasks)
            ])
            
            message_content = f"""{time_context}

Context: {context}

Tasks to complete (in order):
{task_descriptions}

Please execute these tasks in the order specified."""
            
            # LangGraph agents expect dict with messages key
            agent_input = {
                "messages": [HumanMessage(content=message_content)]
            }
            
            # Invoke the base agent
            result = self.agent.invoke(agent_input)
            
            return {
                "tasks_completed": len(sorted_tasks),
                "result": result
            }
        finally:
            # Reset context variables
            supabase_context.reset(supabase_token)
            user_id_context.reset(user_id_token)

# Export the wrapped agent
calendar_agent = CalendarAgent(_base_calendar_agent)


if __name__ == "__main__":
    # Test the agent
    test_state = {
        "context": "User wants to check their calendar",
        "tasks": [
            {"description": "Get all tasks for this week", "order": 1, "assigned_agent": "calendar_agent"},
            {"description": "Create a new event for tomorrow at 10 AM", "order": 2, "assigned_agent": "calendar_agent"}
        ]
    }
    response = calendar_agent.invoke(test_state)
    print(response)
