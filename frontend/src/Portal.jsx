import { useState, useEffect, useRef } from 'react';

const API = 'https://consulting-backend-y19q.onrender.com';

const STATUS_META = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.13)',  label: 'Pending'   },
  reviewing: { color: '#38bdf8', bg: 'rgba(56,189,248,0.13)',  label: 'Reviewing' },
  responded: { color: '#34d399', bg: 'rgba(52,211,153,0.13)',  label: 'Responded' },
  closed:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  label: 'Closed'    },
};

const RESOURCES = [
  { title: 'AI Integration Playbook',         size: '2.4 MB', desc: 'Step-by-step guide to integrating LLMs into enterprise workflows.' },
  { title: 'Cloud Cost Optimisation Guide',   size: '1.8 MB', desc: 'Reduce cloud spend by up to 40% without sacrificing performance.' },
  { title: 'Web3 Security Checklist',         size: '0.9 MB', desc: 'Pre-deployment security checklist for smart contracts & DeFi.' },
  { title: 'Data Engineering Best Practices', size: '3.1 MB', desc: 'Building reliable data pipelines for real-time analytics at scale.' },
  { title: 'Zero-Trust Architecture Primer',  size: '1.5 MB', desc: 'Zero-trust security models for financial institutions.' },
];

export default function Portal({ auth, setAuth, onNavigate }) {
  const [tab, setTab]               = useState('overview');
  const [enquiries, setEnquiries]   = useState([]);
  const [messages, setMessages]     = useState([]);
  const [projects, setProjects]     = useState([]);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [msgInput, setMsgInput]     = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [selEnquiry, setSelEnquiry] = useState(null);
  const [pForm, setPForm]           = useState({ name:'', email:'', cur_pw:'', new_pw:'' });
  const [pMsg, setPMsg]             = useState({ text:'', ok:true });
  const [pBusy, setPBusy]           = useState(false);
  const chatRef = useRef(null);

  const headers = { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [eR, mR, pR, prR] = await Promise.all([
        fetch(`${API}/api/user/enquiries`, { headers }),
        fetch(`${API}/api/user/messages`,  { headers }),
        fetch(`${API}/api/user/profile`,   { headers }),
        fetch(`${API}/api/user/projects`,  { headers }),
      ]);
      if (eR.ok)  setEnquiries(await eR.json());
      if (mR.ok)  setMessages(await mR.json());
      if (prR.ok) setProjects(await prR.json());
      if (pR.ok) {
        const p = await pR.json();
        setProfile(p);
        setPForm({ name: p.name, email: p.email, cur_pw: '', new_pw: '' });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { chatRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = async () => {
    if (!msgInput.trim()) return;
    setMsgSending(true);
    try {
      const res = await fetch(`${API}/api/user/messages`, {
        method: 'POST', headers, body: JSON.stringify({ content: msgInput }),
      });
      if (res.ok) {
        setMessages(p => [...p, { id: Date.now(), sender: 'user', content: msgInput, created_at: new Date().toISOString() }]);
        setMsgInput('');
      }
    } catch(e){ console.error(e); }
    setMsgSending(false);
  };

  const saveProfile = async () => {
    setPBusy(true); setPMsg({ text:'', ok:true });
    try {
      const res = await fetch(`${API}/api/user/profile`, {
        method: 'PUT', headers,
        body: JSON.stringify({
          name: pForm.name !== profile?.name ? pForm.name : undefined,
          email: pForm.email !== profile?.email ? pForm.email : undefined,
          current_password: pForm.cur_pw || undefined,
          new_password: pForm.new_pw || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Update failed');
      setPMsg({ text: 'Profile updated successfully.', ok: true });
      setAuth(prev => ({ ...prev, token: data.token, name: data.name }));
      setProfile(prev => ({ ...prev, name: data.name }));
      setPForm(prev => ({ ...prev, cur_pw: '', new_pw: '' }));
    } catch(e) { setPMsg({ text: e.message, ok: false }); }
    setPBusy(false);
  };

  const TABS = [
    { id: 'overview',  icon: '◈', label: 'Overview'  },
    { id: 'enquiries', icon: '✉', label: 'Enquiries' },
    { id: 'projects',  icon: '◎', label: 'Projects'  },
    { id: 'messages',  icon: '✦', label: 'Messages'  },
    { id: 'resources', icon: '⊟', label: 'Resources' },
    { id: 'profile',   icon: '◯', label: 'Profile'   },
  ];

  if (loading) return (
    <div className="portal-loading">
      <div className="portal-spinner" />
      <p>Loading your portal…</p>
    </div>
  );

  const goTab = (id) => { setTab(id); setSelEnquiry(null); };

  return (
    <div className="portal-wrap">
      {/* SIDEBAR */}
      <aside className="portal-sidebar">
        <div className="ps-user">
          <div className="ps-avatar">{auth.name?.charAt(0).toUpperCase()}</div>
          <div>
            <div className="ps-name">{auth.name}</div>
            <div className="ps-role">CLIENT PORTAL</div>
          </div>
        </div>
        <nav className="ps-nav">
          {TABS.map(t => (
            <button key={t.id} onClick={() => goTab(t.id)}
              className={`ps-link${tab === t.id ? ' ps-active' : ''}`}>
              <span className="ps-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        <button className="ps-enquire" onClick={() => onNavigate('contact')}>+ New Enquiry</button>
      </aside>

      {/* MAIN */}
      <main className="portal-main">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Welcome back, <span className="p-hi">{auth.name}</span></h2>
              <p>Here's everything happening on your account.</p>
            </div>
            <div className="p-stats">
              {[
                { icon:'✉', label:'Enquiries', val: enquiries.length, color:'#38bdf8' },
                { icon:'◎', label:'Projects',  val: projects.filter(x=>x.status==='in_progress').length, color:'#34d399' },
                { icon:'✦', label:'Messages',  val: messages.length,  color:'#f59e0b' },
                { icon:'⊟', label:'Resources', val: RESOURCES.length, color:'#a78bfa' },
              ].map((s,i) => (
                <div className="p-stat" key={i} style={{'--sc': s.color}}>
                  <span className="p-stat-icon">{s.icon}</span>
                  <span className="p-stat-val" style={{color: s.color}}>{s.val}</span>
                  <span className="p-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {enquiries.length > 0 && (
              <div className="p-block">
                <div className="p-block-title">Recent Enquiries</div>
                {enquiries.slice(0,3).map(e => {
                  const s = STATUS_META[e.status] || STATUS_META.pending;
                  return (
                    <div key={e.id} className="p-row p-row-click" onClick={() => { setSelEnquiry(e); setTab('enquiries'); }}>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="p-service">{e.service || 'General Enquiry'}</div>
                        <div className="p-preview">{e.message?.slice(0,80)}…</div>
                      </div>
                      <div className="p-row-right">
                        <span className="p-badge" style={{color:s.color, background:s.bg, borderColor:s.color}}>{s.label}</span>
                        <span className="p-date">{new Date(e.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {projects.filter(p=>p.status==='in_progress').length > 0 && (
              <div className="p-block">
                <div className="p-block-title">Active Projects</div>
                {projects.filter(p=>p.status==='in_progress').map(p => (
                  <div key={p.id} className="p-project-row">
                    <div style={{flex:1}}>
                      <div className="p-proj-name">{p.title}</div>
                      <div className="p-preview" style={{marginBottom:10}}>{p.description}</div>
                      <div className="p-bar"><div className="p-fill" style={{width:`${p.progress}%`}} /></div>
                      <div className="p-bar-row">
                        <span className="p-date">Progress</span>
                        <span className="p-date" style={{color:'#38bdf8'}}>{p.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {enquiries.length === 0 && projects.length === 0 && (
              <div className="p-empty">
                <div className="p-empty-icon">◎</div>
                <h3>No activity yet</h3>
                <p>Submit an enquiry to get started.</p>
                <button className="p-btn-blue" onClick={() => onNavigate('contact')}>Submit Enquiry</button>
              </div>
            )}
          </div>
        )}

        {/* ENQUIRIES */}
        {tab === 'enquiries' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>My Enquiries</h2>
              <p>All submitted enquiries, status updates, and responses.</p>
            </div>
            {enquiries.length === 0 ? (
              <div className="p-empty">
                <div className="p-empty-icon">✉</div>
                <h3>No enquiries yet</h3>
                <button className="p-btn-blue" onClick={() => onNavigate('contact')}>Submit Enquiry</button>
              </div>
            ) : selEnquiry ? (
              <div className="fade-up">
                <button className="p-back" onClick={() => setSelEnquiry(null)}>← Back to list</button>
                <div className="p-detail-card">
                  <div className="p-detail-top">
                    <div>
                      <div className="p-service">{selEnquiry.service || 'General Enquiry'}</div>
                      <div className="p-date" style={{marginTop:4}}>{new Date(selEnquiry.created_at).toLocaleDateString('en-GB')}</div>
                    </div>
                    {(() => { const s = STATUS_META[selEnquiry.status] || STATUS_META.pending;
                      return <span className="p-badge" style={{color:s.color,background:s.bg,borderColor:s.color}}>{s.label}</span>; })()}
                  </div>
                  <div className="p-detail-section">
                    <div className="p-detail-label">YOUR MESSAGE</div>
                    <div className="p-detail-body">{selEnquiry.message}</div>
                  </div>
                  {selEnquiry.admin_response ? (
                    <div className="p-detail-section">
                      <div className="p-detail-label" style={{color:'#34d399'}}>RESPONSE FROM OUR TEAM</div>
                      <div className="p-detail-body" style={{borderLeftColor:'#34d399'}}>{selEnquiry.admin_response}</div>
                    </div>
                  ) : (
                    <div className="p-awaiting">Awaiting response — usually within 24 hours.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-list">
                {enquiries.map(e => {
                  const s = STATUS_META[e.status] || STATUS_META.pending;
                  return (
                    <div key={e.id} className="p-row p-row-click" onClick={() => setSelEnquiry(e)}>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="p-service">{e.service || 'General Enquiry'}</div>
                        <div className="p-preview">{e.message?.slice(0,100)}…</div>
                      </div>
                      <div className="p-row-right">
                        <span className="p-badge" style={{color:s.color,background:s.bg,borderColor:s.color}}>{s.label}</span>
                        <span className="p-date">{new Date(e.created_at).toLocaleDateString('en-GB')}</span>
                        <span style={{fontSize:12,color:'#38bdf8'}}>View →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROJECTS */}
        {tab === 'projects' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Project Updates</h2>
              <p>Track progress on your active projects.</p>
            </div>
            {projects.length === 0 ? (
              <div className="p-empty">
                <div className="p-empty-icon">◎</div>
                <h3>No projects yet</h3>
                <p>Once we begin work, updates will appear here.</p>
              </div>
            ) : (
              <div className="p-proj-grid">
                {projects.map(p => (
                  <div key={p.id} className="p-proj-card">
                    <div className="p-proj-card-top">
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,letterSpacing:1,
                        color: p.status==='completed'?'#94a3b8':p.status==='in_progress'?'#38bdf8':'#f59e0b'}}>
                        {p.status==='in_progress'?'● IN PROGRESS':p.status==='completed'?'● COMPLETED':'● '+p.status.toUpperCase()}
                      </span>
                      <span className="p-date">{new Date(p.updated_at).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="p-proj-title">{p.title}</div>
                    <div className="p-preview" style={{marginBottom:16}}>{p.description}</div>
                    <div className="p-bar" style={{margin:'0 0 6px'}}>
                      <div className="p-fill" style={{width:`${p.progress}%`,transition:'width 1.2s ease'}} />
                    </div>
                    <div className="p-bar-row">
                      <span className="p-date">Progress</span>
                      <span className="p-date" style={{color:'#38bdf8'}}>{p.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Direct Messages</h2>
              <p>Chat directly with the Elite Consulting team.</p>
            </div>
            <div className="p-chat">
              <div className="p-chat-feed">
                {messages.length === 0 && (
                  <div className="p-chat-empty">No messages yet. Say hello below!</div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`p-bubble-wrap ${m.sender==='user'?'p-bubble-right':'p-bubble-left'}`}>
                    <div className="p-bubble-who">
                      {m.sender==='user' ? auth.name : 'Elite Consulting Team'}
                    </div>
                    <div className={`p-bubble ${m.sender==='user'?'p-bubble-u':'p-bubble-a'}`}>
                      {m.content}
                    </div>
                    <div className="p-bubble-time">
                      {new Date(m.created_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'})}
                    </div>
                  </div>
                ))}
                <div ref={chatRef} />
              </div>
              <div className="p-chat-bar">
                <input className="p-chat-input" placeholder="Type a message… (Enter to send)"
                  value={msgInput} onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMsg()} />
                <button className="p-chat-send" onClick={sendMsg} disabled={msgSending||!msgInput.trim()}>
                  {msgSending?'…':'→'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESOURCES */}
        {tab === 'resources' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Exclusive Resources</h2>
              <p>Whitepapers, guides, and case studies for Elite clients.</p>
            </div>
            <div className="p-res-list">
              {RESOURCES.map((r,i) => (
                <div key={i} className="p-res-card">
                  <div className="p-res-icon">📄</div>
                  <div style={{flex:1}}>
                    <div className="p-res-title">{r.title}</div>
                    <div className="p-preview" style={{marginBottom:8}}>{r.desc}</div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,
                        background:'rgba(56,189,248,0.1)',color:'#38bdf8',
                        border:'1px solid rgba(56,189,248,0.25)',padding:'2px 8px',borderRadius:2}}>PDF</span>
                      <span className="p-date">{r.size}</span>
                    </div>
                  </div>
                  <button className="p-res-dl">↓ Download</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Profile Settings</h2>
              <p>Update your name, email, and password.</p>
            </div>
            {profile && (
              <div className="p-profile-form">
                <div className="p-profile-top">
                  <div className="p-avatar-lg">{profile.name?.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:18,color:'#e8f4ff'}}>{profile.name}</div>
                    <div className="p-date">Member since {new Date(profile.created_at).toLocaleDateString('en-GB',{year:'numeric',month:'long'})}</div>
                  </div>
                </div>
                <div className="p-field">
                  <label className="p-label">Full Name</label>
                  <input className="p-input" value={pForm.name} onChange={e=>setPForm({...pForm,name:e.target.value})} />
                </div>
                <div className="p-field">
                  <label className="p-label">Email Address</label>
                  <input className="p-input" type="email" value={pForm.email} onChange={e=>setPForm({...pForm,email:e.target.value})} />
                </div>
                <div className="p-divider"><span>Change Password</span></div>
                <div className="p-field">
                  <label className="p-label">Current Password</label>
                  <input className="p-input" type="password" placeholder="Enter current password"
                    value={pForm.cur_pw} onChange={e=>setPForm({...pForm,cur_pw:e.target.value})} />
                </div>
                <div className="p-field">
                  <label className="p-label">New Password</label>
                  <input className="p-input" type="password" placeholder="Enter new password"
                    value={pForm.new_pw} onChange={e=>setPForm({...pForm,new_pw:e.target.value})} />
                </div>
                {pMsg.text && (
                  <div className={pMsg.ok ? 'form-success' : 'form-error'} style={{marginBottom:16}}>{pMsg.text}</div>
                )}
                <button className="p-save" onClick={saveProfile} disabled={pBusy}>
                  {pBusy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}