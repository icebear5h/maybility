"""
Authentication routes - Session validation only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas import UserResponse
from app.db import get_supabase

router = APIRouter()
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase = Depends(get_supabase)
):
    """Validate Supabase session and return current user."""
    token = credentials.credentials
    
    try:
        # Validate JWT with Supabase
        user = supabase.auth.get_user(token)
        
        if not user or not user.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user profile from our users table
        result = supabase.table("users").select("*").eq("id", user.data.id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile not found"
            )
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Validate session and return current user profile."""
    return current_user


@router.post("/validate")
async def validate_session(current_user: dict = Depends(get_current_user)):
    """Validate if session is still active."""
    return {"valid": True, "user": current_user}
