import { useState, useEffect, useRef } from 'react';
import './App.css';
import Admin from './Admin';

const API = 'https://consulting-backend-y19q.onrender.com';

function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const num = parseInt(target);
        const step = Math.ceil(num / 50);
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + step, num);
          setCount(current);
          if (current >= num) clearInterval(timer);
        }, 30);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function TypeWriter({ text, speed = 60 }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
      else clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <span>{displayed}<span className="cursor-blink">|</span></span>;
}

export default function App() {
  const [page, setPage] = useState('home');
  const [auth, setAuth] = useState(null);
  const [contactData, setContactData] = useState({ name: '', email: '', service: '', message: '' });
  const [contactStatus, setContactStatus] = useState('idle');
  const [signInMode, setSignInMode] = useState('login');
  const [signInData, setSignInData] = useState({ name: '', email: '', password: '' });
  const [signInError, setSignInError] = useState('');
  const [signInOk, setSignInOk] = useState('');
  const [signInBusy, setSignInBusy] = useState(false);
  const [pageKey, setPageKey] = useState(0);

  const navigate = (p) => { setPage(p); setPageKey(k => k + 1); window.scrollTo(0, 0); };

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
    } catch { setContactStatus('error'); }
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
          body: JSON.stringify(signInData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        setSignInOk('Account created! Check your email, then sign in.');
        setSignInMode('login');
        setSignInData({ name: '', email: signInData.email, password: '' });
        return;
      }
      let result = null;
      const adminRes = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...signInData, role: 'admin' }),
      });
      if (adminRes.ok) {
        result = await adminRes.json();
      } else {
        const userRes = await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...signInData, role: 'user' }),
        });
        const data = await userRes.json();
        if (!userRes.ok) throw new Error(data.detail || 'Incorrect email or password');
        result = data;
      }
      setAuth({ token: result.token, role: result.role, name: result.name });
      navigate(result.role === 'admin' ? 'admin' : 'home');
    } catch (err) {
      setSignInError(err.message);
    } finally {
      setSignInBusy(false);
    }
  };

  const handleLogout = () => { setAuth(null); navigate('home'); };

  const Navbar = () => (
    <nav className="navbar">
      <div className="logo" onClick={() => navigate('home')}>
        ELITE <span className="glow">CONSULTING</span>
      </div>
      <div className="nav-links">
        <button onClick={() => navigate('home')}>Home</button>
        <button onClick={() => navigate('about')}>About</button>
        <button onClick={() => navigate('services')}>Services</button>
        <button onClick={() => navigate('projects')}>Projects</button>
        <button onClick={() => navigate('contact')}>Contact</button>
        {auth ? (
          <>
            <span className="nav-user">👤 {auth.name}</span>
            {auth.role === 'admin' && (
              <button className="nav-admin-btn" onClick={() => navigate('admin')}>Admin Panel</button>
            )}
            <button className="nav-cta" onClick={handleLogout}>Sign Out</button>
          </>
        ) : (
          <button className="nav-cta" onClick={() => navigate('signin')}>Sign In</button>
        )}
      </div>
    </nav>
  );

  if (page === 'home') return (
    <div className="app-container" key={pageKey}>
      <Navbar />
      <div className="scanlines"></div>
      <header className="hero">
        <div className="grid-overlay"></div>
        <div className="hero-particles">
          {[...Array(20)].map((_, i) => <div key={i} className="particle" style={{ '--i': i }}></div>)}
        </div>
        <div className="hero-content fade-up">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            NAIROBI'S PREMIER TECH CONSULTANCY
          </div>
          <h1>ARCHITECTING <span className="gradient-text glitch" data-text="DIGITAL FUTURES">DIGITAL FUTURES</span></h1>
          <p className="hero-sub">
            We deploy AI, Blockchain, and Cloud Infrastructure<br/>
            for enterprises ready to lead tomorrow.
          </p>
          <div className="hero-btns">
            <button className="primary-btn" onClick={() => navigate('services')}>
              <span>Explore Services</span><span className="btn-arrow">→</span>
            </button>
            <button className="secondary-btn" onClick={() => navigate('contact')}>Start a Project</button>
          </div>
          <div className="hero-ticker">
            <span className="ticker-label">LIVE STATUS</span>
            <span className="ticker-dot"></span>
            <span className="ticker-text">Systems Operational · 3 Active Deployments · Accepting New Projects</span>
          </div>
        </div>
      </header>

      <section className="stats-bar">
        {[
          { num: '50', suffix: '+', label: 'Projects Delivered' },
          { num: '98', suffix: '%', label: 'Client Satisfaction' },
          { num: '12', suffix: '',  label: 'Enterprise Partners' },
          { num: '5',  suffix: 'yr',label: 'Industry Experience' },
        ].map((s, i) => (
          <div className="stat fade-up" style={{ animationDelay: `${i * 0.1}s` }} key={i}>
            <span className="stat-num"><Counter target={s.num} suffix={s.suffix} /></span>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      <section className="home-section">
        <p className="section-eyebrow">WHAT WE BUILD</p>
        <h2 className="section-title">Core Competencies</h2>
        <div className="services-grid">
          {[
            { icon: '🤖', title: 'AI Integration', desc: 'LLMs, decision engines, and automated data pipelines built for real business outcomes.' },
            { icon: '⛓️', title: 'Web3 Systems',   desc: 'Secure smart contracts, tokenomics architecture, and full dApp development.' },
            { icon: '☁️', title: 'Cloud Infra',     desc: 'Migration strategies and scalable infrastructure that cuts costs dramatically.' },
          ].map((s, i) => (
            <div className="service-card card-reveal" style={{ animationDelay: `${i * 0.15}s` }} key={i}>
              <div className="card-corner tl"></div>
              <div className="card-corner tr"></div>
              <div className="service-icon-sm">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button className="primary-btn" onClick={() => navigate('services')}>View All Services →</button>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: 0 }}>
        <p className="section-eyebrow">RECENT WORK</p>
        <h2 className="section-title">Active Projects</h2>
        <div className="projects-preview-grid">
          {[
            { tag: 'AI · FINTECH', name: 'NeuralBroker', desc: 'Reduced financial latency by 40% using custom-trained AI trading agents.', status: 'LIVE', color: '#00f2ff' },
            { tag: 'SYSTEMS',      name: 'TitanStack',   desc: 'Rebuilt legacy retail system to handle 100k concurrent global users.',    status: 'LIVE', color: '#00ff8c' },
            { tag: 'SECURITY',     name: 'VaultNet',     desc: 'Zero-trust security architecture for a Nairobi-based financial institution.', status: 'IN PROGRESS', color: '#ffb800' },
          ].map((p, i) => (
            <div className="project-preview-card card-reveal" style={{ animationDelay: `${i * 0.15}s` }} key={i}>
              <div className="card-corner tl"></div>
              <div className="card-corner tr"></div>
              <div className="project-preview-top">
                <span className="tag">{p.tag}</span>
                <span className="project-status" style={{ '--status-color': p.color }}>
                  <span className="status-dot" style={{ background: p.color }}></span>
                  {p.status}
                </span>
              </div>
              <h3>{p.name}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button className="secondary-btn" onClick={() => navigate('projects')}>View All Projects →</button>
        </div>
      </section>

      <section className="cta-banner">
        <div className="grid-overlay" style={{ opacity: 0.3 }}></div>
        <div className="cta-content fade-up">
          <p className="section-eyebrow" style={{ textAlign: 'center' }}>NEXT STEP</p>
          <h2>Ready to build something extraordinary?</h2>
          <p>Our team of engineers is available for new engagements.</p>
          <button className="primary-btn" onClick={() => navigate('contact')}>Initialize Consultation</button>
        </div>
      </section>
    </div>
  );

  if (page === 'about') return (
    <div className="app-container" key={pageKey}>
      <Navbar />
      <div className="scanlines"></div>
      <section className="page-hero">
        <div className="grid-overlay" style={{ opacity: 0.3 }}></div>
        <div className="page-hero-text fade-up">
          <div className="hero-badge"><span className="badge-dot"></span>WHO WE ARE</div>
          <h1>Deep Tech. <span className="gradient-text">Real Results.</span></h1>
          <p>A boutique team of engineers based in Nairobi, solving the hardest problems in software.</p>
        </div>
      </section>

      <section className="home-section">
        <div className="about-mission fade-up">
          <h2 className="section-title">Our Mission</h2>
          <p className="about-mission-text">
            We exist to give African enterprises access to the same calibre of technology that powers
            Silicon Valley's most sophisticated companies. Every system we build is engineered for
            performance, security, and longevity — not just to demo well.
          </p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: 0 }}>
        <p className="section-eyebrow">HOW WE WORK</p>
        <h2 className="section-title">Our Values</h2>
        <div className="values-grid">
          {[
            { icon: '⚡', title: 'Speed Without Shortcuts', desc: 'We ship fast without accumulating technical debt that slows you down later.' },
            { icon: '🔐', title: 'Security First',          desc: 'Every architecture decision considers security from day one, not as an afterthought.' },
            { icon: '📊', title: 'Data-Driven',             desc: 'Every recommendation is backed by numbers and evidence, not opinions.' },
            { icon: '🌍', title: 'Built for Africa',        desc: 'We understand local infrastructure constraints and design systems that work reliably here.' },
          ].map((v, i) => (
            <div className="value-card card-reveal" style={{ animationDelay: `${i * 0.12}s` }} key={i}>
              <div className="value-icon">{v.icon}</div>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: 0 }}>
        <p className="section-eyebrow">THE TEAM</p>
        <h2 className="section-title">Leadership</h2>
        <div className="team-grid">
          {[
            { avatar: '👨‍💻', name: 'Founder & CTO',         role: 'Systems Architecture', desc: '10 years building distributed systems for financial institutions across East Africa.' },
            { avatar: '👩‍🔬', name: 'Head of AI',            role: 'Machine Learning',     desc: 'MSc Applied Mathematics. Specializes in LLM fine-tuning and production ML pipelines.' },
            { avatar: '👨‍💼', name: 'Head of Client Success', role: 'Strategy & Delivery',  desc: 'Ensures every engagement exceeds its KPIs. Former Big 4 strategy consultant.' },
          ].map((t, i) => (
            <div className="team-card card-reveal" style={{ animationDelay: `${i * 0.15}s` }} key={i}>
              <div className="card-corner tl"></div>
              <div className="card-corner tr"></div>
              <div className="team-avatar">{t.avatar}</div>
              <h3>{t.name}</h3>
              <span className="team-role">{t.role}</span>
              <p>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  if (page === 'services') return (
    <div className="app-container" key={pageKey}>
      <Navbar />
      <div className="scanlines"></div>
      <section className="page-hero">
        <div className="grid-overlay" style={{ opacity: 0.3 }}></div>
        <div className="page-hero-text fade-up">
          <div className="hero-badge"><span className="badge-dot"></span>WHAT WE DO</div>
          <h1>Core <span className="gradient-text">Competencies</span></h1>
          <p>Six specialized practice areas built from real enterprise engagements.</p>
        </div>
      </section>
      <section className="home-section">
        <div className="services-full-grid">
          {[
            { icon: '🤖', title: 'AI & Machine Learning',    desc: 'Custom LLM deployments, fine-tuning on proprietary data, AI agents, and automated decision systems integrated directly into your business processes.' },
            { icon: '⛓️', title: 'Blockchain & Web3',        desc: 'Smart contract architecture, tokenomics design, DeFi protocol development, and NFT infrastructure. Audited code, production-ready.' },
            { icon: '☁️', title: 'Cloud Migration & DevOps', desc: 'Move from legacy infrastructure to modern cloud with zero downtime. CI/CD pipelines, Kubernetes orchestration, and cost optimization.' },
            { icon: '🔐', title: 'Cybersecurity',             desc: 'Zero-trust architecture, penetration testing, cryptographic protocol design, and compliance frameworks (ISO 27001, SOC 2).' },
            { icon: '📊', title: 'Data Engineering',          desc: 'Real-time data pipelines, warehouses, and dashboards that turn raw data into revenue-generating insights.' },
            { icon: '🏗️', title: 'System Architecture',      desc: 'Design distributed systems that scale to millions of users. Performance reviews, bottleneck elimination, and technical roadmapping.' },
          ].map((s, i) => (
            <div className="service-card-full card-reveal" style={{ animationDelay: `${i * 0.1}s` }} key={i}>
              <div className="card-corner tl"></div>
              <div className="card-corner tr"></div>
              <div className="service-icon-lg">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <button className="service-enquire-btn" onClick={() => navigate('contact')}>Enquire →</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  if (page === 'projects') return (
    <div className="app-container" key={pageKey}>
      <Navbar />
      <div className="scanlines"></div>
      <section className="page-hero">
        <div className="grid-overlay" style={{ opacity: 0.3 }}></div>
        <div className="page-hero-text fade-up">
          <div className="hero-badge"><span className="badge-dot"></span>OUR WORK</div>
          <h1>Active <span className="gradient-text">Projects</span></h1>
          <p>Proven results across AI, fintech, systems, and security engineering.</p>
        </div>
      </section>
      <section className="home-section">
        <div className="projects-filter-bar">
          <span className="filter-label">FILTER:</span>
          {['All', 'AI', 'Blockchain', 'Cloud', 'Security'].map(f => (
            <button key={f} className="filter-btn filter-active">{f}</button>
          ))}
        </div>
        <div className="projects-full-grid">
          {[
            { tag: 'AI · FINTECH',       name: 'NeuralBroker', status: 'LIVE',        color: '#00f2ff', year: '2025', metrics: ['40% latency reduction', '$2M trades processed', '99.9% uptime'],        desc: 'Custom-trained AI trading agents that reduced financial processing latency by 40%. Built real-time decision engines with sub-millisecond response times for a major East African brokerage.', tech: ['Python', 'FastAPI', 'TensorFlow', 'Redis', 'PostgreSQL'] },
            { tag: 'SYSTEMS · RETAIL',   name: 'TitanStack',   status: 'LIVE',        color: '#00f2ff', year: '2025', metrics: ['100k concurrent users', '300% performance gain', '0 downtime migration'], desc: 'Complete rebuild of a legacy retail management system. Migrated from monolithic PHP to distributed microservices handling 100,000 concurrent users across 3 African countries.', tech: ['Node.js', 'Kubernetes', 'AWS', 'React', 'MongoDB'] },
            { tag: 'SECURITY · FINTECH', name: 'VaultNet',     status: 'IN PROGRESS', color: '#ffb800', year: '2026', metrics: ['ISO 27001 target', 'Zero-trust model', 'Real-time threat detection'],    desc: 'End-to-end zero-trust security architecture for a Nairobi-based financial institution. Includes cryptographic protocol design, penetration testing, and compliance framework implementation.', tech: ['Rust', 'OpenSSL', 'Terraform', 'Datadog', 'Vault'] },
            { tag: 'WEB3 · DEFI',        name: 'ChainBridge',  status: 'IN PROGRESS', color: '#ffb800', year: '2026', metrics: ['Multi-chain support', 'Audited contracts', '$500k TVL target'],           desc: 'Cross-chain DeFi bridge enabling asset transfers between Ethereum, BSC, and Polygon. Smart contracts audited by a third-party security firm before deployment.', tech: ['Solidity', 'Hardhat', 'ethers.js', 'React', 'The Graph'] },
            { tag: 'DATA · LOGISTICS',   name: 'FlowSight',    status: 'COMPLETED',   color: '#888',    year: '2024', metrics: ['15% cost reduction', 'Real-time dashboards', '50+ data sources'],         desc: 'Real-time supply chain analytics platform consolidating data from 50+ sources into a unified dashboard. Enabled a logistics firm to cut operational costs by 15%.', tech: ['Apache Kafka', 'dbt', 'Snowflake', 'Metabase', 'Python'] },
            { tag: 'AI · HEALTHTECH',    name: 'MediScan',     status: 'COMPLETED',   color: '#888',    year: '2024', metrics: ['92% accuracy', '10k scans processed', 'CE Mark compliant'],               desc: 'AI diagnostic tool for early detection of malaria from blood smear images. Trained on a dataset of 80,000 annotated slides. Deployed at 3 clinics in Western Kenya.', tech: ['PyTorch', 'FastAPI', 'Docker', 'PostgreSQL', 'Next.js'] },
          ].map((p, i) => (
            <div className="project-full-card card-reveal" style={{ animationDelay: `${i * 0.1}s` }} key={i}>
              <div className="card-corner tl"></div>
              <div className="card-corner tr"></div>
              <div className="project-card-top">
                <div><span className="tag">{p.tag}</span><span className="project-year">{p.year}</span></div>
                <span className="project-status-badge" style={{ '--status-color': p.color }}>
                  <span className="status-dot" style={{ background: p.color, boxShadow: p.status !== 'COMPLETED' ? `0 0 6px ${p.color}` : 'none' }}></span>
                  {p.status}
                </span>
              </div>
              <h3 className="project-name">{p.name}</h3>
              <p className="project-desc">{p.desc}</p>
              <div className="project-metrics">
                {p.metrics.map((m, j) => <span key={j} className="metric-chip">✓ {m}</span>)}
              </div>
              <div className="project-tech-stack">
                {p.tech.map((t, j) => <span key={j} className="tech-pill">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  if (page === 'contact') return (
    <div className="app-container" key={pageKey}>
      <Navbar />
      <div className="scanlines"></div>
      <section className="contact-section">
        <div className="contact-left fade-up">
          <div className="hero-badge"><span className="badge-dot"></span>GET IN TOUCH</div>
          <h2>Start Your <span className="gradient-text">Project</span></h2>
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: '40px' }}>
            Fill in the form and one of our architects will respond within 24 hours.
          </p>
          <div className="contact-info-list">
            {[
              { icon: '📍', text: 'Nairobi, Kenya' },
              { icon: '📧', text: 'hello@eliteconsulting.co.ke' },
              { icon: '📞', text: '+254 700 000 000' },
              { icon: '🕐', text: 'Mon–Fri, 8am–6pm EAT' },
            ].map((item, i) => (
              <div className="contact-info-item" key={i}><span className="info-icon">{item.icon}</span><span>{item.text}</span></div>
            ))}
          </div>
        </div>
        <div className="contact-right">
          {contactStatus === 'success' ? (
            <div className="contact-success-state fade-up">
              <div className="success-icon">✅</div>
              <h3>Transmission Received</h3>
              <p>Our architects will contact you within 24 hours.</p>
              <button className="neon-btn" style={{ marginTop: '30px' }}
                onClick={() => { setContactStatus('idle'); navigate('home'); }}>Return Home</button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="tech-form contact-glass-box fade-up">
              <h3 style={{ color: 'var(--neon-blue)', marginBottom: '25px', fontSize: '18px', letterSpacing: '2px' }}>SEND ENQUIRY</h3>
              {contactStatus === 'error' && <div className="form-error">Server warming up — please try again in 30 seconds.</div>}
              <input type="text" placeholder="Full Name" required value={contactData.name}
                onChange={e => setContactData({ ...contactData, name: e.target.value })} />
              <input type="email" placeholder="Email Address" required value={contactData.email}
                onChange={e => setContactData({ ...contactData, email: e.target.value })} />
              <select className="form-select" value={contactData.service}
                onChange={e => setContactData({ ...contactData, service: e.target.value })}>
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
                onChange={e => setContactData({ ...contactData, message: e.target.value })} />
              <button type="submit" className="neon-btn" disabled={contactStatus === 'loading'}>
                {contactStatus === 'loading' ? 'Transmitting...' : 'Send Enquiry'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );

  if (page === 'signin') return (
    <div className="app-container" key={pageKey}>
      <Navbar />
      <div className="scanlines"></div>
      <section className="signin-section">
        <div className="signin-box fade-up">
          <div className="signin-header">
            <div className="signin-logo-mark">EC</div>
            <h2 className="glow">ACCESS PORTAL</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '8px' }}>
              <TypeWriter text={signInMode === 'register' ? 'Create your client account...' : 'Authenticating secure connection...'} />
            </p>
          </div>
          <form onSubmit={handleSignIn} className="tech-form" style={{ marginTop: '28px' }}>
            {signInMode === 'register' && (
              <input type="text" placeholder="Full Name" required value={signInData.name}
                onChange={e => setSignInData({ ...signInData, name: e.target.value })} />
            )}
            <input type="email" placeholder="Email Address" required value={signInData.email}
              onChange={e => setSignInData({ ...signInData, email: e.target.value })} />
            <input type="password" placeholder="Password" required value={signInData.password}
              onChange={e => setSignInData({ ...signInData, password: e.target.value })} />
            {signInOk    && <div className="form-success">{signInOk}</div>}
            {signInError && <div className="form-error">{signInError}</div>}
            <button type="submit" className="neon-btn" disabled={signInBusy}>
              {signInBusy
                ? <span className="loading-dots">Verifying<span>.</span><span>.</span><span>.</span></span>
                : signInMode === 'register' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          <div className="signin-footer">
            {signInMode === 'login' ? (
              <span>New client?{' '}
                <button className="link-btn" onClick={() => { setSignInMode('register'); setSignInError(''); setSignInOk(''); }}>Create an account</button>
              </span>
            ) : (
              <span>Already have an account?{' '}
                <button className="link-btn" onClick={() => { setSignInMode('login'); setSignInError(''); setSignInOk(''); }}>Sign in</button>
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  if (page === 'admin' && auth?.role === 'admin') return (
    <div className="app-container" key={pageKey}>
      <Navbar />
      <Admin />
    </div>
  );

  return null;
}