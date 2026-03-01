import { useState, useEffect } from 'react';

function Admin() {
  const [leads, setLeads] = useState([]);

  // --- SECURITY FIX #3: Header with API Key ---
  // This sends your secret key from Vercel to Render in every request.
  const headers = {
    'X-Admin-Key': import.meta.env.VITE_ADMIN_API_KEY
  };

  const fetchLeads = () => {
    fetch('https://consulting-backend-y19q.onrender.com/api/admin/leads', { headers })
      .then(res => res.json())
      .then(data => setLeads(data))
      .catch(err => console.error("Unauthorized access to leads list."));
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Purge this data from the system?")) {
      try {
        // --- SECURITY FIX #4: Corrected DELETE Path ---
        await fetch(`https://consulting-backend-y19q.onrender.com/api/admin/leads/${id}`, {
          method: 'DELETE',
          headers: headers // Required to bypass security filter
        });
        fetchLeads(); // Refresh table
      } catch (err) {
        console.error("Deletion failed.");
      }
    }
  };

  // ... (Return table remains similar, but now protected)
}

export default Admin;