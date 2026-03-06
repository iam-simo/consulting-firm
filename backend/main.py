from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3, os, smtplib, bcrypt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jose import jwt
from datetime import datetime, timedelta

app = FastAPI()

ADMIN_API_KEY  = os.getenv("ADMIN_API_KEY",  "temporary_dev_key")
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "admin@eliteconsulting.co.ke")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
JWT_SECRET     = os.getenv("JWT_SECRET",     "change_this_in_production")
SMTP_USER      = os.getenv("SMTP_USER",      "")
SMTP_PASS      = os.getenv("SMTP_PASS",      "")
NOTIFY_EMAIL   = os.getenv("NOTIFY_EMAIL",   "")

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

def get_conn():
    conn = sqlite3.connect("consulting.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    conn.execute('''CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, email TEXT, service TEXT, message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()

init_db()

def create_token(payload: dict) -> str:
    return jwt.encode(
        {**payload, "exp": datetime.utcnow() + timedelta(hours=24)},
        JWT_SECRET, algorithm="HS256"
    )

async def verify_admin_key(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return x_admin_key

def send_enquiry_email(name: str, email: str, service: str, message: str):
    if not SMTP_USER or not SMTP_PASS or not NOTIFY_EMAIL:
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["From"]    = SMTP_USER
        msg["To"]      = NOTIFY_EMAIL
        msg["Subject"] = f"New Enquiry from {name} — Elite Consulting"
        html = f"""
        <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0a0a0a;
                    color:#e0e0e0;padding:40px;border-radius:12px;border:1px solid #00f2ff33">
          <h2 style="color:#00f2ff;margin-top:0">New Client Enquiry</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:10px 0;color:#888;width:90px">Name</td><td>{name}</td></tr>
            <tr><td style="padding:10px 0;color:#888">Email</td><td>{email}</td></tr>
            <tr><td style="padding:10px 0;color:#888">Service</td><td>{service or 'Not specified'}</td></tr>
          </table>
          <div style="margin-top:20px;background:#111;padding:20px;border-radius:8px;border-left:3px solid #00f2ff">
            <p style="color:#888;margin:0 0 8px;font-size:13px">MESSAGE</p>
            <p style="margin:0;line-height:1.6">{message}</p>
          </div>
        </div>"""
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, NOTIFY_EMAIL, msg.as_string())
    except Exception as e:
        print(f"Email failed: {e}")

class ContactRequest(BaseModel):
    name: str
    email: str
    service: Optional[str] = ""
    message: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

@app.post("/api/contact")
async def receive_contact(req: ContactRequest):
    conn = get_conn()
    conn.execute(
        "INSERT INTO leads (name, email, service, message) VALUES (?, ?, ?, ?)",
        (req.name, req.email, req.service, req.message)
    )
    conn.commit()
    conn.close()
    send_enquiry_email(req.name, req.email, req.service, req.message)
    return {"status": "success"}

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (req.name, req.email, password_hash)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()
    return {"status": "success", "message": "Account created. Please sign in."}

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    if req.role == "admin":
        if req.email != ADMIN_EMAIL or req.password != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        token = create_token({"sub": req.email, "role": "admin", "name": "Administrator"})
        return {"token": token, "role": "admin", "name": "Administrator"}
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    conn.close()
    if not row or not bcrypt.checkpw(req.password.encode(), row["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_token({"sub": row["email"], "role": "user", "name": row["name"]})
    return {"token": token, "role": "user", "name": row["name"]}

@app.get("/api/admin/leads")
async def get_leads(_: str = Depends(verify_admin_key)):
    conn = get_conn()
    leads = [dict(r) for r in conn.execute("SELECT * FROM leads ORDER BY id DESC").fetchall()]
    conn.close()
    return leads

@app.delete("/api/admin/leads/{lead_id}")
async def delete_lead(lead_id: int, _: str = Depends(verify_admin_key)):
    conn = get_conn()
    conn.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
    conn.commit()
    conn.close()
    return {"message": "Lead deleted"}

@app.get("/api/admin/users")
async def get_users(_: str = Depends(verify_admin_key)):
    conn = get_conn()
    users = [dict(r) for r in conn.execute(
        "SELECT id, name, email, created_at FROM users ORDER BY id DESC"
    ).fetchall()]
    conn.close()
    return users