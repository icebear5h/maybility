# routes/chat.py
from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException, status
from app.db import with_user_jwt, service_client
from app.schemas import ChatRequest, ChatResponse
from app.agents.orchestrator import orchestratorAgent
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def get_optional_bearer_token(request: Request) -> str | None:
    """Extract Bearer token if present, return None if missing."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: Request, payload: ChatRequest):
    """
    Chat endpoint that routes messages through the orchestrator agent.

    Auth is optional for development - if no token provided, uses service client (bypasses RLS).
    """
    logger.debug("=" * 60)
    logger.debug("[CHAT_ENDPOINT] Incoming request")
    logger.debug(f"[CHAT_ENDPOINT] Messages: {[m.content[:100] for m in payload.messages]}")
    logger.debug(f"[CHAT_ENDPOINT] Context: {payload.context[:200] if payload.context else 'None'}")
    logger.debug(f"[CHAT_ENDPOINT] Thread ID: {payload.threadId}")

    # Try to get auth token (optional)
    token = get_optional_bearer_token(request)
    user_id = None
    supabase = service_client  # Default to service client (bypasses RLS for dev)

    if token:
        try:
            from app.core.cache import get_user_context
            user_ctx = get_user_context(token)
            user_id = user_ctx.get("user_id")
            supabase = with_user_jwt(token)
            logger.debug(f"[CHAT_ENDPOINT] Authenticated user: {user_id}")
        except Exception as e:
            logger.warning(f"Auth failed, using service client: {e}")
    else:
        logger.debug("[CHAT_ENDPOINT] No auth token - using service client (RLS bypassed)")

    thread_id = payload.threadId or str(uuid4())

    # Resolve timezone: payload > database > UTC
    user_timezone = payload.timezone
    if not user_timezone and user_id:
        try:
            user_profile = (
                supabase.table("users")
                .select("timezone")
                .eq("id", user_id)
                .execute()
            )
            if user_profile.data and len(user_profile.data) > 0:
                user_timezone = user_profile.data[0].get("timezone")
        except Exception as e:
            logger.warning(f"Could not fetch user timezone: {e}")

    user_timezone = user_timezone or "UTC"
    logger.debug(f"[CHAT_ENDPOINT] Timezone: {user_timezone}")

    # Convert Pydantic messages to dicts for LangGraph
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    logger.debug(f"[CHAT_ENDPOINT] Converted messages: {messages}")

    initial_state = {
        "messages": messages,
        "context": payload.context,
        "goal": "",
        "route_decision": "",
        "tasks": [],
        "agent_results": [],
        "final_response": "",
        "user_id": user_id,
        "user_timezone": user_timezone,
    }

    # Runtime config (not persisted by checkpointer)
    config = {
        "configurable": {
            "thread_id": thread_id,
            "supabase": supabase,
            "user_id": user_id,
            "agent_settings": payload.agentSettings.model_dump() if payload.agentSettings else None,
        }
    }

    logger.debug("[CHAT_ENDPOINT] Invoking orchestratorAgent...")
    try:
        result = orchestratorAgent.invoke(initial_state, config=config)
    except Exception as e:
        logger.error(f"Orchestrator error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent processing failed: {str(e)}",
        )

    logger.debug(f"[CHAT_ENDPOINT] Orchestrator result keys: {result.keys()}")
    logger.debug(f"[CHAT_ENDPOINT] Route decision was: {result.get('route_decision')}")

    # Extract response from result
    final_response = result.get("final_response", "")
    if not final_response:
        logger.debug("[CHAT_ENDPOINT] No final_response - checking messages fallback")
        # Fallback: try to get last message content
        messages = result.get("messages", [])
        if messages:
            last_msg = messages[-1]
            if hasattr(last_msg, "content"):
                final_response = last_msg.content
            elif isinstance(last_msg, dict):
                final_response = last_msg.get("content", "No response generated")

    logger.debug(f"[CHAT_ENDPOINT] Final response: '{final_response[:200] if final_response else 'None'}...'")
    logger.debug("=" * 60)

    return ChatResponse(
        threadId=thread_id,
        response=final_response,
        agentResults=result.get("agent_results"),
    )
