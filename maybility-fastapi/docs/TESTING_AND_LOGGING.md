# Testing & Logging Guide

Complete guide for testing and monitoring the Maybility backend.

## Quick Start

```bash
# Install dependencies
pip install -r requirements-dev.txt

# Run all tests
pytest

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests
pytest -m eval          # AI agent evals
pytest -m "not slow"    # Skip slow tests

# Run with coverage
pytest --cov=app --cov-report=html

# Watch mode (re-run on file changes)
ptw

# Start TUI monitor
python scripts/tui_monitor.py
```

---

## Testing Framework

### Test Structure

```
tests/
├── conftest.py              # Shared fixtures
├── unit/                    # Unit tests (fast, isolated)
│   └── test_schemas.py      # Pydantic schema tests
├── integration/             # Integration tests (slower)
│   └── test_api.py          # API endpoint tests
└── evals/                   # AI evaluation tests
    └── test_agent_evals.py  # Agent behavior tests
```

### Running Tests

**Basic commands:**
```bash
# All tests
pytest

# Specific file
pytest tests/unit/test_schemas.py

# Specific test
pytest tests/unit/test_schemas.py::TestEnums::test_task_status_values

# With output
pytest -v

# Stop on first failure
pytest -x

# Run last failed tests
pytest --lf
```

**With markers:**
```bash
pytest -m unit              # Fast unit tests
pytest -m integration       # Integration tests
pytest -m eval              # AI evals
pytest -m slow              # Slow tests only
pytest -m "unit or integration"  # Multiple markers
pytest -m "not slow"        # Exclude slow tests
```

**Coverage:**
```bash
# Generate HTML coverage report
pytest --cov=app --cov-report=html

# View in browser
open htmlcov/index.html

# Terminal report
pytest --cov=app --cov-report=term-missing

# Fail if coverage below 70%
pytest --cov=app --cov-fail-under=70
```

---

## Unit Tests

### Schema Tests

Test Pydantic models for validation:

```python
# tests/unit/test_schemas.py
from app.schemas import TaskCreate, Priority

def test_task_create_minimal():
    """Test TaskCreate with minimal fields"""
    task = TaskCreate(title="Test Task")

    assert task.title == "Test Task"
    assert task.priority == Priority.MEDIUM  # Default

def test_task_create_invalid_priority():
    """Test TaskCreate rejects invalid priority"""
    with pytest.raises(ValidationError):
        TaskCreate(title="Test", priority="INVALID")
```

**Run:**
```bash
pytest tests/unit/test_schemas.py -v
```

### Service Tests (Coming in Phase 2)

Test business logic in isolation:

```python
# tests/unit/test_services.py
from app.services.task_service import TaskService

def test_task_service_create(mock_task_repo):
    """Test task creation logic"""
    service = TaskService(mock_task_repo)

    result = service.create(
        user_id="user-123",
        data=TaskCreate(title="Test")
    )

    mock_task_repo.create.assert_called_once()
    assert result.title == "Test"
```

---

## Integration Tests

### API Tests

Test full HTTP endpoints:

```python
# tests/integration/test_api.py
def test_create_task_endpoint(client, auth_headers):
    """Test POST /api/tasks"""
    response = client.post(
        "/api/tasks",
        json={"title": "Test Task", "priority": "HIGH"},
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
```

**Run:**
```bash
pytest tests/integration/ -v
```

---

## AI Agent Evals

### Router Classification Tests

Test if router correctly classifies queries:

```python
# tests/evals/test_agent_evals.py
@pytest.mark.eval
def test_router_simple_classification():
    """Eval: Router identifies simple queries"""
    simple_queries = ["Hello", "Hi", "Thanks"]

    for query in simple_queries:
        state = {"messages": [{"content": query}]}
        result = router(state)

        assert result["route_decision"] == "simple"
```

### Tool Selection Tests

Test if agents select correct tools:

