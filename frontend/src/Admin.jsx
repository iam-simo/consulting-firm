import { useState, useEffect } from 'react';

const API     = 'https://consulting-backend-y19q.onrender.com';
const HEADERS = {
  'X-Admin-Key': import.meta.env.VITE_ADMIN_API_KEY,
  'Content-Type': 'application/json',
};

function Admin() {
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const fetchLeads = async () => {
    const res  = await fetch(`${API}/api/admin/leads`, { headers: HEADERS });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to load leads');
    setLeads(Array.isArray(data) ? data : []);
  };

  const fetchUsers = async () => {
    const res  = await fetch(`${API}/api/admin/users`, { headers: HEADERS });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to load users');
    setUsers(Array.isArray(data) ? data : []);
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchLeads(), fetchUsers()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this lead?')) return;
    try {
      const res = await fetch(`${API}/api/admin/leads/${id}`, { method: 'DELETE', headers: HEADERS });
      if (!res.ok) throw new Error('Delete failed');
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (err) { alert('Could not delete: ' + err.message); }
  };

  if (loading) return (
    <div style={{ padding: '80px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: '#00f2ff', fontSize: '13px', letterSpacing: '2px' }}>
      LOADING DATA...
    </div>
  );

  if (error) return (
    <div style={{ padding: '80px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: '#ff6b55', fontSize: '13px' }}>
      ⚠️ {error}
      <br /><br />
      <button onClick={loadAll} style={{ background: 'transparent', border: '1px solid #ff6b55', color: '#ff6b55', padding: '8px 20px', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '3px' }}>
        Retry
      </button>
    </div>
  );

  return (
    <div className="admin-view">
      <div className="admin-nav">
        <h2>⬡ CENTRAL COMMAND</h2>
        <button onClick={loadAll} className="refresh-btn">↻ REFRESH</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'TOTAL ENQUIRIES',  value: leads.length, color: '#00f2ff' },
          { label: 'REGISTERED USERS', value: users.length, color: '#00ff8c' },
          { label: 'THIS MONTH', value: leads.filter(l => {
              const d = new Date(l.created_at); const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length, color: '#ffb800' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${card.color}22`, borderLeft: `3px solid ${card.color}`, padding: '20px 24px', borderRadius: '3px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '2px', color: '#7a8a9a', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '32px', color: card.color, fontWeight: '500', lineHeight: 1 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'leads' ? 'tab-active' : ''}`} onClick={() => setActiveTab('leads')}>
          📬 ENQUIRIES ({leads.length})
        </button>
        <button className={`tab-btn ${activeTab === 'users' ? 'tab-active' : ''}`} onClick={() => setActiveTab('users')}>
          👤 USERS ({users.length})
        </button>
      </div>

      {activeTab === 'leads' && (
        leads.length === 0
          ? <p style={{ color: '#7a8a9a', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', padding: '20px 0' }}>No enquiries yet.</p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Service</th><th>Message</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id}>
                      <td style={{ color: '#444', fontSize: '11px' }}>{lead.id}</td>
                      <td style={{ fontWeight: '600', color: '#d0dde8' }}>{lead.name}</td>
                      <td><a href={`mailto:${lead.email}`} style={{ color: 'var(--neon-blue)', textDecoration: 'none' }}>{lead.email}</a></td>
                      <td style={{ color: '#7a8a9a' }}>{lead.service || '—'}</td>
                      <td><span className="message-text">{lead.message}</span></td>
                      <td style={{ color: '#555', whiteSpace: 'nowrap' }}>
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td><button className="delete-btn" onClick={() => handleDelete(lead.id)}>DELETE</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {activeTab === 'users' && (
        users.length === 0
          ? <p style={{ color: '#7a8a9a', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', padding: '20px 0' }}>No registered users yet.</p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Registered</th></tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td style={{ color: '#444', fontSize: '11px' }}>{user.id}</td>
                      <td style={{ fontWeight: '600', color: '#d0dde8' }}>{user.name}</td>
                      <td style={{ color: '#7a8a9a' }}>{user.email}</td>
                      <td style={{ color: '#555' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}
    </div>
  );
}

export default Admin;