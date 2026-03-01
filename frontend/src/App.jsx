import { useState } from 'react';
import './App.css';
import Admin from './Admin'; 

function App() {
  const [currentPage, setCurrentPage] = useState('home'); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleLogin = () => {
    const password = prompt("System Authorization Required:");
    // Uses the secret phrase you set in Vercel/Env
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
      const response = await fetch('https://consulting-backend-y19q.onrender.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        alert("Transmission Received. Our architects will contact you.");
        setFormData({ name: '', email: '', message: '' });
        setCurrentPage('home');
      }
    } catch (err) {
      alert("Uplink failed. Server waking up (wait 60s)...");
    }
  };

  const Navbar = () => (
    <nav className="navbar">
      <div className="logo" onClick={() => setCurrentPage('home')}>ELITE <span className="glow">CONSULTING</span></div>
      <div className="nav-links">
        <button onClick={() => setCurrentPage('home')}>Capabilities</button>
        <button onClick={() => setCurrentPage('contact')} className="nav-cta">Initialize</button>
        <button onClick={handleLogin} className="admin-btn">Command</button>
      </div>
    </nav>
  );

  return (
    <div className="app-container">
      <Navbar />
      
      {currentPage === 'home' && (
        <>
          <header className="hero">
            <div className="grid-overlay"></div>
            <h1>ARCHITECTING <span className="gradient-text">DIGITAL FUTURES</span></h1>
            <p>Deploying AI, Blockchain, and Modern Cloud Infrastructure.</p>
          </header>
          <section className="services-grid">
            <div className="service-card">
              <h3>AI Integration</h3>
              <p>Implementing LLMs and automated data pipelines.</p>
            </div>
            <div className="service-card">
              <h3>Web3 Systems</h3>
              <p>Design of secure smart contracts and dApps.</p>
            </div>
            <div className="service-card">
              <h3>Cloud Infrastructure</h3>
              <p>Migration and massive cost-reduction strategies.</p>
            </div>
          </section>
        </>
      )}

      {currentPage === 'contact' && (
        <div className="contact-view">
          <div className="contact-glass-box">
            <h2 className="glow">SYSTEM INITIALIZATION</h2>
            <form onSubmit={handleSubmit} className="tech-form">
              <input type="text" placeholder="Operator Name" required value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <input type="email" placeholder="Communication Email" required value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <textarea placeholder="Project Specifications..." required value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}></textarea>
              <button type="submit" className="neon-btn">TRANSMIT DATA</button>
            </form>
          </div>
        </div>
      )}

      {currentPage === 'admin' && isAuthenticated && <Admin />}
    </div>
  );
}

export default App;