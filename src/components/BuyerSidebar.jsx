import { useNavigate } from "react-router-dom";
import { propertyService } from "../services/propertyService";

export default function BuyerSidebar({ currentUser, userData, notifications, activeBiddedProperties, wonCount }) {
  const navigate = useNavigate();

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"2.5rem" }}>
      <div className="sidebar-panel" style={{ padding: "32px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"20px", marginBottom: "32px" }}>
          <div style={{ width:64, height:64, background:"var(--primary-gradient)", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:400, color:"#fff", fontFamily: "var(--font-display)", boxShadow: "0 8px 16px rgba(210,31,60,0.15)" }}>
             {userData?.name?.[0] || currentUser?.email?.[0] || "?"}
          </div>
          <div style={{ overflow: "hidden" }}>
            <h2 style={{ fontSize:20, fontWeight:400, margin:"0 0 4px", fontFamily: "var(--font-display)" }}>{userData?.name || "Premium User"}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }}></div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing: 1, fontWeight: 700 }}>VERIFIED BIDDER</div>
            </div>
          </div>
        </div>
        
        <div style={{ display:"flex", gap:16, borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:"24px" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", fontWeight:700, letterSpacing: 1 }}>Active</div>
            <div style={{ fontSize:24, fontWeight:400, color:"#fff", fontFamily: "var(--font-display)" }}>{activeBiddedProperties.length}</div>
          </div>
          <div style={{ flex:1, borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: 16 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", fontWeight:700, letterSpacing: 1 }}>Won</div>
            <div style={{ fontSize:24, fontWeight:400, color:"var(--primary)", fontFamily: "var(--font-display)" }}>{wonCount}</div>
          </div>
        </div>
      </div>

      <div className="sidebar-panel" style={{ background: "none", border: "none", padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "0 10px" }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, margin: 0, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>NOTIFICATIONS</h3>
          {notifications.length > 0 && (
            <span style={{ fontSize: 10, background: "rgba(210,31,60,0.1)", border: "1px solid rgba(210,31,60,0.2)", padding: "2px 8px", borderRadius: 40, color: "var(--primary)", fontWeight: 700 }}>{notifications.length} NEW</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notifications.length === 0 ? (
             <div style={{ fontSize:13, color:"rgba(255,255,255,0.2)", textAlign:"center", padding: "3rem 0", background: "rgba(255,255,255,0.01)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.05)" }}>Ready for latest updates.</div>
          ) : (
            notifications.slice(0, 5).map(n => {
              const getAlertConfig = (type) => {
                const t = type?.toLowerCase() || "";
                if (t.includes("approved")) return { icon: "✓", color: "#4ade80", title: "LISTING APPROVED" };
                if (t.includes("action") || t.includes("sign")) return { icon: "!", color: "#f59e0b", title: "ACTION REQUIRED" };
                if (t.includes("bid")) return { icon: "•", color: "var(--primary)", title: "BID UPDATE" };
                return { icon: "•", color: "rgba(255,255,255,0.4)", title: "NOTIFICATION" };
              };
              
              const config = getAlertConfig(n.type);
              const timeAgo = n.createdAt ? (() => {
                const seconds = Math.floor((new Date() - n.createdAt.toDate()) / 1000);
                if (seconds < 60) return "now";
                if (seconds < 3600) return `${Math.floor(seconds/60)}m`;
                if (seconds < 86400) return `${Math.floor(seconds/3600)}h`;
                return `${Math.floor(seconds/86400)}d`;
              })() : "";

              return (
                <div 
                  key={n.id} 
                  className="card-architectural"
                  style={{ 
                      cursor: n.propertyId ? "pointer" : "default",
                      background: n.read ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                      padding: "16px 20px",
                      borderRadius: 16,
                      border: n.read ? "1px solid transparent" : "1px solid rgba(255,255,255,0.05)",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                  onClick={async () => {
                      if (n.propertyId) {
                          try {
                              await propertyService.markNotificationRead(n.id);
                          } catch (e) { console.error("Error marking notif read:", e); }
                          navigate(`/agreement/${n.propertyId}`);
                      }
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                           <div style={{ width: 6, height: 6, borderRadius: "50%", background: config.color }}></div>
                           <span style={{ fontWeight: 800, fontSize: 10, letterSpacing: 1.2, color: "rgba(255,255,255,0.8)" }}>{config.title}</span>
                       </div>
                       <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>{timeAgo}</span>
                  </div>
                  <div style={{ color:"rgba(255,255,255,0.5)", lineHeight: 1.5, fontSize: 12 }}>{n.message}</div>
                </div>
              );
            })
          )}
        </div>
        {notifications.length > 5 && (
          <button style={{ width: "100%", background: "none", border: "none", color: "var(--primary)", fontSize: 11, fontWeight: 700, padding: "20px 0", cursor: "pointer", letterSpacing: 1 }}>SEE ALL ARCHIVES</button>
        )}
      </div>
    </div>
  );
}
