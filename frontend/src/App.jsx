import { useState, useEffect, useRef } from 'react';
import './App.css';
import Admin from './Admin';
import Portal from './Portal';

const API = 'https://consulting-backend-y19q.onrender.com';

function Counter({ target, suffix = '' }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const max = parseInt(target), step = Math.ceil(max / 50);
        let c = 0;
        const t = setInterval(() => { c = Math.min(c + step, max); setN(c); if (c >= max) clearInterval(t); }, 28);
      }
    });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [target]);
  return <span ref={ref}>{n}{suffix}</span>;
}

function TypeWriter({ text, speed = 55 }) {
  const [out, setOut] = useState('');
  useEffect(() => {
    setOut(''); let i = 0;
    const t = setInterval(() => { if (i < text.length) { setOut(text.slice(0, ++i)); } else clearInterval(t); }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span>{out}<span className="blink">|</span></span>;
}

export default function App() {
  const [page, setPage]   = useState('home');
  const [auth, setAuth]   = useState(null);
  const [pageKey, setKey] = useState(0);
  const [cForm, setCForm] = useState({ name:'', email:'', service:'', message:'' });
  const [cStatus, setCStatus] = useState('idle');
  const [sMode, setSMode] = useState('login');
  const [sForm, setSForm] = useState({ name:'', email:'', password:'' });
  const [sErr, setSErr]   = useState('');
  const [sOk, setSOk]     = useState('');
  const [sBusy, setSBusy] = useState(false);

  const go = (p) => { setPage(p); setKey(k=>k+1); window.scrollTo(0,0); };

  const submitContact = async (e) => {
    e.preventDefault(); setCStatus('loading');
    try {
      const h = { 'Content-Type':'application/json' };
      if (auth?.token) h['Authorization'] = `Bearer ${auth.token}`;
      const res = await fetch(`${API}/api/contact`, { method:'POST', headers:h, body:JSON.stringify(cForm) });
      if (!res.ok) throw new Error();
      setCStatus('success'); setCForm({ name:'', email:'', service:'', message:'' });
    } catch { setCStatus('error'); }
  };

  const submitSignIn = async (e) => {
    e.preventDefault(); setSBusy(true); setSErr(''); setSOk('');
    try {
      if (sMode === 'register') {
        const res = await fetch(`${API}/api/auth/register`, {
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(sForm),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.detail || 'Registration failed');
        setSOk('Account created! Check your email, then sign in.');
        setSMode('login'); setSForm({ name:'', email:sForm.email, password:'' });
        return;
      }
      let result = null;
      const aRes = await fetch(`${API}/api/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...sForm, role:'admin'}),
      });
      if (aRes.ok) { result = await aRes.json(); }
      else {
        const uRes = await fetch(`${API}/api/auth/login`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({...sForm, role:'user'}),
        });
        const d = await uRes.json();
        if (!uRes.ok) throw new Error(d.detail || 'Incorrect email or password');
        result = d;
      }
      setAuth({ token:result.token, role:result.role, name:result.name });
      go(result.role === 'admin' ? 'admin' : 'portal');
    } catch(err) { setSErr(err.message); }
    finally { setSBusy(false); }
  };

  const logout = () => { setAuth(null); go('home'); };

  const Nav = () => (
    <nav className="nav">
      <div className="nav-logo" onClick={() => go('home')}>
        ELITE <span className="neon">CONSULTING</span>
      </div>
      <div className="nav-links">
        {['home','about','services','projects','contact'].map(p => (
          <button key={p} onClick={() => go(p)} className={page===p?'nav-active':''}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
        ))}
        {auth ? (
          <>
            {auth.role==='user'  && <button className="nav-portal" onClick={() => go('portal')}>My Portal</button>}
            {auth.role==='admin' && <button className="nav-admin"  onClick={() => go('admin')}>Admin</button>}
            <span className="nav-user">👤 {auth.name}</span>
            <button className="nav-out" onClick={logout}>Sign Out</button>
          </>
        ) : (
          <button className="nav-cta" onClick={() => go('signin')}>Sign In</button>
        )}
      </div>
    </nav>
  );

  // HOME
  if (page === 'home') return (
    <div className="app" key={pageKey}>
      <Nav /><div className="scanlines" />
      <header className="hero">
        <div className="grid-bg" />
        <div className="particles">{[...Array(20)].map((_,i)=><div key={i} className="particle" style={{'--i':i}} />)}</div>
        <div className="hero-body fade-up">
          <div className="chip"><span className="chip-dot" />NAIROBI'S PREMIER TECH CONSULTANCY</div>
          <h1>ARCHITECTING <span className="grad glitch" data-text="DIGITAL FUTURES">DIGITAL FUTURES</span></h1>
          <p className="hero-sub">We deploy AI, Blockchain, and Cloud Infrastructure<br/>for enterprises ready to lead tomorrow.</p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={() => go('services')}>Explore Services <span>→</span></button>
            <button className="btn-outline" onClick={() => go('contact')}>Start a Project</button>
          </div>
          <div className="ticker">
            <span className="ticker-live">● LIVE</span>
            <span className="ticker-text">Systems Operational · 3 Active Deployments · Accepting New Projects</span>
          </div>
        </div>
      </header>

      <section className="stats-row">
        {[{n:'50',s:'+',l:'Projects Delivered'},{n:'98',s:'%',l:'Client Satisfaction'},{n:'12',s:'',l:'Enterprise Partners'},{n:'5',s:'yr',l:'Industry Experience'}].map((x,i)=>(
          <div key={i} className="stat fade-up" style={{animationDelay:`${i*0.1}s`}}>
            <span className="stat-n"><Counter target={x.n} suffix={x.s} /></span>
            <span className="stat-l">{x.l}</span>
          </div>
        ))}
      </section>

      <section className="section">
        <p className="eyebrow">WHAT WE BUILD</p>
        <h2 className="sec-title">Core Services</h2>
        <div className="cards-3">
          {[
            {icon:'🤖',t:'AI Integration',d:'LLMs, decision engines, and automated data pipelines built for real business outcomes.'},
            {icon:'⛓️',t:'Web3 Systems',  d:'Secure smart contracts, tokenomics architecture, and full dApp development.'},
            {icon:'☁️',t:'Cloud Infra',   d:'Migration strategies and scalable infrastructure that cuts costs dramatically.'},
          ].map((c,i)=>(
            <div key={i} className="card card-reveal" style={{animationDelay:`${i*0.15}s`}}>
              <span className="card-icon">{c.icon}</span>
              <h3>{c.t}</h3><p>{c.d}</p>
            </div>
          ))}
        </div>
        <div className="sec-cta">
          <button className="btn-primary" onClick={() => go('services')}>View All Services →</button>
        </div>
      </section>

      <section className="section" style={{paddingTop:0}}>
        <p className="eyebrow">RECENT WORK</p>
        <h2 className="sec-title">Active Projects</h2>
        <div className="cards-3">
          {[
            {tag:'AI · FINTECH',name:'NeuralBroker',status:'LIVE',        col:'#38bdf8',desc:'40% latency reduction using AI trading agents.'},
            {tag:'SYSTEMS',     name:'TitanStack',  status:'LIVE',        col:'#34d399',desc:'Rebuilt legacy retail system for 100k concurrent users.'},
            {tag:'SECURITY',    name:'VaultNet',    status:'IN PROGRESS', col:'#f59e0b',desc:'Zero-trust architecture for a Nairobi fintech firm.'},
          ].map((p,i)=>(
            <div key={i} className="card card-reveal" style={{animationDelay:`${i*0.15}s`}}>
              <div className="proj-top">
                <span className="tag">{p.tag}</span>
                <span className="status-pill" style={{color:p.col}}>● {p.status}</span>
              </div>
              <h3>{p.name}</h3><p>{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="sec-cta">
          <button className="btn-outline" onClick={() => go('projects')}>View All Projects →</button>
        </div>
      </section>

      {/* PORTAL CALLOUT */}
      <section className="portal-callout">
        <div className="portal-callout-inner">
          <div>
            <p className="eyebrow">CLIENT PORTAL</p>
            <h2 className="sec-title" style={{marginBottom:14}}>Track Your Projects</h2>
            <p style={{color:'var(--dim)',lineHeight:1.8,marginBottom:28,fontSize:15}}>
              Registered clients get a personal dashboard — track enquiries, monitor project
              progress, access exclusive resources, and message our team directly.
            </p>
            <button className="btn-primary" onClick={() => go(auth ? 'portal' : 'signin')}>
              {auth ? 'Open My Portal →' : 'Sign In to Portal →'}
            </button>
          </div>
          <div className="callout-features">
            {['✉ View enquiry status & responses','◎ Track project milestones & progress','✦ Message the team directly','⊟ Access exclusive whitepapers','◯ Manage your profile & password'].map((f,i)=>(
              <div key={i} className="callout-row" style={{animationDelay:`${i*0.1}s`}}>
                <span className="callout-check">✓</span><span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="grid-bg" style={{opacity:0.2}} />
        <div className="cta-inner fade-up">
          <p className="eyebrow" style={{textAlign:'center'}}>NEXT STEP</p>
          <h2>Ready to build something extraordinary?</h2>
          <p>Our team of engineers is available for new engagements.</p>
          <button className="btn-primary" onClick={() => go('contact')}>Initialize Consultation</button>
        </div>
      </section>
    </div>
  );

  // ABOUT
  if (page === 'about') return (
    <div className="app" key={pageKey}>
      <Nav /><div className="scanlines" />
      <section className="page-hero">
        <div className="grid-bg" style={{opacity:0.2}} />
        <div className="page-hero-body fade-up">
          <div className="chip"><span className="chip-dot" />WHO WE ARE</div>
          <h1>Deep Tech. <span className="grad">Real Results.</span></h1>
          <p>A boutique team of engineers in Nairobi solving the hardest problems in software.</p>
        </div>
      </section>
      <section className="section">
        <h2 className="sec-title">Our Mission</h2>
        <p style={{color:'var(--dim)',fontSize:17,lineHeight:1.85,maxWidth:760}}>
          We exist to give African enterprises access to the same calibre of technology that
          powers Silicon Valley's most sophisticated companies. Every system we build is
          engineered for performance, security, and longevity — not just to demo well.
        </p>
      </section>
      <section className="section" style={{paddingTop:0}}>
        <p className="eyebrow">HOW WE WORK</p>
        <h2 className="sec-title">Our Values</h2>
        <div className="cards-4">
          {[
            {icon:'⚡',t:'Speed Without Shortcuts',d:'We ship fast without accumulating technical debt.'},
            {icon:'🔐',t:'Security First',         d:'Every architecture decision considers security from day one.'},
            {icon:'📊',t:'Data-Driven',            d:'Every recommendation is backed by numbers, not opinions.'},
            {icon:'🌍',t:'Built for Africa',       d:'We design systems that work within local infrastructure constraints.'},
          ].map((v,i)=>(
            <div key={i} className="card card-reveal" style={{animationDelay:`${i*0.12}s`}}>
              <span className="card-icon">{v.icon}</span><h3>{v.t}</h3><p>{v.d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section" style={{paddingTop:0}}>
        <p className="eyebrow">THE TEAM</p>
        <h2 className="sec-title">Leadership</h2>
        <div className="cards-3">
          {[
            {av:'👨‍💻',n:'Founder & CTO',         r:'Systems Architecture',d:'10 years building distributed systems for financial institutions across East Africa.'},
            {av:'👩‍🔬',n:'Head of AI',            r:'Machine Learning',    d:'MSc Applied Mathematics. Specialises in LLM fine-tuning and production ML pipelines.'},
            {av:'👨‍💼',n:'Head of Client Success', r:'Strategy & Delivery', d:'Ensures every engagement exceeds its KPIs. Former Big 4 strategy consultant.'},
          ].map((t,i)=>(
            <div key={i} className="card team-card card-reveal" style={{animationDelay:`${i*0.15}s`,textAlign:'center'}}>
              <div style={{fontSize:44,marginBottom:14}}>{t.av}</div>
              <h3>{t.n}</h3>
              <span className="team-role">{t.r}</span>
              <p>{t.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  // SERVICES
  if (page === 'services') return (
    <div className="app" key={pageKey}>
      <Nav /><div className="scanlines" />
      <section className="page-hero">
        <div className="grid-bg" style={{opacity:0.2}} />
        <div className="page-hero-body fade-up">
          <div className="chip"><span className="chip-dot" />WHAT WE DO</div>
          <h1>Core <span className="grad">Competencies</span></h1>
          <p>Six specialised practice areas built from real enterprise engagements.</p>
        </div>
      </section>
      <section className="section">
        <div className="cards-2">
          {[
            {icon:'🤖',t:'AI & Machine Learning',   d:'Custom LLM deployments, fine-tuning on proprietary data, AI agents, and automated decision systems integrated directly into your business processes.'},
            {icon:'⛓️',t:'Blockchain & Web3',        d:'Smart contract architecture, tokenomics design, DeFi protocol development, and NFT infrastructure. Audited code, production-ready.'},
            {icon:'☁️',t:'Cloud Migration & DevOps', d:'Move from legacy infrastructure to modern cloud with zero downtime. CI/CD pipelines, Kubernetes orchestration, and cost optimisation.'},
            {icon:'🔐',t:'Cybersecurity',             d:'Zero-trust architecture, penetration testing, cryptographic protocol design, and compliance frameworks (ISO 27001, SOC 2).'},
            {icon:'📊',t:'Data Engineering',          d:'Real-time data pipelines, warehouses, and dashboards that turn raw data into revenue-generating insights.'},
            {icon:'🏗️',t:'System Architecture',      d:'Design distributed systems that scale to millions of users. Performance reviews, bottleneck elimination, and technical roadmapping.'},
          ].map((s,i)=>(
            <div key={i} className="card service-card card-reveal" style={{animationDelay:`${i*0.1}s`}}>
              <span className="card-icon">{s.icon}</span>
              <h3>{s.t}</h3><p>{s.d}</p>
              <button className="btn-ghost" onClick={() => go('contact')}>Enquire →</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  // PROJECTS
  if (page === 'projects') return (
    <div className="app" key={pageKey}>
      <Nav /><div className="scanlines" />
      <section className="page-hero">
        <div className="grid-bg" style={{opacity:0.2}} />
        <div className="page-hero-body fade-up">
          <div className="chip"><span className="chip-dot" />OUR WORK</div>
          <h1>Active <span className="grad">Projects</span></h1>
          <p>Proven results across AI, fintech, systems, and security engineering.</p>
        </div>
      </section>
      <section className="section">
        <div className="proj-grid">
          {[
            {tag:'AI · FINTECH',       name:'NeuralBroker',status:'LIVE',        col:'#38bdf8',year:'2025',metrics:['40% latency reduction','$2M trades processed','99.9% uptime'],        desc:'Custom AI trading agents that reduced financial processing latency by 40% for a major East African brokerage.',tech:['Python','FastAPI','TensorFlow','Redis','PostgreSQL']},
            {tag:'SYSTEMS · RETAIL',   name:'TitanStack',  status:'LIVE',        col:'#38bdf8',year:'2025',metrics:['100k concurrent users','300% performance gain','0 downtime migration'],desc:'Rebuilt a legacy retail management system to distributed microservices handling 100k concurrent users.',tech:['Node.js','Kubernetes','AWS','React','MongoDB']},
            {tag:'SECURITY · FINTECH', name:'VaultNet',    status:'IN PROGRESS', col:'#f59e0b',year:'2026',metrics:['ISO 27001 target','Zero-trust model','Real-time threat detection'],   desc:'End-to-end zero-trust security architecture for a Nairobi-based financial institution.',tech:['Rust','OpenSSL','Terraform','Datadog','Vault']},
            {tag:'WEB3 · DEFI',        name:'ChainBridge', status:'IN PROGRESS', col:'#f59e0b',year:'2026',metrics:['Multi-chain support','Audited contracts','$500k TVL target'],          desc:'Cross-chain DeFi bridge enabling asset transfers between Ethereum, BSC, and Polygon.',tech:['Solidity','Hardhat','ethers.js','React','The Graph']},
            {tag:'DATA · LOGISTICS',   name:'FlowSight',   status:'COMPLETED',   col:'#94a3b8',year:'2024',metrics:['15% cost reduction','Real-time dashboards','50+ data sources'],        desc:'Real-time supply chain analytics platform consolidating data from 50+ sources.',tech:['Apache Kafka','dbt','Snowflake','Metabase','Python']},
            {tag:'AI · HEALTHTECH',    name:'MediScan',    status:'COMPLETED',   col:'#94a3b8',year:'2024',metrics:['92% accuracy','10k scans processed','CE Mark compliant'],              desc:'AI diagnostic tool for early detection of malaria from blood smear images. Deployed at 3 clinics.',tech:['PyTorch','FastAPI','Docker','PostgreSQL','Next.js']},
          ].map((p,i)=>(
            <div key={i} className="card proj-card card-reveal" style={{animationDelay:`${i*0.1}s`}}>
              <div className="proj-top">
                <div><span className="tag">{p.tag}</span><span className="proj-year">{p.year}</span></div>
                <span className="status-pill" style={{color:p.col}}>● {p.status}</span>
              </div>
              <h3 className="proj-name">{p.name}</h3>
              <p className="proj-desc">{p.desc}</p>
              <div className="metrics">{p.metrics.map((m,j)=><span key={j} className="metric">✓ {m}</span>)}</div>
              <div className="techs">{p.tech.map((t,j)=><span key={j} className="tech-tag">{t}</span>)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  // CONTACT
  if (page === 'contact') return (
    <div className="app" key={pageKey}>
      <Nav /><div className="scanlines" />
      <div className="contact-layout">
        <div className="contact-left fade-up">
          <div className="chip"><span className="chip-dot" />GET IN TOUCH</div>
          <h2>Start Your <span className="grad">Project</span></h2>
          <p style={{color:'var(--dim)',lineHeight:1.7,marginBottom:36}}>Fill in the form and an architect will respond within 24 hours.</p>
          {[{i:'📍',t:'Nairobi, Kenya'},{i:'📧',t:'hello@eliteconsulting.co.ke'},{i:'📞',t:'+254 700 000 000'},{i:'🕐',t:'Mon–Fri, 8am–6pm EAT'}].map((x,j)=>(
            <div key={j} className="contact-info-row"><span>{x.i}</span><span>{x.t}</span></div>
          ))}
        </div>
        <div className="contact-right">
          {cStatus === 'success' ? (
            <div className="success-box fade-up">
              <div style={{fontSize:48,marginBottom:16}}>✅</div>
              <h3>Transmission Received</h3>
              <p>Our architects will contact you within 24 hours.</p>
              {auth && <p style={{color:'var(--blue)',fontSize:14}}>Track this in your Client Portal.</p>}
              <button className="btn-primary" style={{marginTop:24}} onClick={() => { setCStatus('idle'); go(auth?'portal':'home'); }}>
                {auth ? 'Go to Portal' : 'Return Home'}
              </button>
            </div>
          ) : (
            <form onSubmit={submitContact} className="contact-form fade-up">
              <h3 className="form-title">SEND ENQUIRY</h3>
              {cStatus==='error' && <div className="form-error">Server warming up — try again in 30 seconds.</div>}
              <input placeholder="Full Name" required value={cForm.name} onChange={e=>setCForm({...cForm,name:e.target.value})} />
              <input type="email" placeholder="Email Address" required value={cForm.email} onChange={e=>setCForm({...cForm,email:e.target.value})} />
              <select value={cForm.service} onChange={e=>setCForm({...cForm,service:e.target.value})}>
                <option value="">Select a Service (Optional)</option>
                {['AI & Machine Learning','Blockchain & Web3','Cloud Migration & DevOps','Cybersecurity','Data Engineering','System Architecture'].map(s=><option key={s}>{s}</option>)}
              </select>
              <textarea placeholder="Describe your project or challenge…" required rows={5} value={cForm.message} onChange={e=>setCForm({...cForm,message:e.target.value})} />
              <button type="submit" className="btn-neon" disabled={cStatus==='loading'}>
                {cStatus==='loading' ? 'Transmitting…' : 'Send Enquiry'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  // SIGN IN
  if (page === 'signin') return (
    <div className="app" key={pageKey}>
      <Nav /><div className="scanlines" />
      <div className="signin-wrap">
        <div className="signin-box fade-up">
          <div className="signin-top">
            <div className="signin-mark">EC</div>
            <h2 className="neon">ACCESS PORTAL</h2>
            <p style={{color:'var(--dim)',fontSize:13,marginTop:8}}>
              <TypeWriter text={sMode==='register'?'Creating your account…':'Authenticating secure connection…'} />
            </p>
          </div>
          <form onSubmit={submitSignIn} className="signin-form">
            {sMode==='register' && (
              <input placeholder="Full Name" required value={sForm.name} onChange={e=>setSForm({...sForm,name:e.target.value})} />
            )}
            <input type="email" placeholder="Email Address" required value={sForm.email} onChange={e=>setSForm({...sForm,email:e.target.value})} />
            <input type="password" placeholder="Password" required value={sForm.password} onChange={e=>setSForm({...sForm,password:e.target.value})} />
            {sOk  && <div className="form-success">{sOk}</div>}
            {sErr && <div className="form-error">{sErr}</div>}
            <button type="submit" className="btn-neon" disabled={sBusy}>
              {sBusy ? <span className="dots">Verifying<span>.</span><span>.</span><span>.</span></span>
                : sMode==='register' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          <div className="signin-footer">
            {sMode==='login'
              ? <>New client? <button className="link-btn" onClick={()=>{setSMode('register');setSErr('');setSOk('');}}>Create an account</button></>
              : <>Have an account? <button className="link-btn" onClick={()=>{setSMode('login');setSErr('');setSOk('');}}>Sign in</button></>
            }
          </div>
        </div>
      </div>
    </div>
  );

  // PORTAL
  if (page === 'portal' && auth?.role === 'user') return (
    <div className="app" key={pageKey}>
      <Nav />
      <Portal auth={auth} setAuth={setAuth} onNavigate={go} />
    </div>
  );

  // ADMIN
  if (page === 'admin' && auth?.role === 'admin') return (
    <div className="app" key={pageKey}>
      <Nav />
      <Admin />
    </div>
  );

  return null;
}