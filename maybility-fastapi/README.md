# Maybility FastAPI Backend

AI-powered task and calendar management backend built with FastAPI, LangGraph, and Supabase.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run development server
python run.py
```

API available at `http://localhost:8000` | Docs at `http://localhost:8000/docs`

---

## Tech Stack

- **Framework**: FastAPI 0.104.1 + Uvicorn
- **AI/LLM**: LangChain 1.0.3 + LangGraph + Groq (llama-3.1-8b-instant, gpt-oss-120b)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Cache**: Redis 5.0+
- **Auth**: JWT (python-jose) + NextAuth integration
- **Validation**: Pydantic 2.5.0 + pydantic-settings

---

## Architecture

### Clean Architecture with 5 Layers

```
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Application                     │
│                                                          │
│  API Layer (routes/) → Service Layer (services/) →      │
│  Repository Layer (db/repository/) → Database           │
│                                                          │
│  + Agent Layer (agents/) → LLM Tools → Database         │
└─────────────────────────────────────────────────────────┘
```

### Project Structure

```
maybility-fastapi/
├── app/
│   ├── api/                      # API routes (HTTP layer)
│   │   └── v1/endpoints/         # Versioned endpoints
│   ├── schemas/                  # Pydantic models (validation) ✨ NEW
│   │   ├── enums.py              # TaskStatus, Priority, OccurrenceType
│   │   ├── task.py               # Task schemas (unscheduled)
│   │   ├── event.py              # Event schemas (scheduled)
│   │   ├── agent.py              # Agent tool inputs
│   │   └── auth.py               # Auth schemas
│   ├── services/                 # Business logic layer ✨ NEW
│   ├── db/                       # Database layer
│   │   ├── client.py             # Supabase client
│   │   └── repository/           # Data access patterns ✨ NEW
│   ├── agents/                   # AI agent orchestration
│   │   ├── orchestrator.py       # Multi-agent graph
│   │   ├── internal_calendar_agent.py  # Calendar tools
│   │   └── prompts/              # LLM prompt templates
│   ├── core/                     # Core utilities
│   │   ├── config.py             # Settings (Pydantic v2)
│   │   ├── security.py           # JWT + password hashing
│   │   └── cache.py              # Redis caching
│   ├── middleware/               # Custom middleware ✨ NEW
│   ├── exceptions/               # Custom exceptions ✨ NEW
│   └── routes/                   # Current routes (legacy)
├── tests/                        # Test suite ✨ NEW
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/                         # Documentation ✨ NEW
├── scripts/                      # Utility scripts ✨ NEW
├── requirements.txt
└── run.py                        # Dev server entry
```

---

## Layer Breakdown

### 1. API Layer (`app/api/v1/endpoints/`)
**Responsibility**: HTTP request/response handling

```python
@router.post("/tasks", response_model=TaskResponse)
async def create_task(data: TaskCreate, current_user: User):
    # Route → Service → Response
    return await task_service.create(current_user.id, data)
```

### 2. Schema Layer (`app/schemas/`)
**Responsibility**: Data validation with Pydantic

**Import pattern**:
```python
from app.schemas import TaskCreate, TaskStatus, Priority
from app.schemas.agent import CreateTaskInput  # Agent-specific
```

**Files**:
- `enums.py` - Shared enums
- `task.py` - TaskCreate, TaskUpdate, TaskResponse
- `event.py` - EventCreate, EventUpdate, EventResponse
- `agent.py` - Agent tool input schemas (9 tools)
- `auth.py` - Token, UserCreate, UserResponse

### 3. Service Layer (`app/services/`) 🔄 To Be Implemented
**Responsibility**: Business logic and orchestration

```python
class TaskService:
    def __init__(self, task_repo: TaskRepository):
        self.repo = task_repo

    async def create(self, user_id: str, data: TaskCreate) -> Task:
        # Apply business rules
        # Validate permissions
        # Call repository
        return await self.repo.create(user_id, data)
```

### 4. Repository Layer (`app/db/repository/`) 🔄 To Be Implemented
**Responsibility**: Data access abstraction

```python
class TaskRepository(BaseRepository):
    async def find_by_user(self, user_id: str) -> List[Task]:
        return self.db.table("tasks").select("*").eq("userId", user_id).execute()
```

### 5. Agent Layer (`app/agents/`)
**Responsibility**: AI-powered task orchestration

**Multi-Agent Graph**:
```
User Query → Router → Simple? → Simple Responder → Response
                   ↓
              Complex → Orchestrator → Set Tasks → Agent Calls → Synthesizer → Response
```

