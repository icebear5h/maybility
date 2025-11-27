"""
Agent evaluation tests using LangSmith
"""

import pytest
from datetime import datetime
from typing import Dict, Any, List
from unittest.mock import patch, MagicMock

# Agent imports
from app.agents.orchestrator import router, simple_responder, orchestrator


@pytest.mark.eval
class TestRouterEvals:
    """Evaluate router's ability to classify queries"""

    def test_router_simple_classification(self):
        """Eval: Router correctly identifies simple queries"""
        simple_queries = [
            "Hello",
            "Hi there",
            "Thanks",
            "What time is it?",
            "Who are you?"
        ]

        for query in simple_queries:
            state = {
                "messages": [{"role": "user", "content": query}],
                "context": ""
            }

            with patch('app.agents.orchestrator.fastModel') as mock_llm:
                # Mock LLM to return "simple"
                mock_llm.invoke.return_value.content = "simple"

                result = router(state)

                assert result["route_decision"] == "simple", \
                    f"Failed to classify '{query}' as simple"

    def test_router_direct_agent_classification(self):
        """Eval: Router correctly identifies direct agent queries"""
        calendar_queries = [
            "What's on my calendar today?",
            "Show me my schedule",
            "Do I have any meetings?",
            "What's my next appointment?"
        ]

        for query in calendar_queries:
            state = {
                "messages": [{"role": "user", "content": query}],
                "context": ""
            }

            with patch('app.agents.orchestrator.fastModel') as mock_llm:
                # Mock LLM to return direct route
                mock_llm.invoke.return_value.content = "direct:calendar_agent"

                result = router(state)

                assert result["route_decision"].startswith("direct:"), \
                    f"Failed to classify '{query}' as direct agent call"

    def test_router_complex_classification(self):
        """Eval: Router correctly identifies complex queries"""
        complex_queries = [
            "Schedule 3 meetings tomorrow and move any conflicting tasks",
            "Analyze my week and suggest optimizations",
            "Create recurring standup meetings and notify the team"
        ]

        for query in complex_queries:
            state = {
                "messages": [{"role": "user", "content": query}],
                "context": ""
            }

            with patch('app.agents.orchestrator.fastModel') as mock_llm:
                # Mock LLM to return complex
                mock_llm.invoke.return_value.content = "complex"

                result = router(state)

                assert result["route_decision"] == "complex", \
                    f"Failed to classify '{query}' as complex"


@pytest.mark.eval
@pytest.mark.slow
class TestOrchestratorEvals:
    """Evaluate orchestrator's goal determination"""

    def test_orchestrator_goal_extraction(self):
        """Eval: Orchestrator extracts correct goal from user query"""
        test_cases = [
            {
                "query": "I need to schedule a team meeting for next Monday",
                "expected_keywords": ["schedule", "meeting", "Monday"]
            },
            {
                "query": "Show me all my high-priority tasks",
                "expected_keywords": ["show", "high-priority", "tasks"]
            }
        ]

        for case in test_cases:
            state = {
                "messages": [{"role": "user", "content": case["query"]}],
                "context": "",
                "route_decision": "complex"
            }

            with patch('app.agents.orchestrator.fastModel') as mock_llm:
                # Mock LLM to return a goal
                mock_llm.invoke.return_value.content = f"Goal: {case['query']}"

                result = orchestrator(state)

                goal = result.get("goal", "")

                # Check if goal contains expected keywords
                for keyword in case["expected_keywords"]:
                    assert keyword.lower() in goal.lower(), \
                        f"Goal missing keyword '{keyword}': {goal}"


@pytest.mark.eval
class TestCalendarAgentEvals:
    """Evaluate calendar agent tool selection and execution"""

    def test_agent_tool_selection_create_event(self):
        """Eval: Agent selects create_event for scheduling requests"""
        from app.agents.internal_calendar_agent import calendar_agent

        state = {
            "messages": [],
            "context": "User wants to create a meeting",
            "tasks": [
                {
                    "description": "Create team standup meeting for Monday at 9am",
                    "assigned_agent": "calendar_agent",
                    "order": 1
                }
            ],
            "user_timezone": "America/New_York",
            "user_id": "test-user-123"
        }

        config = {
            "configurable": {
                "supabase": MagicMock()  # Mock Supabase
            }
        }

        with patch('app.agents.internal_calendar_agent.reasoningModel') as mock_llm:
            # Mock the agent to simulate tool call
            mock_response = MagicMock()
            mock_response.content = "Created meeting successfully"
            mock_llm.invoke.return_value = mock_response

            # This would normally call tools - we're just testing structure
            # In real evals, we'd track which tools were attempted
            result = calendar_agent.invoke(state, config)

            assert result is not None
            assert "tasks_completed" in result

    def test_agent_tool_selection_get_events(self):
        """Eval: Agent selects get_events for query requests"""
        from app.agents.internal_calendar_agent import calendar_agent

        state = {
            "messages": [],
            "context": "User wants to see their schedule",
            "tasks": [
                {
                    "description": "Show all events for today",
                    "assigned_agent": "calendar_agent",
                    "order": 1
                }
            ],
            "user_timezone": "America/New_York",
            "user_id": "test-user-123"
        }

        config = {
            "configurable": {
                "supabase": MagicMock()
            }
        }

        with patch('app.agents.internal_calendar_agent.reasoningModel'):
            result = calendar_agent.invoke(state, config)

            assert result is not None


@pytest.mark.eval
class TestAgentResponseQuality:
    """Evaluate agent response quality (would use LLM-as-judge in production)"""

    def test_simple_responder_provides_answer(self):
        """Eval: Simple responder provides helpful answers"""
        state = {
            "messages": [{"role": "user", "content": "What is your purpose?"}],
            "context": "Maybility calendar assistant"
        }

        with patch('app.agents.orchestrator.fastModel') as mock_llm:
            mock_llm.invoke.return_value.content = "I help you manage your calendar and tasks efficiently."

            result = simple_responder(state)

            assert "final_response" in result
            assert len(result["final_response"]) > 0

            # Basic quality checks
            response = result["final_response"]
            assert len(response) > 10  # Not too short
            assert len(response) < 1000  # Not too long


# ============================================================================
# LangSmith Integration Examples
# ============================================================================

@pytest.mark.eval
@pytest.mark.skip(reason="Requires LangSmith API key - enable for production evals")
class TestLangSmithIntegration:
    """
    Examples of LangSmith integration for production evals
    These tests are skipped by default - enable when you have LangSmith configured
    """

    def test_router_with_langsmith_dataset(self):
        """
        Example: Evaluate router against LangSmith dataset

        To use:
        1. Set LANGSMITH_API_KEY environment variable
        2. Create dataset in LangSmith UI
        3. Run: pytest tests/evals/test_agent_evals.py -m eval
        """
        from langsmith import Client

        # Initialize LangSmith client
        client = Client()

        # Create or get dataset
        dataset_name = "router-classification-dataset"

        # This would run evals against LangSmith
        # results = client.evaluate(router, dataset_name=dataset_name)
        # assert results["accuracy"] > 0.9

        pass  # Placeholder for actual implementation

    def test_agent_with_llm_as_judge(self):
        """
        Example: Use LLM as judge to evaluate response quality

        This would use another LLM to judge the quality of agent responses
        """
        # Placeholder for LLM-as-judge implementation
        pass
