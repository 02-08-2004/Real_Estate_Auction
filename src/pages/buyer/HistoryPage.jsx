import { useAuth } from "../../context/AuthContext";
import { useBuyerStatus } from "../../hooks/useBuyerStatus";
import PropertyCard from "../../components/PropertyCard";
import LoadingIndicator from "../../components/LoadingIndicator";
import { useNavigate } from "react-router-dom";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { loading, pastAuctions = [], wonProperties = [], bidsMap = {} } = useBuyerStatus(currentUser, userData) || {};

  if (loading) return <LoadingIndicator message="Accessing archives..." />;

  // Auctions where user placed a bid but didn't win
  const lostAuctions = pastAuctions.filter(p => {
    const propBids = bidsMap[p.id] || [];
    const userBid = propBids.find(b => b.bidderId === currentUser?.uid);
    return userBid && p.winnerId !== currentUser?.uid;
  });

  return (
    <div className="dashboard-content-wrapper" style={{ padding: "0 2rem 4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: 0, fontWeight: 500 }}>Auction Archives</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Review your past auction participations and successfully closed deals.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Sort by:</span>
                <select style={{ background: "none", border: "none", color: "#fff", fontSize: 12, outline: "none", cursor: "pointer" }}>
                    <option value="recent">Most Recent</option>
                    <option value="value">Highest Value</option>
                </select>
            </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        {/* SECTION: WON PROPERTIES */}
        {wonProperties.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 20 }}>🏆</span>
                <h3 className="text-label" style={{ marginBottom: 0 }}>Won Properties</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
              {wonProperties.map(p => (
                <div key={p.id} className="card-architectural history-item-grid">
                  <img src={p.imageUrls?.[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="history-item-details">
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 600 }}>{p.title}</h2>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{p.location}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Final Value</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>₹{p.currentBid.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ background: "rgba(74,222,128,0.05)", padding: "16px", borderRadius: 12, border: "1px solid rgba(74,222,128,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                        <strong>Transaction Records:</strong> Agreement fully generated and available for review.
                      </div>
                      <button 
                        onClick={() => navigate(`/agreement/${p.id}`)}
                        className="filter-btn" 
                        style={{ width: "auto", height: 36, fontSize: 11, background: "#4ade80", color: "#000", fontWeight: 700 }}
                      >
                        VIEW CONTRACT
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION: LOST BIDS */}
        {lostAuctions.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 20 }}>📉</span>
                <h3 className="text-label" style={{ marginBottom: 0 }}>Unsuccessful Engagements</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {lostAuctions.map(p => <PropertyCard key={p.id} property={p} minimal={true} />)}
            </div>
          </section>
        )}

        {pastAuctions.length === 0 && (
          <div style={{ textAlign: "center", padding: "100px", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>📜</div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>Your auction history is currently empty.</div>
          </div>
        )}
      </div>
    </div>
  );
}