```python
@pytest.mark.eval
def test_agent_selects_create_event():
    """Eval: Agent uses create_event for scheduling"""
    state = {
        "tasks": [{
            "description": "Schedule meeting tomorrow at 2pm",
            "assigned_agent": "calendar_agent"
        }]
    }

    result = calendar_agent.invoke(state, config)

    # Assert create_event tool was called
    assert tool_calls_include("create_event")
```

**Run:**
```bash
pytest -m eval -v
```

---

## LangSmith Integration

### Setup

```bash
# Install LangSmith
pip install langsmith

# Set API key
export LANGSMITH_API_KEY=your-api-key
export LANGSMITH_PROJECT=maybility-backend
```

### Creating Datasets

```python
from langsmith import Client

client = Client()

# Create dataset for router classification
examples = [
    {"input": "Hello", "expected": "simple"},
    {"input": "What's on my calendar?", "expected": "direct:calendar_agent"},
    {"input": "Schedule 3 meetings", "expected": "complex"}
]

dataset = client.create_dataset(
    dataset_name="router-classification",
    description="Router classification test cases"
)

for example in examples:
    client.create_example(
        dataset_id=dataset.id,
        inputs={"query": example["input"]},
        outputs={"route": example["expected"]}
    )
```

### Running Evaluations

```python
from langsmith import evaluate

def router_eval_fn(example):
    """Eval function for router"""
    result = router({"messages": [example["input"]]})
    return {"route": result["route_decision"]}

# Run evaluation
results = evaluate(
    router_eval_fn,
    data="router-classification",
    evaluators=[
        # Built-in evaluators
        exact_match("route", "expected"),
        # Custom evaluators
        custom_route_scorer
    ]
)

print(f"Accuracy: {results['accuracy']}")
```

### LLM-as-Judge

Use LLM to evaluate response quality:

```python
def llm_judge_evaluator(run, example):
    """Use LLM to judge response quality"""

    judge_prompt = f"""
    User Query: {example.inputs['query']}
    Agent Response: {run.outputs['response']}

    Rate the response (1-10) on:
    1. Correctness
    2. Helpfulness
    3. Clarity

    Return JSON: {{"scores": [x, y, z], "overall": avg}}
    """

    result = judge_llm.invoke(judge_prompt)
    return {"score": result["overall"]}
```

---

## Logging System

### Configuration

Logging is auto-configured via environment variables:

```env
# .env
LOG_LEVEL=INFO              # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_TO_FILE=true            # Enable file logging
LOG_TO_CONSOLE=true         # Enable console logging
JSON_LOGS=false             # Use JSON format (for production)
```

### Log Files

All logs stored in `logs/`:

```
logs/
├── app.log           # All application logs (rotates at 100MB)
├── errors.log        # Errors only (rotates at 50MB)
├── agents.log        # Agent actions (rotates at 50MB)
├── api.log           # API requests (rotates at 100MB)
└── app.json          # JSON format (if enabled)
```

### Using Logging

**In your code:**

```python
from app.core.logging import logger, LogContext, log_api_request

# Simple logging
logger.info("Starting process")
logger.error("Something went wrong")
logger.debug("Debugging info")

# With context
with LogContext(user_id="user-123", action="create_task"):
    logger.info("Creating task")
    # All logs in this block will have user_id and action

# API request logging
log_api_request(
    method="POST",
    path="/api/tasks",
    status_code=201,
    duration_ms=45.2
)

# Agent logging
from app.core.logging import log_agent_action

log_agent_action(
    agent_name="calendar_agent",
    action="create_event",
    details={"event_id": "evt-123"}
)
```

### Log Formats

**Console (development):**
```
2025-01-15 12:34:56 | INFO     | app.main:startup:45 - Application started
2025-01-15 12:35:01 | ERROR    | app.routes.tasks:create_task:89 - Failed to create task
```

**File (production):**
```
2025-01-15 12:34:56 | INFO     | app.main:startup:45 - Application started
```

