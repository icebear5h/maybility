# Database Module

Simple, exportable Supabase client configuration.

## Structure

```
app/db/
├── __init__.py      # Exports: public_client, with_user_jwt, get_supabase
├── client.py        # Supabase client initialization
├── schema.sql       # Database schema (reference)
└── README.md        # This file
```

## Usage

### Import the client

```python
from app.db import public_client, with_user_jwt, get_supabase
```

### Public client (requires user JWT for RLS)

```python
from app.db import public_client

# Query will respect Row Level Security policies
result = public_client.table("tasks").select("*").execute()
```

### With user JWT (authenticated)

```python
from app.db import with_user_jwt

client = with_user_jwt(user_access_token)
result = client.table("tasks").select("*").execute()
```

### FastAPI dependency

```python
from fastapi import Depends
from app.db import get_supabase

@router.get("/tasks")
async def get_tasks(supabase = Depends(get_supabase)):
    result = supabase.table("tasks").select("*").execute()
    return result.data
```

## Configuration

Required environment variables in `.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

## Files using this module

- `app/routes/auth.py` - Authentication routes
- `app/routes/tasks.py` - Task management routes  
- `app/routes/chat.py` - Chat endpoint
- `app/agents/internal_calendar_agent.py` - Calendar agent

## Testing

Run the connection test:

```bash
python3 test_supabase_connection.py
```
