import { useState, useEffect } from 'react';

const API   = 'https://consulting-backend-y19q.onrender.com';
const AKEY  = 'temporary_dev_key';
const H     = { 'x-admin-key': AKEY, 'Content-Type': 'application/json' };

const SCORE_META = {
  hot:  { color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)', label: '🔥 Hot'  },
  warm: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: '🟡 Warm' },
  cold: { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  label: '❄️ Cold' },
};

const STATUS_COLORS = {
  pending:   '#f59e0b',
  reviewing: '#38bdf8',
  responded: '#34d399',
  closed:    '#94a3b8',
};

export default function Admin() {
  const [tab, setTab]               = useState('dashboard');
  const [leads, setLeads]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [messages, setMessages]     = useState([]);
  const [projects, setProjects]     = useState([]);
  const [appts, setAppts]           = useState([]);
  const [analytics, setAnalytics]   = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [blogPosts, setBlogPosts]   = useState([]);
  const [newsletter, setNewsletter] = useState([]);
  const [unread, setUnread]         = useState({ messages:0, leads:0, appointments:0, total:0 });
  const [loading, setLoading]       = useState(true);

  // Lead management
  const [selLead, setSelLead]       = useState(null);
  const [leadStatus, setLeadStatus] = useState('');
  const [leadResp, setLeadResp]     = useState('');
  const [selLeads, setSelLeads]     = useState([]);
  const [bulkStatus, setBulkStatus] = useState('reviewed');

  // Messages
  const [selUser, setSelUser]       = useState(null);
  const [reply, setReply]           = useState('');
  const [replySending, setReplySending] = useState(false);

  // Projects
  const [pForm, setPForm]           = useState({ user_id:'', title:'', description:'', status:'in_progress', progress:0, phase:'Discovery' });
  const [pEdit, setPEdit]           = useState(null);
  const [mForm, setMForm]           = useState({ project_id:'', title:'', phase:'Discovery', due_date:'' });

  // Blog
  const [bForm, setBForm]           = useState({ title:'', slug:'', excerpt:'', content:'', tags:'', published: false });
  const [bEdit, setBEdit]           = useState(null);

  // Testimonials
  // Documents
  const [docForm, setDocForm]       = useState({ user_id:'', title:'', doc_type:'general' });
  const [docFile, setDocFile]       = useState(null);

  // Search / filter
  const [leadSearch, setLeadSearch] = useState('');
  const [leadFilter, setLeadFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [lR, uR, mR, aR, apR, anR, tR, bR, nR, urR] = await Promise.all([
        fetch(`${API}/api/admin/leads`,        { headers: H }),
        fetch(`${API}/api/admin/users`,        { headers: H }),
        fetch(`${API}/api/admin/messages`,     { headers: H }),
        fetch(`${API}/api/admin/appointments`, { headers: H }),
        fetch(`${API}/api/admin/analytics`,    { headers: H }),
        fetch(`${API}/api/admin/testimonials`, { headers: H }),
        fetch(`${API}/api/admin/blog`,         { headers: H }),
        fetch(`${API}/api/admin/newsletter`,   { headers: H }),
        fetch(`${API}/api/admin/unread`,       { headers: H }),
        // projects per user fetched separately below
        fetch(`${API}/api/admin/leads`,        { headers: H }), // placeholder
      ]);
      if (lR.ok)  setLeads(await lR.json());
      if (uR.ok)  setUsers(await uR.json());
      if (mR.ok)  setMessages(await mR.json());
      if (aR.ok)  setAppts(await aR.json());
      if (apR.ok) setAnalytics(await apR.json());
      if (anR.ok) setTestimonials(await anR.json());
      if (tR.ok)  setBlogPosts(await tR.json());
      if (bR.ok)  setNewsletter(await bR.json());
      if (nR.ok)  setUnread(await nR.json());
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── LEADS ─────────────────────────────────────────────────
  const saveLead = async (id) => {
    await fetch(`${API}/api/admin/leads/${id}`, {
      method:'PUT', headers:H,
      body: JSON.stringify({ status: leadStatus, admin_response: leadResp }),
    });
    setSelLead(null); load();
  };

  const deleteLead = async (id) => {
    if (!confirm('Delete this lead?')) return;
    await fetch(`${API}/api/admin/leads/${id}`, { method:'DELETE', headers:H });
    load();
  };

  const bulkUpdate = async () => {
    if (!selLeads.length) return;
    await fetch(`${API}/api/admin/leads/bulk`, {
      method:'POST', headers:H,
      body: JSON.stringify({ ids: selLeads, status: bulkStatus }),
    });
    setSelLeads([]); load();
  };

  const exportCSV = () => {
    window.open(`${API}/api/admin/leads/export?x-admin-key=${AKEY}`, '_blank');
  };

  const toggleSelLead = (id) => {
    setSelLeads(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  };

  const filteredLeads = leads.filter(l => {
    const matchSearch = !leadSearch ||
      l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.service?.toLowerCase().includes(leadSearch.toLowerCase());
    const matchFilter = leadFilter === 'all' || l.status === leadFilter || l.score === leadFilter;
    return matchSearch && matchFilter;
  });

  // ── MESSAGES ──────────────────────────────────────────────
  const uniqueUsers = [...new Map(messages.map(m => [m.user_id, { id: m.user_id, name: m.user_name, email: m.user_email }])).values()];
  const threadMsgs  = selUser ? messages.filter(m => m.user_id === selUser.id) : [];

  const sendReply = async () => {
    if (!reply.trim() || !selUser) return;
    setReplySending(true);
    await fetch(`${API}/api/admin/messages/reply`, {
      method:'POST', headers:H,
      body: JSON.stringify({ content: reply, user_id: selUser.id }),
    });
    setReply(''); setReplySending(false); load();
  };

  // ── PROJECTS ──────────────────────────────────────────────
  const saveProject = async () => {
    if (pEdit) {
      await fetch(`${API}/api/admin/projects/${pEdit}?title=${encodeURIComponent(pForm.title)}&description=${encodeURIComponent(pForm.description)}&status=${pForm.status}&progress=${pForm.progress}&phase=${pForm.phase}`, { method:'PUT', headers:H });
      setPEdit(null);
    } else {
      await fetch(`${API}/api/admin/projects?user_id=${pForm.user_id}&title=${encodeURIComponent(pForm.title)}&description=${encodeURIComponent(pForm.description)}&status=${pForm.status}&progress=${pForm.progress}&phase=${pForm.phase}`, { method:'POST', headers:H });
    }
    setPForm({ user_id:'', title:'', description:'', status:'in_progress', progress:0, phase:'Discovery' });
    load();
  };

  const deleteProject = async (id) => {
    if (!confirm('Delete project?')) return;
    await fetch(`${API}/api/admin/projects/${id}`, { method:'DELETE', headers:H });
    load();
  };

  const addMilestone = async () => {
    await fetch(`${API}/api/admin/milestones`, {
      method:'POST', headers:H, body: JSON.stringify(mForm),
    });
    setMForm({ project_id:'', title:'', phase:'Discovery', due_date:'' });
    load();
  };

  // ── BLOG ──────────────────────────────────────────────────
  const saveBlog = async () => {
    if (bEdit) {
      await fetch(`${API}/api/admin/blog/${bEdit}`, { method:'PUT', headers:H, body: JSON.stringify(bForm) });
      setBEdit(null);
    } else {
      await fetch(`${API}/api/admin/blog`, { method:'POST', headers:H, body: JSON.stringify(bForm) });
    }
    setBForm({ title:'', slug:'', excerpt:'', content:'', tags:'', published: false });
    load();
  };

  const deleteBlog = async (id) => {
    if (!confirm('Delete post?')) return;
    await fetch(`${API}/api/admin/blog/${id}`, { method:'DELETE', headers:H });
    load();
  };

  // ── TESTIMONIALS ──────────────────────────────────────────
  const approveTestimonial = async (id, approved) => {
    await fetch(`${API}/api/admin/testimonials/${id}?approved=${approved}`, { method:'PUT', headers:H });
    load();
  };

  const deleteTestimonial = async (id) => {
    if (!confirm('Delete testimonial?')) return;
    await fetch(`${API}/api/admin/testimonials/${id}`, { method:'DELETE', headers:H });
    load();
  };

  // ── APPOINTMENTS ──────────────────────────────────────────
  const updateAppt = async (id, status) => {
    await fetch(`${API}/api/admin/appointments/${id}?status=${status}`, { method:'PUT', headers:H });
    load();
  };

  // ── DOCUMENTS ─────────────────────────────────────────────
  const uploadDoc = async () => {
    if (!docFile || !docForm.user_id || !docForm.title) return alert('Fill all fields and select a file.');
    const fd = new FormData();
    fd.append('user_id', docForm.user_id);
    fd.append('title', docForm.title);
    fd.append('doc_type', docForm.doc_type);
    fd.append('file', docFile);
    await fetch(`${API}/api/admin/documents`, {
      method:'POST', headers:{ 'x-admin-key': AKEY }, body: fd,
    });
    setDocForm({ user_id:'', title:'', doc_type:'general' }); setDocFile(null); load();
  };

  const TABS = [
    { id:'dashboard',     label:'Dashboard',     icon:'◈' },
    { id:'leads',         label:'Leads',          icon:'✉', badge: unread.leads },
    { id:'messages',      label:'Messages',       icon:'✦', badge: unread.messages },
    { id:'users',         label:'Users',          icon:'👥' },
    { id:'projects',      label:'Projects',       icon:'◎' },
    { id:'appointments',  label:'Appointments',   icon:'📅', badge: unread.appointments },
    { id:'documents',     label:'Documents',      icon:'📄' },
    { id:'blog',          label:'Blog',           icon:'📝' },
    { id:'testimonials',  label:'Testimonials',   icon:'⭐' },
    { id:'newsletter',    label:'Newsletter',     icon:'📧' },
  ];

  if (loading) return (
    <div className="portal-loading">
      <div className="portal-spinner" />
      <p>Loading admin panel…</p>
    </div>
  );

  return (
    <div className="portal-wrap">

      {/* SIDEBAR */}
      <aside className="portal-sidebar">
        <div className="ps-user">
          <div className="ps-avatar" style={{background:'linear-gradient(135deg,#f59e0b,#ff6b6b)'}}>A</div>
          <div>
            <div className="ps-name">Administrator</div>
            <div className="ps-role" style={{color:'#f59e0b'}}>ADMIN PANEL</div>
          </div>
        </div>
        <nav className="ps-nav">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`ps-link${tab===t.id?' ps-active':''}`}>
              <span className="ps-icon">{t.icon}</span>
              {t.label}
              {t.badge > 0 && <span className="ps-badge">{t.badge}</span>}
            </button>
          ))}
        </nav>
        <button className="ps-enquire" style={{background:'rgba(255,107,107,0.15)',color:'#ff6b6b',border:'1px solid rgba(255,107,107,0.3)'}}
          onClick={load}>↻ Refresh</button>
      </aside>

      {/* MAIN */}
      <main className="portal-main">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && analytics && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Dashboard <span className="p-hi">Overview</span></h2>
              <p>Real-time snapshot of your consulting platform.</p>
            </div>

            {/* Stat cards */}
            <div className="admin-stat-cards">
              {[
                { label:'Total Leads',    val: analytics.totals.leads,        color:'#f59e0b', icon:'✉' },
                { label:'Registered Users', val: analytics.totals.users,      color:'#38bdf8', icon:'👥' },
                { label:'Active Projects', val: analytics.totals.projects,    color:'#34d399', icon:'◎' },
                { label:'Messages',        val: analytics.totals.messages,    color:'#a78bfa', icon:'✦' },
                { label:'Appointments',    val: analytics.totals.appointments,color:'#f59e0b', icon:'📅' },
                { label:'Newsletter Subs', val: analytics.totals.newsletter,  color:'#38bdf8', icon:'📧' },
              ].map((s,i) => (
                <div key={i} className="admin-stat" style={{borderLeftColor:s.color}}>
                  <div className="admin-stat-val" style={{color:s.color}}>{s.icon} {s.val}</div>
                  <div className="admin-stat-lbl">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Leads by status */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:8}}>
              <div className="p-block" style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.1)',borderRadius:6,padding:20}}>
                <div className="p-block-title" style={{marginBottom:14}}>Leads by Status</div>
                {analytics.by_status.map((s,i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <span style={{color: STATUS_COLORS[s.status] || '#dde8f5',fontFamily:'JetBrains Mono,monospace',fontSize:12,textTransform:'uppercase'}}>{s.status}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:80,height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{width:`${Math.min((s.c/analytics.totals.leads)*100,100)}%`,height:'100%',background: STATUS_COLORS[s.status]||'#dde8f5',borderRadius:3}} />
                      </div>
                      <span style={{color:'var(--text)',fontFamily:'JetBrains Mono,monospace',fontSize:12,minWidth:20}}>{s.c}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-block" style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.1)',borderRadius:6,padding:20}}>
                <div className="p-block-title" style={{marginBottom:14}}>Lead Score</div>
                {analytics.by_score.map((s,i) => {
                  const sm = SCORE_META[s.score] || SCORE_META.warm;
                  return (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <span style={{color:sm.color,fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{sm.label}</span>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:80,height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
                          <div style={{width:`${Math.min((s.c/analytics.totals.leads)*100,100)}%`,height:'100%',background:sm.color,borderRadius:3}} />
                        </div>
                        <span style={{color:'var(--text)',fontFamily:'JetBrains Mono,monospace',fontSize:12,minWidth:20}}>{s.c}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top services */}
            {analytics.by_service.length > 0 && (
              <div className="p-block" style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.1)',borderRadius:6,padding:20,marginTop:16}}>
                <div className="p-block-title" style={{marginBottom:14}}>Top Requested Services</div>
                {analytics.by_service.map((s,i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <span style={{color:'var(--body)',fontSize:13}}>{s.service}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:120,height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{width:`${Math.min((s.c/analytics.by_service[0].c)*100,100)}%`,height:'100%',background:'linear-gradient(90deg,#00d4ff,#00ffb3)',borderRadius:3}} />
                      </div>
                      <span style={{color:'var(--blue)',fontFamily:'JetBrains Mono,monospace',fontSize:12,minWidth:20}}>{s.c}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unread alerts */}
            {unread.total > 0 && (
              <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:6,padding:16,marginTop:16}}>
                <div style={{color:'#f59e0b',fontFamily:'JetBrains Mono,monospace',fontSize:12,letterSpacing:2,marginBottom:10}}>⚠ ACTION REQUIRED</div>
                <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                  {unread.leads > 0        && <span style={{color:'var(--body)',fontSize:13}}>📬 <strong style={{color:'var(--text)'}}>{unread.leads}</strong> new leads</span>}
                  {unread.messages > 0     && <span style={{color:'var(--body)',fontSize:13}}>💬 <strong style={{color:'var(--text)'}}>{unread.messages}</strong> unread messages</span>}
                  {unread.appointments > 0 && <span style={{color:'var(--body)',fontSize:13}}>📅 <strong style={{color:'var(--text)'}}>{unread.appointments}</strong> pending appointments</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LEADS ── */}
        {tab === 'leads' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Leads <span className="p-hi">Management</span></h2>
              <p>All enquiries with scoring, filtering, bulk actions, and CSV export.</p>
            </div>

            {/* Toolbar */}
            <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap',alignItems:'center'}}>
              <input placeholder="Search name, email, service…" value={leadSearch}
                onChange={e=>setLeadSearch(e.target.value)}
                style={{flex:1,minWidth:200,marginBottom:0}} />
              <select value={leadFilter} onChange={e=>setLeadFilter(e.target.value)} style={{width:140,marginBottom:0}}>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="responded">Responded</option>
                <option value="closed">Closed</option>
                <option value="hot">🔥 Hot</option>
                <option value="warm">🟡 Warm</option>
                <option value="cold">❄️ Cold</option>
              </select>
              <button className="save-btn" onClick={exportCSV}>↓ Export CSV</button>
            </div>

            {/* Bulk actions */}
            {selLeads.length > 0 && (
              <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14,
                background:'rgba(0,212,255,0.06)',border:'1px solid rgba(0,212,255,0.2)',
                borderRadius:6,padding:'10px 14px'}}>
                <span style={{color:'var(--blue)',fontFamily:'JetBrains Mono,monospace',fontSize:12}}>
                  {selLeads.length} selected
                </span>
                <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)} style={{width:130,marginBottom:0}}>
                  <option value="reviewing">Reviewing</option>
                  <option value="responded">Responded</option>
                  <option value="closed">Closed</option>
                </select>
                <button className="save-btn" onClick={bulkUpdate}>Apply to All</button>
                <button className="del-btn" onClick={()=>setSelLeads([])}>Clear</button>
              </div>
            )}

            {selLead ? (
              <div className="fade-up">
                <button className="p-back" onClick={()=>setSelLead(null)}>← Back to list</button>
                <div className="p-detail-card">
                  <div className="p-detail-top">
                    <div>
                      <div style={{color:'var(--text)',fontWeight:700,fontSize:16}}>{selLead.name}</div>
                      <div style={{color:'var(--blue)',fontFamily:'JetBrains Mono,monospace',fontSize:12,marginTop:4}}>{selLead.email}</div>
                      <div className="p-date" style={{marginTop:4}}>{selLead.service || 'General'} · {new Date(selLead.created_at).toLocaleDateString('en-GB')}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                      {(() => { const sm = SCORE_META[selLead.score] || SCORE_META.warm;
                        return <span style={{color:sm.color,background:sm.bg,border:`1px solid ${sm.color}`,fontFamily:'JetBrains Mono,monospace',fontSize:11,padding:'3px 10px',borderRadius:2}}>{sm.label}</span>;
                      })()}
                    </div>
                  </div>
                  <div className="p-detail-section">
                    <div className="p-detail-label">MESSAGE</div>
                    <div className="p-detail-body">{selLead.message}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:18}}>
                    <div>
                      <label className="p-label">Status</label>
                      <select value={leadStatus} onChange={e=>setLeadStatus(e.target.value)} style={{marginBottom:0}}>
                        <option value="pending">Pending</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="responded">Responded</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div style={{marginTop:14}}>
                    <label className="p-label">Response to Client (sent by email)</label>
                    <textarea rows={4} value={leadResp} onChange={e=>setLeadResp(e.target.value)}
                      placeholder="Type your response — client will be notified by email…" />
                  </div>
                  <div style={{display:'flex',gap:10,marginTop:4}}>
                    <button className="save-btn" style={{padding:'9px 22px'}} onClick={()=>saveLead(selLead.id)}>Save & Notify Client</button>
                    <button className="del-btn" onClick={()=>deleteLead(selLead.id)}>Delete Lead</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-list">
                {filteredLeads.length === 0 && (
                  <div className="p-empty"><div className="p-empty-icon">✉</div><h3>No leads found</h3></div>
                )}
                {filteredLeads.map(l => {
                  const sm = SCORE_META[l.score] || SCORE_META.warm;
                  const sc = STATUS_COLORS[l.status] || '#dde8f5';
                  return (
                    <div key={l.id} className="p-row" style={{cursor:'default'}}>
                      <input type="checkbox" checked={selLeads.includes(l.id)}
                        onChange={()=>toggleSelLead(l.id)}
                        style={{width:'auto',margin:'4px 8px 0 0',flexShrink:0}} />
                      <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>{setSelLead(l);setLeadStatus(l.status||'pending');setLeadResp(l.admin_response||'');}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          <span style={{color:'var(--text)',fontWeight:700,fontSize:14}}>{l.name}</span>
                          <span style={{color:'var(--blue)',fontFamily:'JetBrains Mono,monospace',fontSize:11}}>{l.email}</span>
                          {!l.read_by_admin && <span style={{background:'#ff6b6b',color:'#fff',fontSize:9,padding:'1px 6px',borderRadius:8,fontWeight:700}}>NEW</span>}
                        </div>
                        <div className="p-preview">{l.message?.slice(0,90)}…</div>
                        <div style={{color:'var(--dim2)',fontFamily:'JetBrains Mono,monospace',fontSize:10,marginTop:4}}>{l.service || 'General'} · {new Date(l.created_at).toLocaleDateString('en-GB')}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
                        <span style={{color:sm.color,background:sm.bg,border:`1px solid ${sm.color}`,fontFamily:'JetBrains Mono,monospace',fontSize:10,padding:'2px 8px',borderRadius:2}}>{sm.label}</span>
                        <span style={{color:sc,fontFamily:'JetBrains Mono,monospace',fontSize:10,textTransform:'uppercase'}}>{l.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES ── */}
        {tab === 'messages' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Client <span className="p-hi">Messages</span></h2>
              <p>Reply to client messages. Clients are notified by email on reply.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:16,height:560}}>
              {/* User list */}
              <div style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.1)',borderRadius:6,overflow:'auto'}}>
                {uniqueUsers.length === 0 && <div style={{padding:20,color:'var(--dim)',fontSize:13,textAlign:'center'}}>No messages yet</div>}
                {uniqueUsers.map(u => {
                  const unreadCount = messages.filter(m=>m.user_id===u.id&&m.sender==='user'&&!m.read_by_admin).length;
                  return (
                    <div key={u.id} onClick={()=>setSelUser(u)}
                      style={{padding:'14px 16px',cursor:'pointer',borderBottom:'1px solid rgba(0,212,255,0.06)',
                        background: selUser?.id===u.id ? 'rgba(0,212,255,0.08)' : 'transparent',
                        borderLeft: selUser?.id===u.id ? '2px solid var(--blue)' : '2px solid transparent'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#00d4ff,#00ffb3)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'#000',flexShrink:0}}>{u.name?.charAt(0).toUpperCase()}</div>
                        <div style={{minWidth:0}}>
                          <div style={{color:'var(--text)',fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name}</div>
                          <div style={{color:'var(--dim)',fontSize:11,fontFamily:'JetBrains Mono,monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                        </div>
                        {unreadCount > 0 && <span className="ps-badge" style={{marginLeft:'auto'}}>{unreadCount}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Thread */}
              {selUser ? (
                <div className="p-chat" style={{height:'100%'}}>
                  <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(0,212,255,0.1)',background:'rgba(0,0,0,0.2)'}}>
                    <span style={{color:'var(--text)',fontWeight:700}}>{selUser.name}</span>
                    <span style={{color:'var(--dim)',fontFamily:'JetBrains Mono,monospace',fontSize:11,marginLeft:8}}>{selUser.email}</span>
                  </div>
                  <div className="p-chat-feed">
                    {threadMsgs.map(m => (
                      <div key={m.id} className={`p-bubble-wrap ${m.sender==='user'?'p-bubble-left':'p-bubble-right'}`}>
                        <div className="p-bubble-who">{m.sender==='user'?m.user_name:'⚡ Admin'}</div>
                        <div className={`p-bubble ${m.sender==='user'?'p-bubble-a':'p-bubble-u'}`}>{m.content}</div>
                        <div className="p-bubble-time">{new Date(m.created_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'})}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-chat-bar">
                    <input className="p-chat-input" placeholder="Type reply… (Enter to send)"
                      value={reply} onChange={e=>setReply(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendReply()} />
                    <button className="p-chat-send" onClick={sendReply} disabled={replySending||!reply.trim()}>
                      {replySending?'…':'→'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',border:'1px solid rgba(0,212,255,0.1)',borderRadius:6,color:'var(--dim)',fontFamily:'JetBrains Mono,monospace',fontSize:13}}>
                  Select a client to view messages
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Registered <span className="p-hi">Users</span></h2>
              <p>{users.length} registered clients on the platform.</p>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Onboarding</th><th>Newsletter</th><th>Joined</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{color:'var(--text)',fontWeight:600}}>{u.name}</td>
                      <td><a href={`mailto:${u.email}`} style={{color:'var(--blue)'}}>{u.email}</a></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:60,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
                            <div style={{width:`${(u.onboarding_step/4)*100}%`,height:'100%',background:'linear-gradient(90deg,var(--blue),var(--green))',borderRadius:2}} />
                          </div>
                          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--dim)'}}>{u.onboarding_step}/4</span>
                        </div>
                      </td>
                      <td><span style={{color:u.newsletter?'#34d399':'var(--dim)',fontSize:13}}>{u.newsletter?'✓ Yes':'No'}</span></td>
                      <td className="p-date">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                      <td>
                        <button className="del-btn" onClick={async()=>{ if(!confirm('Delete user?'))return; await fetch(`${API}/api/admin/users/${u.id}`,{method:'DELETE',headers:H}); load(); }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PROJECTS ── */}
        {tab === 'projects' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Project <span className="p-hi">Management</span></h2>
              <p>Create and update client projects with phases and milestones.</p>
            </div>

            {/* Project form */}
            <div style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.12)',borderRadius:6,padding:24,marginBottom:24}}>
              <div className="p-block-title" style={{marginBottom:16}}>{pEdit ? 'Edit Project' : 'Create New Project'}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {!pEdit && (
                  <div>
                    <label className="p-label">Client (User ID)</label>
                    <select value={pForm.user_id} onChange={e=>setPForm({...pForm,user_id:e.target.value})} style={{marginBottom:0}}>
                      <option value="">Select client…</option>
                      {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="p-label">Project Title</label>
                  <input value={pForm.title} onChange={e=>setPForm({...pForm,title:e.target.value})} placeholder="e.g. AI Dashboard Build" style={{marginBottom:0}} />
                </div>
                <div>
                  <label className="p-label">Phase</label>
                  <select value={pForm.phase} onChange={e=>setPForm({...pForm,phase:e.target.value})} style={{marginBottom:0}}>
                    {['Discovery','Design','Build','Testing','Deploy'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="p-label">Status</label>
                  <select value={pForm.status} onChange={e=>setPForm({...pForm,status:e.target.value})} style={{marginBottom:0}}>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                <div>
                  <label className="p-label">Progress: {pForm.progress}%</label>
                  <input type="range" min="0" max="100" value={pForm.progress}
                    onChange={e=>setPForm({...pForm,progress:parseInt(e.target.value)})}
                    style={{marginBottom:0,padding:'8px 0'}} />
                </div>
              </div>
              <div style={{marginTop:14}}>
                <label className="p-label">Description</label>
                <textarea rows={2} value={pForm.description} onChange={e=>setPForm({...pForm,description:e.target.value})} placeholder="Brief project description…" />
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="save-btn" style={{padding:'9px 22px'}} onClick={saveProject}>
                  {pEdit ? 'Update Project' : 'Create Project'}
                </button>
                {pEdit && <button className="del-btn" onClick={()=>{setPEdit(null);setPForm({user_id:'',title:'',description:'',status:'in_progress',progress:0,phase:'Discovery'});}}>Cancel</button>}
              </div>
            </div>

            {/* Milestone form */}
            <div style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.12)',borderRadius:6,padding:24,marginBottom:24}}>
              <div className="p-block-title" style={{marginBottom:16}}>Add Milestone</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:14,alignItems:'end'}}>
                <div>
                  <label className="p-label">Project</label>
                  <input value={mForm.project_id} onChange={e=>setMForm({...mForm,project_id:e.target.value})} placeholder="Project ID" style={{marginBottom:0}} />
                </div>
                <div>
                  <label className="p-label">Milestone Title</label>
                  <input value={mForm.title} onChange={e=>setMForm({...mForm,title:e.target.value})} placeholder="e.g. API integration complete" style={{marginBottom:0}} />
                </div>
                <div>
                  <label className="p-label">Phase</label>
                  <select value={mForm.phase} onChange={e=>setMForm({...mForm,phase:e.target.value})} style={{marginBottom:0}}>
                    {['Discovery','Design','Build','Testing','Deploy'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <button className="save-btn" style={{padding:'10px 18px',marginBottom:1}} onClick={addMilestone}>Add</button>
              </div>
            </div>

            {/* Projects list — fetched per user from leads context */}
            <div className="p-block-title" style={{marginBottom:12}}>All Users with Projects</div>
            {users.map(u => (
              <div key={u.id} style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.1)',borderRadius:6,padding:16,marginBottom:10}}>
                <div style={{color:'var(--text)',fontWeight:700,marginBottom:4}}>{u.name}</div>
                <div style={{color:'var(--dim)',fontFamily:'JetBrains Mono,monospace',fontSize:11}}>User ID: {u.id} — use this ID above to assign projects</div>
              </div>
            ))}
          </div>
        )}

        {/* ── APPOINTMENTS ── */}
        {tab === 'appointments' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Appointment <span className="p-hi">Requests</span></h2>
              <p>Manage consultation bookings from clients.</p>
            </div>
            {appts.length === 0 ? (
              <div className="p-empty"><div className="p-empty-icon">📅</div><h3>No appointments yet</h3></div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Date</th><th>Time</th><th>Service</th><th>Notes</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {appts.map(a => (
                      <tr key={a.id}>
                        <td style={{color:'var(--text)',fontWeight:600}}>{a.name}</td>
                        <td><a href={`mailto:${a.email}`} style={{color:'var(--blue)'}}>{a.email}</a></td>
                        <td style={{color:'var(--text)'}}>{a.date}</td>
                        <td style={{color:'var(--text)'}}>{a.time} EAT</td>
                        <td style={{color:'var(--dim)'}}>{a.service || 'General'}</td>
                        <td style={{color:'var(--dim)',maxWidth:160}}>{a.notes || '—'}</td>
                        <td>
                          <span style={{color: a.status==='confirmed'?'#34d399':a.status==='cancelled'?'#ff6b6b':'#f59e0b',
                            fontFamily:'JetBrains Mono,monospace',fontSize:11,textTransform:'uppercase'}}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="save-btn" onClick={()=>updateAppt(a.id,'confirmed')}>✓ Confirm</button>
                            <button className="del-btn"  onClick={()=>updateAppt(a.id,'cancelled')}>✗ Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {tab === 'documents' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Document <span className="p-hi">Upload</span></h2>
              <p>Upload proposals, invoices, and contracts to client portals.</p>
            </div>
            <div style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.12)',borderRadius:6,padding:24,maxWidth:540}}>
              <div className="p-block-title" style={{marginBottom:16}}>Upload Document to Client</div>
              <div className="p-field">
                <label className="p-label">Client</label>
                <select value={docForm.user_id} onChange={e=>setDocForm({...docForm,user_id:e.target.value})}>
                  <option value="">Select client…</option>
                  {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div className="p-field">
                <label className="p-label">Document Title</label>
                <input value={docForm.title} onChange={e=>setDocForm({...docForm,title:e.target.value})} placeholder="e.g. Phase 1 Proposal" />
              </div>
              <div className="p-field">
                <label className="p-label">Document Type</label>
                <select value={docForm.doc_type} onChange={e=>setDocForm({...docForm,doc_type:e.target.value})}>
                  <option value="general">General</option>
                  <option value="proposal">Proposal</option>
                  <option value="invoice">Invoice</option>
                  <option value="contract">Contract</option>
                  <option value="report">Report</option>
                </select>
              </div>
              <div className="p-field">
                <label className="p-label">File</label>
                <input type="file" onChange={e=>setDocFile(e.target.files[0])}
                  style={{padding:'10px 14px',cursor:'pointer'}} />
              </div>
              <button className="save-btn" style={{padding:'10px 24px'}} onClick={uploadDoc}>
                ↑ Upload Document
              </button>
            </div>
          </div>
        )}

        {/* ── BLOG ── */}
        {tab === 'blog' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Blog <span className="p-hi">Posts</span></h2>
              <p>Write and publish articles to the public blog.</p>
            </div>

            {/* Blog form */}
            <div style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.12)',borderRadius:6,padding:24,marginBottom:24}}>
              <div className="p-block-title" style={{marginBottom:16}}>{bEdit ? 'Edit Post' : 'New Post'}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label className="p-label">Title</label>
                  <input value={bForm.title} onChange={e=>setBForm({...bForm,title:e.target.value})} placeholder="Post title" style={{marginBottom:0}} />
                </div>
                <div>
                  <label className="p-label">Slug (URL)</label>
                  <input value={bForm.slug} onChange={e=>setBForm({...bForm,slug:e.target.value.toLowerCase().replace(/\s+/g,'-')})} placeholder="post-url-slug" style={{marginBottom:0}} />
                </div>
                <div>
                  <label className="p-label">Tags (comma separated)</label>
                  <input value={bForm.tags} onChange={e=>setBForm({...bForm,tags:e.target.value})} placeholder="AI, Web3, Cloud" style={{marginBottom:0}} />
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:20}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,color:'var(--body)',fontSize:13,fontFamily:"'JetBrains Mono',monospace",cursor:'pointer'}}>
                    <input type="checkbox" checked={bForm.published} onChange={e=>setBForm({...bForm,published:e.target.checked})} style={{width:'auto',margin:0}} />
                    Publish immediately
                  </label>
                </div>
              </div>
              <div style={{marginTop:14}}>
                <label className="p-label">Excerpt (shown in previews)</label>
                <input value={bForm.excerpt} onChange={e=>setBForm({...bForm,excerpt:e.target.value})} placeholder="Short summary of the post…" />
              </div>
              <div>
                <label className="p-label">Content</label>
                <textarea rows={8} value={bForm.content} onChange={e=>setBForm({...bForm,content:e.target.value})} placeholder="Write your article here…" />
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="save-btn" style={{padding:'9px 22px'}} onClick={saveBlog}>
                  {bEdit ? 'Update Post' : 'Publish Post'}
                </button>
                {bEdit && <button className="del-btn" onClick={()=>{setBEdit(null);setBForm({title:'',slug:'',excerpt:'',content:'',tags:'',published:false});}}>Cancel</button>}
              </div>
            </div>

            {/* Posts list */}
            <div className="p-list">
              {blogPosts.length === 0 && <div className="p-empty"><div className="p-empty-icon">📝</div><h3>No posts yet</h3></div>}
              {blogPosts.map(p => (
                <div key={p.id} className="p-row">
                  <div style={{flex:1}}>
                    <div style={{color:'var(--text)',fontWeight:700,fontSize:14,marginBottom:4}}>{p.title}</div>
                    <div className="p-preview">{p.excerpt}</div>
                    <div style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
                      {p.tags && <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--blue)',border:'1px solid rgba(0,212,255,0.25)',padding:'1px 8px',borderRadius:2}}>{p.tags.split(',')[0]}</span>}
                      <span style={{color:p.published?'#34d399':'var(--dim)',fontFamily:'JetBrains Mono,monospace',fontSize:10}}>{p.published?'● PUBLISHED':'○ DRAFT'}</span>
                      <span className="p-date">{new Date(p.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,flexShrink:0}}>
                    <button className="save-btn" onClick={()=>{ setBEdit(p.id); setBForm({title:p.title,slug:p.slug,excerpt:p.excerpt,content:p.content,tags:p.tags||'',published:!!p.published}); }}>Edit</button>
                    <button className="del-btn" onClick={()=>deleteBlog(p.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TESTIMONIALS ── */}
        {tab === 'testimonials' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Testimonial <span className="p-hi">Review</span></h2>
              <p>Approve or reject client testimonials before they appear on the site.</p>
            </div>
            {testimonials.length === 0 ? (
              <div className="p-empty"><div className="p-empty-icon">⭐</div><h3>No testimonials yet</h3></div>
            ) : (
              <div className="p-list">
                {testimonials.map(t => (
                  <div key={t.id} className="p-row">
                    <div style={{flex:1}}>
                      <div style={{color:'#f59e0b',fontSize:14,marginBottom:6}}>{'★'.repeat(t.rating)}</div>
                      <div style={{color:'var(--body)',fontStyle:'italic',marginBottom:8}}>"{t.content}"</div>
                      <div style={{color:'var(--text)',fontWeight:700,fontSize:13}}>{t.client_name}</div>
                      {t.role && <div className="p-date">{t.role}{t.company?`, ${t.company}`:''}</div>}
                      <div style={{marginTop:6}}>
                        <span style={{color:t.approved?'#34d399':'#f59e0b',fontFamily:'JetBrains Mono,monospace',fontSize:10,textTransform:'uppercase'}}>
                          {t.approved?'● Approved':'○ Pending Approval'}
                        </span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8,flexShrink:0}}>
                      {!t.approved && <button className="save-btn" onClick={()=>approveTestimonial(t.id,true)}>✓ Approve</button>}
                      {t.approved  && <button className="del-btn" style={{color:'#f59e0b',borderColor:'rgba(245,158,11,0.3)'}} onClick={()=>approveTestimonial(t.id,false)}>Unpublish</button>}
                      <button className="del-btn" onClick={()=>deleteTestimonial(t.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NEWSLETTER ── */}
        {tab === 'newsletter' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Newsletter <span className="p-hi">Subscribers</span></h2>
              <p>{newsletter.length} subscribers on your mailing list.</p>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="admin-table">
                <thead><tr><th>#</th><th>Email</th><th>Subscribed</th></tr></thead>
                <tbody>
                  {newsletter.map((n,i) => (
                    <tr key={n.id}>
                      <td style={{color:'var(--dim)'}}>{i+1}</td>
                      <td><a href={`mailto:${n.email}`} style={{color:'var(--blue)'}}>{n.email}</a></td>
                      <td className="p-date">{new Date(n.created_at).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
