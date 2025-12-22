from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langchain_groq import ChatGroq
from typing import TypedDict, List, Dict, Any, Tuple
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
import json
import os
import logging
from dotenv import load_dotenv

# Configure debug logging - quiet down noisy HTTP libraries
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Silence noisy HTTP/API client loggers
for noisy_logger in [
    "httpcore", "httpx", "urllib3", "groq", "groq._base_client",
    "langsmith", "langsmith.client", "httpcore.http11",
    "hpack", "hpack.hpack", "hpack.table"
]:
    logging.getLogger(noisy_logger).setLevel(logging.WARNING)
# Support both package and script execution
try:
  from .prompts import load_prompt
  from .internal_calendar_agent import calendar_agent
except ImportError:
  import sys
  CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
  if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)
  from prompts import load_prompt
  from internal_calendar_agent import calendar_agent
from concurrent.futures import ThreadPoolExecutor, as_completed

checkpointer = InMemorySaver()  


# Load environment variables from .env file
load_dotenv()

fastModel = ChatGroq(model = "llama-3.1-8b-instant")
reasoningModel = ChatGroq(model = "openai/gpt-oss-120b")

class TaskState(TypedDict):
  description: str
  assigned_agent: str
  dependencies: List[str]  # List of task descriptions this task depends on
  order: int  # Execution order

class AgentState(TypedDict):
  messages: List[Dict[str, Any]]
  context: str
  goal: str
  route_decision: str
  tasks: List[TaskState]
  agent_results: List[Dict[str, Any]]
  final_response: str
  user_timezone: str  # IANA timezone (e.g., "America/New_York")


def get_last_user_message(messages: List) -> str:
  """Extract the last user message content from messages list.
  Handles both dict format and LangChain message objects."""
  for msg in reversed(messages):
    # Dict format: {"role": "user", "content": "..."}
    if isinstance(msg, dict):
      if msg.get("role") == "user":
        return msg.get("content", "")
    # LangChain message object
    elif hasattr(msg, 'content'):
      # Check it's not a tool/function message
      if not hasattr(msg, 'name') and getattr(msg, 'type', '') != 'ai':
        return msg.content
  return ""



def router(state: AgentState):
  """Router determines if query needs complex agent workflow or simple LLM response"""
  logger.debug("=" * 50)
  logger.debug("[ROUTER] Starting router node")

  messages = state.get("messages", [])
  context = state.get("context", "")

  logger.debug(f"[ROUTER] Messages count: {len(messages)}")
  logger.debug(f"[ROUTER] Context: {context[:100] if context else 'None'}...")

  # Get the last user message for routing
  user_message = get_last_user_message(messages)
  logger.debug(f"[ROUTER] Extracted user message: '{user_message}'")

  # Load router prompt and format it
  router_prompt_template = load_prompt("router")
  router_prompt = router_prompt_template.format(
    user_message=user_message,
    context=context
  )

  logger.debug(f"[ROUTER] Sending to LLM for routing decision...")
  router_messages = [HumanMessage(content=router_prompt)]
  response = fastModel.invoke(router_messages)

  decision = response.content.strip().lower()
  logger.debug(f"[ROUTER] LLM raw response: '{response.content}'")
  logger.debug(f"[ROUTER] Parsed decision: '{decision}'")

  # Route decision
  if decision == "simple":
    logger.debug("[ROUTER] -> Routing to: simple_responder")
    return {"route_decision": "simple", "messages": messages + [response]}
  elif decision.startswith("direct:"):
    logger.debug(f"[ROUTER] -> Routing to: {decision}")
    return {"route_decision": decision, "messages": messages + [response]}
  else:
    logger.debug(f"[ROUTER] -> Routing to: complex (orchestrator)")
    return {"route_decision": "complex", "messages": messages + [response]}

def simple_responder(state: AgentState):
  """Simple LLM response for straightforward queries"""
  logger.debug("=" * 50)
  logger.debug("[SIMPLE_RESPONDER] Starting simple responder node")

  messages = state.get("messages", [])
  context = state.get("context", "")

  # Get the last user message
  user_question = get_last_user_message(messages)
  logger.debug(f"[SIMPLE_RESPONDER] User question: '{user_question}'")

  # Load simple responder prompt and format it
  simple_prompt_template = load_prompt("simple_responder")
  simple_prompt = simple_prompt_template.format(
    context=context,
    user_question=user_question
  )

  logger.debug("[SIMPLE_RESPONDER] Invoking LLM...")
  response = fastModel.invoke([HumanMessage(content=simple_prompt)])
  logger.debug(f"[SIMPLE_RESPONDER] Response: '{response.content[:200]}...'")

  return {
    "messages": messages + [response],
    "final_response": response.content,
    "user_timezone": "America/New_York"  # Default timezone
  }

