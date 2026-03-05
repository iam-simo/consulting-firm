import { useState, useEffect } from 'react';

const API     = 'https://consulting-backend-y19q.onrender.com';
const HEADERS = { 'X-Admin-Key': import.meta.env.VITE_ADMIN_API_KEY };

function Admin() {
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const fetchLeads = async () => {
    try {
      const res  = await fetch(`${API}/api/admin/leads`, { headers: HEADERS });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch leads');
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
  };

  const fetchUsers = async () => {
    try {
      const res  = await fetch(`${API}/api/admin/users`, { headers: HEADERS });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    await Promise.all([fetchLeads(), fetchUsers()]);
    setLoading(false);
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

  if (loading) return <div style={{padding:'60px', textAlign:'center', color:'#888'}}>Loading data...</div>;
  if (error)   return <div style={{padding:'60px', textAlign:'center', color:'#ff6b55'}}>⚠️ {error}</div>;

  return (
    <div className="admin-view">
      <div className="admin-nav">
        <h2>CENTRAL COMMAND</h2>
        <button onClick={loadAll} className="refresh-btn">↻ Refresh</button>
      </div>

      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'leads' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('leads')}>
          📬 Enquiries ({leads.length})
        </button>
        <button className={`tab-btn ${activeTab === 'users' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('users')}>
          👤 Registered Users ({users.length})
        </button>
      </div>

      {activeTab === 'leads' && (
        leads.length === 0 ? <p style={{color:'#888', padding:'20px 0'}}>No enquiries yet.</p> : (
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Email</th><th>Service</th><th>Message</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td style={{color:'#555', fontSize:'12px'}}>{lead.id}</td>
                  <td style={{fontWeight:'600'}}>{lead.name}</td>
                  <td><a href={`mailto:${lead.email}`} style={{color:'var(--neon-blue)', textDecoration:'none'}}>{lead.email}</a></td>
                  <td style={{color:'#888', fontSize:'13px'}}>{lead.service || '—'}</td>
                  <td><span className="message-text">{lead.message}</span></td>
                  <td style={{color:'#666', fontSize:'12px', whiteSpace:'nowrap'}}>
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td><button className="delete-btn" onClick={() => handleDelete(lead.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {activeTab === 'users' && (
        users.length === 0 ? <p style={{color:'#888', padding:'20px 0'}}>No registered users yet.</p> : (
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Email</th><th>Registered</th></tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{color:'#555', fontSize:'12px'}}>{user.id}</td>
                  <td style={{fontWeight:'600'}}>{user.name}</td>
                  <td style={{color:'#aaa'}}>{user.email}</td>
                  <td style={{color:'#666', fontSize:'12px'}}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

export default Admin;