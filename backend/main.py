from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3, os, smtplib, bcrypt, threading
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

# ── DATABASE ──────────────────────────────────────────────────
def get_conn():
    conn = sqlite3.connect("consulting.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    conn.execute('''CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT, email TEXT, service TEXT, message TEXT,
        status TEXT DEFAULT 'pending',
        admin_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        sender TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'in_progress',
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    for col in [
        "ALTER TABLE leads ADD COLUMN user_id INTEGER",
        "ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'pending'",
        "ALTER TABLE leads ADD COLUMN admin_response TEXT",
    ]:
        try: conn.execute(col)
        except: pass
    conn.commit()
    conn.close()

init_db()

# ── AUTH ──────────────────────────────────────────────────────
def create_token(payload: dict) -> str:
    return jwt.encode(
        {**payload, "exp": datetime.utcnow() + timedelta(hours=24)},
        JWT_SECRET, algorithm="HS256"
    )

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return jwt.decode(authorization.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def verify_admin_key(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return x_admin_key

# ── EMAIL (FIXED) ─────────────────────────────────────────────
def send_email(to: str, subject: str, html: str):
    def _send():
        print(f"[EMAIL] Trying to send: subject='{subject}' to={to}")
        print(f"[EMAIL] SMTP_USER={'SET' if SMTP_USER else 'MISSING'} | SMTP_PASS={'SET' if SMTP_PASS else 'MISSING'}")
        if not SMTP_USER or not SMTP_PASS:
            print("[EMAIL] SKIPPED — add SMTP_USER and SMTP_PASS to Render env vars")
            return
        try:
            msg = MIMEMultipart("alternative")
            msg["From"]    = f"Elite Consulting <{SMTP_USER}>"
            msg["To"]      = to
            msg["Subject"] = subject
            msg.attach(MIMEText(html, "html"))
            print("[EMAIL] Connecting to smtp.gmail.com:587 ...")
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, to, msg.as_string())
            print(f"[EMAIL] SUCCESS — sent to {to}")
        except smtplib.SMTPAuthenticationError:
            print("[EMAIL] AUTH FAILED — use a Gmail App Password, not your real password")
        except smtplib.SMTPException as e:
            print(f"[EMAIL] SMTP ERROR — {type(e).__name__}: {e}")
        except Exception as e:
            print(f"[EMAIL] UNEXPECTED ERROR — {type(e).__name__}: {e}")
    threading.Thread(target=_send, daemon=True).start()

def _html_card(title: str, body: str) -> str:
    return f"""
<div style="font-family:Arial,sans-serif;max-width:580px;margin:30px auto;
     background:#0f1b2d;color:#dde8f5;border-radius:10px;
     border:1px solid rgba(0,210,255,0.2);overflow:hidden">
  <div style="background:linear-gradient(135deg,#0a2240,#0d1f38);
       border-bottom:2px solid rgba(0,210,255,0.3);padding:26px 30px">
    <p style="margin:0;color:#00d4ff;font-size:11px;letter-spacing:4px;
       text-transform:uppercase">ELITE CONSULTING</p>
    <h2 style="margin:8px 0 0;font-size:22px;color:#fff;font-weight:700">{title}</h2>
  </div>
  <div style="padding:26px 30px">{body}</div>
  <div style="padding:14px 30px;border-top:1px solid rgba(255,255,255,0.07);
       font-size:12px;color:#3a5a7a">
    Elite Consulting · Nairobi, Kenya · hello@eliteconsulting.co.ke
  </div>
</div>"""

def notify_new_enquiry(name, email, service, message):
    if not NOTIFY_EMAIL: return
    body = f"""
<p style="color:#8ab0d0;margin:0 0 16px">A new enquiry has arrived from the website.</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:18px">
  <tr><td style="padding:7px 0;color:#5a80a0;width:100px">Name</td>
      <td style="color:#fff;font-weight:600">{name}</td></tr>
  <tr><td style="padding:7px 0;color:#5a80a0">Email</td>
      <td><a href="mailto:{email}" style="color:#00d4ff">{email}</a></td></tr>
  <tr><td style="padding:7px 0;color:#5a80a0">Service</td>
      <td style="color:#dde8f5">{service or 'Not specified'}</td></tr>
</table>
<div style="background:#0a1828;border-left:3px solid #00d4ff;padding:14px;border-radius:0 6px 6px 0">
  <p style="color:#3a6a8a;font-size:11px;letter-spacing:2px;margin:0 0 8px">MESSAGE</p>
  <p style="color:#dde8f5;line-height:1.8;margin:0">{message}</p>
</div>
<p style="color:#3a5a7a;font-size:13px;margin-top:14px">
  Reply to <a href="mailto:{email}" style="color:#00d4ff">{email}</a>
</p>"""
    send_email(NOTIFY_EMAIL, f"New Enquiry from {name} — Elite Consulting", _html_card("New Client Enquiry", body))

def notify_welcome(name, email):
    body = f"""
<p style="color:#8ab0d0;line-height:1.8;margin:0 0 18px">
  Hi <strong style="color:#fff">{name}</strong>,<br><br>
  Your Elite Consulting client account is now active.
  Sign in to your Client Portal to track enquiries,
  monitor project updates, and message our team.
</p>
<div style="background:#00d4ff;border-radius:6px;padding:13px 20px;
     text-align:center;margin-bottom:18px">
  <p style="color:#000;font-weight:700;font-size:14px;margin:0;letter-spacing:2px">
    ACCOUNT ACTIVATED</p>
</div>
<p style="color:#3a5a7a;font-size:13px">
  Questions? Email hello@eliteconsulting.co.ke
</p>"""
    send_email(email, "Welcome to Elite Consulting — Account Activated", _html_card("Welcome Aboard", body))

def notify_login(name, email):
    now = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")
    body = f"""
<p style="color:#8ab0d0;line-height:1.8;margin:0 0 18px">
  Hi <strong style="color:#fff">{name}</strong>,<br><br>
  A successful sign-in was detected on your account.
</p>
<div style="background:#0a1828;border:1px solid rgba(0,212,255,0.15);
     border-radius:6px;padding:16px;margin-bottom:18px">
  <p style="color:#4a7a9a;font-size:11px;letter-spacing:2px;margin:0 0 10px">SIGN-IN DETAILS</p>
  <p style="color:#dde8f5;margin:0 0 6px">Time: {now}</p>
  <p style="color:#dde8f5;margin:0">Account: {email}</p>
</div>
<p style="color:#e07050;font-size:13px;margin:0">Not you? Contact us immediately.</p>"""
    send_email(email, "Sign-In Detected — Elite Consulting", _html_card("Sign-In Detected", body))

def notify_new_message(user_name, user_email, content):
    if not NOTIFY_EMAIL: return
    body = f"""
<p style="color:#8ab0d0;margin:0 0 14px">
  <strong style="color:#fff">{user_name}</strong>
  (<a href="mailto:{user_email}" style="color:#00d4ff">{user_email}</a>)
  sent a message via the Client Portal:
</p>
<div style="background:#0a1828;border-left:3px solid #00d4ff;padding:14px;border-radius:0 6px 6px 0">
  <p style="color:#dde8f5;line-height:1.8;margin:0">{content}</p>
</div>
<p style="color:#3a5a7a;font-size:13px;margin-top:14px">Reply via the Admin Panel.</p>"""
    send_email(NOTIFY_EMAIL, f"New Message from {user_name} — Elite Consulting", _html_card("New Client Message", body))

def notify_admin_reply(user_name, user_email, content):
    body = f"""
<p style="color:#8ab0d0;line-height:1.8;margin:0 0 18px">
  Hi <strong style="color:#fff">{user_name}</strong>,<br><br>
  The Elite Consulting team has replied to your message:
</p>
<div style="background:#0a1828;border-left:3px solid #34d399;padding:14px;
     border-radius:0 6px 6px 0;margin-bottom:18px">
  <p style="color:#dde8f5;line-height:1.8;margin:0">{content}</p>
</div>
<p style="color:#3a5a7a;font-size:13px">
  Sign in to your Client Portal to continue the conversation.
</p>"""
    send_email(user_email, "New Message from Elite Consulting Team", _html_card("Message from Our Team", body))

# ── MODELS ────────────────────────────────────────────────────
class ContactRequest(BaseModel):
    name: str; email: str; service: Optional[str] = ""; message: str

class RegisterRequest(BaseModel):
    name: str; email: str; password: str

class LoginRequest(BaseModel):
    email: str; password: str; role: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class MessageRequest(BaseModel):
    content: str

class ReplyRequest(BaseModel):
    content: str; user_id: int

class UpdateLeadRequest(BaseModel):
    status: str; admin_response: Optional[str] = None

# ── PUBLIC ROUTES ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Elite Consulting API running"}

@app.get("/api/test-email")
def test_email(to: str = ""):
    target = to or NOTIFY_EMAIL or SMTP_USER
    if not target:
        return {"error": "Pass ?to=your@email.com"}
    send_email(
        target,
        "Elite Consulting — SMTP Test",
        _html_card("Email Test", "<p style='color:#8ab0d0'>SMTP is working correctly!</p>")
    )
    return {
        "queued_to": target,
        "smtp_user_set": bool(SMTP_USER),
        "smtp_pass_set": bool(SMTP_PASS),
        "notify_email": NOTIFY_EMAIL,
    }

@app.post("/api/contact")
async def receive_contact(req: ContactRequest, authorization: str = Header(None)):
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            payload = jwt.decode(authorization.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
            c = get_conn()
            row = c.execute("SELECT id FROM users WHERE email=?", (payload.get("sub"),)).fetchone()
            c.close()
            if row: user_id = row["id"]
        except: pass
    conn = get_conn()
    conn.execute(
        "INSERT INTO leads (user_id,name,email,service,message) VALUES (?,?,?,?,?)",
        (user_id, req.name, req.email, req.service, req.message)
    )
    conn.commit(); conn.close()
    notify_new_enquiry(req.name, req.email, req.service, req.message)
    return {"status": "success"}

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    pw = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    conn = get_conn()
    try:
        conn.execute("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)", (req.name, req.email, pw))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()
    notify_welcome(req.name, req.email)
    return {"status": "success", "message": "Account created. Please sign in."}

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    if req.role == "admin":
        if req.email != ADMIN_EMAIL or req.password != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        token = create_token({"sub": req.email, "role": "admin", "name": "Administrator"})
        return {"token": token, "role": "admin", "name": "Administrator"}
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE email=?", (req.email,)).fetchone()
    conn.close()
    if not row or not bcrypt.checkpw(req.password.encode(), row["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    notify_login(row["name"], row["email"])
    token = create_token({"sub": row["email"], "role": "user", "name": row["name"], "user_id": row["id"]})
    return {"token": token, "role": "user", "name": row["name"], "user_id": row["id"]}

# ── USER PORTAL ROUTES ────────────────────────────────────────
@app.get("/api/user/profile")
async def get_profile(user=Depends(get_current_user)):
    conn = get_conn()
    row = conn.execute("SELECT id,name,email,created_at FROM users WHERE email=?", (user["sub"],)).fetchone()
    conn.close()
    if not row: raise HTTPException(status_code=404, detail="Not found")
    return dict(row)

@app.put("/api/user/profile")
async def update_profile(req: UpdateProfileRequest, user=Depends(get_current_user)):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); raise HTTPException(status_code=404, detail="Not found")
    new_name  = req.name  or row["name"]
    new_email = req.email or row["email"]
    new_hash  = row["password_hash"]
    if req.new_password:
        if not req.current_password:
            conn.close(); raise HTTPException(status_code=400, detail="Current password required")
        if not bcrypt.checkpw(req.current_password.encode(), row["password_hash"].encode()):
            conn.close(); raise HTTPException(status_code=401, detail="Current password incorrect")
        new_hash = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    try:
        conn.execute("UPDATE users SET name=?,email=?,password_hash=? WHERE id=?",
                     (new_name, new_email, new_hash, row["id"]))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close(); raise HTTPException(status_code=400, detail="Email already in use")
    conn.close()
    token = create_token({"sub": new_email, "role": "user", "name": new_name, "user_id": row["id"]})
    return {"status": "success", "token": token, "name": new_name}

@app.get("/api/user/enquiries")
async def get_user_enquiries(user=Depends(get_current_user)):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM leads WHERE email=? ORDER BY id DESC", (user["sub"],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/user/messages")
async def get_user_messages(user=Depends(get_current_user)):
    conn = get_conn()
    row = conn.execute("SELECT id FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); return []
    msgs = conn.execute("SELECT * FROM messages WHERE user_id=? ORDER BY created_at ASC", (row["id"],)).fetchall()
    conn.close()
    return [dict(m) for m in msgs]

@app.post("/api/user/messages")
async def send_user_message(req: MessageRequest, user=Depends(get_current_user)):
    conn = get_conn()
    row = conn.execute("SELECT id,name,email FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); raise HTTPException(status_code=404, detail="Not found")
    conn.execute("INSERT INTO messages (user_id,sender,content) VALUES (?,?,?)", (row["id"], "user", req.content))
    conn.commit(); conn.close()
    notify_new_message(row["name"], row["email"], req.content)
    return {"status": "success"}

@app.get("/api/user/projects")
async def get_user_projects(user=Depends(get_current_user)):
    conn = get_conn()
    row = conn.execute("SELECT id FROM users WHERE email=?", (user["sub"],)).fetchone()
    if not row: conn.close(); return []
    projects = conn.execute("SELECT * FROM projects WHERE user_id=? ORDER BY created_at DESC", (row["id"],)).fetchall()
    conn.close()
    return [dict(p) for p in projects]

# ── ADMIN ROUTES ──────────────────────────────────────────────
@app.get("/api/admin/leads")
async def get_leads(_=Depends(verify_admin_key)):
    conn = get_conn()
    leads = [dict(r) for r in conn.execute("SELECT * FROM leads ORDER BY id DESC").fetchall()]
    conn.close(); return leads

@app.delete("/api/admin/leads/{lid}")
async def delete_lead(lid: int, _=Depends(verify_admin_key)):
    conn = get_conn(); conn.execute("DELETE FROM leads WHERE id=?", (lid,)); conn.commit(); conn.close()
    return {"message": "Deleted"}

@app.put("/api/admin/leads/{lid}")
async def update_lead(lid: int, req: UpdateLeadRequest, _=Depends(verify_admin_key)):
    conn = get_conn()
    conn.execute("UPDATE leads SET status=?,admin_response=? WHERE id=?", (req.status, req.admin_response, lid))
    conn.commit(); conn.close()
    return {"message": "Updated"}

@app.get("/api/admin/users")
async def get_users(_=Depends(verify_admin_key)):
    conn = get_conn()
    users = [dict(r) for r in conn.execute(
        "SELECT id,name,email,created_at FROM users ORDER BY id DESC"
    ).fetchall()]
    conn.close(); return users

@app.get("/api/admin/messages")
async def get_all_messages(_=Depends(verify_admin_key)):
    conn = get_conn()
    rows = conn.execute("""
        SELECT m.*, u.name as user_name, u.email as user_email
        FROM messages m JOIN users u ON m.user_id=u.id
        ORDER BY m.created_at ASC
    """).fetchall()
    conn.close(); return [dict(r) for r in rows]

@app.post("/api/admin/messages/reply")
async def admin_reply(req: ReplyRequest, _=Depends(verify_admin_key)):
    conn = get_conn()
    user = conn.execute("SELECT name,email FROM users WHERE id=?", (req.user_id,)).fetchone()
    if not user: conn.close(); raise HTTPException(status_code=404, detail="User not found")
    conn.execute("INSERT INTO messages (user_id,sender,content) VALUES (?,?,?)", (req.user_id, "admin", req.content))
    conn.commit(); conn.close()
    notify_admin_reply(user["name"], user["email"], req.content)
    return {"status": "success"}

@app.post("/api/admin/projects")
async def create_project(user_id: int, title: str, description: str = "",
                         status: str = "in_progress", progress: int = 0,
                         _=Depends(verify_admin_key)):
    conn = get_conn()
    conn.execute("INSERT INTO projects (user_id,title,description,status,progress) VALUES (?,?,?,?,?)",
                 (user_id, title, description, status, progress))
    conn.commit(); conn.close()
    return {"status": "success"}

@app.put("/api/admin/projects/{pid}")
async def update_project(pid: int, title: str = None, description: str = None,
                         status: str = None, progress: int = None,
                         _=Depends(verify_admin_key)):
    conn = get_conn()
    p = conn.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    if not p: conn.close(); raise HTTPException(status_code=404, detail="Not found")
    conn.execute("""UPDATE projects SET title=?,description=?,status=?,progress=?,
                    updated_at=CURRENT_TIMESTAMP WHERE id=?""",
                 (title or p["title"], description or p["description"],
                  status or p["status"], progress if progress is not None else p["progress"], pid))
    conn.commit(); conn.close()
    return {"status": "success"}