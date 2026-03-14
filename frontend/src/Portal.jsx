import { useState, useEffect, useRef } from 'react';

const API = 'https://consulting-backend-y19q.onrender.com';

const STATUS_META = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.13)',  label: 'Pending'   },
  reviewing: { color: '#38bdf8', bg: 'rgba(56,189,248,0.13)',  label: 'Reviewing' },
  responded: { color: '#34d399', bg: 'rgba(52,211,153,0.13)',  label: 'Responded' },
  closed:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  label: 'Closed'    },
};

const PHASES = ['Discovery', 'Design', 'Build', 'Testing', 'Deploy'];

const RESOURCES = [
  { title: 'AI Integration Playbook',         size: '2.4 MB', desc: 'Step-by-step guide to integrating LLMs into enterprise workflows.' },
  { title: 'Cloud Cost Optimisation Guide',   size: '1.8 MB', desc: 'Reduce cloud spend by up to 40% without sacrificing performance.' },
  { title: 'Web3 Security Checklist',         size: '0.9 MB', desc: 'Pre-deployment security checklist for smart contracts & DeFi.' },
  { title: 'Data Engineering Best Practices', size: '3.1 MB', desc: 'Building reliable data pipelines for real-time analytics at scale.' },
  { title: 'Zero-Trust Architecture Primer',  size: '1.5 MB', desc: 'Zero-trust security models for financial institutions.' },
];

const ONBOARDING_STEPS = [
  { icon: '✉', title: 'Submit your first enquiry', desc: 'Tell us about your project or challenge.' },
  { icon: '📅', title: 'Book an intro call',        desc: 'Schedule a 30-min consultation with our team.' },
  { icon: '📄', title: 'Review your proposal',      desc: 'We\'ll prepare a tailored proposal for you.' },
  { icon: '🚀', title: 'Project kick-off',           desc: 'We begin building your solution.' },
];

