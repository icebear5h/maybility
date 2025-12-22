"""
Supabase database client - Simple exportable client
"""

from supabase import create_client
from app.core.config import settings

# Public client with anon key (for unauthenticated operations - blocked by RLS)
public_client = create_client(settings.supabase_url, settings.supabase_anon_key)

# Service role client (bypasses RLS - use for dev or server-side operations)
service_client = create_client(settings.supabase_url, settings.supabase_service_key)


def with_user_jwt(access_token: str):
    """
    Create a new Supabase client with user's JWT for RLS.

    IMPORTANT: Creates a fresh client instance per request to avoid
    sharing auth state between users.
    """
    # Create a new client instance for this user
    client = create_client(settings.supabase_url, settings.supabase_anon_key)

    # Attach the user's JWT
    try:
        client.postgrest.auth(access_token)
    except Exception:
        client.postgrest.headers["Authorization"] = f"Bearer {access_token}"

    return client


def get_supabase():
    """FastAPI dependency for Supabase client"""
    return public_client
