import re
from datetime import datetime
from typing import Optional

def validate_utc_iso_format(datetime_str: str) -> bool:
    """
    Validate if a string is in proper UTC ISO 8601 format.
    
    Valid formats:
    - 2025-01-15T10:00:00Z
    - 2025-01-15T10:00:00.000Z
    
    Returns:
        bool: True if valid, False otherwise
    """
    if not datetime_str:
        return False
    
    # Regex for UTC ISO 8601 format
    utc_iso_pattern = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$'
    
    if not re.match(utc_iso_pattern, datetime_str):
        return False
    
    # Additional validation: try to parse the datetime
    try:
        # Remove milliseconds if present for parsing
        clean_str = datetime_str.split('.')[0] + 'Z' if '.' in datetime_str else datetime_str
        datetime.fromisoformat(clean_str.replace('Z', '+00:00'))
        return True
    except ValueError:
        return False

def validate_event_times(start_time: str, end_time: str) -> tuple[bool, Optional[str]]:
    """
    Validate that start_time and end_time are valid UTC times and start_time < end_time.
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not validate_utc_iso_format(start_time):
        return False, "Invalid start_time format. Use UTC ISO 8601 format (e.g., 2025-01-15T10:00:00Z)"
    
    if not validate_utc_iso_format(end_time):
        return False, "Invalid end_time format. Use UTC ISO 8601 format (e.g., 2025-01-15T11:00:00Z)"
    
    try:
        # Parse both times
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        if start_dt >= end_dt:
            return False, "start_time must be before end_time"
        
        return True, None
    except ValueError as e:
        return False, f"Invalid datetime: {str(e)}"

def parse_natural_datetime(datetime_str: str) -> Optional[str]:
    """
    Convert natural language datetime to UTC ISO format.
    This is a placeholder - you might want to use a library like dateparser.
    
    Args:
        datetime_str: Natural language datetime (e.g., "tomorrow at 2pm")
    
    Returns:
        UTC ISO string or None if parsing fails
    """
    # TODO: Implement natural language parsing
    # For now, just validate if it's already in ISO format
    if validate_utc_iso_format(datetime_str):
        return datetime_str
    return None
