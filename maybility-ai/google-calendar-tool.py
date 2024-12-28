from groq import Groq
import json
from dotenv import load_dotenv
from datetime import datetime, timedelta
import os.path
import pdb
import logging
import traceback
from functools import wraps

# Set up logging with more detailed format
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s - [%(filename)s:%(lineno)d]',
    handlers=[
        logging.StreamHandler()  # Only console output for immediate feedback
    ]
)
logger = logging.getLogger(__name__)

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

load_dotenv()

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]


"""Shows basic usage of the Google Calendar API.
Prints the start and name of the next 10 events on the user's calendar.
"""
creds = None
# The file token.json stores the user's access and refresh tokens, and is
# created automatically when the authorization flow completes for the first
# time.
if os.path.exists("token.json"):
    creds = Credentials.from_authorized_user_file("token.json", SCOPES)
# If there are no (valid) credentials available, let the user log in.
if not creds or not creds.valid:
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        flow = InstalledAppFlow.from_client_secrets_file(
            "credentials.json", SCOPES
        )
        creds = flow.run_local_server(port=0)
    # Save the credentials for the next run
    with open("token.json", "w") as token:
        token.write(creds.to_json())


# Initialize the Groq client 
client = Groq()

# Define models
ROUTING_MODEL = "llama3-70b-8192"
TOOL_USE_MODEL = "llama3-groq-70b-8192-tool-use-preview"
GENERAL_MODEL = "llama3-70b-8192"

relevant_fields = ["start", "end", "summary", "description"]

def trace(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        func_name = func.__name__
        logger.debug(f"ENTER {func_name} - Args: {args}, Kwargs: {kwargs}")
        try:
            result = func(*args, **kwargs)
            logger.debug(f"EXIT {func_name} - Result: {str(result)[:200]}...")
            return result
        except Exception as e:
            logger.error(f"ERROR in {func_name}: {str(e)}\n{traceback.format_exc()}")
            raise
    return wrapper

@trace
def calendar(start_time, end_time):
    """Tool to get calendar events"""
    logger.debug(f"Calendar function called with start_time={start_time}, end_time={end_time}")
    
    try:
        service = build("calendar", "v3", credentials=creds)
        logger.debug("Calendar service built successfully")
        
        calendar_list = service.calendarList().list().execute()
        logger.debug(f"Retrieved calendar list with {len(calendar_list.get('items', []))} calendars")
        
        events = []
        # Call the Calendar API
        logger.info("Getting events for each calendar")
        for calendar in calendar_list.get("items", []):  # Loop through calendars
            calendar_id = calendar["id"]
            logger.debug(f"Processing calendar: {calendar['summary']} (ID: {calendar_id})")
            
            # Fetch events for this calendar
            try:
                events_result = service.events().list(
                    calendarId=calendar_id,
                    timeMin=start_time,
                    timeMax=end_time,
                    singleEvents=True,
                    orderBy="startTime",
                ).execute()
                logger.debug(f"Retrieved {len(events_result.get('items', []))} events")
                
                filtered_events = [{key: item[key] for key in relevant_fields if key in item} 
                                for item in events_result.get("items", [])]
                events.append({
                    "calendar_name": calendar["summary"],
                    "events": filtered_events
                })
                logger.debug(f"Processed {len(filtered_events)} filtered events")
            
            except Exception as e:
                logger.error(f"Error processing calendar {calendar['summary']}: {str(e)}")
                events.append({
                    "calendar_name": calendar["summary"],
                    "error": str(e)
                })

        logger.debug(f"Returning {len(events)} calendar results")
        return json.dumps({"result": events})
    except Exception as e:
        logger.error(f"Error in calendar function: {str(e)}", exc_info=True)
        return json.dumps({"error": str(e)})

@trace
def route_query(query):
    """Routing logic to let LLM decide if tools are needed"""
    logger.debug(f"route_query called with query: {query}")
    
    routing_prompt = f"""
    Given the following user query, determine if any tools are needed to answer it.
    If a calendar tool is needed, respond with 'TOOL: CALENDAR'.
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
    
    if "TOOL: CALENDAR" in routing_decision:
        return "calendar"
    else:
        return "no tool needed"

@trace
def run_with_tool(query):
    """Use the tool use model to perform retrieval of events"""
    logger.debug(f"run_with_tool called with query: {query}")
    
    now = datetime.utcnow().isoformat() + "Z"
    logger.debug(f"Current time: {now}")
    
    messages = [
        {
            "role": "system",
            "content": "You are a calendar assistant. Use the get events function to retrieve information of the user's schedule and summarize it accurately. Make sure you address each category of events in bullet points. You need to determine the start_date and end_date based on the following user query, it is currently " + now
        },
        {
            "role": "user",
            "content": query,
        }
    ]
    logger.debug("Prepared messages for model")
    
    try:
        response = client.chat.completions.create(
            model=TOOL_USE_MODEL,
            messages=messages,
            tools=local_tools,
            tool_choice="auto",
            max_tokens=4096
        )
        logger.debug("Received initial model response")
        
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls
        
        if tool_calls:
            logger.debug(f"Model requested {len(tool_calls)} tool calls")
            messages.append(response_message)
            
            for tool_call in tool_calls:
                function_args = json.loads(tool_call.function.arguments)
                logger.debug(f"Executing tool call with args: {function_args}")
                
                function_response = calendar(function_args.get("start_time"), function_args.get("end_time"))
                logger.debug(f"Received function response: {function_response[:100]}...")
                
                messages.append(
                    {
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "calendar",
                        "content": function_response,
                    }
                )
            
            logger.debug("Making second model call")
            second_response = client.chat.completions.create(
                model=TOOL_USE_MODEL,
                messages=messages
            )
            return second_response.choices[0].message.content
            
        logger.debug("No tool calls requested by model")
        return response_message.content
        
    except Exception as e:
        logger.error(f"Error in run_with_tool: {str(e)}", exc_info=True)
        raise

@trace
def run_general(query):
    """Use the general model to answer the query since no tool is needed"""
    logger.debug(f"run_general called with query: {query}")
    
    response = client.chat.completions.create(
        model=GENERAL_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": query}
        ]
    )
    logger.debug("Received general model response")
    
    return response.choices[0].message.content

@trace
def process_query(query):
    """Process the query and route it to the appropriate model"""
    logger.debug(f"process_query called with query: {query}")
    
    route = route_query(query)
    if route == "calendar":
        response = run_with_tool(query)
    else:
        response = run_general(query)
    
    logger.debug(f"Returning response: {response[:100]}...")
    
    return {
        "query": query,
        "route": route,
        "response": response
    }

# Example usage
if __name__ == "__main__":
    queries = [
        "What is the capital of the Netherlands?",
        "What is my next week looking like",
        "What is my day looking like today",
        "What is on my calendar next monday"
    ]
    
    for query in queries:
        result = process_query(query)
        print(f"Query: {result['query']}")
        print(f"Route: {result['route']}")
        print(f"Response: {result['response']}\n")