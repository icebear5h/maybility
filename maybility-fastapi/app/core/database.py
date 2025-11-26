"""
Database dependency injection for Supabase
"""

# core/database.py
from supabase import create_client
from app.core.config import settings

public_client = create_client(settings.supabase_url, settings.supabase_anon_key)

def with_user_jwt(access_token: str):
    # Clone or reuse the base client; then attach JWT to PostgREST for this request
    client = public_client
    try:
        client.postgrest.auth(access_token)
    except Exception:
        client.postgrest.headers["Authorization"] = f"Bearer {access_token}"
    return client