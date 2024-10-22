from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from toolhouse import Toolhouse
from dotenv import load_dotenv
import os
from nomic import embed
from supabase import create_client, Client
from openai import OpenAI
from prisma import Prisma
from groq import Groq
import asyncio
import supabase
import logging
import ast
import time
load_dotenv()

#logging.basicConfig(level=logging.DEBUG)

# Initialize OpenAI client with your API key
# Create the Groq client
#client = Groq(api_key=os.environ.get("GROQ_API_KEY"), )
client = OpenAI()
# Create the tools
th = Toolhouse(provider="openai")
th.set_metadata('timezone', -4)

#MODEL = "llama3-groq-70b-8192-tool-use-preview"


async def retrieveDocs(query):
    queryVector = embed.text(
        texts = [query],
        model='nomic-embed-text-v1.5',
        task_type='search_query',     
    )
    queryEmbedding = queryVector['embeddings'][0]
    #print(queryEmbedding)
    embedding_array = f"{queryEmbedding}"

    db = Prisma()
    await db.connect()
    try:
        docIds = await db.query_raw(
           '''
            SELECT "documentId"
            FROM "DocumentChunks"
            WHERE "userId" = 'cm1i7065600003kw4l6b3ds0q'
            ORDER BY "embedding" <-> CAST($1 AS vector) ASC
            LIMIT 5
            ''',
            embedding_array 
        )
        
        return docIds
            
    finally:
        await db.disconnect()
        


# Initialize FastAPI client
app = FastAPI()

async def getDocContext(docIds):
    db = Prisma()
    await db.connect()
    context = ""
    for docId in docIds:
        doc = await db.document.find_first_or_raise(
            where={
                'id': docId['documentId']
            },
        )
        context += doc.content
    await db.disconnect()
    return context
#print(th.get_tools())

class ChatRequest (BaseModel):
    input_str: str

#MODEL = 'llama3-groq-70b-8192-tool-use-preview'
MODEL = 'gpt-4o-mini'

# Function to handle one step of the conversation
async def chat_with_assistant(input_str):
    start_time = time.time()
    # Get the documents and add them to the context
    docIds = await (retrieveDocs(input_str))
    print("Embedding query and retrieving docIds: " + str(time.time()-start_time))
    userDocContext = await getDocContext(docIds)
    print("Retrieving doc contents: " + str(time.time()-start_time))

    # Append the user input to the chat history
    messages = [{
        "role": "assistant",
        "content": "This is the user's key query: " + input_str +  "\n\n The following is the user's journal contents:" + userDocContext
    }]
    
    
    # Create the response
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        tools=th.get_tools(),
        temperature=1.2
    )
    print("Initial feed??: " + str(time.time()-start_time))

    
    messages += th.run_tools(response)
    print("With tools: " + str(time.time()-start_time))

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        tools=th.get_tools(),
        temperature=1.2
    )
    # Append the response to the chat history
    messages.append({
        "role": "assistant",
        "content": response.choices[0].message.content
    })
    print("Final: " + str(time.time()-start_time))

    
    #print(messages)
    # Print the assistant's response
    return (response.choices[0].message.content)

#print(chat_with_assistant("what is going on with the news right now"))

@app.post("/chat/")  # This line decorates 'translate' as a POST endpoint
async def chat(request: ChatRequest):
    try:
        # Call your translation function
        assistant_text = chat_with_assistant(request.input_str)
        return {"assistant_text": assistant_text}
    except Exception as e:
        # Handle exceptions or errors during translation
        raise HTTPException(status_code=500, detail=str(e))
    
    
async def main() -> None:
    print (await chat_with_assistant("What is on the news for october 21 2024"))
    #print(await retrieveDocs("goals for the semester"))
    
    
if __name__ == "__main__":
    asyncio.run(main())