**JSON (structured):**
```json
{
  "timestamp": "2025-01-15T12:34:56.789Z",
  "level": "INFO",
  "message": "Application started",
  "module": "app.main",
  "function": "startup",
  "line": 45
}
```

---

## TUI Monitor

### Starting the TUI

```bash
python scripts/tui_monitor.py
```

### Features

**Real-time monitoring:**
- 📊 Metrics panel (requests, errors, response times)
- 🤖 Agent activity table (recent agent actions)
- 📝 Live log streams (app, errors, agents)

**Keyboard shortcuts:**
- `q` - Quit
- `r` - Refresh data
- `c` - Clear logs

### TUI Layout

```
┌─────────────────────────────────────────────────────┐
│                   Maybility Monitor                  │
├──────────────────────┬──────────────────────────────┤
│   📊 Metrics         │  🤖 Agent Activity          │
│   Total: 1,234       │  Calendar Agent | ✓ Success │
│   Errors: 5          │  Orchestrator   | ✓ Success │
│   Avg: 45.2ms        │                              │
├──────────────────────┴──────────────────────────────┤
│   📝 Application Logs                                │
│   [12:34:56] INFO - Application started              │
│   [12:35:01] POST /api/tasks - 201 (45ms)           │
├──────────────────────┬──────────────────────────────┤
│   ❌ Error Logs       │  🧠 Agent Logs               │
│   [12:36:00] ERROR   │  [12:35:00] calendar_agent  │
│   Task creation fail │  Created event successfully  │
└──────────────────────┴──────────────────────────────┘
q: quit | r: refresh | c: clear
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install -r requirements-dev.txt

      - name: Run linting
        run: |
          ruff check app/
          black --check app/

      - name: Run unit tests
        run: pytest -m unit --cov=app --cov-report=xml

      - name: Run integration tests
        run: pytest -m integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

---

## Best Practices

### Testing

1. **Write tests first** - TDD when possible
2. **One assertion per test** - Easier to debug
3. **Use fixtures** - DRY principle
4. **Mock external services** - Fast, reliable tests
5. **Test edge cases** - Empty inputs, null values, etc.

### Logging

1. **Use appropriate levels**:
   - DEBUG: Detailed diagnostic info
   - INFO: General information events
   - WARNING: Warning messages
   - ERROR: Error events
   - CRITICAL: Critical conditions

2. **Add context**: Use `LogContext` for structured logging

3. **Don't log sensitive data**: Passwords, tokens, PII

4. **Use log rotation**: Prevents disk space issues

5. **Monitor logs**: Use TUI or external tools (Datadog, Sentry)

### AI Evals

1. **Create datasets** - Use real user queries
2. **Track metrics** - Accuracy, latency, quality
3. **Use LangSmith** - Centralized eval platform
4. **LLM-as-judge** - For subjective quality
5. **Iterate** - Improve prompts based on results

---

## Troubleshooting

### Tests Failing

```bash
# Run with verbose output
pytest -vv

# See print statements
pytest -s

# Debug mode
pytest --pdb

# Show local variables on failure
pytest --showlocals
```

### Logs Not Appearing

```bash
# Check log directory exists
mkdir -p logs

# Check file permissions
ls -la logs/

# Check environment variables
echo $LOG_LEVEL
echo $LOG_TO_FILE
```

### TUI Not Starting

```bash
# Check textual is installed
pip install textual rich

# Run with debug
python scripts/tui_monitor.py --dev

# Check logs exist
ls -la logs/
```

---

## Next Steps

1. **Run your first test**: `pytest tests/unit/test_schemas.py`
2. **Start the TUI**: `python scripts/tui_monitor.py`
3. **Set up LangSmith**: Get API key from https://smith.langchain.com
4. **Create your first eval**: Add test case to `tests/evals/`
5. **Monitor your app**: Watch logs in real-time with TUI