def direct_agent_call(state: AgentState, config: RunnableConfig = None):
  """Direct call to a single agent without task breakdown"""
  logger.debug("=" * 50)
  logger.debug("[DIRECT_AGENT_CALL] Starting direct agent call node")
  logger.debug(f"[DIRECT_AGENT_CALL] Config received: {config is not None}")
  if config:
    configurable = config.get("configurable", {})
    logger.debug(f"[DIRECT_AGENT_CALL] Config keys: {list(configurable.keys()) if configurable else 'None'}")
    logger.debug(f"[DIRECT_AGENT_CALL] Has supabase client: {'supabase' in configurable}")

  messages = state.get("messages", [])
  context = state.get("context", "")
  route_decision = state.get("route_decision", "")

  logger.debug(f"[DIRECT_AGENT_CALL] Route decision: '{route_decision}'")

  # Extract agent name from route_decision (e.g., "direct:calendar_agent")
  agent_name = route_decision.split(":")[1] if ":" in route_decision else "calendar_agent"
  logger.debug(f"[DIRECT_AGENT_CALL] Target agent: '{agent_name}'")

  # Create a simple task for the agent
  # Get the last user message
  user_query = get_last_user_message(messages)
  logger.debug(f"[DIRECT_AGENT_CALL] User query: '{user_query}'")

  # Create minimal task structure
  task = {
    "description": user_query,
    "assigned_agent": agent_name,
    "dependencies": [],
    "order": 1
  }

  # Call the agent directly
  try:
    from internal_calendar_agent import calendar_agent
  except ImportError:
    # Handle absolute imports when running as module
    from app.agents.internal_calendar_agent import calendar_agent

  agents = {
    "calendar_agent": calendar_agent
  }

  selected_agent = agents.get(agent_name, calendar_agent)

  # Prepare state for agent
  agent_state = {
    "messages": messages,
    "context": context,
    "tasks": [task],
    "user_timezone": "America/New_York"
  }

  logger.debug(f"[DIRECT_AGENT_CALL] Invoking {agent_name}...")
  # Invoke agent with config so it can access authenticated Supabase client
  result = selected_agent.invoke(agent_state, config)
  logger.debug(f"[DIRECT_AGENT_CALL] Agent result keys: {result.keys() if isinstance(result, dict) else type(result)}")

  final_response = result.get("result", {}).get("messages", [])[-1].content if result.get("result", {}).get("messages") else "No response"
  logger.debug(f"[DIRECT_AGENT_CALL] Final response: '{final_response[:200] if final_response else 'None'}...'")

  return {
    "messages": messages,
    "agent_results": [{"agent": agent_name, "result": result}],
    "final_response": final_response,
    "user_timezone": "America/New_York"
  }

def orchestrator(state: AgentState):
  """Orchestrator agent - analyzes messages and context to determine the goal"""
  logger.debug("=" * 50)
  logger.debug("[ORCHESTRATOR] Starting orchestrator node (complex path)")

  messages = state.get("messages", [])
  context = state.get("context", "")

  logger.debug(f"[ORCHESTRATOR] Messages count: {len(messages)}")

  # Load orchestrator prompt and format it
  orchestrator_prompt_template = load_prompt("orchestrator")
  analysis_prompt = orchestrator_prompt_template.format(
    context=context,
    messages=messages
  )

  logger.debug("[ORCHESTRATOR] Invoking LLM for goal analysis...")
  analysis_messages = [HumanMessage(content=analysis_prompt)]
  response = fastModel.invoke(analysis_messages)

  # Extract the goal from the response and update the state
  goal = response.content
  logger.debug(f"[ORCHESTRATOR] Determined goal: '{goal[:200]}...'")

  return {
    "messages": messages + [response],
    "context": context,
    "goal": goal,  # Add goal to state for set_tasks to use
    "route_decision": state.get("route_decision", "complex")  # Preserve route decision
  }

