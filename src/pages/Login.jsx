// src/pages/Login.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

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
.login-submit:hover  { background: #c0111f !important; }
.login-submit:active { transform: scale(0.985); }
.google-circle:hover {
  background: rgba(255,255,255,0.18) !important;
  border-color: rgba(255,255,255,0.5) !important;
}

@media (max-width: 540px) {
  .login-card { 
    max-width: 92% !important; 
    padding: 2rem 1.5rem !important; 
  }
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

export default function Login() {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  // Ensure fields are empty on mount
  useState(() => {
    setEmail("");
    setPassword("");
  });

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");
    setError(""); setLoading(true);
    try {
      const { role } = await login(email, password);
      navigate(role === "admin" ? "/admin-dashboard" : "/user-dashboard");
    } catch (err) {
      setError(formatAuthError(err));
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError(""); setLoading(true);
    try {
      const { role } = await googleLogin();
      navigate(role === "admin" ? "/admin-dashboard" : "/user-dashboard");
    } catch (err) {
      setError(formatAuthError(err));
    }
    setLoading(false);
  }

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/*
        ─────────────────────────────────────────────────────
        PAGE BACKGROUND — high-res textured house.
        ─────────────────────────────────────────────────────
      */}
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

        {/*
          ─────────────────────────────────────────────────────
          CENTERED GLASS CARD — 'This shade' heavy blur requested.
          ─────────────────────────────────────────────────────
        */}
        <div
          className="login-card"
          style={{
            width: "100%",
            maxWidth: 420,
            /* 'This shade' — heavy dark blur as per reference */
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

            {/* ── HEADING ── */}
            <h1 className="li li-1" style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 56,
              fontWeight: 400,
              color: "#ffffff",
              letterSpacing: "0.01em",
              marginBottom: 28,
              textAlign: "center",
              textShadow: "0 2px 25px rgba(0,0,0,0.7)",
            }}>
              Login
            </h1>

            {/* ── ERROR ── */}
            {error && (
              <div className="li li-1" style={{
                background: "rgba(232,25,44,0.15)",
                border: "1px solid rgba(232,25,44,0.4)",
                color: "#ff8c9c", borderRadius: 8,
                padding: "10px 14px", fontSize: 13,
                marginBottom: 16, textAlign: "center",
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              {/* ── EMAIL ── */}
              <div className="li li-2" style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block", fontSize: 13,
                  color: "rgba(255,255,255,0.75)",
                  marginBottom: 6, letterSpacing: "0.02em",
                }}>
                  Email
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 14, top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none", display: "flex", alignItems: "center",
                  }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    className="login-input"
                    type="email"
                    placeholder="Enter your Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="off"
                    style={{
                      width: "100%", background: "#ffffff",
                      border: "none", borderRadius: 8,
                      padding: "12px 14px 12px 44px",
                      fontSize: 14, color: "#111", fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>

              {/* ── PASSWORD ── */}
              <div className="li li-3" style={{ marginBottom: 6 }}>
                <label style={{
                  display: "block", fontSize: 13,
                  color: "rgba(255,255,255,0.75)",
                  marginBottom: 6, letterSpacing: "0.02em",
                }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 14, top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none", display: "flex", alignItems: "center",
                  }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </span>
                  <input
                    className="login-input"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    style={{
                      width: "100%", background: "#ffffff",
                      border: "none", borderRadius: 8,
                      padding: "12px 44px 12px 44px",
                      fontSize: 14, color: "#111", fontFamily: "inherit",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: "absolute", right: 14, top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none",
                      cursor: "pointer", color: "#9ca3af",
                      display: "flex", alignItems: "center", padding: 0,
                    }}
                  >
                    {showPw ? <EyeOpen /> : <EyeOff />}
                  </button>
                </div>
              </div>

              {/* ── FORGOT PASSWORD ── */}
              <div className="li li-4" style={{
                display: "flex", justifyContent: "flex-end", marginBottom: 18,
              }}>
                <Link to="/forgot-password" style={{
                  fontSize: 12, color: "rgba(255,255,255,0.48)",
                  textDecoration: "none", fontStyle: "italic",
                }}>
                  Forgot password?
                </Link>
              </div>

              {/* ── OR DIVIDER ── */}
              <div className="li li-4" style={{
                display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
              }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.18)" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", whiteSpace: "nowrap" }}>
                  or continue with
                </span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.18)" }} />
              </div>

              {/* ── GOOGLE BUTTON ── */}
              <div className="li li-5" style={{
                display: "flex", justifyContent: "center", marginBottom: 20,
              }}>
                <button
                  type="button"
                  className="google-circle"
                  onClick={handleGoogle}
                  disabled={loading}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1.5px solid rgba(255,255,255,0.28)",
                    borderRadius: "50%",
                    width: 52, height: 52,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                >
                  <GoogleIcon />
                </button>
              </div>

              {/* ── REGISTER HINT ── */}
              <div className="li li-6" style={{ textAlign: "center", marginBottom: 22 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  Don't have an account?{" "}
                </span>
                <Link to="/register" style={{
                  fontSize: 13, color: "rgba(255,255,255,0.88)",
                  textDecoration: "underline",
                }}>
                  Register here
                </Link>
              </div>

              {/* ── LOGIN BUTTON ── */}
              <button
                type="submit"
                className="login-submit li li-7"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "#E8192C",
                  border: "none", borderRadius: 8,
                  padding: "14px",
                  color: "#fff", fontSize: 15,
                  fontFamily: "inherit", fontWeight: 500,
                  cursor: "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                  letterSpacing: "0.04em",
                  transition: "background 0.18s, transform 0.1s",
                  marginBottom: 18,
                }}
              >
                {loading
                  ? "Signing in…"
                  : <>Login <span style={{ fontSize: 18, lineHeight: 1 }}>→</span></>
                }
              </button>
            </form>

            {/* ── ADMIN PORTAL ── */}
            <div className="li li-8" style={{ textAlign: "center" }}>
              <Link
                to="/admin-login"
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                  textDecoration: "none",
                  letterSpacing: "0.06em",
                }}
                onMouseEnter={e => e.target.style.color = "#E8192C"}
                onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.35)"}
              >
                Admin portal →
              </Link>
            </div>

          </div>
        </div>
        {/* end login card */}

      </div>
    </>
  );
}