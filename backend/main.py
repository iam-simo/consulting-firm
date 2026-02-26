from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # This allows EVERY site to connect, fixing the error instantly
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Initialize Database
def init_db():
    conn = sqlite3.connect("consulting.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            message TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

@app.post("/api/contact")
async def receive_contact(request: ContactRequest):
    conn = sqlite3.connect("consulting.db")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO leads (name, email, message) VALUES (?, ?, ?)", 
                   (request.name, request.email, request.message))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Lead saved to SQLite database!"}

@app.get("/api/services")
async def get_services():
    return [
        {"id": 1, "title": "Strategic Planning", "description": "Scaling your business."},
        {"id": 2, "title": "Market Research", "description": "Data-driven insights."}
    ]
# New Route to fetch all messages for the Admin
@app.get("/api/admin/leads")
async def get_leads():
    conn = sqlite3.connect("consulting.db")
    # This row_factory makes the data look like a Dictionary (JSON) instead of a list
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leads ORDER BY id DESC")
    rows = cursor.fetchall()
    
    # Convert rows to a list of dictionaries
    leads = [dict(row) for row in rows]
    conn.close()
    return leads
origins = [
    "http://localhost:5173",
    "https://consulting-firm-delta.vercel.app",
]