def set_tasks(state: AgentState):
  """Set objective and break down into tasks"""
  logger.debug("=" * 50)
  logger.debug("[SET_TASKS] Starting set_tasks node")

  # Load set_tasks prompt
  system_prompt = load_prompt("set_tasks")

  goal = state.get("goal", "No goal determined")
  logger.debug(f"[SET_TASKS] Goal: '{goal[:200]}...'")

  user_message = f"Determined goal: {goal}"

  messages = [
    SystemMessage(content=system_prompt),
    HumanMessage(content=user_message)
  ]

  logger.debug("[SET_TASKS] Invoking reasoning model for task breakdown...")
  response = reasoningModel.invoke(messages)
  logger.debug(f"[SET_TASKS] Raw response: '{response.content[:300]}...'")

  # Parse the JSON response and return tasks
  try:
    tasks = json.loads(response.content)
    logger.debug(f"[SET_TASKS] Parsed {len(tasks)} tasks: {[t.get('description', 'unknown')[:50] for t in tasks]}")
    return {"tasks": tasks}
  except json.JSONDecodeError as e:
    logger.error(f"[SET_TASKS] Failed to parse JSON: {e}")
    fallback_tasks = [
      {
        "description": "Process the determined goal",
        "assigned_agent": "orchestrator"
      }
    ]
    return {"tasks": fallback_tasks}

def sort_tasks_by_dependencies(tasks: List[TaskState]) -> List[TaskState]:
  """Sort tasks based on dependencies and order"""
  # Simple sort by order first, then topological sort for dependencies
  ordered_tasks = sorted(tasks, key=lambda x: x.get('order', 0))
  
  # Basic dependency resolution
  sorted_tasks = []
  remaining = ordered_tasks.copy()
  
  while remaining:
    # Find tasks with no unmet dependencies
    ready = []
    for task in remaining:
      deps_met = all(
        any(dep == t['description'] for t in sorted_tasks) 
        for dep in task.get('dependencies', [])
      )
      if deps_met:
        ready.append(task)
    
    if not ready:
      # Circular dependency - add remaining tasks
      ready = remaining
    
    # Add ready tasks (prefer lower order)
    ready.sort(key=lambda x: x.get('order', 0))
    task = ready[0]
    sorted_tasks.append(task)
    remaining.remove(task)
  
  return sorted_tasks

def group_tasks_for_parallel_execution(tasks: List[TaskState]) -> List[List[TaskState]]:
  """Create sequential groups of tasks, each group can be executed in parallel.
  Groups are determined by dependency readiness while respecting lowest available 'order'."""
  remaining = tasks.copy()
  completed: List[str] = []
  groups: List[List[TaskState]] = []
  
  while remaining:
    # Tasks whose dependencies are satisfied
    ready = [t for t in remaining if all(dep in completed for dep in t.get('dependencies', []))]
    if not ready:
      # Fallback for circular deps: pick smallest order batch
      min_order = min(t.get('order', 0) for t in remaining)
      batch = [t for t in remaining if t.get('order', 0) == min_order]
    else:
      # Respect the least order among ready tasks to create phases
      min_order = min(t.get('order', 0) for t in ready)
      batch = [t for t in ready if t.get('order', 0) == min_order]
    
    groups.append(batch)
    for t in batch:
      completed.append(t['description'])
      remaining.remove(t)
  
  return groups

def agent_calls(state: AgentState, config: RunnableConfig = None):
  """Execute agent calls - each agent receives its task list"""
  logger.debug("=" * 50)
  logger.debug("[AGENT_CALLS] Starting agent_calls node")

  tasks: List[TaskState] = state.get("tasks", [])
  logger.debug(f"[AGENT_CALLS] Tasks to execute: {len(tasks)}")

  if not tasks:
    logger.debug("[AGENT_CALLS] No tasks - returning empty results")
    return {"agent_results": []}

  # Group tasks by assigned agent
  agent_task_map = {}
  for task in tasks:
    agent_name = task.get("assigned_agent", "unknown")
    if agent_name not in agent_task_map:
      agent_task_map[agent_name] = []
    agent_task_map[agent_name].append(task)

  logger.debug(f"[AGENT_CALLS] Agent task distribution: {[(k, len(v)) for k, v in agent_task_map.items()]}")

  def execute_agent_tasks(agent_name: str, agent_tasks: List[TaskState]) -> Tuple[str, Any]:
    """Execute all tasks for a specific agent"""
    logger.debug(f"[AGENT_CALLS] Executing {len(agent_tasks)} tasks for {agent_name}")
    # Create agent-specific state with its task list
    agent_state = dict(state)
    agent_state["tasks"] = agent_tasks

    try:
      if agent_name == "calendar_agent":
        # Pass config to calendar_agent so it can access Supabase client
        logger.debug(f"[AGENT_CALLS] Invoking calendar_agent...")
        result = calendar_agent.invoke(agent_state, config)
      elif agent_name == "orchestrator":
        result = orchestrator(agent_state)
      else:
        logger.warning(f"[AGENT_CALLS] Unknown agent: {agent_name}")
        result = {"warning": f"Unknown agent {agent_name}"}
      logger.debug(f"[AGENT_CALLS] {agent_name} completed successfully")
      return agent_name, result
    except Exception as e:
      logger.error(f"[AGENT_CALLS] {agent_name} failed: {e}")
      return agent_name, {"error": str(e)}

  # Execute agents in parallel (each agent handles its own task ordering)
  results: List[Dict[str, Any]] = []
  with ThreadPoolExecutor(max_workers=len(agent_task_map)) as executor:
    futures = {
      executor.submit(execute_agent_tasks, agent_name, tasks): agent_name
      for agent_name, tasks in agent_task_map.items()
    }
    for fut in as_completed(futures):
      agent_name, result = fut.result()
      results.append({"agent": agent_name, "result": result})

  logger.debug(f"[AGENT_CALLS] All agents completed. Results count: {len(results)}")
  return {"agent_results": results}

