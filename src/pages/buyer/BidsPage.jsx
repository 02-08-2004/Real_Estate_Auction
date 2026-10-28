import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useBuyerStatus } from "../../hooks/useBuyerStatus";
import PropertyCard from "../../components/PropertyCard";
import LoadingIndicator from "../../components/LoadingIndicator";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export default function BidsPage() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { loading, properties = [], userBidPropertyIds = [], bidsMap = {} } = useBuyerStatus(currentUser, userData) || {};
  const [expandedProp, setExpandedProp] = useState(null);

  if (loading) return <LoadingIndicator message="Fetching your bids..." />;

  const participatedAuctions = properties.filter(p => userBidPropertyIds.includes(p.id));

  return (
    <div className="dashboard-content-wrapper" style={{ padding: "0 2rem 4rem" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: 0, fontWeight: 500 }}>Investment Portfolio</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Monitor your placed bids and participation details across all auctions.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
        {participatedAuctions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "100px", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>🏦</div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>No participated bids found. Start exploring the marketplace to participate!</div>
          </div>
        ) : (
          participatedAuctions.map(p => {
            const propBids = bidsMap[p.id] || [];
            const sortedBids = [...propBids].sort((a, b) => b.amount - a.amount);
            const isWinning = sortedBids[0]?.bidderId === currentUser?.uid;
            const userBids = propBids.filter(b => b.bidderId === currentUser?.uid);
            const isDone = p.status === "ended" || p.status === "contract_pending" || p.status === "sold" || (p.endDate && new Date(p.endDate) <= new Date());

            return (
              <div key={p.id} className="card-architectural" style={{ overflow: "hidden", opacity: 1, background: "rgba(10, 12, 16, 0.86)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.18)" }}>
                  <div className="bids-card-grid">
                      <PropertyCard property={p} minimal={true} />
                      
                      <div className="bids-card-details">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
                              <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: isDone ? "#ffffff" : isWinning ? "#4ade80" : "var(--primary)", boxShadow: isDone ? "0 0 8px rgba(255,255,255,0.6)" : (isWinning ? "0 0 10px #4ade80" : "0 0 10px var(--primary)") }}></div>
                                      <span style={{ fontSize: 11, fontWeight: 800, color: isDone ? "#ffffff" : (isWinning ? "#4ade80" : "var(--primary)"), letterSpacing: 1 }}>
                                          {isDone ? "AUCTION COMPLETED" : (isWinning ? "CURRENTLY WINNING" : "OUTBID - ACTION REQUIRED")}
                                      </span>
                                  </div>
                                  <h2 style={{ fontSize: 24, margin: 0, fontWeight: 700, color: "#ffffff" }}>{p.title}</h2>
                                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.88)", fontWeight: 600, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                    <span className={!isDone ? "loading-spinner" : ""} style={{ width: 8, height: 8, borderSize: 1, borderStyle: isDone ? 'solid' : undefined, borderRadius: '50%', borderColor: 'rgba(255,255,255,0.85)' }}></span>
                                    {isDone ? "ARCHIVED RECORD" : "LIVE UPDATES ENABLED"}
                                  </div>
                              </div>
                              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 12 }}>
                                  <div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{isDone ? "Final Bid" : "Current Bid"}</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff" }}>₹{p.currentBid?.toLocaleString()}</div>
                                  </div>
                                  {!isWinning && !isDone && (
                                    <button 
                                      onClick={() => navigate(`/auction/${p.id}`)}
                                      className="btn-primary" 
                                      style={{ height: 36, padding: "0 16px", fontSize: 11, background: "var(--primary)" }}
                                    >
                                      INCREASE BID →
                                    </button>
                                  )}
                                  {isDone && (
                                    <button 
                                      onClick={() => navigate(`/auction/${p.id}`)}
                                      style={{ height: 36, padding: "0 16px", fontSize: 11, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.14)", color: "#ffffff", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}
                                    >
                                      VIEW RESULTS
                                    </button> 
                                  )}
                              </div>
                          </div>

                          <div style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, padding: "20px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: 13, color: "#ffffff", fontWeight: 500 }}>
                                      You have placed <strong>{userBids.length}</strong> {userBids.length === 1 ? 'bid' : 'bids'} on this property.
                                  </div>
                                  <button 
                                      onClick={() => setExpandedProp(expandedProp === p.id ? null : p.id)}
                                      style={{ background: "none", border: "none", color: "#ff4d5e", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                  >
                                      {expandedProp === p.id ? "HIDE HISTORY" : "VIEW BID HISTORY"}
                                      {expandedProp === p.id ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                  </button>
                              </div>

                              {expandedProp === p.id && (
                                  <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 20 }}>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                          {sortedBids.map((bid, i) => (
                                              <div key={bid.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i === sortedBids.length - 1 ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
                                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 600, width: 24 }}>#{sortedBids.length - i}</span>
                                                      <div style={{ fontSize: 13, color: "#ffffff", fontWeight: bid.bidderId === currentUser?.uid ? 700 : 500 }}>
                                                          ₹{bid.amount.toLocaleString()} {bid.bidderId === currentUser?.uid && "(You)"}
                                                      </div>
                                                  </div>
                                                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                                                      {new Date(bid.createdAt?.seconds * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

