import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useBuyerStatus } from "../hooks/useBuyerStatus";
import { BellIcon } from "@heroicons/react/24/outline";

export default function NotificationBell() {
  const { currentUser, userData } = useAuth();
  const { notifications = [] } = useBuyerStatus(currentUser, userData);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: unreadCount > 0 ? "#fff" : "var(--text-muted)",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative"
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
      >
        <BellIcon style={{ width: 20, height: 20 }} />
        {unreadCount > 0 && (
          <span style={{ 
            position: "absolute", 
            top: "8px", 
            right: "8px", 
            width: "8px", 
            height: "8px", 
            background: "var(--primary)", 
            borderRadius: "50%", 
            border: "2px solid #000" 
          }} />
        )}
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 12px)",
          right: 0,
          width: "320px",
          background: "rgba(15, 15, 15, 0.95)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          zIndex: 1000,
          overflow: "hidden",
          animation: "fadeUp 0.3s ease-out"
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "1.2px" }}>NOTIFICATIONS</span>
            {unreadCount > 0 && <span style={{ fontSize: "10px", color: "var(--primary)", fontWeight: 700 }}>{unreadCount} NEW</span>}
          </div>
          
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 5).map((n, i) => (
                <div key={n.id} style={{ 
                  padding: "16px 20px", 
                  borderBottom: i === notifications.length - 1 ? "none" : "1px solid rgba(255,255,255,0.03)",
                  background: n.read ? "transparent" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(255,255,255,0.02)"}
                >
                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: n.read ? "transparent" : "var(--primary)", marginTop: "6px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "13px", color: "#fff", lineHeight: 1.4, marginBottom: "4px" }}>{n.message}</div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{n.createdAt?.toDate?.()?.toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <button style={{ 
              width: "100%", 
              background: "rgba(255,255,255,0.02)", 
              border: "none", 
              borderTop: "1px solid rgba(255,255,255,0.05)", 
              padding: "12px", 
              color: "rgba(255,255,255,0.4)", 
              fontSize: "11px", 
              fontWeight: 700, 
              cursor: "pointer" 
            }}>
              VIEW ALL ACTIVITY
            </button>
          )}
        </div>
      )}
    </div>
  );
}
