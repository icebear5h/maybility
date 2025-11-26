"""
Task management routes with Supabase dependency injection
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.models.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskStatus, 
    RecurrenceException, RecurringOverride
)
from app.db import get_supabase
from app.routes.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    supabase = Depends(get_supabase),
    current_user: dict = Depends(get_current_user)
):
    """Create a new task."""
    try:
        task_dict = task_data.dict()
        task_dict["user_id"] = current_user["id"]
        
        result = supabase.table("tasks").insert(task_dict).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create task")
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[TaskStatus] = Query(None),
    supabase = Depends(get_supabase),
    current_user: dict = Depends(get_current_user)
):
    """Get tasks for the current user."""
    try:
        query = supabase.table("tasks").select("*").eq("user_id", current_user["id"])
        
        if start_date:
            query = query.gte("start_time", start_date.isoformat())
        if end_date:
            query = query.lte("end_time", end_date.isoformat())
        if status:
            query = query.eq("status", status.value)
        
        result = query.execute()
        return result.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    supabase = Depends(get_supabase),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific task."""
    try:
        result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = result.data[0]
        
        # Verify ownership
        if task["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this task")
        
        return task
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_updates: TaskUpdate,
    supabase = Depends(get_supabase),
    current_user: dict = Depends(get_current_user)
):
    """Update a task."""
    try:
        # Verify task exists and belongs to user
        existing_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        
        if not existing_result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        existing_task = existing_result.data[0]
        if existing_task["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to update this task")
        
        # Update task
        updates_dict = task_updates.dict(exclude_unset=True)
        result = supabase.table("tasks").update(updates_dict).eq("id", task_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update task")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    supabase = Depends(get_supabase),
    current_user: dict = Depends(get_current_user)
):
    """Delete a task."""
    try:
        # Verify task exists and belongs to user
        existing_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        
        if not existing_result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        existing_task = existing_result.data[0]
        if existing_task["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this task")
        
        result = supabase.table("tasks").delete().eq("id", task_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to delete task")
        
        return {"message": "Task deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/exceptions")
async def create_exception(
    task_id: str,
    exception_data: RecurrenceException,
    supabase = Depends(get_supabase),
    current_user: dict = Depends(get_current_user)
):
    """Create a recurrence exception for a task."""
    try:
        # Verify task ownership
        existing_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        
        if not existing_result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        existing_task = existing_result.data[0]
        if existing_task["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to modify this task")
        
        exception_dict = exception_data.dict()
        exception_dict["event_id"] = task_id
        
        result = supabase.table("recurring_exceptions").insert(exception_dict).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create exception")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/overrides")
async def create_override(
    task_id: str,
    override_data: RecurringOverride,
    supabase = Depends(get_supabase),
    current_user: dict = Depends(get_current_user)
):
    """Create a recurring override for a task."""
    try:
        # Verify task ownership
        existing_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        
        if not existing_result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        existing_task = existing_result.data[0]
        if existing_task["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to modify this task")
        
        override_dict = override_data.dict()
        override_dict["event_id"] = task_id
        
        result = supabase.table("recurring_overrides").insert(override_dict).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create override")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
