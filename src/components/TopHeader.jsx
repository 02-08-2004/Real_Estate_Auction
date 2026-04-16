import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function TopHeader({ onToggleSidebar }) {
  const { userData, currentUser } = useAuth();

  return (
    <header className="app-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}>
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={(e) => { e.stopPropagation(); onToggleSidebar(); }}>
          <Bars3Icon className="w-6 h-6" />
        </button>
        <div className="topbar-logo" style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 0.5, fontWeight: 400 }}>
          Estate<span style={{ color: "var(--primary)", fontWeight: 700, fontStyle: "italic", marginLeft: 2 }}>Auction</span>
        </div>
      </div>
      
      <div className="header-right">
        <div className="user-profile-summary" style={{ background: "rgba(255,255,255,0.03)", padding: "4px 4px 4px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="user-info" style={{ marginRight: 12 }}>
            <span className="user-name" style={{ fontSize: 13, fontWeight: 600 }}>{userData?.name || "Premium Member"}</span>
            {userData?.role === 'admin' && <span className="user-role" style={{ fontSize: 9, color: "var(--primary)", letterSpacing: 1 }}>ADMIN</span>}
          </div>
          <div className="user-avatar-small" style={{ width: 32, height: 32, background: "var(--primary-gradient)", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            {userData?.name?.[0] || currentUser?.email?.[0] || "?"}
          </div>
        </div>
        <div className="header-actions" style={{ marginLeft: 16 }}>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
