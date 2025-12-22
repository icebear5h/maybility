# schemas/chat.py
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict


class ChatMessage(BaseModel):
    """Single message in conversation."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class AgentSettingsPayload(BaseModel):
    """Agent configuration settings from frontend."""
    fastModel: str = Field(default="llama-3.1-8b-instant", description="Fast model for routing and simple queries")
    reasoningModel: str = Field(default="openai/gpt-oss-120b", description="Reasoning model for complex tasks")
    routerThreshold: float = Field(default=0.7, description="Confidence threshold for routing")
    enableComplexPath: bool = Field(default=True, description="Enable multi-agent orchestration")
    customPrompts: Optional[Dict[str, Optional[str]]] = Field(default=None, description="Custom prompt overrides")


class ChatRequest(BaseModel):
    """Request payload for chat endpoint."""
    messages: List[ChatMessage] = Field(default_factory=list, description="Conversation history")
    context: str = Field(default="", description="Additional context (RAG chunks, selected entry, etc.)")
    timezone: Optional[str] = Field(default=None, description="User's IANA timezone (e.g., 'America/New_York')")
    threadId: Optional[str] = Field(default=None, description="Thread ID for conversation continuity")
    agentSettings: Optional[AgentSettingsPayload] = Field(default=None, description="Agent configuration settings")


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    threadId: str = Field(..., description="Thread ID for this conversation")
    response: str = Field(..., description="Assistant's response text")
    agentResults: Optional[List[Dict[str, Any]]] = Field(default=None, description="Raw agent results if needed")
