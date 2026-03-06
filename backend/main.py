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

def send_email(to: str, subject: str, html: str):
    if not SMTP_USER or not SMTP_PASS:
        print("SMTP not configured — skipping email")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["From"]    = f"Elite Consulting <{SMTP_USER}>"
        msg["To"]      = to
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to, msg.as_string())
        print(f"Email sent to {to}")
    except smtplib.SMTPAuthenticationError:
        print("SMTP auth failed — check SMTP_USER and SMTP_PASS (use Gmail App Password)")
    except Exception as e:
        print(f"Email failed: {type(e).__name__}: {e}")

def send_enquiry_notification(name: str, email: str, service: str, message: str):
    if not NOTIFY_EMAIL:
        return
    html = f"""
    <div style="font-family:monospace;max-width:600px;margin:auto;background:#050505;
                color:#e0e0e0;padding:40px;border:1px solid #00f2ff33;border-radius:12px">
      <div style="border-left:4px solid #00f2ff;padding-left:16px;margin-bottom:30px">
        <p style="color:#00f2ff;font-size:11px;letter-spacing:3px;margin:0">ELITE CONSULTING</p>
        <h2 style="color:#fff;margin:8px 0 0;font-size:22px">New Client Enquiry</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr><td style="padding:10px 0;color:#888;width:100px">Name</td>
            <td style="padding:10px 0;color:#fff;font-weight:600">{name}</td></tr>
        <tr><td style="padding:10px 0;color:#888">Email</td>
            <td style="padding:10px 0;color:#00f2ff">{email}</td></tr>
        <tr><td style="padding:10px 0;color:#888">Service</td>
            <td style="padding:10px 0;color:#fff">{service or 'Not specified'}</td></tr>
      </table>
      <div style="background:#0a0a0a;padding:20px;border-radius:8px;border-left:3px solid #00f2ff">
        <p style="color:#888;font-size:11px;letter-spacing:2px;margin:0 0 10px">MESSAGE</p>
        <p style="color:#e0e0e0;line-height:1.7;margin:0">{message}</p>
      </div>
      <p style="color:#444;font-size:12px;margin-top:24px">Reply directly to {email} to respond.</p>
    </div>"""
    send_email(NOTIFY_EMAIL, f"New Enquiry from {name} — Elite Consulting", html)

def send_login_notification(name: str, email: str):
    now = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")
    html = f"""
    <div style="font-family:monospace;max-width:600px;margin:auto;background:#050505;
                color:#e0e0e0;padding:40px;border:1px solid #00f2ff33;border-radius:12px">
      <div style="border-left:4px solid #00f2ff;padding-left:16px;margin-bottom:30px">
        <p style="color:#00f2ff;font-size:11px;letter-spacing:3px;margin:0">ELITE CONSULTING</p>
        <h2 style="color:#fff;margin:8px 0 0;font-size:22px">Sign-In Detected</h2>
      </div>
      <p style="color:#b0b0b0;line-height:1.7">
        Hi <strong style="color:#fff">{name}</strong>,<br><br>
        A successful sign-in to your Elite Consulting account was detected.
      </p>
      <div style="background:#0a0a0a;padding:20px;border-radius:8px;margin:24px 0;
                  border:1px solid rgba(0,242,255,0.15)">
        <p style="color:#888;font-size:11px;letter-spacing:2px;margin:0 0 8px">SIGN-IN DETAILS</p>
        <p style="color:#e0e0e0;margin:0">🕐 {now}</p>
        <p style="color:#e0e0e0;margin:8px 0 0">📧 {email}</p>
      </div>
      <p style="color:#b0b0b0;line-height:1.7;font-size:14px">
        If this wasn't you, please contact us immediately.
      </p>
    </div>"""
    send_email(email, "Sign-In Detected — Elite Consulting", html)

def send_welcome_email(name: str, email: str):
    html = f"""
    <div style="font-family:monospace;max-width:600px;margin:auto;background:#050505;
                color:#e0e0e0;padding:40px;border:1px solid #00f2ff33;border-radius:12px">
      <div style="border-left:4px solid #00f2ff;padding-left:16px;margin-bottom:30px">
        <p style="color:#00f2ff;font-size:11px;letter-spacing:3px;margin:0">ELITE CONSULTING</p>
        <h2 style="color:#fff;margin:8px 0 0;font-size:22px">Welcome Aboard</h2>
      </div>
      <p style="color:#b0b0b0;line-height:1.7">
        Hi <strong style="color:#fff">{name}</strong>,<br><br>
        Your Elite Consulting client account has been created successfully.
      </p>
      <div style="background:#00f2ff;padding:16px 24px;border-radius:8px;
                  text-align:center;margin:24px 0">
        <p style="color:#000;font-weight:700;font-size:16px;margin:0;letter-spacing:1px">
          ACCOUNT ACTIVATED
        </p>
      </div>
      <p style="color:#b0b0b0;line-height:1.7;font-size:14px">
        If you have any questions, reach us at hello@eliteconsulting.co.ke
      </p>
    </div>"""
    send_email(email, "Welcome to Elite Consulting", html)

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
    send_enquiry_notification(req.name, req.email, req.service, req.message)
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
    send_welcome_email(req.name, req.email)
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
    send_login_notification(row["name"], row["email"])
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