**Available Tools** (9 LangChain tools):
- `create_task`, `update_task`, `delete_task`, `get_tasks`
- `create_event`, `update_event`, `delete_event`, `get_events`
- `assess_information` (checks if sufficient data provided)

**Context Management**:
- Per-request Supabase client (via `contextvars`)
- User timezone (for relative date parsing)
- Current time context (UTC + local)

---

## Data Flow Examples

### API Request (Standard)
```
POST /api/tasks
  ↓
Pydantic validation (schemas/task.py)
  ↓
Task Service (business logic)
  ↓
Task Repository (database query)
  ↓
Supabase (RLS enforced)
  ↓
Response (serialized)
```

### AI Agent Request (Chat)
```
POST /api/chat {"message": "Create meeting tomorrow at 2pm"}
  ↓
Orchestrator analyzes intent
  ↓
Router → "complex" path
  ↓
Set Tasks breaks into subtasks
  ↓
Calendar Agent calls create_event tool
  ↓
Tool → Supabase (with user context)
  ↓
Synthesizer formats response
  ↓
Natural language response
```

---

## Authentication Flow

### JWT + Supabase RLS
```
1. User logs in (NextAuth) → JWT token generated
2. Token cached in Redis (SHA256 hash key, TTL = token expiry)
3. Requests include Bearer token
4. Middleware validates token
5. Supabase client configured with user JWT
6. All queries filtered by userId (RLS enforced)
```

### Per-Request Context
```python
# Chat endpoint
token = get_bearer_token(request)
user_ctx = get_user_context(token)      # Redis cache
supabase = with_user_jwt(token)         # RLS-enabled client

# Agent uses contextvars to access client
supabase_context.set(supabase_client)
```

---

## Database Schema

**Key Tables** (see Prisma schema in frontend):
- `users` - User accounts (timezone, calendarType, preferences)
- `tasks` - Tasks + Events (unified table, differentiated by startTime/endTime)
- `folders` - Journal folder hierarchy
- `journal_entries` - Journal content
- `goals` - User goals

**Indexes**:
- `tasks`: userId, folderId, composite (userId + folderId)
- `journal_entries`: userId, folderId, composite

---

## Environment Variables

**Required**:
```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Auth
SECRET_KEY=your-jwt-secret
ALGORITHM=HS256                          # Optional, default
ACCESS_TOKEN_EXPIRE_MINUTES=30           # Optional, default

# Cache
REDIS_URL=redis://localhost:6379

# AI
GROQ_API_KEY=your-groq-key

# MCP (Optional)
MCP_SERVER_URL=http://localhost:8001    # Optional, default
```

---

## API Endpoints

### Current Endpoints
- `POST /api/auth/login` - Authentication
- `GET/POST /api/tasks` - Task CRUD
- `GET/PUT/DELETE /api/tasks/{id}` - Single task operations
- `POST /api/tasks/{id}/exceptions` - Recurrence exceptions
- `POST /api/tasks/{id}/overrides` - Recurring overrides
- `POST /api/chat` - AI agent chat

### Future Endpoints (Phase 2)
- `/api/v1/events` - Separate event management
- `/api/v1/goals` - Goal management
- `/api/v1/journal` - Journal integration

---

## Development Roadmap

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Centralized schema structure (`app/schemas/`)
- [x] Fixed Pydantic v2 compatibility (`pydantic-settings`)
- [x] Created clean directory structure (services, api, middleware, etc.)
- [x] Updated imports across codebase
- [x] Moved documentation to `docs/`

**What changed**:
```python
# Before
from app.models.schemas import TaskCreate     # ❌ Didn't exist
from app.agents.models import TaskStatus      # ❌ Wrong location

# After
from app.schemas import TaskCreate, TaskStatus  # ✅ Centralized
```

### 🔄 Phase 2: Service Layer (Next)
- [ ] Create `services/task_service.py` - Task CRUD logic
- [ ] Create `services/event_service.py` - Event CRUD logic
- [ ] Create `services/auth_service.py` - Auth logic
- [ ] Add custom exceptions (`exceptions/auth.py`, `exceptions/database.py`)
- [ ] Update routes to use services

**Pattern**:
```python
# Route becomes thin
@router.post("/tasks")
async def create_task(data: TaskCreate, user: User):
    return await task_service.create(user.id, data)

# Logic moves to service
class TaskService:
    async def create(self, user_id: str, data: TaskCreate):
        # Validation, business rules, etc.
        return await self.repo.create(user_id, data)
```

