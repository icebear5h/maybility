from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.tools import tool
import os
from dotenv import load_dotenv
from contextvars import ContextVar

# Load environment variables before initializing ChatGroq models
load_dotenv()
try:
    from .models import (
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
    from models import (
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

# Context variable to hold the per-request Supabase client
# This allows tools to access the authenticated client for the current user
supabase_context: ContextVar = ContextVar('supabase_context', default=None)

# Import default Supabase client (fallback)
default_supabase = None
try:
    from app.db import public_client as default_supabase
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
        key = os.getenv("SUPABASE_ANON_KEY")
        
        if url and key:
            default_supabase = create_client(url, key)
        else:
            print("Warning: SUPABASE_URL or SUPABASE_ANON_KEY not found in environment")
    except Exception as e:
        print(f"Warning: Could not create Supabase client: {e}")

def get_supabase():
    """Get the current Supabase client from context or use default"""
    client = supabase_context.get()
    if client is None:
        client = default_supabase
    return client

fastModel = ChatGroq(model = "llama-3.1-8b-instant")
reasoningModel = ChatGroq(model = "openai/gpt-oss-120b")

 

# Tool implementations
@tool(args_schema=CreateTaskInput)
def create_task(
    title: str,
    description: Optional[str] = None,
    priority: Priority = Priority.MEDIUM,
    color: str = "#3b82f6",
    goalId: Optional[str] = None
) -> dict:
    """Create a new task/event.
    
    Args:
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
    
    Returns:
        Dict containing the created task data or error information
    """
    try:
        # Create task via Supabase
        task_data = {
            "title": title,
            "description": description,
            "priority": priority.value,
            "color": color,
            "goalId": goalId
        }
        
        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        result = supabase.table("tasks").insert(task_data).execute()
        
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
        result = supabase.table("tasks").update(update_data).eq("id", taskId).execute()
        
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
        result = supabase.table("tasks").delete().eq("id", taskId).execute()
        
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
    """Retrieve unscheduled tasks (items without startTime and endTime).
    
    Note: startTime/endTime filters are ignored for tasks since tasks are, by definition, unscheduled.
    Other filters (status, priority, goalId, occurrenceType, keywords) still apply.
    
    Returns:
        Dict containing the search results or error information
    """
    try:
        # Build query
        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        query = supabase.table("tasks").select("*")
        
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
    occurrenceType: OccurrenceType = OccurrenceType.SINGLE,
    rrule: Optional[str] = None,
    priority: Priority = Priority.MEDIUM,
    color: str = "#3b82f6",
    goalId: Optional[str] = None
) -> dict:
    try:
        is_valid, error = validate_event_times(
            startTime.isoformat() if startTime else "",
            endTime.isoformat() if endTime else ""
        )
        if not is_valid:
            return {"error": error, "status": "validation_failed"}
        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        data = {
            "title": title,
            "description": description,
            "startTime": startTime.isoformat(),
            "endTime": endTime.isoformat(),
            "timezone": timezone,
            "occurrenceType": occurrenceType.value,
            "rrule": rrule,
            "priority": priority.value,
            "color": color,
            "goalId": goalId
        }
        result = supabase.table("tasks").insert(data).execute()
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
        result = supabase.table("tasks").update(update_data).eq("id", eventId).execute()
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
        result = supabase.table("tasks").delete().eq("id", eventId).execute()
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
    try:
        supabase = get_supabase()
        if supabase is None:
            return {"error": "Supabase client unavailable", "status": "failed"}
        query = supabase.table("tasks").select("*")
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
        return {"events": events, "status": "found"}
    except Exception as e:
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

# Create the base LangChain calendar agent with tools
_base_calendar_agent = create_agent(
    model=reasoningModel,
    tools=[
        create_task,
        update_task,
        delete_task,
        get_tasks,
        create_event,
        update_event,
        delete_event,
        get_events,
        assess_information,
    ],
    system_prompt=(
        "You are a helpful calendar assistant. Use the available tools to manage calendar tasks and events.\n\n"
        "IMPORTANT: You will receive current time information (UTC and local timezone). "
        "Use this to interpret relative times like 'tomorrow', 'next week', 'in 2 hours', etc.\n\n"
        "WORKFLOW RULES:\n"
        "1. Call assess_information FIRST if you need to verify missing information\n"
        "2. After getting tool results, ALWAYS interpret and synthesize them before responding\n"
        "3. DO NOT retry the same tool with different parameters unless the first call failed\n"
        "4. For date queries, use the full day range (00:00:00Z to 23:59:59Z)\n\n"
        "When creating events:\n"
        "- Convert all times to UTC format: YYYY-MM-DDTHH:MM:SSZ\n"
        "- Use the provided current time to calculate relative dates\n\n"
        "CRITICAL: When calling assess_information, extract and pass concrete values:\n"
        "- For 'today', use the current local date from the time context\n"
        "- For 'tomorrow', calculate the next day\n"
        "- For 'next Monday', calculate the date based on current day\n"
        "- DO NOT pass relative terms like 'today' to assess_information - use actual dates\n\n"
        "RESPONSE FORMAT:\n"
        "- After tool calls, provide a clear interpretation of results\n"
        "- Synthesize multiple events into a readable summary\n"
        "- Include relevant details (times, locations, attendees)\n"
    ),
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
        
        # Extract Supabase client from config and set in context
        supabase_client = None
        if config and "configurable" in config:
            supabase_client = config["configurable"].get("supabase")
        
        # Set the Supabase client in context for tools to use
        token = supabase_context.set(supabase_client)
        
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
            # Reset the context variable
            supabase_context.reset(token)

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
