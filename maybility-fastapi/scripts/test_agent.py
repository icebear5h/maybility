#!/usr/bin/env python3
"""
Quick test script for calendar agent and database connectivity.
Run from maybility-fastapi directory: python scripts/test_agent.py
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import service_client
from app.agents.internal_calendar_agent import calendar_agent

# Default test user ID
DEFAULT_USER_ID = "100578596100088188025"


def test_db_connection():
    """Test basic database connectivity with service_client"""
    print("\n=== Testing Database Connection ===")
    try:
        result = service_client.table("events").select("*").limit(5).execute()
        print(f"SUCCESS: Connected to database")
        print(f"  Found {len(result.data)} events")
        if result.data:
            for item in result.data[:3]:
                print(f"  - {item.get('title', 'Untitled')} (id: {item.get('id', 'N/A')[:8]}...)")
        return True
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        return False


def test_calendar_agent(query: str = "What's on my calendar today?", user_id: str = None):
    """Test calendar agent with a simple query"""
    print(f"\n=== Testing Calendar Agent ===")
    print(f"Query: {query}")

    user_id = user_id or DEFAULT_USER_ID

    test_state = {
        "messages": [{"role": "user", "content": query}],
        "context": query,
        "tasks": [
            {"description": query, "order": 1, "assigned_agent": "calendar_agent"}
        ],
        "user_id": user_id,
        "user_timezone": "America/New_York"
    }

    config = {
        "configurable": {
            "supabase": service_client,
            "thread_id": "test-thread",
            "user_id": user_id
        }
    }

    try:
        result = calendar_agent.invoke(test_state, config)
        print(f"SUCCESS: Agent responded")

        # Extract response
        if "result" in result and "messages" in result["result"]:
            messages = result["result"]["messages"]
            if messages:
                last_msg = messages[-1]
                content = getattr(last_msg, 'content', str(last_msg))
                print(f"\nAgent Response:\n{content[:500]}...")
        else:
            print(f"Raw result: {result}")
        return True
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def generate_cuid():
    """Generate a cuid-like ID (simplified version)"""
    import time
    import random
    import string
    timestamp = hex(int(time.time() * 1000))[2:]
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
    return f"c{timestamp}{random_part}"


def test_create_event(user_id: str = None):
    """Test creating a test event."""
    print("\n=== Testing Event Creation ===")

    user_id = user_id or DEFAULT_USER_ID

    from datetime import datetime, timedelta
    import pytz

    now = datetime.now(pytz.UTC)
    start = now + timedelta(hours=1)
    end = start + timedelta(hours=1)

    event_data = {
        "id": generate_cuid(),
        "userId": user_id,
        "title": "Test Event from Script",
        "description": "Created by test_agent.py",
        "startTime": start.isoformat(),
        "endTime": end.isoformat(),
        "occurrenceType": "SINGLE",
        "priority": "MEDIUM",
        "color": "#3b82f6",
        "updatedAt": now.isoformat()
    }

    try:
        result = service_client.table("events").insert(event_data).execute()
        if result.data:
            event_id = result.data[0]["id"]
            print(f"SUCCESS: Created event with ID: {event_id}")

            # Clean up
            service_client.table("events").delete().eq("id", event_id).execute()
            print(f"  (Cleaned up test event)")
            return True
        else:
            print("FAILED: No data returned")
            return False
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        return False


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Test calendar agent and database")
    parser.add_argument("query", nargs="*", default=["What's on my calendar today?"],
                        help="Query to test the agent with")
    parser.add_argument("--user-id", help="User ID for event creation test")
    parser.add_argument("--skip-agent", action="store_true", help="Skip agent test")
    args = parser.parse_args()

    print("=" * 50)
    print("Calendar Agent Test Script")
    print("=" * 50)

    # Run tests
    db_ok = test_db_connection()

    if db_ok:
        test_create_event(args.user_id)

        if not args.skip_agent:
            query = " ".join(args.query)
            test_calendar_agent(query)
    else:
        print("\nSkipping agent tests - database connection failed")
        print("Make sure you've run the SQL permissions fix in Supabase")

    print("\n" + "=" * 50)
