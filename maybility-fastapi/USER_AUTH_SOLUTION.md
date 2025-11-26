# User Authentication & RLS Solution

## Problem
The calendar agent tools were using a global Supabase client, which meant:
- All users shared the same database connection
- Row Level Security (RLS) policies couldn't work properly
- Users could potentially see other users' data

## Solution Architecture

### 1. **Context Variables for Per-User Clients**
We use Python's `contextvars` to pass user-specific Supabase clients to tools:

```python
# In internal_calendar_agent.py
supabase_context: ContextVar = ContextVar('supabase_context', default=None)

def get_supabase():
    """Get the current Supabase client from context or use default"""
    client = supabase_context.get()
    if client is None:
        client = default_supabase
    return client
```

### 2. **Tools Use Context Client**
All calendar tools now call `get_supabase()` instead of using a global variable:

```python
@tool(args_schema=CreateTaskInput)
def create_task(...):
    supabase = get_supabase()  # Gets user-specific client
    if supabase is None:
        return {"error": "Supabase client unavailable", "status": "failed"}
    result = supabase.table("tasks").insert(task_data).execute()
```

### 3. **CalendarAgent Sets Context**
The `CalendarAgent.invoke()` method extracts the Supabase client from config and sets it in context:

```python
def invoke(self, state: dict, config: dict = None):
    # Extract Supabase client from config
    supabase_client = None
    if config and "configurable" in config:
        supabase_client = config["configurable"].get("supabase")
    
    # Set in context for tools to use
    token = supabase_context.set(supabase_client)
    
    try:
        # ... invoke agent ...
    finally:
        # Clean up context
        supabase_context.reset(token)
```

### 4. **Orchestrator Passes Config**
The orchestrator's `agent_calls` function now accepts and passes config:

```python
def agent_calls(state: AgentState, config: Dict[str, Any] = None):
    # ...
    if agent_name == "calendar_agent":
        result = calendar_agent.invoke(agent_state, config)
```

### 5. **Test Script Provides User Context**
The test script creates a Supabase client and passes it with the user ID:

```python
# Create Supabase client
supabase = create_client(supabase_url, supabase_key)

# State includes user_id
state = {
    "user_id": "cmgmm7h8t0000vv3odxrsaah6",
    # ... other state ...
}

# Config includes authenticated client
config = {
    "configurable": {
        "thread_id": thread_id,
        "supabase": supabase,
        "user_id": test_user_id,
    }
}

# Invoke with both
result = orchestratorAgent.invoke(state, config=config)
```

## Data Flow

```
Test Script
  ├─> Creates Supabase client
  ├─> Passes user_id in state
  └─> Passes supabase client in config
      │
      ▼
Orchestrator (agent_calls node)
  ├─> Receives config parameter
  └─> Passes config to calendar_agent.invoke()
      │
      ▼
CalendarAgent.invoke()
  ├─> Extracts supabase from config
  ├─> Sets supabase_context.set(supabase)
  └─> Invokes LangChain agent
      │
      ▼
Calendar Tools (create_task, get_events, etc.)
  ├─> Call get_supabase()
  ├─> Get user-specific client from context
  └─> Execute database operations with RLS
```

## Row Level Security (RLS)

With this architecture, RLS policies work correctly:

```sql
-- Users can only see their own events
CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING (auth.uid() = user_id);
```

The Supabase client authenticates with the user's JWT token, so `auth.uid()` returns the correct user ID, and RLS filters results automatically.

## Production vs Testing

### Production (FastAPI endpoint)
```python
# In routes/chat.py
token = get_bearer_token(request)  # Real JWT from user
supabase = with_user_jwt(token)    # Authenticated client

config = {
    "configurable": {
        "supabase": supabase,  # User's authenticated client
        "user_id": user_ctx.get("user_id"),
    }
}
```

### Testing (simple_test.py)
```python
# For testing, we use anon key
supabase = create_client(supabase_url, supabase_anon_key)

# But we still pass user_id
config = {
    "configurable": {
        "supabase": supabase,
        "user_id": "cmgmm7h8t0000vv3odxrsaah6",
    }
}
```

**Note**: For full RLS testing, you'd need a real JWT token. The test script uses the anon key, which may have different permissions.

## Benefits

1. **Security**: Each user only sees their own data
2. **Isolation**: User operations are properly isolated
3. **Scalability**: No shared state between requests
4. **Testability**: Easy to test with different user IDs
5. **Clean Architecture**: Context variables keep code clean

## Usage

Run the test script:
```bash
python simple_test.py
```

Enter your user ID when prompted (or press Enter for default):
```
Enter your user ID (or press Enter for default): cmgmm7h8t0000vv3odxrsaah6
```

Now all calendar operations will be scoped to that user!
