// src/pages/AdminLogin.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

.login-input:focus {
  box-shadow: 0 0 0 3px rgba(232,25,44,0.3) !important;
  outline: none;
}
.login-submit { 
  width: 100%; background: #E8192C; border: none; border-radius: 8px; padding: 14px; 
  color: #fff; fontSize: 15px; fontWeight: 500; cursor: pointer; display: flex; 
  align-items: center; justify-content: center; gap: 8px; letterSpacing: "0.04em"; transition: all 0.2s;
}
.login-submit:hover  { background: #c0111f !important; }
.login-submit:active { transform: scale(0.985); }

@media (max-width: 500px) {
  .login-card { max-width: 92% !important; padding: 2.5rem 1.5rem !important; }
}
`;

const formatAuthError = (err) => {
  if (!err) return "An unexpected error occurred.";
  const code = err.code || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/invalid-email":
      return "The email address is invalid.";
    case "auth/operation-not-allowed":
      return "Email/password accounts are not enabled.";
    case "auth/weak-password":
      return "The password is too weak.";
    case "auth/user-disabled":
      return "This user account has been disabled.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many requests. Please try again later.";
    default:
      if (err.message) {
        return err.message
          .replace("Firebase: ", "")
          .replace(/\(auth\/[^)]+\)\.?/, "")
          .replace(/\(auth.*\)/, "")
          .trim();
      }
      return "An unexpected error occurred.";
  }
};

export default function AdminLogin() {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Ensure fields are empty on mount
  useState(() => {
    setEmail("");
    setPassword("");
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { role } = await login(email, password);
      if (role !== "admin") {
        setError("Access denied. Admin accounts only.");
        setLoading(false); return;
      }
      navigate("/admin-dashboard");
    } catch (err) {
      setError(formatAuthError(err));
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
          padding: "2rem",
        }}
      >
        <div
          className="login-card"
          style={{
            width: "100%",
            maxWidth: 420,
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
            <div className="li li-1" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 42,
                fontWeight: 400,
                color: "#ffffff",
                letterSpacing: "0.01em",
                textShadow: "0 2px 25px rgba(0,0,0,0.7)",
              }}>
                Admin Login
              </h1>
              <span style={{ background: "#E8192C", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em", transform: "translateY(-4px)" }}>Admin</span>
            </div>

            {error && <div className="li li-1" style={{ background: "rgba(232,25,44,0.15)", border: "1px solid rgba(232,25,44,0.4)", color: "#ff8c9c", borderRadius: 8, padding: "10px", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</div>}

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="li li-2" style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>Admin Email</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input className="login-input" type="email" placeholder="Admin email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" style={{ width: "100%", background: "#ffffff", border: "none", borderRadius: 8, padding: "12px 14px 12px 44px", fontSize: 14, color: "#111", fontFamily: "inherit" }} />
                </div>
              </div>

              <div className="li li-3" style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </span>
                  <input className="login-input" type="password" placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" style={{ width: "100%", background: "#ffffff", border: "none", borderRadius: 8, padding: "12px 14px 12px 44px", fontSize: 14, color: "#111", fontFamily: "inherit" }} />
                </div>
              </div>

              <button type="submit" className="login-submit li li-4" disabled={loading}>
                {loading ? "Verifying..." : <>Access Dashboard <span style={{ fontSize: 18 }}>→</span></>}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 22 }} className="li li-5">
              <Link to="/login" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.8)"}
                onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}
              >← Back to User Login</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
