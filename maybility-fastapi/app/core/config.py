"""
Application configuration and settings
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    supabase_url: str
    supabase_anon_key: str  # Public anon key for client-side auth
    supabase_service_key: str  # Service role key (bypasses RLS)

    # FastAPI
    secret_key: str = "development-secret-key-change-in-production"  # Default for development
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # FastMCP
    mcp_server_url: str = "http://localhost:8001"

    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields from .env


settings = Settings()
