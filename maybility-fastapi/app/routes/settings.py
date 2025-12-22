"""
Settings API routes for agent configuration and prompts
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Optional
from app.agents.prompts import load_prompt

router = APIRouter()


class AgentSettings(BaseModel):
    fastModel: str = "llama-3.1-8b-instant"
    reasoningModel: str = "openai/gpt-oss-120b"
    routerThreshold: float = 0.7
    enableComplexPath: bool = True
    customPrompts: Optional[Dict[str, Optional[str]]] = None


# In-memory cache for runtime settings per user
_user_settings_cache: Dict[str, AgentSettings] = {}


@router.get("/prompts")
async def get_default_prompts() -> Dict[str, str]:
    """Return all default prompt templates."""
    prompt_names = ["router", "simple_responder", "orchestrator", "synthesizer", "set_tasks"]
    prompts = {}

    for name in prompt_names:
        try:
            prompts[name] = load_prompt(name)
        except FileNotFoundError:
            prompts[name] = ""

    return prompts


@router.get("/agent-settings/{user_id}")
async def get_agent_settings(user_id: str) -> AgentSettings:
    """Get agent settings for a user (from cache or defaults)."""
    return _user_settings_cache.get(user_id, AgentSettings())


@router.put("/agent-settings/{user_id}")
async def update_agent_settings(user_id: str, settings: AgentSettings) -> AgentSettings:
    """Update agent settings for a user."""
    _user_settings_cache[user_id] = settings
    return settings
