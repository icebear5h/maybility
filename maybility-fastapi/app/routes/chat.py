# routes/chat.py
from uuid import uuid4
from fastapi import APIRouter, Request
from app.core.auth import get_bearer_token
from app.core.cache import get_user_context
from app.db import with_user_jwt
from app.agents.orchestrator import orchestratorAgent

router = APIRouter()

@router.post("/chat")
async def chat_endpoint(request: Request, payload: dict):
    token = get_bearer_token(request)
    user_ctx = get_user_context(token)           # optional cache (user_id, exp)
    supabase = with_user_jwt(token)              # per-request client (RLS)

    thread_id = payload.get("threadId") or str(uuid4())
    
    # Get user timezone: payload > database > default UTC
    user_timezone = payload.get("timezone")
    
    if not user_timezone and user_ctx.get("user_id"):
        # Fetch from user profile in database
        try:
            user_profile = supabase.table("users").select("timezone").eq("id", user_ctx.get("user_id")).execute()
            if user_profile.data and len(user_profile.data) > 0:
                user_timezone = user_profile.data[0].get("timezone")
        except Exception as e:
            print(f"Warning: Could not fetch user timezone: {e}")
    
    # Default to UTC if still not found
    if not user_timezone:
        user_timezone = "UTC"

    initial_state = {
        "messages": payload.get("messages", []),
        "context": payload.get("context", ""),
        "goal": "",
        "route_decision": "",
        "tasks": [],
        "agent_results": [],
        "final_response": "",
        "user_id": user_ctx.get("user_id"),      # OK to persist (non-secret)
        "user_timezone": user_timezone,          # User's IANA timezone
    }

    # Runtime-only config (not persisted by checkpointer)
    config = {
        "configurable": {
            "thread_id": thread_id,              # tells checkpointer which thread to resume
            "supabase": supabase,                # per-request client
            "user_id": user_ctx.get("user_id"),  # convenience
        }
    }

    result = orchestratorAgent.invoke(initial_state, config=config)
    return {"threadId": thread_id, "result": result}