def synthesizer(state: AgentState):
  """Synthesize information from all agents"""
  logger.debug("=" * 50)
  logger.debug("[SYNTHESIZER] Starting synthesizer node")

  # Load synthesizer prompt
  system_prompt = load_prompt("synthesizer")

  # Format the agent results for the prompt
  results_text = ""
  agent_results = state.get("agent_results", [])
  logger.debug(f"[SYNTHESIZER] Agent results to synthesize: {len(agent_results)}")

  if agent_results:
    for i, result in enumerate(agent_results, 1):
      results_text += f"\nTask {i}: {result.get('task', 'Unknown task')}\n"
      results_text += f"Result: {result.get('result', 'No result')}\n"

  logger.debug(f"[SYNTHESIZER] Results text preview: '{results_text[:300]}...'")

  user_message = f"""Original request: {state.get('context', 'No context provided')}

  Agent Results:
  {results_text}

  Please provide a comprehensive summary and final response."""

  messages = [
    SystemMessage(content=system_prompt),
    HumanMessage(content=user_message)
  ]

  logger.debug("[SYNTHESIZER] Invoking reasoning model for synthesis...")
  response = reasoningModel.invoke(messages)
  logger.debug(f"[SYNTHESIZER] Final response: '{response.content[:200]}...'")

  return {"final_response": response.content}
  


graph = StateGraph(AgentState)
graph.add_node("router", router)
graph.add_node("simple_responder", simple_responder)
graph.add_node("direct_agent_call", direct_agent_call)
graph.add_node("orchestrator", orchestrator)
graph.add_node("set_tasks", set_tasks)
graph.add_node("agent_calls", agent_calls)
graph.add_node("synthesizer", synthesizer)

# Start with router
graph.add_edge(START, "router")

# Conditional routing based on router decision
def route_next(state):
    route_decision = state.get("route_decision", "")
    logger.debug(f"[ROUTE_NEXT] Evaluating route_decision: '{route_decision}'")
    if route_decision == "simple":
        logger.debug("[ROUTE_NEXT] -> simple_responder")
        return "simple_responder"
    elif route_decision.startswith("direct:"):
        logger.debug(f"[ROUTE_NEXT] -> direct_agent_call")
        return "direct_agent_call"
    else:
        logger.debug("[ROUTE_NEXT] -> orchestrator (complex path)")
        return "orchestrator"

graph.add_conditional_edges(
    "router", 
    route_next,
    {
        "simple_responder": "simple_responder",
        "direct_agent_call": "direct_agent_call",
        "orchestrator": "orchestrator"
    }
)

# Simple path - direct to end
graph.add_edge("simple_responder", END)

# Direct agent path - direct to end
graph.add_edge("direct_agent_call", END)

# Complex path - full agent workflow

graph.add_edge("orchestrator", "set_tasks")
graph.add_edge("set_tasks", "agent_calls")
graph.add_edge("agent_calls", "synthesizer")
graph.add_edge("synthesizer", END)

orchestratorAgent = graph.compile(checkpointer=checkpointer)

if __name__ == "__main__":
  state = orchestratorAgent.invoke({
      "messages": [{"role": "user", "content": "what is on my calendar today"}], 
      "context": "",
      "goal": "",
      "route_decision": "",
      "tasks": [], 
      "agent_results": [], 
      "final_response": "",
      "user_timezone": "America/New_York"  # Pass user timezone
  }, config={"configurable": {"thread_id": "test-thread-1"}})
  print(state)


