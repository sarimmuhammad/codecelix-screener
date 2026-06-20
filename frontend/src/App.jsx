import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const T = {
  bg:          "#0A0A0A",
  surface:     "#111111",
  surfaceUp:   "#161616",
  border:      "#222222",
  borderFaint: "#1A1A1A",
  maroon:      "#9B1D3A",
  maroonDim:   "#6B1228",
  maroonGlow:  "rgba(155,29,58,0.18)",
  maroonFaint: "rgba(155,29,58,0.07)",
  text:        "#F0F0F0",
  textMid:     "#888888",
  textFaint:   "#444444",
  white:       "#FFFFFF",
  green:       "#2D9E5F",
  greenDim:    "rgba(45,158,95,0.15)",
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function callAPI(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function uploadCV(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/upload-cv`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

/* ─── Client-side validators (mirrors backend) ──────────────────────────────── */
function validatePhone(v) {
  const digits = v.replace(/\D/g, "");
  return digits.length === 11;
}
function validateEmail(v) {
  if (!v.includes("@")) return false;
  const [local, domain] = v.split("@");
  return local.length > 0 && domain && domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}
function validateGithub(v) {
  const s = v.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return true;
  return s.includes(".") && s.length > 4;
}

/* ─── Global styles injected once ───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900;1,14..32,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: ${T.bg}; color: ${T.text}; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
  textarea, input { font-family: inherit; }
  button { font-family: inherit; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
  @keyframes slideUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes shimmer  { 0%,100% { opacity:0.4 } 50% { opacity:1 } }
  @keyframes pulse    { 0%,100% { opacity:1 } 50% { opacity:0.35 } }
  @keyframes spin     { to { transform:rotate(360deg) } }
  @keyframes dotBounce{
    0%,80%,100% { transform:translateY(0); opacity:0.4 }
    40%         { transform:translateY(-5px); opacity:1 }
  }
  @keyframes borderGlow {
    0%,100% { border-color: ${T.border} }
    50%     { border-color: ${T.maroon} }
  }
  @keyframes checkPop {
    0%   { opacity:0; transform:scale(0.5) }
    70%  { transform:scale(1.1) }
    100% { opacity:1; transform:scale(1) }
  }

  .fade-up  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) both }
  .fade-in  { animation: fadeIn  0.4s ease both }
  .slide-up { animation: slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both }

  .intro-btn {
    background: ${T.maroon};
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 15px 32px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: -0.2px;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 20px ${T.maroonGlow};
  }
  .intro-btn:hover  { background: #B02040; transform: translateY(-1px); box-shadow: 0 8px 28px ${T.maroonGlow}; }
  .intro-btn:active { transform: translateY(0); }

  .role-card {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 12px;
    padding: 16px 20px;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: border-color 0.15s, background 0.15s;
  }
  .role-card:hover { border-color: ${T.maroon}; background: ${T.maroonFaint}; }

  .send-btn {
    width: 42px; height: 42px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s, transform 0.1s;
  }
  .send-btn:not(:disabled):hover  { transform: scale(1.05); }
  .send-btn:not(:disabled):active { transform: scale(0.97); }

  .chat-input {
    flex: 1;
    resize: none;
    border: 1px solid ${T.border};
    border-radius: 10px;
    padding: 11px 15px;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.55;
    color: ${T.text};
    background: ${T.surfaceUp};
    max-height: 130px;
    overflow-y: auto;
    transition: border-color 0.2s;
    outline: none;
  }
  .chat-input::placeholder { color: ${T.textFaint}; }
  .chat-input:focus { border-color: ${T.maroon}; }
  .chat-input:disabled { opacity: 0.25; cursor: not-allowed; }

  .cv-btn {
    background: transparent;
    border: 1px solid ${T.border};
    color: ${T.textMid};
    border-radius: 10px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex; align-items: center; gap: 10px;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    font-family: inherit;
  }
  .cv-btn:hover:not(:disabled) { border-color: ${T.maroon}; color: ${T.text}; background: ${T.maroonFaint}; }
  .cv-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 600px) {
    .hero-title { font-size: 38px !important; letter-spacing: -2px !important; }
    .benefit-grid { grid-template-columns: 1fr !important; }
  }
`;

/* ─── Tiny logo wordmark ─────────────────────────────────────────────────────── */
function Logo({ size = 16 }) {
  return (
    <span style={{ fontWeight: 800, fontSize: size, letterSpacing: "-0.5px", color: T.text }}>
      CODE<span style={{ color: T.maroon }}>CELIX</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   INTRO SCREEN
═══════════════════════════════════════════════════════════════════════════════ */
function IntroScreen({ onStart }) {
  const benefits = [
    { label: "Real AI projects", desc: "Production work with global clients — agents, RAG, LLM features, automation." },
    { label: "Latest tools",     desc: "Access to the newest models and APIs before they're mainstream." },
    { label: "Remote & flexible",desc: "Work from anywhere, on your own schedule." },
    { label: "Industry Expert Mentors", desc: "Collaborative Team Mentorship Programs" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Nav */}
      <nav style={{ padding: "22px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.borderFaint}` }}>
        <Logo size={15} />
        <span style={{ fontSize: 13, color: T.textMid, fontWeight: 500 }}>Talent · Apply</span>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 32px 0", width: "100%" }}>

        {/* Hiring pill */}
        <div className="fade-up" style={{ animationDelay: "0s", marginBottom: 32 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.maroonFaint, border: `1px solid ${T.maroonDim}`, borderRadius: 100, padding: "6px 14px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.maroon, display: "inline-block", animation: "pulse 2s ease infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: T.maroon, letterSpacing: "0.3px" }}>NOW HIRING</span>
          </span>
        </div>

        <h1 className="hero-title fade-up" style={{ animationDelay: "0.05s", fontSize: 56, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-3px", color: T.white, marginBottom: 24 }}>
          Apply to join<br />CodeCelix.
        </h1>

        <p className="fade-up" style={{ animationDelay: "0.1s", fontSize: 18, color: T.textMid, lineHeight: 1.65, marginBottom: 40, fontWeight: 400 }}>
          Submit your application through our AI screener.<br />
          <span style={{ color: T.text, fontWeight: 500 }}>Hear back in days.</span>
        </p>

        <div className="fade-up" style={{ animationDelay: "0.15s", display: "flex", alignItems: "center", gap: 16, marginBottom: 80 }}>
          <button className="intro-btn" onClick={onStart}>
            Start your application
            <svg style={{ marginLeft: 8, display: "inline", verticalAlign: "middle" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span style={{ fontSize: 13, color: T.textFaint }}>Takes about 7 minutes</span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: T.borderFaint, marginBottom: 56 }} />

        {/* Process */}
        <div className="fade-up" style={{ animationDelay: "0.25s", marginBottom: 80 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.8px", color: T.textFaint, textTransform: "uppercase", marginBottom: 28 }}>Process</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              ["Chat with our AI", "Answer a few questions — about 7 minutes."],
              ["Upload your CV",   "We read it and ask about your real experience."],
              ["We review & reach out", "Hear back within a few days on WhatsApp or email."],
            ].map(([title, desc], i, arr) => (
              <div key={title} style={{ display: "flex", gap: 20, paddingBottom: i < arr.length - 1 ? 28 : 0, position: "relative" }}>
                {i < arr.length - 1 && (
                  <div style={{ position: "absolute", left: 15, top: 32, width: 1, bottom: 0, background: T.border }} />
                )}
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.surface, border: `1px solid ${T.border}`, color: T.maroon, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ paddingTop: 5 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

        {/* Benefits */}
        <div className="fade-up" style={{ animationDelay: "0.2s", marginBottom: 64 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.8px", color: T.textFaint, textTransform: "uppercase", marginBottom: 28 }}>Benefits</p>
          <div className="benefit-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
            {benefits.map((b, i) => (
              <div key={b.label} style={{
                background: T.surface,
                padding: "28px 28px",
                borderRight:  i % 2 === 0 ? `1px solid ${T.border}` : "none",
                borderBottom: i < 2       ? `1px solid ${T.border}` : "none",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>{b.label}</div>
                <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.borderFaint}`, padding: "22px 40px", textAlign: "center", marginTop: "auto" }}>
        <span style={{ fontSize: 12, color: T.textFaint }}>© 2025 CodeCelix · All rights reserved</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DONE SCREEN
═══════════════════════════════════════════════════════════════════════════════ */
function DoneScreen({ name }) {
  const first = name ? name.split(" ")[0] : "";
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <style>{GLOBAL_CSS}</style>
      <nav style={{ padding: "22px 40px", display: "flex", alignItems: "center", borderBottom: `1px solid ${T.borderFaint}` }}>
        <Logo size={15} />
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div className="fade-up" style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>

          {/* Check mark */}
          <div style={{ animation: "checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both", width: 64, height: 64, borderRadius: "50%", background: T.maroonFaint, border: `1px solid ${T.maroonDim}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke={T.maroon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 className="fade-up" style={{ animationDelay: "0.15s", fontSize: 38, fontWeight: 900, letterSpacing: "-2px", color: T.white, marginBottom: 16 }}>
            You're all done{first ? `, ${first}` : ""}.
          </h1>
          <p className="fade-up" style={{ animationDelay: "0.2s", fontSize: 16, color: T.textMid, lineHeight: 1.7, marginBottom: 48 }}>
            Your application has been submitted.<br />
            A real person reviews every application — you'll hear back within a few days.
          </p>

          {/* Next steps */}
          <div className="fade-up" style={{ animationDelay: "0.25s", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 32px", textAlign: "left" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.8px", color: T.textFaint, textTransform: "uppercase", marginBottom: 24 }}>What happens next</p>
            {[
              ["Your answers are reviewed by our team", "We look at every response — not just the score."],
              ["We generate a technical report",        "Your transcript is evaluated by our AI and a human."],
              ["If it's a match, we'll message you",    "Expect a WhatsApp or email within a few days."],
            ].map(([title, sub], i, arr) => (
              <div key={title} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: i < arr.length - 1 ? 20 : 0 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.maroon, marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 13, color: T.textMid }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CHAT COMPONENTS
═══════════════════════════════════════════════════════════════════════════════ */

function ThinkingDots() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 20, animation: "slideUp 0.25s ease both" }}>
      <BotMark />
      <div style={{ display: "flex", gap: 5, padding: "13px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "4px 16px 16px 16px" }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ display: "block", width: 5, height: 5, borderRadius: "50%", background: T.textFaint, animation: `dotBounce 1.4s ease-in-out ${i * 0.18}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

function BotMark() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.maroon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="white" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function Bubble({ msg }) {
  const isBot = msg.role === "bot";
  return (
    <div style={{ display: "flex", flexDirection: isBot ? "row" : "row-reverse", alignItems: "flex-end", gap: 10, marginBottom: 14, animation: "slideUp 0.22s cubic-bezier(0.22,1,0.36,1) both" }}>
      {isBot && <BotMark />}
      <div style={{
        maxWidth: "76%",
        background:    isBot ? T.surface : T.maroon,
        color:         isBot ? T.text    : T.white,
        border:        `1px solid ${isBot ? T.border : "transparent"}`,
        borderRadius:  isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        padding:       "12px 16px",
        fontSize:      15,
        lineHeight:    1.65,
        fontWeight:    400,
        whiteSpace:    "pre-wrap",
        wordBreak:     "break-word",
        letterSpacing: "-0.1px",
      }}>
        {msg.text}
      </div>
    </div>
  );
}

function RolePicker({ onSelect }) {
  const roles = [
    { id: "AI Engineering",  label: "AI Engineering",  sub: "LLMs, RAG, agents, voice AI, automation" },
    { id: "Web Development", label: "Web Development", sub: "Frontend, backend, full-stack APIs" },
    { id: "UI/UX Design",    label: "UI/UX Design",    sub: "Product design, Figma, user research" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 38, marginBottom: 16 }}>
      {roles.map((r, i) => (
        <button key={r.id} className="role-card" onClick={() => onSelect(r.id)} style={{ animationDelay: `${i * 0.06}s` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: T.textMid }}>{r.sub}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6" stroke={T.text} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}

function CVUploadButton({ onUpload, loading }) {
  const ref = useRef();
  return (
    <div style={{ marginLeft: 38, marginBottom: 16, animation: "slideUp 0.22s ease both" }}>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
      <button className="cv-btn" onClick={() => !loading && ref.current.click()} disabled={loading}>
        {loading
          ? <><Spinner /> Reading your CV…</>
          : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> Upload CV — PDF or Word</>
        }
      </button>
      <p style={{ fontSize: 12, color: T.textFaint, marginTop: 8, marginLeft: 2 }}>Your CV won't be shared without your permission.</p>
    </div>
  );
}

function Spinner() {
  return <span style={{ display: "inline-block", width: 13, height: 13, border: `2px solid ${T.textFaint}`, borderTopColor: T.maroon, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CHAT SCREEN
═══════════════════════════════════════════════════════════════════════════════ */
function ChatScreen({ onDone, setDoneName }) {
  const [messages,   setMessages]   = useState([]);
  const [inputVal,   setInputVal]   = useState("");
  const [isTyping,   setIsTyping]   = useState(false);
  const [stage,      setStage]      = useState("name");
  const [uiBlock,    setUiBlock]    = useState(null);
  const [inputOff,   setInputOff]   = useState(false);
  const [cvLoading,  setCvLoading]  = useState(false);
  const [fieldError, setFieldError] = useState("");

  const bottomRef = useRef();
  const inputRef  = useRef();

  const d = useRef({
    name:"", whatsapp:"", email:"", city:"", role:"",
    projectAnswer:"", projectQuestions:[], projectAnswers:[],
    cvText:"", cvQuestions:[], cvAnswers:[],
    refQuestions:[], refAnswers:[],
    github:"", githubQuestion:"", githubAnswer:"",
    transcript:[],
  });
  const qIndex = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping, uiBlock]);

  useEffect(() => {
    const t = setTimeout(() => {
      bot("Hey! I'm the CodeCelix AI screener.\n\nThis takes about 7 minutes. Let's start — what's your full name?");
    }, 600);
    return () => clearTimeout(t);
  }, []);

  function bot(text) {
    setIsTyping(false);
    setMessages(p => [...p, { role: "bot", text }]);
    d.current.transcript.push({ role: "bot", text });
  }
  function user(text) {
    setMessages(p => [...p, { role: "user", text }]);
    d.current.transcript.push({ role: "user", text });
  }
  async function pause(ms = 1000) {
    setIsTyping(true); setInputOff(true);
    await new Promise(r => setTimeout(r, ms));
    setIsTyping(false);
  }
  async function apiCall(endpoint, body) {
    try { return await callAPI(endpoint, body); } catch { return null; }
  }

  async function handle(raw) {
    const val = raw.trim();
    if (!val) return;
    setFieldError("");

    switch (stage) {
      case "name": {
        if (val.split(" ").filter(Boolean).length < 1 || val.length < 2) {
          setFieldError("Please enter your full name.");
          return;
        }
        user(val); setInputVal(""); setInputOff(true);
        d.current.name = val;
        await pause(900);
        bot(`Nice to meet you, ${val.split(" ")[0]}!\n\nWhat's your WhatsApp number? (11 digits)`);
        setStage("whatsapp"); setInputOff(false);
        break;
      }
      case "whatsapp": {
        if (!validatePhone(val)) {
          setFieldError("Phone number must be exactly 11 digits.");
          return;
        }
        user(val); setInputVal(""); setInputOff(true);
        d.current.whatsapp = val;
        await pause(850);
        bot("Got it. And your email address?");
        setStage("email"); setInputOff(false);
        break;
      }
      case "email": {
        if (!validateEmail(val)) {
          setFieldError("Please enter a valid email — e.g. you@example.com");
          return;
        }
        user(val); setInputVal(""); setInputOff(true);
        d.current.email = val;
        await pause(850);
        bot("Perfect. Which city are you based in?");
        setStage("city"); setInputOff(false);
        break;
      }
      case "city": {
        user(val); setInputVal(""); setInputOff(true);
        d.current.city = val;
        await pause(1000);
        bot(`Just to confirm — you're ${d.current.name}, based in ${d.current.city}. We'll reach you at ${d.current.whatsapp} or ${d.current.email}.\n\nWhich role are you applying for?`);
        setUiBlock("roles"); setStage("role");
        break;
      }
      case "project": {
        user(val); setInputVal(""); setInputOff(true);
        if (val.length < 50) {
          await pause(700);
          bot("Can you go a bit deeper? Tell me more — the stack, the challenges, how it actually works.");
          setStage("project"); setInputOff(false);
          break;
        }
        d.current.projectAnswer = val;
        setIsTyping(true);
        const res = await apiCall("/generate-project-questions", { role: d.current.role, project_answer: val });
        const qs = res?.questions || [
          "What was the hardest technical decision you made in that project, and what alternatives did you consider?",
          "If you rebuilt it from scratch today, what would you do completely differently?",
        ];
        d.current.projectQuestions = qs; qIndex.current = 0;
        setIsTyping(false);
        setTimeout(() => bot(qs[0]), 300);
        setStage("project_q"); setInputOff(false);
        break;
      }
      case "project_q": {
        user(val); setInputVal(""); setInputOff(true);
        d.current.projectAnswers.push(val); qIndex.current++;
        if (qIndex.current < d.current.projectQuestions.length) {
          await pause(900);
          bot(d.current.projectQuestions[qIndex.current]);
          setStage("project_q"); setInputOff(false);
        } else {
          await pause(1000);
          bot("Got it — solid background.\n\nNow please upload your CV so I can ask you a couple of questions from your actual experience.");
          setUiBlock("cv"); setStage("cv_upload");
        }
        break;
      }
      case "cv_q": {
        user(val); setInputVal(""); setInputOff(true);
        d.current.cvAnswers.push(val); qIndex.current++;
        if (qIndex.current < d.current.cvQuestions.length) {
          await pause(900);
          bot(d.current.cvQuestions[qIndex.current]);
          setStage("cv_q"); setInputOff(false);
        } else {
          setIsTyping(true);
          const res = await apiCall("/generate-ref-questions", { role: d.current.role, project_answer: d.current.projectAnswer, cv_text: d.current.cvText });
          const qs = res?.questions || [
            "How do you decide what to build yourself vs use an existing tool or API?",
            "Walk me through how you'd scope and kick off a new client project.",
          ];
          d.current.refQuestions = qs; qIndex.current = 0;
          setIsTyping(false);
          setTimeout(() => bot(qs[0]), 300);
          setStage("ref_q"); setInputOff(false);
        }
        break;
      }
      case "ref_q": {
        user(val); setInputVal(""); setInputOff(true);
        d.current.refAnswers.push(val); qIndex.current++;
        if (qIndex.current < d.current.refQuestions.length) {
          await pause(900);
          bot(d.current.refQuestions[qIndex.current]);
          setStage("ref_q"); setInputOff(false);
        } else {
          await pause(1000);
          bot("Almost there.\n\nShare your GitHub profile or portfolio link.");
          setStage("github"); setInputOff(false);
        }
        break;
      }
      case "github": {
        if (!validateGithub(val)) {
          setFieldError("Please enter a valid URL — e.g. https://github.com/username");
          return;
        }
        user(val); setInputVal(""); setInputOff(true);
        d.current.github = val;
        setIsTyping(true);
        const res = await apiCall("/generate-github-question", { role: d.current.role, github_url: val, name: d.current.name });
        const q = res?.question || "Which project on your GitHub best shows your problem-solving ability, and why should we look at it first?";
        d.current.githubQuestion = q;
        setIsTyping(false);
        setTimeout(() => bot(q), 300);
        setStage("github_q"); setInputOff(false);
        break;
      }
      case "github_q": {
        user(val); setInputVal(""); setInputOff(true);
        d.current.githubAnswer = val;
        await pause(700);
        bot("Submitting your application now…");
        setInputOff(true);
        await submitAll();
        break;
      }
      default: break;
    }
    inputRef.current?.focus();
  }

  async function handleRoleSelect(role) {
    d.current.role = role;
    setUiBlock(null);
    user(role);
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsTyping(false);
    bot(`${role} — great.\n\nTell me about your most technically complex project. What did you build, what was the stack, and what was the hardest part?`);
    setStage("project"); setInputOff(false);
    inputRef.current?.focus();
  }

  async function handleCVUpload(file) {
    setCvLoading(true);
    let cvText = "", cvQuestions = [];
    try {
      const res = await uploadCV(file);
      cvText = res.cv_text || ""; cvQuestions = res.questions || [];
    } catch {
      cvQuestions = [
        "Walk me through your most recent role and what you built.",
        "Which experience on your CV pushed your skills the most?",
      ];
    }
    d.current.cvText = cvText; d.current.cvQuestions = cvQuestions;
    setCvLoading(false); setUiBlock(null);
    user("CV uploaded");
    qIndex.current = 0;
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsTyping(false);
    bot(`Read through it.\n\n${cvQuestions[0]}`);
    setStage("cv_q"); setInputOff(false);
    inputRef.current?.focus();
  }

  async function submitAll() {
    try {
      await callAPI("/submit", {
        personal: { name: d.current.name, whatsapp: d.current.whatsapp, email: d.current.email, city: d.current.city },
        role: d.current.role,
        project_qa: { answer: d.current.projectAnswer, followups: d.current.projectQuestions.map((q, i) => ({ question: q, answer: d.current.projectAnswers[i] || "" })) },
        cv_text: d.current.cvText,
        cv_qa:  d.current.cvQuestions.map((q, i) => ({ question: q, answer: d.current.cvAnswers[i] || "" })),
        ref_qa: d.current.refQuestions.map((q, i) => ({ question: q, answer: d.current.refAnswers[i] || "" })),
        github: d.current.github,
        github_qa: { question: d.current.githubQuestion, answer: d.current.githubAnswer },
        transcript: d.current.transcript,
      });
    } catch (e) { console.error(e); }
    setDoneName(d.current.name);
    onDone();
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!inputOff && inputVal.trim()) handle(inputVal);
    }
  }

  const inputBlocked = inputOff || ["role", "cv_upload"].includes(stage);

  const placeholders = {
    name:      "Your full name",
    whatsapp:  "+92 300 1234567",
    email:     "you@example.com",
    city:      "e.g. Lahore",
    github:    "https://github.com/yourusername",
  };
  const ph = placeholders[stage] || "Type your answer…";

  /* ─── Progress ───────────────────────────────────────────────────────────── */
  const STAGES = [
    { id: "name",      label: "Your name" },
    { id: "whatsapp",  label: "WhatsApp number" },
    { id: "email",     label: "Email address" },
    { id: "city",      label: "Your city" },
    { id: "role",      label: "Role selection" },
    { id: "project",   label: "Project overview" },
    { id: "project_q", label: "Project deep-dive" },
    { id: "cv_upload", label: "CV upload" },
    { id: "cv_q",      label: "CV questions" },
    { id: "ref_q",     label: "General questions" },
    { id: "github",    label: "GitHub / Portfolio" },
    { id: "github_q",  label: "Final question" },
  ];
  const stageIndex = STAGES.findIndex(s => s.id === stage);
  const progress   = Math.round(((stageIndex + 1) / STAGES.length) * 100);
  const stageLabel = STAGES[stageIndex]?.label ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Top progress bar — full width, no border-radius, sits above header ── */}
      <div style={{ position: "relative", height: 3, background: T.border, flexShrink: 0 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${progress}%`,
          background: T.maroon,
          transition: "width 0.45s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.borderFaint}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <Logo size={14} />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2.5s ease infinite" }} />
            <span style={{ fontSize: 12, color: T.textMid, fontWeight: 500 }}>AI Screener</span>
          </div>
          {/* Step label + % */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: T.textFaint, fontWeight: 500 }}>
              Step {stageIndex + 1}/{STAGES.length}
            </span>
            <span style={{ width: 1, height: 10, background: T.border, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: T.textMid, fontWeight: 500 }}>{stageLabel}</span>
            <span style={{ width: 1, height: 10, background: T.border, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: T.maroon, fontWeight: 700 }}>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 20px 16px", maxWidth: 680, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column" }}>
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        {isTyping && <ThinkingDots />}
        {!isTyping && uiBlock === "roles" && <RolePicker onSelect={handleRoleSelect} />}
        {!isTyping && uiBlock === "cv"    && <CVUploadButton onUpload={handleCVUpload} loading={cvLoading} />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ borderTop: `1px solid ${T.borderFaint}`, padding: "12px 20px 16px", background: T.bg, flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>

          {fieldError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "9px 14px", background: "rgba(155,29,58,0.08)", border: `1px solid ${T.maroonDim}`, borderRadius: 8, animation: "slideUp 0.2s ease both" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" stroke={T.maroon} strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke={T.maroon} strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 13, color: T.maroon, fontWeight: 500 }}>{fieldError}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              className="chat-input"
              value={inputVal}
              onChange={e => { setInputVal(e.target.value); setFieldError(""); }}
              onKeyDown={onKey}
              disabled={inputBlocked}
              placeholder={inputBlocked ? "" : ph}
              rows={1}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px"; }}
            />
            <button
              className="send-btn"
              onClick={() => handle(inputVal)}
              disabled={inputBlocked || !inputVal.trim()}
              style={{ background: inputVal.trim() && !inputBlocked ? T.maroon : T.border }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: T.textFaint, textAlign: "center" }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen,   setScreen]   = useState("intro");
  const [doneName, setDoneName] = useState("");

  if (screen === "intro") return <IntroScreen onStart={() => setScreen("chat")} />;
  if (screen === "done")  return <DoneScreen name={doneName} />;
  return <ChatScreen onDone={() => setScreen("done")} setDoneName={setDoneName} />;
}