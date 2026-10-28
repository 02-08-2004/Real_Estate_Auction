// src/pages/ForgotPassword.jsx

import { useState, useEffect } from "react";
import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
} from "firebase/auth";
import { auth, checkEmailRegistered } from "../firebase/config";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

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

.login-input:focus {
  box-shadow: 0 0 0 3px rgba(232,25,44,0.3) !important;
  outline: none;
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
      return "No account found with this email. Please register first.";
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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg]     = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Ensure field is empty on mount
  useState(() => {
    setEmail("");
  });

  // Handle email verification link if routed here with ?mode=verifyEmail&oobCode=...
  useEffect(() => {
    if (!oobCode) return;
    if (mode === "verifyEmail") {
      setLoading(true);
      applyActionCode(auth, oobCode)
        .then(() => {
          setMsg("Email verified successfully! Redirecting to login...");
          setTimeout(() => navigate("/login"), 2000);
        })
        .catch((err) => setError(formatAuthError(err)))
        .finally(() => setLoading(false));
    } else if (mode === "resetPassword" || oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then((verifiedEmail) => setEmail(verifiedEmail))
        .catch(() => setError("This password reset link is invalid or has expired."));
    }
  }, [mode, oobCode, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return setError("Please enter your email address.");
    setMsg(""); setError(""); setNotFound(false); setLoading(true);
    try {
      const isRegistered = await checkEmailRegistered(trimmedEmail);
      if (!isRegistered) {
        setNotFound(true);
        setError("No account found with this email. Please register first.");
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, trimmedEmail, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
      setMsg("Password reset email sent! Check your inbox.");
    } catch (err) {
      if (err?.code === "auth/user-not-found") setNotFound(true);
      setError(formatAuthError(err));
    }
    setLoading(false);
  }

  async function handleConfirmReset(e) {
    e.preventDefault();
    setMsg(""); setError("");
    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMsg("Password updated successfully! Redirecting to login page...");
      setTimeout(() => navigate("/login"), 2000);
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
            <h1 className="li li-1" style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 44,
              fontWeight: 400,
              color: "#ffffff",
              letterSpacing: "0.01em",
              marginBottom: 12,
              textAlign: "center",
              textShadow: "0 2px 25px rgba(0,0,0,0.7)",
            }}>
              {oobCode && mode !== "verifyEmail" ? "Set New Password" : "Reset Password"}
            </h1>
            <p className="li li-1" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 28, textAlign: "center" }}>
              {oobCode && mode !== "verifyEmail"
                ? `Create a new password${email ? ` for ${email}` : ""}.`
                : "Enter your email to receive a reset link."}
            </p>

            {error && (
              <div className="li li-1" style={{ background: "rgba(232,25,44,0.15)", border: "1px solid rgba(232,25,44,0.4)", color: "#ff8c9c", borderRadius: 8, padding: "12px", fontSize: 13, marginBottom: 16, textAlign: "center", lineHeight: 1.5 }}>
                <div>{error}</div>
                {notFound && (
                  <div style={{ marginTop: 6 }}>
                    <Link to="/register" style={{ color: "#ffffff", fontWeight: 600, textDecoration: "underline" }}>
                      Go to Register →
                    </Link>
                  </div>
                )}
              </div>
            )}
            {msg && <div className="li li-1" style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", borderRadius: 8, padding: "10px", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{msg}</div>}

            {oobCode && mode !== "verifyEmail" ? (
              <form onSubmit={handleConfirmReset}>
                <div className="li li-2" style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>New Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    style={{ width: "100%", background: "#ffffff", border: "none", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#111", fontFamily: "inherit" }}
                  />
                </div>
                <div className="li li-2" style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>Confirm New Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    style={{ width: "100%", background: "#ffffff", border: "none", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#111", fontFamily: "inherit" }}
                  />
                </div>
                <button type="submit" className="li li-3" disabled={loading} style={{ width: "100%", background: "#E8192C", border: "none", borderRadius: 8, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.04em", transition: "all 0.2s" }}>
                  {loading ? "Updating..." : <>Update Password <span style={{ fontSize: 18 }}>→</span></>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="li li-2" style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>Email Address</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input className="login-input" type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", background: "#ffffff", border: "none", borderRadius: 8, padding: "12px 14px 12px 44px", fontSize: 14, color: "#111", fontFamily: "inherit" }} />
                  </div>
                </div>

                <button type="submit" className="li li-3" disabled={loading} style={{ width: "100%", background: "#E8192C", border: "none", borderRadius: 8, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.04em", transition: "all 0.2s" }}>
                  {loading ? "Sending..." : <>Send Reset Link <span style={{ fontSize: 18 }}>→</span></>}
                </button>
              </form>
            )}

            <div style={{ textAlign: "center", marginTop: 22 }} className="li li-4">
              <Link to="/login" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.8)"}
                onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}
              >← Back to Login</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
