from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from typing import Optional, List
import sqlite3, os, smtplib, bcrypt, threading, secrets, csv, io
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jose import jwt, JWTError
from datetime import datetime, timedelta

app = FastAPI()

ADMIN_API_KEY  = os.getenv("ADMIN_API_KEY",  "temporary_dev_key")
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "admin@eliteconsulting.co.ke")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
JWT_SECRET     = os.getenv("JWT_SECRET",     "change_this_in_production")
SMTP_USER      = os.getenv("SMTP_USER",      "")
SMTP_PASS      = os.getenv("SMTP_PASS",      "")
NOTIFY_EMAIL   = os.getenv("NOTIFY_EMAIL",   "")
FRONTEND_URL   = os.getenv("FRONTEND_URL",   "https://consulting-firm-delta.vercel.app")

origins = ["http://localhost:5173", "https://consulting-firm-delta.vercel.app"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

def get_conn():
    conn = sqlite3.connect("consulting.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    conn.execute('''CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, name TEXT, email TEXT, service TEXT, message TEXT,
        status TEXT DEFAULT 'pending', admin_response TEXT,
        score TEXT DEFAULT 'warm', read_by_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        newsletter INTEGER DEFAULT 0, onboarding_step INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL, sender TEXT NOT NULL, content TEXT NOT NULL,
        read_by_user INTEGER DEFAULT 0, read_by_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT,
        status TEXT DEFAULT 'in_progress', progress INTEGER DEFAULT 0,
        phase TEXT DEFAULT 'Discovery',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL, title TEXT NOT NULL,
        phase TEXT NOT NULL, done INTEGER DEFAULT 0, due_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL, title TEXT NOT NULL,
        filename TEXT NOT NULL, file_path TEXT NOT NULL,
        doc_type TEXT DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL, token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL, used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, action TEXT NOT NULL, detail TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS newsletter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
        excerpt TEXT, content TEXT NOT NULL, tags TEXT,
        published INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, name TEXT NOT NULL, email TEXT NOT NULL,
        date TEXT NOT NULL, time TEXT NOT NULL,
        service TEXT, notes TEXT, status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL, company TEXT, role TEXT,
        content TEXT NOT NULL, rating INTEGER DEFAULT 5,
        approved INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    for m in [
        "ALTER TABLE leads ADD COLUMN score TEXT DEFAULT 'warm'",
        "ALTER TABLE leads ADD COLUMN read_by_admin INTEGER DEFAULT 0",
        "ALTER TABLE messages ADD COLUMN read_by_user INTEGER DEFAULT 0",
        "ALTER TABLE messages ADD COLUMN read_by_admin INTEGER DEFAULT 0",
        "ALTER TABLE projects ADD COLUMN phase TEXT DEFAULT 'Discovery'",
        "ALTER TABLE users ADD COLUMN newsletter INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN onboarding_step INTEGER DEFAULT 0",
    ]:
        try: conn.execute(m)
        except: pass
    os.makedirs("uploads", exist_ok=True)
    conn.commit(); conn.close()

init_db()

def score_lead(service, message):
    text = f"{service} {message}".lower()
    if any(k in text for k in ['urgent','asap','budget','ready to start','hire','contract','payment']): return 'hot'
    if any(k in text for k in ['just curious','exploring','maybe','research','student']): return 'cold'
    return 'warm'

def log_activity(user_id, action, detail=""):
    try:
        conn = get_conn()
        conn.execute("INSERT INTO activity_log (user_id,action,detail) VALUES (?,?,?)", (user_id, action, detail))
        conn.commit(); conn.close()
    except: pass

def create_token(payload):
    return jwt.encode({**payload, "exp": datetime.utcnow() + timedelta(hours=24)}, JWT_SECRET, algorithm="HS256")

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try: return jwt.decode(authorization.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
    except JWTError: raise HTTPException(status_code=401, detail="Invalid or expired token")

async def verify_admin_key(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY: raise HTTPException(status_code=403, detail="Unauthorized")
    return x_admin_key

def send_email(to, subject, html):
    def _send():
        if not SMTP_USER or not SMTP_PASS:
            print(f"[EMAIL] SKIPPED — {subject} → {to}"); return
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = f"Elite Consulting <{SMTP_USER}>"; msg["To"] = to; msg["Subject"] = subject
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as s:
                s.ehlo(); s.starttls(); s.ehlo(); s.login(SMTP_USER, SMTP_PASS)
                s.sendmail(SMTP_USER, to, msg.as_string())
            print(f"[EMAIL] OK → {to}")
        except Exception as e: print(f"[EMAIL] ERR: {e}")
    threading.Thread(target=_send, daemon=True).start()

def _card(title, body):
    return f"""<div style="font-family:Arial,sans-serif;max-width:580px;margin:30px auto;background:#0f1b2d;
color:#dde8f5;border-radius:10px;border:1px solid rgba(0,210,255,0.2);overflow:hidden">
<div style="background:linear-gradient(135deg,#0a2240,#0d1f38);border-bottom:2px solid rgba(0,210,255,0.3);padding:26px 30px">
<p style="margin:0;color:#00d4ff;font-size:11px;letter-spacing:4px;text-transform:uppercase">ELITE CONSULTING</p>
<h2 style="margin:8px 0 0;font-size:22px;color:#fff;font-weight:700">{title}</h2></div>
<div style="padding:26px 30px">{body}</div>
<div style="padding:14px 30px;border-top:1px solid rgba(255,255,255,0.07);font-size:12px;color:#3a5a7a">
Elite Consulting · Nairobi, Kenya · hello@eliteconsulting.co.ke</div></div>"""

def notify_new_enquiry(name, email, service, message):
    if not NOTIFY_EMAIL: return
    body = f"<p style='color:#8ab0d0'>New enquiry from <strong style='color:#fff'>{name}</strong> ({email})</p><p style='color:#dde8f5'>Service: {service or 'Not specified'}</p><div style='background:#0a1828;border-left:3px solid #00d4ff;padding:14px'><p style='color:#dde8f5'>{message}</p></div>"
    send_email(NOTIFY_EMAIL, f"New Enquiry from {name}", _card("New Client Enquiry", body))

def notify_welcome(name, email):
    body = f"<p style='color:#8ab0d0'>Hi <strong style='color:#fff'>{name}</strong>,<br><br>Your Elite Consulting account is now active.</p><div style='background:#00d4ff;border-radius:6px;padding:13px 20px;text-align:center;margin:18px 0'><p style='color:#000;font-weight:700;font-size:14px;margin:0;letter-spacing:2px'>ACCOUNT ACTIVATED</p></div>"
    send_email(email, "Welcome to Elite Consulting", _card("Welcome Aboard", body))

def notify_login(name, email):
    now = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")
    body = f"<p style='color:#8ab0d0'>Hi <strong style='color:#fff'>{name}</strong>,<br><br>Sign-in detected at {now}.</p><p style='color:#e07050;font-size:13px'>Not you? Contact us immediately.</p>"
    send_email(email, "Sign-In Detected — Elite Consulting", _card("Sign-In Detected", body))

def notify_admin_reply(user_name, user_email, content):
    body = f"<p style='color:#8ab0d0'>Hi <strong style='color:#fff'>{user_name}</strong>,<br><br>The team replied:</p><div style='background:#0a1828;border-left:3px solid #34d399;padding:14px;margin-top:12px'><p style='color:#dde8f5'>{content}</p></div>"
    send_email(user_email, "New Message from Elite Consulting", _card("Message from Our Team", body))

def notify_status_update(name, email, service, status, response):
    body = f"<p style='color:#8ab0d0'>Hi <strong style='color:#fff'>{name}</strong>,<br><br>Your enquiry for <strong>{service or 'our services'}</strong> is now <strong style='color:#00d4ff'>{status.upper()}</strong>.</p>"
    if response: body += f"<div style='background:#0a1828;border-left:3px solid #34d399;padding:14px;margin-top:12px'><p style='color:#dde8f5'>{response}</p></div>"
    send_email(email, "Enquiry Update — Elite Consulting", _card("Enquiry Status Updated", body))

def notify_password_reset(email, token):
    link = f"{FRONTEND_URL}?reset_token={token}"
    body = f"<p style='color:#8ab0d0'>A password reset was requested. Expires in 30 minutes.</p><div style='text-align:center;margin:24px 0'><a href='{link}' style='background:#00d4ff;color:#000;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;border-radius:4px;text-decoration:none'>RESET PASSWORD</a></div><p style='color:#e07050;font-size:13px'>If you didn't request this, ignore this email.</p>"
    send_email(email, "Password Reset — Elite Consulting", _card("Reset Your Password", body))

def notify_appointment(name, email, date, time, service):
    body = f"<p style='color:#8ab0d0'>Hi <strong style='color:#fff'>{name}</strong>,<br><br>Appointment request received. We'll confirm within 2 hours.</p><div style='background:#0a1828;border:1px solid rgba(0,212,255,0.15);border-radius:6px;padding:16px;margin-top:12px'><p style='color:#dde8f5;margin:0 0 6px'>Date: <strong>{date}</strong></p><p style='color:#dde8f5;margin:0 0 6px'>Time: <strong>{time} EAT</strong></p><p style='color:#dde8f5;margin:0'>Service: <strong>{service or 'General'}</strong></p></div>"
    send_email(email, "Appointment Request Received — Elite Consulting", _card("Appointment Received", body))

class ContactRequest(BaseModel):
    name: str; email: str; service: Optional[str] = ""; message: str
class RegisterRequest(BaseModel):
    name: str; email: str; password: str; newsletter: Optional[bool] = False
class LoginRequest(BaseModel):
    email: str; password: str; role: str
class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None; email: Optional[str] = None
    current_password: Optional[str] = None; new_password: Optional[str] = None
class MessageRequest(BaseModel):
    content: str
class ReplyRequest(BaseModel):
    content: str; user_id: int
class UpdateLeadRequest(BaseModel):
    status: str; admin_response: Optional[str] = None
class PasswordResetRequest(BaseModel):
    email: str
class PasswordResetConfirm(BaseModel):
    token: str; new_password: str
class NewsletterRequest(BaseModel):
    email: str
class AppointmentRequest(BaseModel):
    name: str; email: str; date: str; time: str
    service: Optional[str] = ""; notes: Optional[str] = ""
class TestimonialRequest(BaseModel):
    client_name: str; company: Optional[str] = ""; role: Optional[str] = ""
    content: str; rating: Optional[int] = 5
class BlogPostRequest(BaseModel):
    title: str; slug: str; excerpt: Optional[str] = ""; content: str
    tags: Optional[str] = ""; published: Optional[bool] = False
class MilestoneRequest(BaseModel):
    project_id: int; title: str; phase: str; due_date: Optional[str] = ""
class BulkLeadRequest(BaseModel):
    ids: List[int]; status: str

@app.get("/")
def root(): return {"status": "Elite Consulting API v2.0"}

@app.get("/api/test-email")
def test_email(to: str = ""):
    target = to or NOTIFY_EMAIL or SMTP_USER
    if not target: return {"error": "Pass ?to=your@email.com"}
    send_email(target, "SMTP Test", _card("Email Test", "<p style='color:#8ab0d0'>SMTP working!</p>"))
    return {"queued_to": target, "smtp_set": bool(SMTP_USER and SMTP_PASS)}

@app.post("/api/contact")
async def receive_contact(req: ContactRequest, authorization: str = Header(None)):
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            payload = jwt.decode(authorization.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
            c = get_conn(); row = c.execute("SELECT id FROM users WHERE email=?", (payload.get("sub"),)).fetchone(); c.close()
            if row: user_id = row["id"]
        except: pass
    conn = get_conn()
    conn.execute("INSERT INTO leads (user_id,name,email,service,message,score) VALUES (?,?,?,?,?,?)",
                 (user_id, req.name, req.email, req.service, req.message, score_lead(req.service, req.message)))
    conn.commit(); conn.close()
    notify_new_enquiry(req.name, req.email, req.service, req.message)
    return {"status": "success"}

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    pw = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    conn = get_conn()
    try:
        conn.execute("INSERT INTO users (name,email,password_hash,newsletter) VALUES (?,?,?,?)",
                     (req.name, req.email, pw, 1 if req.newsletter else 0))
        conn.commit()
        if req.newsletter:
            try: conn.execute("INSERT INTO newsletter (email) VALUES (?)", (req.email,)); conn.commit()
            except: pass
    except sqlite3.IntegrityError: raise HTTPException(status_code=400, detail="Email already registered")
    finally: conn.close()
    notify_welcome(req.name, req.email)
    log_activity(None, "register", req.email)
    return {"status": "success", "message": "Account created. Please sign in."}

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    if req.role == "admin":
        if req.email != ADMIN_EMAIL or req.password != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        return {"token": create_token({"sub": req.email, "role": "admin", "name": "Administrator"}),
                "role": "admin", "name": "Administrator"}
    conn = get_conn(); row = conn.execute("SELECT * FROM users WHERE email=?", (req.email,)).fetchone(); conn.close()
    if not row or not bcrypt.checkpw(req.password.encode(), row["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    notify_login(row["name"], row["email"])
    log_activity(row["id"], "login", row["email"])
    return {"token": create_token({"sub": row["email"], "role": "user", "name": row["name"], "user_id": row["id"]}),
            "role": "user", "name": row["name"], "user_id": row["id"], "onboarding_step": row["onboarding_step"]}

@app.post("/api/auth/forgot-password")
async def forgot_password(req: PasswordResetRequest):
    conn = get_conn(); row = conn.execute("SELECT id FROM users WHERE email=?", (req.email,)).fetchone(); conn.close()
    if not row: return {"status": "success"}
    token = secrets.token_urlsafe(32)
    conn = get_conn()
    conn.execute("INSERT INTO password_resets (email,token,expires_at) VALUES (?,?,?)",
                 (req.email, token, datetime.utcnow() + timedelta(minutes=30)))
    conn.commit(); conn.close()
    notify_password_reset(req.email, token)
    return {"status": "success"}

@app.post("/api/auth/reset-password")
async def reset_password(req: PasswordResetConfirm):
    conn = get_conn()
    row = conn.execute("SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at>?",
                       (req.token, datetime.utcnow())).fetchone()
    if not row: conn.close(); raise HTTPException(status_code=400, detail="Invalid or expired link")
    pw = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    conn.execute("UPDATE users SET password_hash=? WHERE email=?", (pw, row["email"]))
    conn.execute("UPDATE password_resets SET used=1 WHERE token=?", (req.token,))
    conn.commit(); conn.close()
    return {"status": "success", "message": "Password updated. Please sign in."}

@app.get("/api/user/profile")
async def get_profile(user=Depends(get_current_user)):
    conn = get_conn()
    row = conn.execute("SELECT id,name,email,created_at,onboarding_step,newsletter FROM users WHERE email=?",
                       (user["sub"],)).fetchone()
    conn.close()
    if not row: raise HTTPException(status_code=404, detail="Not found")
    return dict(row)

@app.put("/api/user/profile")
async def update_profile(req: UpdateProfileRequest, user=Depends(get_current_user)):
    conn = get_conn(); row = conn.execute("SELECT * FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); raise HTTPException(status_code=404, detail="Not found")
    new_name = req.name or row["name"]; new_email = req.email or row["email"]; new_hash = row["password_hash"]
    if req.new_password:
        if not req.current_password: conn.close(); raise HTTPException(status_code=400, detail="Current password required")
        if not bcrypt.checkpw(req.current_password.encode(), row["password_hash"].encode()):
            conn.close(); raise HTTPException(status_code=401, detail="Current password incorrect")
        new_hash = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    try:
        conn.execute("UPDATE users SET name=?,email=?,password_hash=? WHERE id=?",
                     (new_name, new_email, new_hash, row["id"])); conn.commit()
    except sqlite3.IntegrityError: conn.close(); raise HTTPException(status_code=400, detail="Email already in use")
    conn.close(); log_activity(row["id"], "profile_update")
    return {"status": "success", "token": create_token({"sub": new_email, "role": "user", "name": new_name, "user_id": row["id"]}), "name": new_name}

@app.put("/api/user/onboarding")
async def update_onboarding(step: int, user=Depends(get_current_user)):
    conn = get_conn(); conn.execute("UPDATE users SET onboarding_step=? WHERE email=?", (step, user["sub"]))
    conn.commit(); conn.close(); return {"status": "success"}

@app.get("/api/user/enquiries")
async def get_user_enquiries(user=Depends(get_current_user)):
    conn = get_conn(); rows = conn.execute("SELECT * FROM leads WHERE email=? ORDER BY id DESC", (user["sub"],)).fetchall(); conn.close()
    return [dict(r) for r in rows]

@app.get("/api/user/messages")
async def get_user_messages(user=Depends(get_current_user)):
    conn = get_conn(); row = conn.execute("SELECT id FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); return []
    msgs = conn.execute("SELECT * FROM messages WHERE user_id=? ORDER BY created_at ASC", (row["id"],)).fetchall()
    conn.execute("UPDATE messages SET read_by_user=1 WHERE user_id=? AND sender='admin'", (row["id"],))
    conn.commit(); conn.close(); return [dict(m) for m in msgs]

@app.get("/api/user/unread")
async def get_user_unread(user=Depends(get_current_user)):
    conn = get_conn(); row = conn.execute("SELECT id FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); return {"messages": 0}
    c = conn.execute("SELECT COUNT(*) as c FROM messages WHERE user_id=? AND sender='admin' AND read_by_user=0", (row["id"],)).fetchone()["c"]
    conn.close(); return {"messages": c}

@app.post("/api/user/messages")
async def send_user_message(req: MessageRequest, user=Depends(get_current_user)):
    conn = get_conn(); row = conn.execute("SELECT id,name,email FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); raise HTTPException(status_code=404, detail="Not found")
    conn.execute("INSERT INTO messages (user_id,sender,content) VALUES (?,?,?)", (row["id"], "user", req.content))
    conn.commit(); conn.close()
    notify_new_enquiry(row["name"], row["email"], "", req.content)
    return {"status": "success"}

@app.get("/api/user/projects")
async def get_user_projects(user=Depends(get_current_user)):
    conn = get_conn(); row = conn.execute("SELECT id FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); return []
    projects = conn.execute("SELECT * FROM projects WHERE user_id=? ORDER BY created_at DESC", (row["id"],)).fetchall()
    result = []
    for p in projects:
        pd = dict(p)
        pd["milestones"] = [dict(m) for m in conn.execute("SELECT * FROM milestones WHERE project_id=? ORDER BY id", (p["id"],)).fetchall()]
        result.append(pd)
    conn.close(); return result

@app.get("/api/user/documents")
async def get_user_documents(user=Depends(get_current_user)):
    conn = get_conn(); row = conn.execute("SELECT id FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); return []
    docs = conn.execute("SELECT * FROM documents WHERE user_id=? ORDER BY created_at DESC", (row["id"],)).fetchall()
    conn.close(); return [dict(d) for d in docs]

@app.get("/api/user/activity")
async def get_user_activity(user=Depends(get_current_user)):
    conn = get_conn(); row = conn.execute("SELECT id FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); return []
    logs = conn.execute("SELECT * FROM activity_log WHERE user_id=? ORDER BY created_at DESC LIMIT 20", (row["id"],)).fetchall()
    conn.close(); return [dict(l) for l in logs]

@app.post("/api/appointments")
async def book_appointment(req: AppointmentRequest, authorization: str = Header(None)):
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            payload = jwt.decode(authorization.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
            c = get_conn(); r = c.execute("SELECT id FROM users WHERE email=?", (payload.get("sub"),)).fetchone(); c.close()
            if r: user_id = r["id"]
        except: pass
    conn = get_conn()
    conn.execute("INSERT INTO appointments (user_id,name,email,date,time,service,notes) VALUES (?,?,?,?,?,?,?)",
                 (user_id, req.name, req.email, req.date, req.time, req.service, req.notes))
    conn.commit(); conn.close()
    notify_appointment(req.name, req.email, req.date, req.time, req.service)
    if NOTIFY_EMAIL:
        body = f"<p style='color:#8ab0d0'>Appointment from <strong style='color:#fff'>{req.name}</strong> on {req.date} at {req.time}</p>"
        send_email(NOTIFY_EMAIL, f"New Appointment — {req.name}", _card("New Appointment", body))
    return {"status": "success"}

@app.post("/api/newsletter")
async def subscribe(req: NewsletterRequest):
    conn = get_conn()
    try: conn.execute("INSERT INTO newsletter (email) VALUES (?)", (req.email,)); conn.commit()
    except: pass
    finally: conn.close()
    return {"status": "success"}

@app.get("/api/testimonials")
async def get_testimonials():
    conn = get_conn(); rows = conn.execute("SELECT * FROM testimonials WHERE approved=1 ORDER BY created_at DESC").fetchall(); conn.close()
    return [dict(r) for r in rows]

@app.post("/api/testimonials")
async def submit_testimonial(req: TestimonialRequest):
    conn = get_conn()
    conn.execute("INSERT INTO testimonials (client_name,company,role,content,rating) VALUES (?,?,?,?,?)",
                 (req.client_name, req.company, req.role, req.content, req.rating))
    conn.commit(); conn.close(); return {"status": "success"}

@app.get("/api/blog")
async def get_blog(limit: int = 10):
    conn = get_conn(); rows = conn.execute("SELECT id,title,slug,excerpt,tags,created_at FROM blog_posts WHERE published=1 ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall(); conn.close()
    return [dict(r) for r in rows]

@app.get("/api/blog/{slug}")
async def get_post(slug: str):
    conn = get_conn(); row = conn.execute("SELECT * FROM blog_posts WHERE slug=? AND published=1", (slug,)).fetchone(); conn.close()
    if not row: raise HTTPException(status_code=404, detail="Not found")
    return dict(row)

@app.get("/api/admin/leads")
async def get_leads(_=Depends(verify_admin_key)):
    conn = get_conn(); leads = [dict(r) for r in conn.execute("SELECT * FROM leads ORDER BY id DESC").fetchall()]; conn.close(); return leads

@app.delete("/api/admin/leads/{lid}")
async def delete_lead(lid: int, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("DELETE FROM leads WHERE id=?", (lid,)); conn.commit(); conn.close(); return {"message": "Deleted"}

@app.put("/api/admin/leads/{lid}")
async def update_lead(lid: int, req: UpdateLeadRequest, _=Depends(verify_admin_key)):
    conn = get_conn(); lead = conn.execute("SELECT * FROM leads WHERE id=?", (lid,)).fetchone()
    if not lead: conn.close(); raise HTTPException(status_code=404)
    conn.execute("UPDATE leads SET status=?,admin_response=?,read_by_admin=1 WHERE id=?", (req.status, req.admin_response, lid))
    conn.commit(); conn.close()
    if lead["email"]: notify_status_update(lead["name"], lead["email"], lead["service"], req.status, req.admin_response)
    return {"message": "Updated"}

@app.post("/api/admin/leads/bulk")
async def bulk_leads(req: BulkLeadRequest, _=Depends(verify_admin_key)):
    conn = get_conn()
    for lid in req.ids: conn.execute("UPDATE leads SET status=? WHERE id=?", (req.status, lid))
    conn.commit(); conn.close(); return {"message": f"Updated {len(req.ids)} leads"}

@app.get("/api/admin/leads/export")
async def export_leads(_=Depends(verify_admin_key)):
    conn = get_conn(); leads = conn.execute("SELECT * FROM leads ORDER BY id DESC").fetchall(); conn.close()
    out = io.StringIO(); w = csv.writer(out)
    w.writerow(["ID","Name","Email","Service","Message","Status","Score","Response","Created"])
    for l in leads: w.writerow([l["id"],l["name"],l["email"],l["service"],l["message"],l["status"],l.get("score",""),l["admin_response"],l["created_at"]])
    out.seek(0)
    return Response(content=out.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=leads.csv"})

@app.get("/api/admin/users")
async def get_users(_=Depends(verify_admin_key)):
    conn = get_conn(); users = [dict(r) for r in conn.execute("SELECT id,name,email,created_at,newsletter,onboarding_step FROM users ORDER BY id DESC").fetchall()]; conn.close(); return users

@app.delete("/api/admin/users/{uid}")
async def delete_user(uid: int, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("DELETE FROM users WHERE id=?", (uid,)); conn.commit(); conn.close(); return {"message": "Deleted"}

@app.get("/api/admin/messages")
async def get_all_messages(_=Depends(verify_admin_key)):
    conn = get_conn()
    rows = conn.execute("SELECT m.*,u.name as user_name,u.email as user_email FROM messages m JOIN users u ON m.user_id=u.id ORDER BY m.created_at ASC").fetchall()
    conn.close(); return [dict(r) for r in rows]

@app.post("/api/admin/messages/reply")
async def admin_reply(req: ReplyRequest, _=Depends(verify_admin_key)):
    conn = get_conn(); user = conn.execute("SELECT name,email FROM users WHERE id=?", (req.user_id,)).fetchone()
    if not user: conn.close(); raise HTTPException(status_code=404)
    conn.execute("INSERT INTO messages (user_id,sender,content) VALUES (?,?,?)", (req.user_id, "admin", req.content))
    conn.execute("UPDATE messages SET read_by_admin=1 WHERE user_id=? AND sender='user'", (req.user_id,))
    conn.commit(); conn.close()
    notify_admin_reply(user["name"], user["email"], req.content)
    return {"status": "success"}

@app.get("/api/admin/unread")
async def admin_unread(_=Depends(verify_admin_key)):
    conn = get_conn()
    msgs  = conn.execute("SELECT COUNT(*) as c FROM messages WHERE sender='user' AND read_by_admin=0").fetchone()["c"]
    leads = conn.execute("SELECT COUNT(*) as c FROM leads WHERE read_by_admin=0").fetchone()["c"]
    appts = conn.execute("SELECT COUNT(*) as c FROM appointments WHERE status='pending'").fetchone()["c"]
    conn.close(); return {"messages": msgs, "leads": leads, "appointments": appts, "total": msgs+leads+appts}

@app.post("/api/admin/projects")
async def create_project(user_id: int, title: str, description: str = "", status: str = "in_progress", progress: int = 0, phase: str = "Discovery", _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("INSERT INTO projects (user_id,title,description,status,progress,phase) VALUES (?,?,?,?,?,?)", (user_id, title, description, status, progress, phase)); conn.commit(); conn.close(); return {"status": "success"}

@app.put("/api/admin/projects/{pid}")
async def update_project(pid: int, title: str = None, description: str = None, status: str = None, progress: int = None, phase: str = None, _=Depends(verify_admin_key)):
    conn = get_conn(); p = conn.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    if not p: conn.close(); raise HTTPException(status_code=404)
    conn.execute("UPDATE projects SET title=?,description=?,status=?,progress=?,phase=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
                 (title or p["title"], description or p["description"], status or p["status"],
                  progress if progress is not None else p["progress"], phase or p.get("phase","Discovery"), pid))
    conn.commit(); conn.close(); return {"status": "success"}

@app.delete("/api/admin/projects/{pid}")
async def delete_project(pid: int, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("DELETE FROM projects WHERE id=?", (pid,)); conn.commit(); conn.close(); return {"message": "Deleted"}

@app.post("/api/admin/milestones")
async def create_milestone(req: MilestoneRequest, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("INSERT INTO milestones (project_id,title,phase,due_date) VALUES (?,?,?,?)", (req.project_id, req.title, req.phase, req.due_date)); conn.commit(); conn.close(); return {"status": "success"}

@app.put("/api/admin/milestones/{mid}")
async def update_milestone(mid: int, done: bool = False, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("UPDATE milestones SET done=? WHERE id=?", (1 if done else 0, mid)); conn.commit(); conn.close(); return {"status": "success"}

@app.post("/api/admin/documents")
async def upload_doc(user_id: int = Form(...), title: str = Form(...), doc_type: str = Form("general"), file: UploadFile = File(...), _=Depends(verify_admin_key)):
    ext = os.path.splitext(file.filename)[1]; safe = f"{secrets.token_hex(8)}{ext}"; path = os.path.join("uploads", safe)
    with open(path, "wb") as f: f.write(await file.read())
    conn = get_conn(); conn.execute("INSERT INTO documents (user_id,title,filename,file_path,doc_type) VALUES (?,?,?,?,?)", (user_id, title, file.filename, path, doc_type)); conn.commit(); conn.close()
    return {"status": "success"}

@app.get("/api/admin/documents/{did}/download")
async def download_doc(did: int, _=Depends(verify_admin_key)):
    conn = get_conn(); doc = conn.execute("SELECT * FROM documents WHERE id=?", (did,)).fetchone(); conn.close()
    if not doc: raise HTTPException(status_code=404)
    return FileResponse(doc["file_path"], filename=doc["filename"])

@app.delete("/api/admin/documents/{did}")
async def delete_doc(did: int, _=Depends(verify_admin_key)):
    conn = get_conn(); doc = conn.execute("SELECT * FROM documents WHERE id=?", (did,)).fetchone()
    if doc:
        try: os.remove(doc["file_path"])
        except: pass
        conn.execute("DELETE FROM documents WHERE id=?", (did,)); conn.commit()
    conn.close(); return {"message": "Deleted"}

@app.get("/api/admin/appointments")
async def get_appointments(_=Depends(verify_admin_key)):
    conn = get_conn(); rows = conn.execute("SELECT * FROM appointments ORDER BY date DESC,time DESC").fetchall(); conn.close(); return [dict(r) for r in rows]

@app.put("/api/admin/appointments/{aid}")
async def update_appointment(aid: int, status: str, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("UPDATE appointments SET status=? WHERE id=?", (status, aid)); conn.commit(); conn.close(); return {"status": "success"}

@app.get("/api/admin/newsletter")
async def get_newsletter(_=Depends(verify_admin_key)):
    conn = get_conn(); rows = conn.execute("SELECT * FROM newsletter ORDER BY created_at DESC").fetchall(); conn.close(); return [dict(r) for r in rows]

@app.get("/api/admin/analytics")
async def get_analytics(_=Depends(verify_admin_key)):
    conn = get_conn()
    totals = {
        "leads":    conn.execute("SELECT COUNT(*) as c FROM leads").fetchone()["c"],
        "users":    conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"],
        "projects": conn.execute("SELECT COUNT(*) as c FROM projects").fetchone()["c"],
        "messages": conn.execute("SELECT COUNT(*) as c FROM messages").fetchone()["c"],
        "appointments": conn.execute("SELECT COUNT(*) as c FROM appointments").fetchone()["c"],
        "newsletter": conn.execute("SELECT COUNT(*) as c FROM newsletter").fetchone()["c"],
    }
    by_status  = [dict(r) for r in conn.execute("SELECT status,COUNT(*) as c FROM leads GROUP BY status").fetchall()]
    by_service = [dict(r) for r in conn.execute("SELECT service,COUNT(*) as c FROM leads WHERE service!='' GROUP BY service ORDER BY c DESC LIMIT 6").fetchall()]
    by_score   = [dict(r) for r in conn.execute("SELECT score,COUNT(*) as c FROM leads GROUP BY score").fetchall()]
    by_week    = [dict(r) for r in conn.execute("SELECT strftime('%Y-W%W',created_at) as week,COUNT(*) as c FROM leads GROUP BY week ORDER BY week DESC LIMIT 8").fetchall()]
    conn.close()
    return {"totals": totals, "by_status": by_status, "by_service": by_service, "by_score": by_score, "by_week": by_week}

@app.get("/api/admin/testimonials")
async def admin_testimonials(_=Depends(verify_admin_key)):
    conn = get_conn(); rows = conn.execute("SELECT * FROM testimonials ORDER BY created_at DESC").fetchall(); conn.close(); return [dict(r) for r in rows]

@app.put("/api/admin/testimonials/{tid}")
async def approve_testimonial(tid: int, approved: bool, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("UPDATE testimonials SET approved=? WHERE id=?", (1 if approved else 0, tid)); conn.commit(); conn.close(); return {"status": "success"}

@app.delete("/api/admin/testimonials/{tid}")
async def delete_testimonial(tid: int, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("DELETE FROM testimonials WHERE id=?", (tid,)); conn.commit(); conn.close(); return {"message": "Deleted"}

@app.get("/api/admin/blog")
async def admin_blog(_=Depends(verify_admin_key)):
    conn = get_conn(); rows = conn.execute("SELECT * FROM blog_posts ORDER BY created_at DESC").fetchall(); conn.close(); return [dict(r) for r in rows]

@app.post("/api/admin/blog")
async def create_post(req: BlogPostRequest, _=Depends(verify_admin_key)):
    conn = get_conn()
    try:
        conn.execute("INSERT INTO blog_posts (title,slug,excerpt,content,tags,published) VALUES (?,?,?,?,?,?)",
                     (req.title, req.slug, req.excerpt, req.content, req.tags, 1 if req.published else 0))
        conn.commit()
    except sqlite3.IntegrityError: raise HTTPException(status_code=400, detail="Slug exists")
    finally: conn.close()
    return {"status": "success"}

@app.put("/api/admin/blog/{bid}")
async def update_post(bid: int, req: BlogPostRequest, _=Depends(verify_admin_key)):
    conn = get_conn()
    conn.execute("UPDATE blog_posts SET title=?,excerpt=?,content=?,tags=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
                 (req.title, req.excerpt, req.content, req.tags, 1 if req.published else 0, bid))
    conn.commit(); conn.close(); return {"status": "success"}

@app.delete("/api/admin/blog/{bid}")
async def delete_post(bid: int, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("DELETE FROM blog_posts WHERE id=?", (bid,)); conn.commit(); conn.close(); return {"message": "Deleted"}