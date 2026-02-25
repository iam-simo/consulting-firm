import { useState, useEffect } from 'react';

function Admin() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/admin/leads')
      .then(res => res.json())
      .then(data => setLeads(data))
      .catch(err => console.error("Error fetching leads:", err));
}, []);

const handleDelete = async (id) => {
  if (window.confirm("Archive this lead permanently?")) {
    try {
      await fetch(`https://consulting-backend-y19q.onrender.com/${id}`, {
        method: 'DELETE',
      });
      
      // Refresh the page data by calling the fetch again
      const response = await fetch('https://consulting-backend-y19q.onrender.com');
      const data = await response.json();
      setLeads(data);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }
};

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <h2 style={{ color: '#1a2a6c', borderBottom: '2px solid #1a2a6c', paddingBottom: '10px' }}>
        Customer Inquiry Database
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
        <thead>
          <tr style={{ background: '#1a2a6c', color: 'white', textAlign: 'left' }}>
            <th style={{ padding: '15px' }}>ID</th>
            <th style={{ padding: '15px' }}>Client Name</th>
            <th style={{ padding: '15px' }}>Email Address</th>
            <th style={{ padding: '15px' }}>Project Message</th>
            <th style={{ padding: '15px' }}>Actions</th>
          </tr>
        </thead>
<tbody>
  {leads.map((lead) => (
    <tr key={lead.id}>
      <td style={{ padding: '15px' }}>{lead.id}</td>
      <td style={{ padding: '15px' }}>{lead.name}</td>
      <td style={{ padding: '15px' }}>{lead.email}</td>
      <td style={{ padding: '15px' }}>{lead.message}</td>
      <td style={{ padding: '15px' }}>
        <button 
          onClick={() => handleDelete(lead.id)}
          style={{ 
            backgroundColor: '#e74c3c', 
            color: 'white', 
            border: 'none', 
            padding: '8px 12px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Archive Lead
        </button>
      </td>
    </tr>
  ))}
</tbody>
      </table>
    </div>
  );
}
  export default Admin;