import { useAuth } from "../../context/AuthContext";
import { useSellerStatus } from "../../hooks/useSellerStatus";
import PropertyCard from "../../components/PropertyCard";
import LoadingIndicator from "../../components/LoadingIndicator";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ScheduleAuctionModal from "../../components/ScheduleAuctionModal";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import BidderManagementView from "../../components/BidderManagementView";

const TABS = [
  { key: "active",   label: "Live & Scheduled",   icon: "🏪", color: "#4ade80" },
  { key: "approved", label: "Approved",           icon: "✔️", color: "#60a5fa" },
  { key: "pending",  label: "Pending Review",     icon: "⏳", color: "#f59e0b" },
  { key: "rejected", label: "Rejected",           icon: "❌", color: "#e8192c" },
  { key: "closed",   label: "Closed & Sold",      icon: "🏁", color: "rgba(255,255,255,0.4)" },
];

export default function ListingsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { loading, myListings = [] } = useSellerStatus(currentUser) || {};
  const [schedulingProperty, setSchedulingProperty] = useState(null);
  const [viewingBiddersFor, setViewingBiddersFor] = useState(null);
  const [activeTab, setActiveTab] = useState("active");

  const handleCancelList = async (propertyId, isLive) => {
    const defaultMsg = isLive ? "Are you sure you want to close this auction early? Please provide a reason to update the admin:" : "Are you sure you want to cancel this listing? Please provide a reason:";
    const reason = window.prompt(defaultMsg);
    if (reason !== null && reason.trim() !== "") {
      try {
        await updateDoc(doc(db, "properties", propertyId), { 
          status: "cancelled",
          cancelledReason: reason.trim(),
          cancelledAt: new Date().toISOString()
        });
      } catch (e) {
        console.error(e);
      }
    } else if (reason !== null) {
      alert("A reason is required to close the property.");
    }
  };

  if (loading) return <LoadingIndicator message="Opening Seller Center..." />;

  const now = new Date();
  const groups = {
    active:   myListings.filter(p => 
      (p.status === "scheduled" && (!p.endDate || new Date(p.endDate) > now)) ||
      (p.status === "live" && (!p.endDate || new Date(p.endDate) > now))
    ),
    approved: myListings.filter(p => 
      (p.status === "approved" && (!p.endDate || new Date(p.endDate) > now))
    ),
    pending:  myListings.filter(p => p.status === "pending" || p.status === "pending_review"),
    rejected: myListings.filter(p => p.status === "rejected"),
    closed:   myListings.filter(p => 
      ["contract_pending", "sold", "ended", "cancelled"].includes(p.status) || 
      ( ["approved", "scheduled", "live"].includes(p.status) && p.endDate && new Date(p.endDate) <= now )
    ),
  };

  const currentItems = groups[activeTab] || [];
  const currentTab = TABS.find(t => t.key === activeTab);

  if (viewingBiddersFor) {
    return (
      <div className="dashboard-content-wrapper" style={{ padding: "1rem 2rem 4rem" }}>
         <BidderManagementView 
            property={viewingBiddersFor} 
            onClose={() => setViewingBiddersFor(null)} 
         />
      </div>
    );
  }

  return (
    <div className="dashboard-content-wrapper" style={{ padding: "0 2rem 4rem" }}>
      {schedulingProperty && (
        <ScheduleAuctionModal
          property={schedulingProperty}
          onClose={() => setSchedulingProperty(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: 0, fontWeight: 500 }}>My Property</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Track and manage properties you have listed for auction.</p>
        </div>
        <button onClick={() => navigate("/sell-property")} className="btn-primary" style={{ width: "auto", padding: "12px 24px", fontSize: 13 }}>
          + Sell Property
        </button>
      </div>

      {/* Tab Filter Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 40, flexWrap: "wrap" }}>
        {TABS.map(tab => {
          const count = groups[tab.key].length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 12,
                border: isActive ? `1px solid ${tab.color}` : "1px solid rgba(255,255,255,0.08)",
                background: isActive ? `${tab.color}18` : "rgba(255,255,255,0.03)",
                color: isActive ? tab.color : "rgba(255,255,255,0.5)",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: isActive ? "0.03em" : 0,
              }}
            >
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              {tab.label}
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                background: isActive ? tab.color : "rgba(255,255,255,0.1)",
                color: isActive ? "#000" : "rgba(255,255,255,0.4)",
                padding: "2px 7px",
                borderRadius: 20,
                minWidth: 20,
                textAlign: "center",
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {myListings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px dashed rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>🏡</div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>You haven't listed any properties for auction yet.</div>
          <button onClick={() => navigate("/sell-property")} style={{ marginTop: 24, background: "none", border: "none", color: "var(--primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>START LISTING →</button>
        </div>
      ) : currentItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px dashed rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>{currentTab?.icon}</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.3)" }}>No listings in this category yet.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {currentItems.map(p => (
            <div key={p.id} className="card-architectural" style={{ overflow: "hidden", display: "flex", flexDirection: "column", padding: 0 }}>
              <PropertyCard property={p} variant="manage" />

              {/* Management Actions Center */}
              <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "auto" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Management Center</div>
                
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {/* BIDDERS Button - Available for all active/live/approved */}
                  {(p.status === "live" || p.status === "scheduled") && (
                    <button
                      onClick={() => setViewingBiddersFor(p)}
                      style={{ background: "#60a5fa", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer", flex: 1, minWidth: "fit-content" }}
                    >
                      VIEW BIDDERS
                    </button>
                  )}

                  {/* SET TIME Button - Only for Approved (Not yet scheduled) */}
                  {p.status === "approved" && (!p.endDate || new Date(p.endDate) > now) && (
                    <button
                      onClick={() => setSchedulingProperty(p)}
                      style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer", flex: 2, minWidth: "fit-content" }}
                    >
                      SET DATE & GO LIVE
                    </button>
                  )}

                  {/* CANCEL Button - Only for Approved/Live/Scheduled */}
                  {(p.status === "approved" || p.status === "live" || p.status === "scheduled") && (
                    <button
                      onClick={() => handleCancelList(p.id, p.status === "live")}
                      style={{ background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.2)", color: "var(--red)", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      CANCEL
                    </button>
                  )}
                </div>

                {/* Rejection reason if any */}
                {p.status === "rejected" && p.rejectedReason && (
                  <div style={{ marginTop: 12, padding: 10, background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.2)", borderRadius: 8, fontSize: 11, color: "var(--red)" }}>
                    <strong>Admin Feedback:</strong> {p.rejectedReason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
