"""
Supabase database client - Simple exportable client
"""

from supabase import create_client
from app.core.config import settings

# Public client with anon key
public_client = create_client(settings.supabase_url, settings.supabase_anon_key)

def with_user_jwt(access_token: str):
    """Attach user JWT to client for RLS"""
    client = public_client
    try:
        client.postgrest.auth(access_token)
    except Exception:
        client.postgrest.headers["Authorization"] = f"Bearer {access_token}"
    return client

def get_supabase():
    """FastAPI dependency for Supabase client"""
    return public_client
