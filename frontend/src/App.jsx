import { useState } from 'react';
import './App.css';
import Admin from './Admin'; 

function App() {
  const [currentPage, setCurrentPage] = useState('home'); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  // --- SECURITY FIX #1: Removed Hardcoded Password ---
  // We now use import.meta.env to hide the password from GitHub.
  const handleLogin = () => {
    const password = prompt("System Authorization Required:");
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setCurrentPage('admin');
    } else {
      alert("Access Denied.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('https://consulting-backend-y19q.onrender.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      alert("Transmission Received. Our architects will contact you.");
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      alert("Uplink failed. Server waking up...");
    }
  };

  const Navbar = () => (
    <nav className="navbar">
      <div className="logo" onClick={() => setCurrentPage('home')}>ELITE <span className="glow">CONSULTING</span></div>
      <div className="nav-links">
        <button onClick={() => setCurrentPage('home')}>Capabilities</button>
        <button onClick={() => setCurrentPage('contact')}>Initialize</button>
        <button onClick={handleLogin} className="admin-btn">Command</button>
      </div>
    </nav>
  );

  if (currentPage === 'home') {
    return (
      <div className="app-container">
        <Navbar />
        <header className="hero">
          <h1>ARCHITECTING <span className="gradient-text">DIGITAL FUTURES</span></h1>
          <p>Deploying AI, Blockchain, and Modern Cloud Infrastructure.</p>
        </header>

        {/* --- ADDED: NEW OFFICIAL SERVICES SECTION --- */}
        <section className="services-grid">
          <div className="service-card">
            <h3>AI Integration & Automation</h3>
            <p>Implementing LLMs, custom bots, and automated data pipelines.</p>
          </div>
          <div className="service-card">
            <h3>Blockchain & Web3</h3>
            <p>Design of smart contracts and decentralized identity systems.</p>
          </div>
          <div className="service-card">
            <h3>Cloud Infrastructure</h3>
            <p>Migration to AWS/Azure and massive cost-reduction strategies.</p>
          </div>
          <div className="service-card">
            <h3>Legacy Modernization</h3>
            <p>Upgrading business software to modern React + FastAPI stacks.</p>
          </div>
        </section>
      </div>
    );
  }

  // ... (Contact and Admin logic remains, using updated services layout)
}

export default App;