export default function Portal({ auth, setAuth, onNavigate }) {
  const [tab, setTab]               = useState('overview');
  const [enquiries, setEnquiries]   = useState([]);
  const [messages, setMessages]     = useState([]);
  const [projects, setProjects]     = useState([]);
  const [documents, setDocuments]   = useState([]);
  const [activity, setActivity]     = useState([]);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [msgInput, setMsgInput]     = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [selEnquiry, setSelEnquiry] = useState(null);
  const [pForm, setPForm]           = useState({ name:'', email:'', cur_pw:'', new_pw:'' });
  const [pMsg, setPMsg]             = useState({ text:'', ok:true });
  const [pBusy, setPBusy]           = useState(false);
  const [unread, setUnread]         = useState({ messages: 0 });
  const [onboarding, setOnboarding] = useState(0);
  const [apptForm, setApptForm]     = useState({ date:'', time:'', service:'', notes:'' });
  const [apptStatus, setApptStatus] = useState('idle');
  const chatRef = useRef(null);
  const pollRef = useRef(null);

  const headers = { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [eR, mR, pR, prR, dR, aR, uR] = await Promise.all([
        fetch(`${API}/api/user/enquiries`,  { headers }),
        fetch(`${API}/api/user/messages`,   { headers }),
        fetch(`${API}/api/user/profile`,    { headers }),
        fetch(`${API}/api/user/projects`,   { headers }),
        fetch(`${API}/api/user/documents`,  { headers }),
        fetch(`${API}/api/user/activity`,   { headers }),
        fetch(`${API}/api/user/unread`,     { headers }),
      ]);
      if (eR.ok)  setEnquiries(await eR.json());
      if (mR.ok)  setMessages(await mR.json());
      if (prR.ok) setProjects(await prR.json());
      if (dR.ok)  setDocuments(await dR.json());
      if (aR.ok)  setActivity(await aR.json());
      if (uR.ok)  setUnread(await uR.json());
      if (pR.ok) {
        const p = await pR.json();
        setProfile(p);
        setPForm({ name: p.name, email: p.email, cur_pw: '', new_pw: '' });
        setOnboarding(p.onboarding_step || 0);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const pollMessages = async () => {
    try {
      const [mR, uR] = await Promise.all([
        fetch(`${API}/api/user/messages`, { headers }),
        fetch(`${API}/api/user/unread`,   { headers }),
      ]);
      if (mR.ok) setMessages(await mR.json());
      if (uR.ok) setUnread(await uR.json());
    } catch {}
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    pollRef.current = setInterval(pollMessages, 12000);
    return () => clearInterval(pollRef.current);
  }, [auth.token]);
  useEffect(() => { chatRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = async () => {
    if (!msgInput.trim()) return;
    const content = msgInput;
    setMsgInput(''); setMsgSending(true);
    setMessages(p => [...p, { id: Date.now(), sender: 'user', content, created_at: new Date().toISOString() }]);
    try {
      await fetch(`${API}/api/user/messages`, { method: 'POST', headers, body: JSON.stringify({ content }) });
    } catch {}
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
      setPMsg({ text: 'Profile updated.', ok: true });
      setAuth(prev => ({ ...prev, token: data.token, name: data.name }));
      setProfile(prev => ({ ...prev, name: data.name }));
      setPForm(prev => ({ ...prev, cur_pw: '', new_pw: '' }));
    } catch(e) { setPMsg({ text: e.message, ok: false }); }
    setPBusy(false);
  };

  const advanceOnboarding = async (step) => {
    const next = step + 1;
    setOnboarding(next);
    await fetch(`${API}/api/user/onboarding?step=${next}`, { method: 'PUT', headers });
  };

  const bookAppointment = async (e) => {
    e.preventDefault(); setApptStatus('loading');
    try {
      const res = await fetch(`${API}/api/appointments`, {
        method: 'POST', headers,
        body: JSON.stringify({ ...apptForm, name: profile?.name, email: profile?.email }),
      });
      if (!res.ok) throw new Error();
      setApptStatus('success');
      if (onboarding === 1) advanceOnboarding(1);
    } catch { setApptStatus('error'); }
  };

  const TABS = [
    { id: 'overview',  icon: '◈',  label: 'Overview'    },
    { id: 'enquiries', icon: '✉',  label: 'Enquiries'   },
    { id: 'projects',  icon: '◎',  label: 'Projects'    },
    { id: 'messages',  icon: '✦',  label: 'Messages', badge: unread.messages },
    { id: 'documents', icon: '📄', label: 'Documents'   },
    { id: 'resources', icon: '⊟',  label: 'Resources'   },
    { id: 'book',      icon: '📅', label: 'Book a Call' },
    { id: 'activity',  icon: '◷',  label: 'Activity'    },
    { id: 'profile',   icon: '◯',  label: 'Profile'     },
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
              <span className="ps-icon">{t.icon}</span>
              {t.label}
              {t.badge > 0 && <span className="ps-badge">{t.badge}</span>}
            </button>
          ))}
        </nav>
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

            {/* ONBOARDING CHECKLIST */}
            {onboarding < 4 && (
              <div className="p-onboard">
                <div className="p-onboard-title">
                  <span>🚀 Getting Started</span>
                  <span className="p-onboard-pct">{onboarding}/4 complete</span>
                </div>
                <div className="p-onboard-bar">
                  <div className="p-onboard-fill" style={{width:`${onboarding*25}%`}} />
                </div>
                <div className="p-onboard-steps">
                  {ONBOARDING_STEPS.map((s, i) => (
                    <div key={i} className={`p-onboard-step${onboarding > i ? ' done' : onboarding === i ? ' active' : ''}`}>
                      <div className="p-onboard-icon">{onboarding > i ? '✓' : s.icon}</div>
                      <div>
                        <div className="p-onboard-step-title">{s.title}</div>
                        <div className="p-preview">{s.desc}</div>
                      </div>
                      {onboarding === i && (
                        <button className="p-btn-sm" onClick={() => {
                          if (i === 0) { onNavigate('contact'); advanceOnboarding(i); }
                          else if (i === 1) goTab('book');
                          else if (i === 2) goTab('documents');
                          else advanceOnboarding(i);
                        }}>
                          {i === 0 ? 'Submit →' : i === 1 ? 'Book →' : i === 2 ? 'View →' : 'Mark Done'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-stats">
              {[
                { icon:'✉', label:'Enquiries', val: enquiries.length,                                    color:'#38bdf8' },
                { icon:'◎', label:'Projects',  val: projects.filter(x=>x.status==='in_progress').length, color:'#34d399' },
                { icon:'✦', label:'Messages',  val: messages.length,                                     color:'#f59e0b' },
                { icon:'📄', label:'Documents', val: documents.length,                                   color:'#a78bfa' },
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
                    <div key={e.id} className="p-row p-row-click"
                      onClick={() => { setSelEnquiry(e); setTab('enquiries'); }}>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="p-service">{e.service || 'General Enquiry'}</div>
                        <div className="p-preview">{e.message?.slice(0,80)}…</div>
                      </div>
                      <div className="p-row-right">
                        <span className="p-badge-status" style={{color:s.color,background:s.bg,borderColor:s.color}}>{s.label}</span>
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
                      <div className="p-phase-mini">
                        {PHASES.map((ph, i) => (
                          <span key={i}
                            className={`p-phase-dot${ph === p.phase ? ' active' : i < PHASES.indexOf(p.phase) ? ' done' : ''}`}
                            title={ph} />
                        ))}
                        <span className="p-date" style={{marginLeft:8}}>{p.phase}</span>
                      </div>
                      <div className="p-bar" style={{marginTop:8}}>
                        <div className="p-fill" style={{width:`${p.progress}%`}} />
                      </div>
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
                      <div className="p-date" style={{marginTop:4}}>
                        {new Date(selEnquiry.created_at).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                    {(() => {
                      const s = STATUS_META[selEnquiry.status] || STATUS_META.pending;
                      return <span className="p-badge-status" style={{color:s.color,background:s.bg,borderColor:s.color}}>{s.label}</span>;
                    })()}
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
                        <span className="p-badge-status" style={{color:s.color,background:s.bg,borderColor:s.color}}>{s.label}</span>
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
              <p>Track progress, phases, and milestones on your active projects.</p>
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

                    {/* Phase timeline */}
                    <div className="p-timeline">
                      {PHASES.map((ph, i) => {
                        const idx = PHASES.indexOf(p.phase);
                        const isDone = i < idx;
                        const isCurrent = i === idx;
                        return (
                          <div key={i} className={`p-tl-step${isDone?' tl-done':isCurrent?' tl-current':''}`}>
                            <div className="p-tl-dot">{isDone ? '✓' : i+1}</div>
                            <div className="p-tl-label">{ph}</div>
                            {i < PHASES.length-1 && <div className={`p-tl-line${isDone?' tl-line-done':''}`} />}
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-bar" style={{margin:'16px 0 6px'}}>
                      <div className="p-fill" style={{width:`${p.progress}%`,transition:'width 1.2s ease'}} />
                    </div>
                    <div className="p-bar-row">
                      <span className="p-date">Overall Progress</span>
                      <span className="p-date" style={{color:'#38bdf8'}}>{p.progress}%</span>
                    </div>

                    {/* Milestones */}
                    {p.milestones?.length > 0 && (
                      <div className="p-milestones">
                        <div className="p-detail-label" style={{marginBottom:8}}>MILESTONES</div>
                        {p.milestones.map(m => (
                          <div key={m.id} className="p-milestone-row">
                            <span className={`p-milestone-check${m.done?' done':''}`}>{m.done?'✓':'○'}</span>
                            <span style={{color: m.done?'#4a6a80':'#8ab0d0', fontSize:13,
                              textDecoration: m.done?'line-through':'none'}}>{m.title}</span>
                            {m.due_date && <span className="p-date" style={{marginLeft:'auto'}}>{m.due_date}</span>}
                          </div>
                        ))}
                      </div>
                    )}
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
              <p>Chat directly with the Elite Consulting team. Auto-refreshes every 12 seconds.</p>
            </div>
            <div className="p-chat">
              <div className="p-chat-feed">
                {messages.length === 0 && (
                  <div className="p-chat-empty">No messages yet. Say hello below!</div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`p-bubble-wrap ${m.sender==='user'?'p-bubble-right':'p-bubble-left'}`}>
                    <div className="p-bubble-who">
                      {m.sender==='user' ? auth.name : '⚡ Elite Consulting Team'}
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
                  {msgSending ? '…' : '→'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === 'documents' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Documents</h2>
              <p>Proposals, invoices, contracts, and files shared by our team.</p>
            </div>
            {documents.length === 0 ? (
              <div className="p-empty">
                <div className="p-empty-icon">📄</div>
                <h3>No documents yet</h3>
                <p>Proposals and contracts will appear here once shared by our team.</p>
              </div>
            ) : (
              <div className="p-res-list">
                {documents.map((d,i) => (
                  <div key={i} className="p-res-card">
                    <div className="p-res-icon">
                      {d.doc_type==='invoice'?'🧾':d.doc_type==='proposal'?'📋':d.doc_type==='contract'?'📝':'📄'}
                    </div>
                    <div style={{flex:1}}>
                      <div className="p-res-title">{d.title}</div>
                      <div style={{display:'flex',gap:8,alignItems:'center',marginTop:4}}>
                        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,
                          background:'rgba(56,189,248,0.1)',color:'#38bdf8',
                          border:'1px solid rgba(56,189,248,0.25)',padding:'2px 8px',borderRadius:2,
                          textTransform:'uppercase'}}>{d.doc_type}</span>
                        <span className="p-date">{new Date(d.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                    <a href={`${API}/api/admin/documents/${d.id}/download`}
                       className="p-res-dl" target="_blank" rel="noreferrer">↓ Download</a>
                  </div>
                ))}
              </div>
            )}
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

        {/* BOOK A CALL */}
        {tab === 'book' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Book a Consultation</h2>
              <p>Schedule a 30-minute call with our team. We'll confirm your slot within 2 hours.</p>
            </div>
            {apptStatus === 'success' ? (
              <div className="p-appt-success">
                <div style={{fontSize:48,marginBottom:16}}>✅</div>
                <h3>Appointment Requested!</h3>
                <p>We'll confirm your slot by email within 2 hours.</p>
                <button className="p-btn-blue" style={{marginTop:20}} onClick={() => setApptStatus('idle')}>Book Another</button>
              </div>
            ) : (
              <div className="p-appt-form">
                <form onSubmit={bookAppointment}>
                  <div className="p-appt-grid">
                    <div className="p-field">
                      <label className="p-label">Preferred Date</label>
                      <input className="p-input" type="date" required
                        min={new Date().toISOString().split('T')[0]}
                        value={apptForm.date}
                        onChange={e => setApptForm({...apptForm, date: e.target.value})} />
                    </div>
                    <div className="p-field">
                      <label className="p-label">Preferred Time (EAT)</label>
                      <select className="p-input" required value={apptForm.time}
                        onChange={e => setApptForm({...apptForm, time: e.target.value})}>
                        <option value="">Select time slot</option>
                        {['08:00','09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="p-field">
                    <label className="p-label">Service Area</label>
                    <select className="p-input" value={apptForm.service}
                      onChange={e => setApptForm({...apptForm, service: e.target.value})}>
                      <option value="">General Consultation</option>
                      {['AI & Machine Learning','Blockchain & Web3','Cloud Migration & DevOps',
                        'Cybersecurity','Data Engineering','System Architecture'].map(s => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="p-field">
                    <label className="p-label">Notes (Optional)</label>
                    <textarea className="p-input" rows={3}
                      placeholder="Briefly describe what you'd like to discuss…"
                      value={apptForm.notes}
                      onChange={e => setApptForm({...apptForm, notes: e.target.value})} />
                  </div>
                  {apptStatus === 'error' && (
                    <div className="form-error" style={{marginBottom:12}}>Something went wrong. Try again.</div>
                  )}
                  <button type="submit" className="p-save" disabled={apptStatus==='loading'}>
                    {apptStatus==='loading' ? 'Booking…' : '📅 Request Appointment'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY LOG */}
        {tab === 'activity' && (
          <div className="p-section fade-up">
            <div className="p-heading">
              <h2>Activity Log</h2>
              <p>A record of all account activity for your security.</p>
            </div>
            {activity.length === 0 ? (
              <div className="p-empty">
                <div className="p-empty-icon">◷</div>
                <h3>No activity yet</h3>
              </div>
            ) : (
              <div className="p-activity-list">
                {activity.map((a, i) => (
                  <div key={i} className="p-activity-row">
                    <div className="p-activity-dot" />
                    <div style={{flex:1}}>
                      <div style={{color:'#dde8f5',fontSize:14,fontWeight:600,textTransform:'capitalize'}}>
                        {a.action.replace(/_/g,' ')}
                      </div>
                      {a.detail && <div className="p-preview">{a.detail}</div>}
                    </div>
                    <div className="p-date">
                      {new Date(a.created_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'})}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  <input className="p-input" value={pForm.name}
                    onChange={e=>setPForm({...pForm,name:e.target.value})} />
                </div>
                <div className="p-field">
                  <label className="p-label">Email Address</label>
                  <input className="p-input" type="email" value={pForm.email}
                    onChange={e=>setPForm({...pForm,email:e.target.value})} />
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
                  <div className={pMsg.ok ? 'form-success' : 'form-error'} style={{marginBottom:16}}>
                    {pMsg.text}
                  </div>
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