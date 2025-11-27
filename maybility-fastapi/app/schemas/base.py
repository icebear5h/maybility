"""Base schemas with common fields"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TimestampMixin(BaseModel):
    """Mixin for created_at and updated_at timestamps"""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class IDMixin(BaseModel):
    """Mixin for ID field"""
    id: str = Field(..., description="Unique identifier")
