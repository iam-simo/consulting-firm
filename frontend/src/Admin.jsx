import { useState, useEffect } from 'react';

function Admin() {
  const [leads, setLeads] = useState([]);
  
  // Handshake header using your Vercel/Env secret
  const headers = {
    'X-Admin-Key': import.meta.env.VITE_ADMIN_API_KEY
  };

  const fetchLeads = () => {
    fetch('https://consulting-backend-y19q.onrender.com/api/admin/leads', { headers })
      .then(res => res.json())
      .then(data => setLeads(Array.isArray(data) ? data : []))
      .catch(err => console.error("Unauthorized."));
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Purge this data?")) {
      await fetch(`https://consulting-backend-y19q.onrender.com/api/admin/leads/${id}`, {
        method: 'DELETE',
        headers: headers
      });
      fetchLeads();
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-nav">
        <h2>CENTRAL COMMAND: INQUIRY DATABASE</h2>
        <button onClick={fetchLeads} className="refresh-btn">Sync Data</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>ID</th><th>Client</th><th>Email</th><th>Message</th><th>Action</th></tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr key={lead.id}>
              <td>{lead.id}</td>
              <td>{lead.name}</td>
              <td>{lead.email}</td>
              <td className="message-text">{lead.message}</td>
              <td><button onClick={() => handleDelete(lead.id)} className="delete-btn">PURGE</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Admin;