import datetime, os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client()   # auto-reads GEMINI_API_KEY from the environment

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # our Vite frontend, later
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/token")
async def create_token():
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    token = client.auth_tokens.create(
        config={
            "uses": 1,                                                # one connection per token
            "expire_time": now + datetime.timedelta(minutes=30),      # session may run 30 min
            "new_session_expire_time": now + datetime.timedelta(minutes=1),  # connect within 1 min
        }
    )
    return {"token": token.name}