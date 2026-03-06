import { useState, useEffect } from 'react';

const API = 'https://consulting-backend-y19q.onrender.com';
const ADMIN_HEADERS = {
  'X-Admin-Key': import.meta.env.VITE_ADMIN_API_KEY,
  'Content-Type': 'application/json',
};

export default function Admin() {
  const [tab, setTab]           = useState('leads');
  const [leads, setLeads]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [leadEdits, setLeadEdits] = useState({});
  const [replies, setReplies]   = useState({});
  const [sending, setSending]   = useState({});

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const [lR, uR, mR] = await Promise.all([
        fetch(`${API}/api/admin/leads`,    { headers: ADMIN_HEADERS }),
        fetch(`${API}/api/admin/users`,    { headers: ADMIN_HEADERS }),
        fetch(`${API}/api/admin/messages`, { headers: ADMIN_HEADERS }),
      ]);
      if (lR.ok) setLeads(await lR.json());
      if (uR.ok) setUsers(await uR.json());
      if (mR.ok) setMessages(await mR.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const deleteLead = async (id) => {
    if (!confirm('Delete this enquiry?')) return;
    await fetch(`${API}/api/admin/leads/${id}`, { method: 'DELETE', headers: ADMIN_HEADERS });
    setLeads(p => p.filter(l => l.id !== id));
  };

  const saveLead = async (id) => {
    const e = leadEdits[id] || {};
    const lead = leads.find(l => l.id === id);
    await fetch(`${API}/api/admin/leads/${id}`, {
      method: 'PUT', headers: ADMIN_HEADERS,
      body: JSON.stringify({
        status: e.status || lead.status || 'pending',
        admin_response: e.response !== undefined ? e.response : lead.admin_response,
      }),
    });
    setLeads(p => p.map(l => l.id === id
      ? { ...l, status: e.status || l.status, admin_response: e.response !== undefined ? e.response : l.admin_response }
      : l
    ));
    setLeadEdits(p => { const n = { ...p }; delete n[id]; return n; });
    alert('Saved!');
  };

  const sendReply = async (userId) => {
    const content = replies[userId];
    if (!content?.trim()) return;
    setSending(p => ({ ...p, [userId]: true }));
    const res = await fetch(`${API}/api/admin/messages/reply`, {
      method: 'POST', headers: ADMIN_HEADERS,
      body: JSON.stringify({ content, user_id: userId }),
    });
    if (res.ok) {
      setReplies(p => ({ ...p, [userId]: '' }));
      await fetchAll();
    }
    setSending(p => ({ ...p, [userId]: false }));
  };

  const convos = messages.reduce((acc, m) => {
    const k = m.user_id;
    if (!acc[k]) acc[k] = { user_id: m.user_id, user_name: m.user_name, user_email: m.user_email, msgs: [] };
    acc[k].msgs.push(m);
    return acc;
  }, {});

  const thisMonth = leads.filter(l => {
    const d = new Date(l.created_at), now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', color: '#38bdf8', fontSize: 13, letterSpacing: 2 }}>
      LOADING DATA…
    </div>
  );
  if (error) return (
    <div style={{ padding: 80, textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', color: '#f87171', fontSize: 13 }}>
      {error} <button onClick={fetchAll} style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', padding: '8px 18px', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 3 }}>Retry</button>
    </div>
  );

  return (
    <div className="admin-view">
      <div className="admin-topbar">
        <h2>⬡ ADMIN PANEL</h2>
        <button onClick={fetchAll} className="refresh-btn">↻ Refresh</button>
      </div>

      <div className="admin-stat-cards">
        {[
          { label: 'TOTAL ENQUIRIES',  val: leads.length,    color: '#38bdf8' },
          { label: 'REGISTERED USERS', val: users.length,    color: '#34d399' },
          { label: 'MESSAGES',         val: messages.length, color: '#fbbf24' },
          { label: 'THIS MONTH',       val: thisMonth,        color: '#a78bfa' },
        ].map((c, i) => (
          <div key={i} className="admin-stat" style={{ borderLeftColor: c.color }}>
            <div className="admin-stat-val" style={{ color: c.color }}>{c.val}</div>
            <div className="admin-stat-lbl">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-tabs">
        {[
          { id: 'leads',    label: `✉ Enquiries (${leads.length})`                     },
          { id: 'users',    label: `◯ Users (${users.length})`                         },
          { id: 'messages', label: `✦ Messages (${Object.keys(convos).length} convos)`  },
        ].map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? ' tab-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* LEADS */}
      {tab === 'leads' && (
        leads.length === 0
          ? <p style={{ fontFamily:'JetBrains Mono,monospace', color:'#4a6a88', fontSize:13, padding:'20px 0' }}>No enquiries yet.</p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th><th>Name</th><th>Email</th><th>Service</th>
                    <th>Message</th><th>Status</th><th>Response</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id}>
                      <td style={{ color:'#2a4a6a', fontSize:11 }}>{l.id}</td>
                      <td style={{ fontWeight:600, color:'#e8f4ff' }}>{l.name}</td>
                      <td><a href={`mailto:${l.email}`} style={{ color:'#38bdf8', textDecoration:'none' }}>{l.email}</a></td>
                      <td style={{ color:'#7a9ab8' }}>{l.service || '—'}</td>
                      <td><span className="msg-cell">{l.message}</span></td>
                      <td>
                        <select
                          style={{ background:'rgba(0,0,0,.4)', border:'1px solid rgba(56,189,248,.2)', color:'#b8d0e8', padding:'5px 8px', borderRadius:3, fontFamily:'JetBrains Mono,monospace', fontSize:11, cursor:'pointer' }}
                          value={leadEdits[l.id]?.status ?? l.status ?? 'pending'}
                          onChange={e => setLeadEdits(p => ({ ...p, [l.id]: { ...p[l.id], status: e.target.value } }))}>
                          <option value="pending">Pending</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="responded">Responded</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td>
                        <textarea rows={2} placeholder="Write a response…"
                          style={{ background:'rgba(0,0,0,.4)', border:'1px solid rgba(56,189,248,.15)', color:'#b8d0e8', padding:'6px 10px', borderRadius:3, fontFamily:'JetBrains Mono,monospace', fontSize:11, width:190, resize:'vertical' }}
                          value={leadEdits[l.id]?.response ?? l.admin_response ?? ''}
                          onChange={e => setLeadEdits(p => ({ ...p, [l.id]: { ...p[l.id], response: e.target.value } }))} />
                      </td>
                      <td style={{ color:'#3a5a7a', whiteSpace:'nowrap', fontSize:11 }}>
                        {l.created_at ? new Date(l.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td>
                        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                          <button className="save-btn" onClick={() => saveLead(l.id)}>Save</button>
                          <button className="del-btn"  onClick={() => deleteLead(l.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {/* USERS */}
      {tab === 'users' && (
        users.length === 0
          ? <p style={{ fontFamily:'JetBrains Mono,monospace', color:'#4a6a88', fontSize:13, padding:'20px 0' }}>No registered users yet.</p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Registered</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ color:'#2a4a6a', fontSize:11 }}>{u.id}</td>
                      <td style={{ fontWeight:600, color:'#e8f4ff' }}>{u.name}</td>
                      <td style={{ color:'#7a9ab8' }}>{u.email}</td>
                      <td style={{ color:'#3a5a7a', fontSize:11 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {/* MESSAGES */}
      {tab === 'messages' && (
        Object.keys(convos).length === 0
          ? <p style={{ fontFamily:'JetBrains Mono,monospace', color:'#4a6a88', fontSize:13, padding:'20px 0' }}>No messages yet.</p>
          : (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {Object.values(convos).map(convo => (
                <div key={convo.user_id} style={{ background:'rgba(0,0,0,.2)', border:'1px solid rgba(56,189,248,.12)', borderRadius:8, overflow:'hidden' }}>
                  <div style={{ background:'rgba(56,189,248,.06)', padding:'12px 18px', borderBottom:'1px solid rgba(56,189,248,.1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color:'#e8f4ff', fontWeight:600 }}>{convo.user_name}</span>
                      <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#4a6a88', marginLeft:10 }}>{convo.user_email}</span>
                    </div>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'#4a6a88' }}>{convo.msgs.length} messages</span>
                  </div>
                  <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:10, maxHeight:320, overflowY:'auto' }}>
                    {convo.msgs.map(m => (
                      <div key={m.id} style={{ alignSelf: m.sender==='user'?'flex-start':'flex-end', maxWidth:'75%' }}>
                        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'#4a6a88', marginBottom:4, textTransform:'uppercase', letterSpacing:1, textAlign: m.sender==='admin'?'right':'left' }}>
                          {m.sender==='user' ? convo.user_name : 'You (Admin)'}
                        </div>
                        <div style={{
                          padding:'10px 14px', borderRadius:6, fontSize:13, lineHeight:1.65, color:'#b8d0e8',
                          background: m.sender==='user'?'rgba(255,255,255,.05)':'rgba(56,189,248,.1)',
                          border: `1px solid ${m.sender==='user'?'rgba(255,255,255,.07)':'rgba(56,189,248,.22)'}`,
                        }}>
                          {m.content}
                        </div>
                        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'#2a4a6a', marginTop:4, textAlign: m.sender==='admin'?'right':'left' }}>
                          {new Date(m.created_at).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:'12px 18px', borderTop:'1px solid rgba(56,189,248,.08)', display:'flex', gap:10, background:'rgba(0,0,0,.15)' }}>
                    <input
                      placeholder={`Reply to ${convo.user_name}… (Enter to send)`}
                      value={replies[convo.user_id] || ''}
                      onChange={e => setReplies(p => ({ ...p, [convo.user_id]: e.target.value }))}
                      onKeyDown={e => e.key==='Enter' && sendReply(convo.user_id)}
                      style={{ flex:1, background:'rgba(0,0,0,.35)', border:'1px solid rgba(56,189,248,.15)', padding:'9px 12px', color:'#b8d0e8', borderRadius:4, fontFamily:'JetBrains Mono,monospace', fontSize:12, marginBottom:0 }}
                    />
                    <button
                      onClick={() => sendReply(convo.user_id)}
                      disabled={sending[convo.user_id]}
                      style={{ background:'#38bdf8', color:'#000', border:'none', padding:'9px 20px', borderRadius:4, cursor:'pointer', fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:13, letterSpacing:1, opacity: sending[convo.user_id]?.5:1 }}>
                      {sending[convo.user_id] ? '…' : 'SEND'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}