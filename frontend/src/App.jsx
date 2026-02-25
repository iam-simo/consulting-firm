import { useState, useEffect } from 'react';
import './App.css';
import Admin from './Admin'; 

function App() {
  // --- STATE MANAGEMENT ---
  const [currentPage, setCurrentPage] = useState('home'); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  // --- SECURITY: HIDDEN GATEKEEPER ---
  const handleLogin = () => {
    const password = prompt("System Authorization Required:");
    if (password === "Admin123") {
      setIsAuthenticated(true);
      setCurrentPage('admin');
    } else {
      alert("Access Denied. Incident logged.");
    }
  };

  // --- API HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('https://consulting-backend-y19q.onrender.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      alert("Transmission Received. Our architects will contact you.");
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      alert("Uplink in progress. The secure server is waking up—please try again in 30 seconds.");
    }
  };

  // --- COMPONENT: UNIVERSAL NAVBAR ---
  const Navbar = () => (
    <nav className="navbar">
      <div className="logo" onClick={() => setCurrentPage('home')}>
        NEXTGEN<span className="glow">TECH</span>
      </div>
      <div className="nav-links">
        <button onClick={() => setCurrentPage('home')}>Home</button>
        <button onClick={() => setCurrentPage('projects')}>Case Studies</button>
        <button onClick={() => setCurrentPage('about')}>About</button>
        <button className="nav-cta" onClick={() => setCurrentPage('contact')}>Contact</button>
        {/* Secret Login point */}
        <span onDoubleClick={handleLogin} className="secret-trigger">.</span>
      </div>
    </nav>
  );

  // --- VIEW: HOME & SERVICES ---
  if (currentPage === 'home') {
    return (
      <div className="app-container">
        <Navbar />
        <header className="hero">
          <div className="grid-overlay"></div>
          <div className="hero-text">
            <h1 className="reveal-text">Building the <span className="gradient-text">Future of Systems</span></h1>
            <p>High-performance AI, Blockchain, and System Architecture for Global Enterprises.</p>
            <div className="hero-btns">
              <button className="primary-btn" onClick={() => setCurrentPage('projects')}>View Portfolio</button>
              <button className="secondary-btn" onClick={() => setCurrentPage('contact')}>Start Project</button>
            </div>
          </div>
        </header>

        <section className="service-section">
          <h2 className="section-title">Core Competencies</h2>
          <div className="glass-grid">
            <div className="glass-card">
              <div className="icon">🤖</div>
              <h3>AI Engineering</h3>
              <p>LLM Fine-tuning and automated decision engines.</p>
            </div>
            <div className="glass-card">
              <div className="icon">⚙️</div>
              <h3>System Scale</h3>
              <p>Distributed backends handling millions of requests.</p>
            </div>
            <div className="glass-card">
              <div className="icon">🔐</div>
              <h3>Cyber Security</h3>
              <p>Zero-trust architecture and cryptographic protocols.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // --- VIEW: CASE STUDIES (New Section) ---
  if (currentPage === 'projects') {
    return (
      <div className="app-container">
        <Navbar />
        <section className="projects-page">
          <h2 className="section-title">Proven Results</h2>
          <div className="project-list">
            <div className="project-item">
              <div className="project-info">
                <span className="tag">AI & FINTECH</span>
                <h3>Project: NeuralBroker</h3>
                <p>Reduced financial latency by 40% using custom-trained AI trading agents.</p>
              </div>
            </div>
            <div className="project-item">
              <div className="project-info">
                <span className="tag">SYSTEMS</span>
                <h3>Project: TitanStack</h3>
                <p>Rebuilt a legacy retail system to handle 100k concurrent global users.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // --- VIEW: ABOUT ---
  if (currentPage === 'about') {
    return (
      <div className="app-container">
        <Navbar />
        <section className="about-hero">
          <div className="about-text">
            <h2>Deep Tech. Deep Results.</h2>
            <p>We are a boutique team of engineers and mathematicians based in Kenya, solving the hardest problems in software today.</p>
          </div>
        </section>
      </div>
    );
  }

  // --- VIEW: CONTACT ---
  if (currentPage === 'contact') {
    return (
      <div className="app-container">
        <Navbar />
        <section className="contact-view">
          <div className="contact-glass-box">
            <h2>Initialize Consultation</h2>
            <form onSubmit={handleSubmit} className="tech-form">
              <input type="text" placeholder="Your Identity" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="email" placeholder="Communication Channel (Email)" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <textarea placeholder="Describe your technical challenge..." required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
              <button type="submit" className="neon-btn">Send Uplink</button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  // --- VIEW: ADMIN (Protected) ---
  if (currentPage === 'admin' && isAuthenticated) {
    return (
      <div className="admin-view">
        <div className="admin-nav">
          <h3>Central Command</h3>
          <button onClick={() => setCurrentPage('home')}>Logout</button>
        </div>
        <Admin />
      </div>
    );
  }
}

export default App;