### 📋 Phase 3: Agent Refactor
- [ ] Split `internal_calendar_agent.py` (655 lines) into:
  - `agents/calendar/agent.py` - Agent wrapper
  - `agents/calendar/tools.py` - Tool definitions
  - `agents/calendar/utils.py` - Helpers
- [ ] Improve orchestrator logging
- [ ] Add agent error handling

### 🗄️ Phase 4: Repository Pattern
- [ ] Create `db/repository/base.py` - Base repository class
- [ ] Create `db/repository/task_repo.py` - Task queries
- [ ] Create `db/repository/event_repo.py` - Event queries
- [ ] Update services to use repositories
- [ ] Add query optimization

### 🧹 Phase 5: Cleanup
- [ ] Delete debug files (`simple_test.py`, `app/db/test_supabase_connection.py`)
- [ ] Add comprehensive tests (`tests/unit/`, `tests/integration/`)
- [ ] Add middleware (error handling, logging, rate limiting)
- [ ] Create migration scripts (`scripts/`)
- [ ] Performance profiling

---

## Testing

### Run Tests (Future)
```bash
# Unit tests
pytest tests/unit -v

# Integration tests
pytest tests/integration -v

# All tests with coverage
pytest --cov=app --cov-report=html
```

### Test Structure
```
tests/
├── unit/
│   ├── test_services.py      # Service logic
│   ├── test_agents.py        # Agent behavior
│   └── test_repositories.py  # Data access
├── integration/
│   ├── test_api.py           # Full endpoint flows
│   └── test_agent_flow.py    # Agent orchestration
└── fixtures/
    └── sample_data.py        # Test data
```

---

## Performance Considerations

### Caching Strategy
- **User context**: Cached in Redis, key = SHA256(token), TTL = token expiry
- **Static data**: Future - cache goals, folder structure

### Query Optimization
- Composite indexes on frequently queried fields
- RLS policies optimized for common patterns
- Avoid N+1 queries (use Supabase `.select("*, relation(field)")`)

### Agent Optimization
- **Fast model** for routing: `llama-3.1-8b-instant` (~200ms)
- **Reasoning model** for complex tasks: `gpt-oss-120b` (~1-2s)
- **Parallel execution**: Independent tasks run concurrently (ThreadPoolExecutor)

### Scaling
- Stateless API (horizontal scaling ready)
- Redis for shared cache
- Supabase handles DB scaling
- Future: Queue agent tasks with Celery

---

## Troubleshooting

### Import Errors
```bash
# If you see "ModuleNotFoundError: No module named 'pydantic_settings'"
pip install pydantic-settings>=2.0.0

# If schemas import fails
python -c "from app.schemas import TaskCreate; print('✅ OK')"
```

### Supabase Connection Issues
```bash
# Check environment variables
python -c "from app.core.config import settings; print(settings.supabase_url)"

# Test connection
python app/db/test_supabase_connection.py  # Should be moved to tests/
```

### Redis Cache Issues
```bash
# Check Redis connection
redis-cli ping  # Should return "PONG"

# Check cache
python -c "from app.core.cache import r; print(r.ping())"
```

---

## Contributing

This is a private project, but contributions should follow these patterns:

1. **Schema changes**: Update `app/schemas/` first
2. **New endpoints**: Create in `app/api/v1/endpoints/`
3. **Business logic**: Add to `app/services/` (not routes!)
4. **Database queries**: Use repository pattern in `app/db/repository/`
5. **Tests**: Add to `tests/unit/` or `tests/integration/`

### Code Style
- Use type hints everywhere
- Pydantic models for validation
- Async/await for IO operations
- Docstrings for public functions

---

## Recent Changes (Phase 1)

**Files Created**: 20 (schemas, directory structure)
**Files Modified**: 3 (config.py, routes/tasks.py, internal_calendar_agent.py)
**Files Moved**: 3 (docs to `docs/`)
**Import Errors Fixed**: 2 critical
**Deprecation Warnings Fixed**: 1 (Pydantic BaseSettings)

**Impact**:
- ✅ Single source of truth for schemas
- ✅ Pydantic v2 compatible
- ✅ Ready for service layer implementation
- ✅ Test infrastructure in place
- ✅ Clean separation of concerns

---

## License

Proprietary - Maybility Project

## Questions?

Check the inline documentation in each module, or review the Prisma schema in the frontend for database structure.
