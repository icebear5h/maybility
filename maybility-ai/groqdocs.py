from groq import Groq
import json
from dotenv import load_dotenv

load_dotenv()

# Initialize the Groq client 
client = Groq()

# Define models
ROUTING_MODEL = "llama3-70b-8192"
TOOL_USE_MODEL = "llama3-groq-70b-8192-tool-use-preview"
GENERAL_MODEL = "llama3-70b-8192"

def calculate(expression):
    """Tool to evaluate a mathematical expression"""
    try:
        result = eval(expression)
        return json.dumps({"result": result})
    except:
        return json.dumps({"error": "Invalid expression"})

def route_query(query):
    """Routing logic to let LLM decide if tools are needed"""
    routing_prompt = f"""
    Given the following user query, determine if any tools are needed to answer it.
    If a calculation tool is needed, respond with 'TOOL: CALCULATE'.
    If no tools are needed, respond with 'NO TOOL'.

    User query: {query}

    Response:
    """
    
    response = client.chat.completions.create(
        model=ROUTING_MODEL,
        messages=[
            {"role": "system", "content": "You are a routing assistant. Determine if tools are needed based on the user query."},
            {"role": "user", "content": routing_prompt}
        ],
        max_tokens=20  # We only need a short response
    )
    
    routing_decision = response.choices[0].message.content.strip()
    
    if "TOOL: CALCULATE" in routing_decision:
        return "calculate tool needed"
    else:
        return "no tool needed"

def run_with_tool(query):
    """Use the tool use model to perform the calculation"""
    messages = [
        {
            "role": "system",
            "content": "You are a calculator assistant. Use the calculate function to perform mathematical operations and provide the results.",
        },
        {
            "role": "user",
            "content": query,
        }
    ]
    tools = [
        {
            "type": "function",
            "function": {
                "name": "calculate",
                "description": "Evaluate a mathematical expression",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expression": {
                            "type": "string",
                            "description": "The mathematical expression to evaluate",
                        }
                    },
                    "required": ["expression"],
                },
            },
        }
    ]
    response = client.chat.completions.create(
        model=TOOL_USE_MODEL,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        max_tokens=4096
    )
    response_message = response.choices[0].message
    tool_calls = response_message.tool_calls
    if tool_calls:
        messages.append(response_message)
        for tool_call in tool_calls:
            function_args = json.loads(tool_call.function.arguments)
            function_response = calculate(function_args.get("expression"))
            messages.append(
                {
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": "calculate",
                    "content": function_response,
                }
            )
        second_response = client.chat.completions.create(
            model=TOOL_USE_MODEL,
            messages=messages
        )
        return second_response.choices[0].message.content
    return response_message.content

def run_general(query):
    """Use the general model to answer the query since no tool is needed"""
    response = client.chat.completions.create(
        model=GENERAL_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": query}
        ]
    )
    return response.choices[0].message.content

def process_query(query):
    """Process the query and route it to the appropriate model"""
    route = route_query(query)
    if route == "calculate":
        response = run_with_tool(query)
    else:
        response = run_general(query)
    
    return {
        "query": query,
        "route": route,
        "response": response
    }

# Example usage
if __name__ == "__main__":
    queries = [
        "What is the capital of the Netherlands?",
        "Calculate 25 * 4 + 10"
    ]
    
    for query in queries:
        result = process_query(query)
        print(f"Query: {result['query']}")
        print(f"Route: {result['route']}")
        print(f"Response: {result['response']}\n")