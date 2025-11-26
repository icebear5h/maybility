from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langchain_groq import ChatGroq
from typing import TypedDict, List, Dict, Any, Tuple
from langchain_core.messages import HumanMessage, SystemMessage
import json
import os
from dotenv import load_dotenv
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



def router(state: AgentState):
  """Router determines if query needs complex agent workflow or simple LLM response"""
  messages = state.get("messages", [])
  context = state.get("context", "")
  
  # Get the last user message for routing
  user_message = ""
  for msg in reversed(messages):
    if hasattr(msg, 'content') and not hasattr(msg, 'name'):  # Simple check for user message
      user_message = msg.content
      break
  
  # Load router prompt and format it
  router_prompt_template = load_prompt("router")
  router_prompt = router_prompt_template.format(
    user_message=user_message,
    context=context
  )
  
  router_messages = [HumanMessage(content=router_prompt)]
  response = fastModel.invoke(router_messages)
  
  decision = response.content.strip().lower()
  
  # Route decision
  if decision == "simple":
    return {"route_decision": "simple", "messages": messages + [response]}
  elif decision.startswith("direct:"):
    return {"route_decision": decision, "messages": messages + [response]}
  else:
    return {"route_decision": "complex", "messages": messages + [response]}

def simple_responder(state: AgentState):
  """Simple LLM response for straightforward queries"""
  messages = state.get("messages", [])
  context = state.get("context", "")
  
  # Get the last user message
  user_question = ""
  for msg in reversed(messages):
    if hasattr(msg, 'content') and not hasattr(msg, 'name'):  # Simple check for user message
      user_question = msg.content
      break
  
  # Load simple responder prompt and format it
  simple_prompt_template = load_prompt("simple_responder")
  simple_prompt = simple_prompt_template.format(
    context=context,
    user_question=user_question
  )
  
  response = fastModel.invoke([HumanMessage(content=simple_prompt)])
  
  return {
    "messages": messages + [response],
    "final_response": response.content,
    "user_timezone": "America/New_York"  # Default timezone
  }

def direct_agent_call(state: AgentState):
  """Direct call to a single agent without task breakdown"""
  messages = state.get("messages", [])
  context = state.get("context", "")
  route_decision = state.get("route_decision", "")
  
  # Extract agent name from route_decision (e.g., "direct:calendar_agent")
  agent_name = route_decision.split(":")[1] if ":" in route_decision else "calendar_agent"
  
  # Create a simple task for the agent
  # Get the last user message
  user_query = ""
  for msg in reversed(messages):
    if hasattr(msg, 'content') and not hasattr(msg, 'name'):  # Simple check for user message
      user_query = msg.content
      break
  
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
  
  # Invoke agent
  result = selected_agent.invoke(agent_state)
  
  return {
    "messages": messages,
    "agent_results": [{"agent": agent_name, "result": result}],
    "final_response": result.get("result", {}).get("messages", [])[-1].content if result.get("result", {}).get("messages") else "No response",
    "user_timezone": "America/New_York"
  }

def orchestrator(state: AgentState):
  """Orchestrator agent - analyzes messages and context to determine the goal"""
  messages = state.get("messages", [])
  context = state.get("context", "")
  
  # Load orchestrator prompt and format it
  orchestrator_prompt_template = load_prompt("orchestrator")
  analysis_prompt = orchestrator_prompt_template.format(
    context=context,
    messages=messages
  )
  
  analysis_messages = [HumanMessage(content=analysis_prompt)]
  response = fastModel.invoke(analysis_messages)
  
  # Extract the goal from the response and update the state
  goal = response.content
  
  return {
    "messages": messages + [response], 
    "context": context,
    "goal": goal,  # Add goal to state for set_tasks to use
    "route_decision": state.get("route_decision", "complex")  # Preserve route decision
  }

def set_tasks(state: AgentState):
  """Set objective and break down into tasks"""
  
  # Load set_tasks prompt
  system_prompt = load_prompt("set_tasks")
  
  goal = state.get("goal", "No goal determined")
  
  user_message = f"Determined goal: {goal}"
  
  messages = [
    SystemMessage(content=system_prompt),
    HumanMessage(content=user_message)
  ]
  
  response = reasoningModel.invoke(messages)
  
  # Parse the JSON response and return tasks
  try:
    tasks = json.loads(response.content)
    return {"tasks": tasks}
  except json.JSONDecodeError:
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

def agent_calls(state: AgentState, config: Dict[str, Any] = None):
  """Execute agent calls - each agent receives its task list"""
  tasks: List[TaskState] = state.get("tasks", [])
  if not tasks:
    return {"agent_results": []}

  # Group tasks by assigned agent
  agent_task_map = {}
  for task in tasks:
    agent_name = task.get("assigned_agent", "unknown")
    if agent_name not in agent_task_map:
      agent_task_map[agent_name] = []
    agent_task_map[agent_name].append(task)

  def execute_agent_tasks(agent_name: str, agent_tasks: List[TaskState]) -> Tuple[str, Any]:
    """Execute all tasks for a specific agent"""
    # Create agent-specific state with its task list
    agent_state = dict(state)
    agent_state["tasks"] = agent_tasks
    
    try:
      if agent_name == "calendar_agent":
        # Pass config to calendar_agent so it can access Supabase client
        result = calendar_agent.invoke(agent_state, config)
      elif agent_name == "orchestrator":
        result = orchestrator(agent_state)
      else:
        result = {"warning": f"Unknown agent {agent_name}"}
      return agent_name, result
    except Exception as e:
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
  
  return {"agent_results": results}

def synthesizer(state: AgentState):
  """Synthesize information from all agents"""
  
  # Load synthesizer prompt
  system_prompt = load_prompt("synthesizer")
  
  # Format the agent results for the prompt
  results_text = ""
  if state.get("agent_results"):
    for i, result in enumerate(state["agent_results"], 1):
      results_text += f"\nTask {i}: {result.get('task', 'Unknown task')}\n"
      results_text += f"Result: {result.get('result', 'No result')}\n"
  
  user_message = f"""Original request: {state.get('context', 'No context provided')}
  
  Agent Results:
  {results_text}
  
  Please provide a comprehensive summary and final response."""
  
  messages = [
    SystemMessage(content=system_prompt),
    HumanMessage(content=user_message)
  ]
  
  response = reasoningModel.invoke(messages)
  
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
    if route_decision == "simple":
        return "simple_responder"
    elif route_decision.startswith("direct:"):
        return "direct_agent_call"
    else:
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


