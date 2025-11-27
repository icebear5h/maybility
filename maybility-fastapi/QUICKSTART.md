# 🚀 Quick Start Guide

Get up and running with testing and logging in 5 minutes.

## Step 1: Install Dependencies

```bash
# Install everything (including dev dependencies)
pip install -r requirements-dev.txt

# Or just production + testing
pip install -r requirements.txt
```

## Step 2: Run Your First Test

```bash
# Run all tests
pytest

# You should see:
# ✓ tests/unit/test_schemas.py::TestEnums::test_task_status_values PASSED
# ✓ tests/unit/test_schemas.py::TestEnums::test_priority_values PASSED
# ... more tests ...
# ====== 20 passed in 2.34s ======
```

## Step 3: Check Code Coverage

```bash
# Generate coverage report
pytest --cov=app --cov-report=term-missing

# You'll see:
# Name                          Stmts   Miss  Cover   Missing
# -----------------------------------------------------------
# app/schemas/enums.py             10      0   100%
# app/schemas/task.py              25      2    92%   45-46
# ...
# TOTAL                           234     23    90%
```

## Step 4: Start the TUI Monitor

```bash
# Start the monitoring dashboard
python scripts/tui_monitor.py

# You'll see a live dashboard with:
# - Metrics (requests, errors, response times)
# - Agent activity
# - Live log streams
```

## Step 5: Test with Logging

```bash
# Start the API server (in one terminal)
python run.py

# In another terminal, make a request
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"title": "Test Task", "priority": "HIGH"}'

# Watch logs appear in:
# - logs/app.log
# - logs/api.log
# - TUI monitor (if running)
```

---

## Common Commands Cheat Sheet

### Testing

```bash
# All tests
pytest

# Only unit tests (fast)
pytest -m unit

# Only AI evals
pytest -m eval

# With coverage
pytest --cov=app

# Stop on first failure
pytest -x

# Watch mode (re-run on changes)
ptw
```

### Logging

```bash
# View logs
tail -f logs/app.log

# View only errors
tail -f logs/errors.log

# View agent activity
tail -f logs/agents.log

# Clear logs
rm -rf logs/*.log
```

### TUI Monitor

```bash
# Start monitor
python scripts/tui_monitor.py

# Inside TUI:
# q - Quit
# r - Refresh
# c - Clear logs
```

---

## What's Next?

### Write Your First Test

Create `tests/unit/test_my_feature.py`:

```python
import pytest
from app.schemas import TaskCreate, Priority

def test_my_task_creation():
    """Test creating a custom task"""
    task = TaskCreate(
        title="My First Test",
        priority=Priority.HIGH
    )

    assert task.title == "My First Test"
    assert task.priority == Priority.HIGH
```

Run it:
```bash
pytest tests/unit/test_my_feature.py -v
```

### Add Custom Logging

In your code:

```python
from app.core.logging import logger

def my_function():
    logger.info("Starting my function")

    try:
        # Your code here
        result = do_something()
        logger.debug(f"Result: {result}")
        return result
    except Exception as e:
        logger.error(f"Error in my_function: {e}")
        raise
```

### Create an Agent Eval

Create `tests/evals/test_my_agent.py`:

```python
import pytest
from app.agents.orchestrator import router

@pytest.mark.eval
def test_router_classifies_my_query():
    """Test router handles my specific query"""
    state = {
        "messages": [{"content": "Schedule a meeting"}],
        "context": ""
    }

    result = router(state)

    # Assert it routes to calendar agent
    assert "calendar" in result["route_decision"].lower()
```

Run it:
```bash
pytest -m eval -v
```

---

## Troubleshooting

### "No module named 'app'"

```bash
# Make sure you're in the project root
cd /path/to/maybility-fastapi

# Run tests from project root
pytest
```

### "Permission denied: logs/"

```bash
# Create logs directory
mkdir -p logs

# Give write permissions
chmod 755 logs/
```

### Tests pass but coverage is low

```bash
# See which lines aren't covered
pytest --cov=app --cov-report=term-missing

# Look for "Missing" column - add tests for those lines
```

### TUI not updating

```bash
# Make sure logs exist
ls -la logs/

# Check if API is running and making requests
curl http://localhost:8000/health
```

---

## Environment Variables

Create `.env` file:

```env
# Logging
LOG_LEVEL=INFO
LOG_TO_FILE=true
LOG_TO_CONSOLE=true
JSON_LOGS=false

# LangSmith (optional)
LANGSMITH_API_KEY=your-key-here
LANGSMITH_PROJECT=maybility-backend
```

---

## Full Documentation

- **Testing Guide**: `docs/TESTING_AND_LOGGING.md`
- **Architecture**: `README.md`
- **API Docs**: http://localhost:8000/docs (when running)

---

## Summary

✅ Install: `pip install -r requirements-dev.txt`
✅ Test: `pytest`
✅ Coverage: `pytest --cov=app`
✅ Monitor: `python scripts/tui_monitor.py`
✅ Logs: `tail -f logs/app.log`

You're all set! 🎉
