from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os # NEW: Required to read security keys from environment variables

app = FastAPI()

# --- SECURITY FIX #2: Restricted CORS ---
# We replaced ["*"] with your specific production URL to prevent unauthorized sites 
# from making requests to your backend.
origins = [
    "http://localhost:5173",
    "https://consulting-firm-delta.vercel.app", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SECURITY FIX #3: API Key Protection ---
# This pulls a secret key from Render's 'Environment' settings.
# If someone tries to access your data without this key, they get blocked.
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "temporary_dev_key")

async def verify_admin_key(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized Access")
    return x_admin_key

def init_db():
    conn = sqlite3.connect("consulting.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, email TEXT, message TEXT
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
    return {"status": "success"}

# --- SECURITY FIX #3: Added Dependency to protect the endpoint ---
@app.get("/api/admin/leads")
async def get_leads(api_key: str = Depends(verify_admin_key)):
    conn = sqlite3.connect("consulting.db")
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leads ORDER BY id DESC")
    leads = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return leads

# --- SECURITY FIX #4: Created Missing DELETE Route ---
# This matches the frontend call to /api/admin/leads/{id}
@app.delete("/api/admin/leads/{lead_id}")
async def delete_lead(lead_id: int, api_key: str = Depends(verify_admin_key)):
    conn = sqlite3.connect("consulting.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
    conn.commit()
    conn.close()
    return {"message": "Lead purged from database"}