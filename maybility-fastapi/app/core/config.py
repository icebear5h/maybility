"""
Application configuration and settings
"""

from pydantic import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    supabase_url: str
    supabase_anon_key: str  # Public anon key for client-side auth
    supabase_service_key: str  # Service role key (bypasses RLS)
    
    # FastAPI
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # FastMCP
    mcp_server_url: str = "http://localhost:8001"
    
    class Config:
        env_file = ".env"


settings = Settings()
