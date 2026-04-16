import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useBuyerStatus } from "../../hooks/useBuyerStatus";
import { useSellerStatus } from "../../hooks/useSellerStatus";
import LoadingIndicator from "../../components/LoadingIndicator";
import PropertyCard from "../../components/PropertyCard";
import { useNavigate } from "react-router-dom";
import { propertyService } from "../../services/propertyService";

export default function DashboardPage() {
  const { currentUser, userData, userRole } = useAuth();
  const {
    loading,
    activeBiddedProperties = [],
    bidsMap = {},
    wonCount = 0,
    totalSpent = 0,
    savedProperties = [],
    notifications = [],
  } = useBuyerStatus(currentUser, userData) || {};
  const { loading: sellerLoading, myListings = [] } = useSellerStatus(currentUser) || {};

  const navigate = useNavigate();
  const latestWinNotice = notifications.find(n => !n.read && n.type === "auction_won");
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);

  useEffect(() => {
    if (latestWinNotice) {
      setShowWinnerPopup(true);
    }
  }, [latestWinNotice?.id]);

  if (loading || (userRole === "auctioneer" && sellerLoading)) return <LoadingIndicator message="Loading live auctions..." />;

  if (userRole === "auctioneer") {
    const liveListings = myListings.filter(p => ["live", "scheduled"].includes(p.status));
    const waitingListings = myListings.filter(p => ["pending", "pending_review"].includes(p.status));
    const closedListings = myListings.filter(p => ["sold", "contract_pending", "ended", "cancelled"].includes(p.status));
    
    return (
      <div className="dashboard-content-wrapper" style={{ padding: "0 2rem 4rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          
          {/* Header */}
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, margin: 0, fontWeight: 500, color: "#fff" }}>
              Seller Dashboard
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>
              Manage your live auctions and properties awaiting approval.
            </p>
          </div>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 20, padding: "22px 26px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1.8, textTransform: "uppercase" }}>Live Auctions</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#4ade80", marginTop: 12 }}>{liveListings.length}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 20, padding: "22px 26px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1.8, textTransform: "uppercase" }}>Pending Approval</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#f59e0b", marginTop: 12 }}>{waitingListings.length}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "22px 26px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1.8, textTransform: "uppercase" }}>Total Listed</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginTop: 12 }}>{myListings.length}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(96,165,250,0.4)", borderRadius: 20, padding: "22px 26px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1.8, textTransform: "uppercase" }}>Closed / Sold</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#60a5fa", marginTop: 12 }}>{closedListings.length}</div>
            </div>
          </div>

          {/* Live & Scheduled Auctions Feed */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, marginTop: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", animation: "pulse 2s infinite" }} />
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, margin: 0, color: "#fff" }}>
                My Live Auctions
              </h2>
            </div>
            {liveListings.length === 0 ? (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 20, padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>No live or scheduled auctions found.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
                {liveListings.map(p => <PropertyCard key={p.id} property={p} variant="seller" />)}
              </div>
            )}
          </section>

          {/* Pending Approval / Action Required Feed */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, marginTop: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px #f59e0b", animation: "pulse 2s infinite" }} />
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, margin: 0, color: "#fff" }}>
                Auctions Pending Permission
              </h2>
            </div>
            {waitingListings.length === 0 ? (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 20, padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>All active properties have been approved and processed!</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {waitingListings.map(p => (
                  <div key={p.id} className="card-architectural" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
                    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                      {p.imageUrls?.[0] ? (
                        <div style={{ width: 60, height: 60, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <img src={p.imageUrls[0]} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{ width: 60, height: 60, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 24, color: "rgba(255,255,255,0.3)" }}>🏛</div>
                      )}
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Price: ₹{p.startingPrice?.toLocaleString()} • {p.location}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)", display: "inline-block", textTransform: "uppercase" }}>
                        In Review
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
                        Admin review pending...
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    );
  }

  const stats = {
    wonCount,
    totalSpent,
    activeBidsCount: activeBiddedProperties.length,
    savedCount: savedProperties.length,
  };

  const StatCard = ({ label, value, icon, color, accent }) => (
    <div style={{
      background: "rgba(255,255,255,0.08)",
      border: `1px solid ${accent || "rgba(255,255,255,0.12)"}`,
      borderRadius: 20,
      padding: "22px 26px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      backdropFilter: "blur(12px)",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 12px 40px ${accent}40`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1.8, textTransform: "uppercase" }}>{label}</span>
        <span style={{
          fontSize: 20, width: 40, height: 40,
          background: `${accent}20`,
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#fff", letterSpacing: -0.5 }}>{value}</div>
    </div>
  );

  return (
    <div className="dashboard-content-wrapper" style={{ padding: "0 2rem 4rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

        {/* Header */}
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, margin: 0, fontWeight: 500, color: "#fff" }}>
            Live Auctions
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>
            Only currently live auctions where you have already participated.
          </p>
        </div>

        {latestWinNotice && (
          <div style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)", borderRadius: 18, padding: "20px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80" }}>Congratulations! You won an auction.</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{latestWinNotice.message}</div>
            </div>
            {latestWinNotice.propertyId && (
              <button
                className="btn-primary"
                style={{ width: "auto", padding: "10px 18px" }}
                onClick={async () => {
                  await propertyService.markNotificationRead(latestWinNotice.id);
                  setShowWinnerPopup(false);
                  navigate(`/agreement/${latestWinNotice.propertyId}`);
                }}
              >
                View Agreement
              </button>
            )}
          </div>
        )}

        {showWinnerPopup && latestWinNotice && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20
            }}
          >
            <div style={{ width: "100%", maxWidth: 520, background: "#0f1319", border: "1px solid rgba(74,222,128,0.35)", borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
              <h2 style={{ margin: 0, fontSize: 28, color: "#4ade80", fontWeight: 700 }}>Congratulations! You Won</h2>
              <p style={{ marginTop: 10, marginBottom: 20, color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
                {latestWinNotice.message}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={async () => {
                    await propertyService.markNotificationRead(latestWinNotice.id);
                    setShowWinnerPopup(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "transparent",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1, width: "auto" }}
                  onClick={async () => {
                    await propertyService.markNotificationRead(latestWinNotice.id);
                    setShowWinnerPopup(false);
                    if (latestWinNotice.propertyId) navigate(`/agreement/${latestWinNotice.propertyId}`);
                  }}
                >
                  Open Agreement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          <StatCard label="Active Bids" value={stats.activeBidsCount} icon="🏦" color="var(--primary)" accent="rgba(210,31,60,0.6)" />
          <StatCard label="Won Auctions" value={stats.wonCount} icon="🏆" color="#4ade80" accent="rgba(74,222,128,0.4)" />
          <StatCard label="Saved Items" value={stats.savedCount} icon="❤️" color="#fb7185" accent="rgba(251,113,133,0.4)" />
          <StatCard label="Total Spent" value={`₹${(stats.totalSpent || 0).toLocaleString()}`} icon="💳" color="#60a5fa" accent="rgba(96,165,250,0.4)" />
        </div>

        {/* Live Auctions Feed */}
        <section>
          {/* My Active Participations */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 8px #4ade80",
                  display: "inline-block",
                  animation: "pulse 2s infinite"
                }} />
                <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#4ade80", margin: 0, textTransform: "uppercase" }}>
                  My Participations
                </h3>
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, margin: 0, color: "#fff" }}>
                Active Auctions You Joined
              </h2>
            </div>
          </div>

          {activeBiddedProperties.length === 0 ? (
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 20, padding: "40px", textAlign: "center"
            }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 500, marginBottom: 8 }}>
                You have not participated in any live auctions yet.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
              {activeBiddedProperties.map(p => (
                <PropertyCard key={p.id} property={p} bids={bidsMap?.[p.id] || []} />
              ))}
            </div>
          )}

        </section>

      </div>
    </div>
  );
}
