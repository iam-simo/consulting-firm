import { useState } from 'react';
import './App.css';
import Admin from './Admin';

const API = 'https://consulting-backend-y19q.onrender.com';

function App() {
  const [page, setPage] = useState('home');
  const [auth, setAuth] = useState(null);
  const [contactData, setContactData] = useState({ name: '', email: '', service: '', message: '' });
  const [contactStatus, setContactStatus] = useState('idle');
  const [signInTab, setSignInTab]     = useState('user');
  const [signInMode, setSignInMode]   = useState('login');
  const [signInData, setSignInData]   = useState({ name: '', email: '', password: '' });
  const [signInError, setSignInError] = useState('');
  const [signInOk, setSignInOk]       = useState('');
  const [signInBusy, setSignInBusy]   = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactStatus('loading');
    try {
      const res = await fetch(`${API}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      });
      if (!res.ok) throw new Error();
      setContactStatus('success');
      setContactData({ name: '', email: '', service: '', message: '' });
    } catch {
      setContactStatus('error');
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSignInBusy(true);
    setSignInError('');
    setSignInOk('');
    try {
      if (signInMode === 'register') {
        const res = await fetch(`${API}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: signInData.name, email: signInData.email, password: signInData.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        setSignInOk('Account created! You can now sign in.');
        setSignInMode('login');
        setSignInData({ name: '', email: signInData.email, password: '' });
        return;
      }
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInData.email, password: signInData.password, role: signInTab }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      setAuth({ token: data.token, role: data.role, name: data.name });
      setPage(data.role === 'admin' ? 'admin' : 'home');
    } catch (err) {
      setSignInError(err.message);
    } finally {
      setSignInBusy(false);
    }
  };

  const handleLogout = () => {
    setAuth(null);
    setPage('home');
    setSignInData({ name: '', email: '', password: '' });
  };

  const goSignIn = () => {
    setSignInError('');
    setSignInOk('');
    setPage('signin');
  };

  const Navbar = () => (
    <nav className="navbar">
      <div className="logo" onClick={() => setPage('home')}>
        ELITE <span className="glow">CONSULTING</span>
      </div>
      <div className="nav-links">
        <button onClick={() => setPage('home')}>Home</button>
        <button onClick={() => setPage('about')}>About</button>
        <button onClick={() => setPage('services')}>Services</button>
        <button onClick={() => setPage('contact')}>Contact</button>
        {auth ? (
          <>
            <span className="nav-user">👤 {auth.name}</span>
            {auth.role === 'admin' && (
              <button className="nav-admin-btn" onClick={() => setPage('admin')}>Admin Panel</button>
            )}
            <button className="nav-cta" onClick={handleLogout}>Sign Out</button>
          </>
        ) : (
          <button className="nav-cta" onClick={goSignIn}>Sign In</button>
        )}
      </div>
    </nav>
  );

  if (page === 'home') return (
    <div className="app-container">
      <Navbar />
      <header className="hero">
        <div className="grid-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">NAIROBI'S PREMIER TECH CONSULTANCY</div>
          <h1>ARCHITECTING <span className="gradient-text">DIGITAL FUTURES</span></h1>
          <p>We deploy AI, Blockchain, and Cloud Infrastructure for enterprises ready to lead tomorrow.</p>
          <div className="hero-btns">
            <button className="primary-btn" onClick={() => setPage('services')}>Our Services</button>
            <button className="secondary-btn" onClick={() => setPage('contact')}>Start a Project</button>
          </div>
        </div>
      </header>

      <section className="stats-bar">
        <div className="stat"><span className="stat-num">50+</span><span>Projects Delivered</span></div>
        <div className="stat"><span className="stat-num">98%</span><span>Client Satisfaction</span></div>
        <div className="stat"><span className="stat-num">12</span><span>Enterprise Partners</span></div>
        <div className="stat"><span className="stat-num">5yr</span><span>Industry Experience</span></div>
      </section>

      <section className="home-section">
        <p className="section-eyebrow">WHAT WE BUILD</p>
        <h2 className="section-title">Core Competencies</h2>
        <div className="services-grid">
          <div className="service-card">
            <div className="service-icon-sm">🤖</div>
            <h3>AI Integration</h3>
            <p>LLMs, decision engines, and automated data pipelines built for real business outcomes.</p>
          </div>
          <div className="service-card">
            <div className="service-icon-sm">⛓️</div>
            <h3>Web3 Systems</h3>
            <p>Secure smart contracts, tokenomics architecture, and full dApp development.</p>
          </div>
          <div className="service-card">
            <div className="service-icon-sm">☁️</div>
            <h3>Cloud Infrastructure</h3>
            <p>Migration strategies and scalable infrastructure that cuts costs dramatically.</p>
          </div>
        </div>
        <div style={{textAlign:'center', marginTop:'40px'}}>
          <button className="primary-btn" onClick={() => setPage('services')}>View All Services →</button>
        </div>
      </section>

      <section className="cta-banner">
        <div className="grid-overlay" style={{opacity:0.3}}></div>
        <div className="cta-content">
          <h2>Ready to build something extraordinary?</h2>
          <p>Our team of engineers is available for new engagements.</p>
          <button className="primary-btn" onClick={() => setPage('contact')}>Initialize Consultation</button>
        </div>
      </section>
    </div>
  );

  if (page === 'about') return (
    <div className="app-container">
      <Navbar />
      <section className="page-hero">
        <div className="grid-overlay" style={{opacity:0.3}}></div>
        <div className="page-hero-text">
          <div className="hero-badge">WHO WE ARE</div>
          <h1>Deep Tech. <span className="gradient-text">Real Results.</span></h1>
          <p>A boutique team of engineers based in Nairobi, solving the hardest problems in software.</p>
        </div>
      </section>

      <section className="home-section">
        <div className="about-mission">
          <h2 className="section-title">Our Mission</h2>
          <p className="about-mission-text">
            We exist to give African enterprises access to the same calibre of technology that powers Silicon Valley's most sophisticated companies. Every system we build is engineered for performance, security, and longevity — not just to demo well.
          </p>
        </div>
      </section>

      <section className="home-section" style={{paddingTop:0}}>
        <p className="section-eyebrow">HOW WE WORK</p>
        <h2 className="section-title">Our Values</h2>
        <div className="values-grid">
          <div className="value-card">
            <div className="value-icon">⚡</div>
            <h3>Speed Without Shortcuts</h3>
            <p>We ship fast without accumulating technical debt that slows you down later.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">🔐</div>
            <h3>Security First</h3>
            <p>Every architecture decision considers security from day one, not as an afterthought.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">📊</div>
            <h3>Data-Driven</h3>
            <p>Every recommendation is backed by numbers and evidence, not opinions.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">🌍</div>
            <h3>Built for Africa</h3>
            <p>We understand local infrastructure constraints and design systems that work reliably here.</p>
          </div>
        </div>
      </section>

      <section className="home-section" style={{paddingTop:0}}>
        <p className="section-eyebrow">THE TEAM</p>
        <h2 className="section-title">Leadership</h2>
        <div className="team-grid">
          <div className="team-card">
            <div className="team-avatar">👨‍💻</div>
            <h3>Founder & CTO</h3>
            <span className="team-role">Systems Architecture</span>
            <p>10 years building distributed systems for financial institutions across East Africa.</p>
          </div>
          <div className="team-card">
            <div className="team-avatar">👩‍🔬</div>
            <h3>Head of AI</h3>
            <span className="team-role">Machine Learning</span>
            <p>MSc Applied Mathematics. Specializes in LLM fine-tuning and production ML pipelines.</p>
          </div>
          <div className="team-card">
            <div className="team-avatar">👨‍💼</div>
            <h3>Head of Client Success</h3>
            <span className="team-role">Strategy & Delivery</span>
            <p>Ensures every engagement exceeds its KPIs. Former Big 4 strategy consultant.</p>
          </div>
        </div>
      </section>
    </div>
  );

  if (page === 'services') return (
    <div className="app-container">
      <Navbar />
      <section className="page-hero">
        <div className="grid-overlay" style={{opacity:0.3}}></div>
        <div className="page-hero-text">
          <div className="hero-badge">WHAT WE DO</div>
          <h1>Core <span className="gradient-text">Competencies</span></h1>
          <p>Six specialized practice areas built from real enterprise engagements.</p>
        </div>
      </section>

      <section className="home-section">
        <div className="services-full-grid">
          {[
            { icon:'🤖', title:'AI & Machine Learning',    desc:'Custom LLM deployments, fine-tuning on proprietary data, AI agents, and automated decision systems integrated directly into your business processes.' },
            { icon:'⛓️', title:'Blockchain & Web3',        desc:'Smart contract architecture, tokenomics design, DeFi protocol development, and NFT infrastructure. Audited code, production-ready.' },
            { icon:'☁️', title:'Cloud Migration & DevOps', desc:'Move from legacy infrastructure to modern cloud with zero downtime. CI/CD pipelines, Kubernetes orchestration, and cost optimization.' },
            { icon:'🔐', title:'Cybersecurity',             desc:'Zero-trust architecture, penetration testing, cryptographic protocol design, and compliance frameworks (ISO 27001, SOC 2).' },
            { icon:'📊', title:'Data Engineering',          desc:'Real-time data pipelines, warehouses, and dashboards that turn raw data into revenue-generating insights.' },
            { icon:'🏗️', title:'System Architecture',      desc:'Design distributed systems that scale to millions of users. Performance reviews, bottleneck elimination, and technical roadmapping.' },
          ].map((s, i) => (
            <div className="service-card-full" key={i}>
              <div className="service-icon-lg">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <button className="service-enquire-btn" onClick={() => setPage('contact')}>Enquire →</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  if (page === 'contact') return (
    <div className="app-container">
      <Navbar />
      <section className="contact-section">
        <div className="contact-left">
          <div className="hero-badge">GET IN TOUCH</div>
          <h2>Start Your <span className="gradient-text">Project</span></h2>
          <p style={{color:'var(--text-dim)', lineHeight:1.7, marginBottom:'40px'}}>
            Fill in the form and one of our architects will respond within 24 hours.
          </p>
          <div className="contact-info-list">
            <div className="contact-info-item"><span className="info-icon">📍</span><span>Nairobi, Kenya</span></div>
            <div className="contact-info-item"><span className="info-icon">📧</span><span>hello@eliteconsulting.co.ke</span></div>
            <div className="contact-info-item"><span className="info-icon">📞</span><span>+254 700 000 000</span></div>
            <div className="contact-info-item"><span className="info-icon">🕐</span><span>Mon–Fri, 8am–6pm EAT</span></div>
          </div>
        </div>

        <div className="contact-right">
          {contactStatus === 'success' ? (
            <div className="contact-success-state">
              <div style={{fontSize:'48px', marginBottom:'20px'}}>✅</div>
              <h3>Transmission Received</h3>
              <p>Our architects will contact you within 24 hours.</p>
              <button className="neon-btn" style={{marginTop:'30px'}} onClick={() => { setContactStatus('idle'); setPage('home'); }}>
                Return Home
              </button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="tech-form contact-glass-box">
              <h3 style={{color:'var(--neon-blue)', marginBottom:'25px', fontSize:'20px'}}>Send Enquiry</h3>
              {contactStatus === 'error' && (
                <div className="form-error">Server warming up — please try again in 30 seconds.</div>
              )}
              <input type="text" placeholder="Full Name" required value={contactData.name}
                onChange={e => setContactData({...contactData, name: e.target.value})} />
              <input type="email" placeholder="Email Address" required value={contactData.email}
                onChange={e => setContactData({...contactData, email: e.target.value})} />
              <select className="form-select" value={contactData.service}
                onChange={e => setContactData({...contactData, service: e.target.value})}>
                <option value="">Select a Service (Optional)</option>
                <option>AI & Machine Learning</option>
                <option>Blockchain & Web3</option>
                <option>Cloud Migration & DevOps</option>
                <option>Cybersecurity</option>
                <option>Data Engineering</option>
                <option>System Architecture</option>
              </select>
              <textarea placeholder="Describe your project or challenge..." required rows={5}
                value={contactData.message}
                onChange={e => setContactData({...contactData, message: e.target.value})} />
              <button type="submit" className="neon-btn" disabled={contactStatus === 'loading'}>
                {contactStatus === 'loading' ? 'Sending...' : 'Send Enquiry'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );

  if (page === 'signin') return (
    <div className="app-container">
      <Navbar />
      <section className="signin-section">
        <div className="signin-box">
          <h2 className="glow" style={{marginBottom:'8px'}}>ACCESS PORTAL</h2>
          <p style={{color:'var(--text-dim)', fontSize:'14px', marginBottom:'30px'}}>
            Sign in as a client or administrator
          </p>
          <div className="signin-tabs">
            <button
              className={`tab-btn ${signInTab === 'user' ? 'tab-active' : ''}`}
              onClick={() => { setSignInTab('user'); setSignInError(''); setSignInOk(''); setSignInMode('login'); }}>
              Client Portal
            </button>
            <button
              className={`tab-btn ${signInTab === 'admin' ? 'tab-active' : ''}`}
              onClick={() => { setSignInTab('admin'); setSignInError(''); setSignInOk(''); setSignInMode('login'); }}>
              Admin Access
            </button>
          </div>

          <form onSubmit={handleSignIn} className="tech-form" style={{marginTop:'25px'}}>
            {signInTab === 'user' && signInMode === 'register' && (
              <input type="text" placeholder="Full Name" required value={signInData.name}
                onChange={e => setSignInData({...signInData, name: e.target.value})} />
            )}
            <input type="email" placeholder="Email Address" required value={signInData.email}
              onChange={e => setSignInData({...signInData, email: e.target.value})} />
            <input type="password" placeholder="Password" required value={signInData.password}
              onChange={e => setSignInData({...signInData, password: e.target.value})} />
            {signInOk   && <div className="form-success">{signInOk}</div>}
            {signInError && <div className="form-error">{signInError}</div>}
            <button type="submit" className="neon-btn" disabled={signInBusy}>
              {signInBusy ? 'Verifying...' : signInTab === 'admin' ? 'Access Admin Panel' : signInMode === 'register' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {signInTab === 'user' && (
            <div className="signin-footer">
              {signInMode === 'login' ? (
                <span>New client?{' '}
                  <button className="link-btn" onClick={() => { setSignInMode('register'); setSignInError(''); setSignInOk(''); }}>
                    Create an account
                  </button>
                </span>
              ) : (
                <span>Already registered?{' '}
                  <button className="link-btn" onClick={() => { setSignInMode('login'); setSignInError(''); setSignInOk(''); }}>
                    Sign in
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );

  if (page === 'admin' && auth?.role === 'admin') return (
    <div className="app-container">
      <Navbar />
      <Admin />
    </div>
  );

  return null;
}

export default App;