// src/pages/Register.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const EyeOpen = () => (
  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = () => (
  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CheckIcon = ({ ok }) => (
  <span style={{ color: ok ? "#4ade80" : "rgba(255,255,255,0.2)", fontSize: 13 }}>{ok ? "✓" : "○"}</span>
);

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes cardEntrance {
  from { opacity: 0; transform: scale(0.96) translateY(24px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.login-card { animation: cardEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.li   { animation: fadeUp 0.45s ease both; }
.li-1 { animation-delay: 0.10s; }
.li-2 { animation-delay: 0.17s; }
.li-3 { animation-delay: 0.23s; }
.li-4 { animation-delay: 0.29s; }
.li-5 { animation-delay: 0.35s; }
.li-6 { animation-delay: 0.41s; }
.li-7 { animation-delay: 0.47s; }
.li-8 { animation-delay: 0.53s; }

.login-input:focus {
  box-shadow: 0 0 0 3px rgba(232,25,44,0.3) !important;
  outline: none;
}
.role-btn {
  flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.6); padding: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s;
  font-family: inherit;
}
.role-btn.active {
  background: rgba(232,25,44,0.15); border-color: #E8192C; color: #fff;
}
.role-btn:first-child { border-radius: 8px 0 0 8px; }
.role-btn:last-child { border-radius: 0 8px 8px 0; }

.login-submit:hover  { background: #c0111f !important; }
.login-submit:active { transform: scale(0.985); }

@media (max-width: 600px) {
  .login-card { max-width: 92% !important; padding: 2.5rem 1.5rem !important; }
}
`;

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("user");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const strength = getStrength(password);
  const strengthColors = ["", "#E8192C", "#EF9F27", "#EF9F27", "#4ade80", "#4ade80"];
  const strengthLabels = ["", "Weak", "Fair", "Fair", "Good", "Strong"];

  const rules = {
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    length: password.length >= 8,
  };

  // Ensure fields are empty on mount
  useState(() => {
    setName(""); setEmail(""); setPassword(""); setConfirm("");
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (password !== confirm) return setError("Passwords do not match.");
    if (strength < 3) return setError("Password is too weak.");
    if (role === "admin") return navigate("/admin-login");
    setLoading(true);
    try {
      await register(name, email, password, role);
      setSuccess("Account created! Check your email to verify.");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(auth.*\)/, "").trim());
    }
    setLoading(false);
  }

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "url('/luxury-house-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
          padding: "2.5rem 1rem",
        }}
      >
        <div
          className="login-card"
          style={{
            width: "100%",
            maxWidth: 460,
            background: "rgba(10, 10, 10, 0.45)",
            backdropFilter: "blur(48px)",
            WebkitBackdropFilter: "blur(48px)",
            borderRadius: 24,
            padding: "3.5rem 2.5rem",
            boxShadow: "0 40px 100px rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ width: "100%" }}>
            <h1 className="li li-1" style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 48,
              fontWeight: 400,
              color: "#ffffff",
              letterSpacing: "0.01em",
              marginBottom: 24,
              textAlign: "center",
              textShadow: "0 2px 25px rgba(0,0,0,0.7)",
            }}>
              Register
            </h1>

            {error && <div className="li li-1msg-error" style={{ background:"rgba(232,25,44,0.15)", border:"1px solid rgba(232,25,44,0.4)", color:"#ff8c9c", borderRadius:8, padding:"10px", fontSize:13, marginBottom:16, textAlign:"center" }}>{error}</div>}
            {success && <div className="li li-1msg-success" style={{ background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.4)", color:"#4ade80", borderRadius:8, padding:"10px", fontSize:13, marginBottom:16, textAlign:"center" }}>{success}</div>}

            {/* Role selector */}
            <div className="li li-1" style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>I am a</label>
              <div style={{ display: "flex" }}>
                <button type="button" className={`role-btn ${role === "user" ? "active" : ""}`} onClick={() => setRole("user")}>User / Buyer</button>
                <button type="button" className={`role-btn ${role === "admin" ? "active" : ""}`} onClick={() => setRole("admin")}>Admin</button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="li li-2" style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>Full Name</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input className="login-input" type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required style={{ width: "100%", background: "#ffffff", border: "none", borderRadius: 8, padding: "12px 14px 12px 44px", fontSize: 14, color: "#111", fontFamily: "inherit" }} />
                </div>
              </div>

              <div className="li li-2" style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>Email</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input className="login-input" type="email" placeholder="Enter your Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", background: "#ffffff", border: "none", borderRadius: 8, padding: "12px 14px 12px 44px", fontSize: 14, color: "#111", fontFamily: "inherit" }} />
                </div>
              </div>

              <div className="li li-3" style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </span>
                  <input className="login-input" type={showPw ? "text" : "password"} placeholder="Create password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", background: "#ffffff", border: "none", borderRadius: 8, padding: "12px 44px 12px 44px", fontSize: 14, color: "#111", fontFamily: "inherit" }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}><EyeOff /></button>
                </div>
              </div>

              {password && (
                <div className="li li-3" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength ? strengthColors[strength] : "rgba(255,255,255,0.15)" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: strengthColors[strength], marginBottom: 8 }}>{strengthLabels[strength]}</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[["upper", "Uppercase"], ["lower", "Lowercase"], ["number", "Number"], ["special", "Special char"], ["length", "8+ chars"]].map(([k, l]) => (
                      <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        <CheckIcon ok={rules[k]} /> {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="li li-4" style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </span>
                  <input className="login-input" type={showConfirm ? "text" : "password"} placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ width: "100%", background: "#ffffff", borderRadius: 8, padding: "12px 44px 12px 44px", fontSize: 14, color: "#111", fontFamily: "inherit", border: confirm && confirm !== password ? "2px solid #E8192C" : "none" }} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}><EyeOff /></button>
                </div>
              </div>

              <button type="submit" className="login-submit li li-5" disabled={loading} style={{ width: "100%", background: "#E8192C", border: "none", borderRadius: 8, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.04em", transition: "all 0.2s" }}>
                {loading ? "Creating account..." : <>Register <span style={{ fontSize: 18 }}>→</span></>}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 20 }} className="li li-6">
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Already have an account? </span>
              <Link to="/login" style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", textDecoration: "underline" }}>Login here</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
