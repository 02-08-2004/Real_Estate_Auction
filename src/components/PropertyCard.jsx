// src/components/PropertyCard.jsx
import { useState } from "react";
import { doc, updateDoc, addDoc, collection, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCountdown } from "../hooks/useCountdown";

export default function PropertyCard({ property, bids = [], variant = "view" }) {
  const { id, title, location, currentBid, endDate, imageUrls, sellerId, status } = property;
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [bidAmount, setBidAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { timeLeft, expired } = useCountdown(endDate);

  async function placeBid() {
    const amount = parseFloat(bidAmount);
    if (!amount || amount <= currentBid) {
      setError(`Bid must be greater than ₹${currentBid.toLocaleString()}`);
      return;
    }
    setError(""); setSuccess(""); setLoading(true);
    try {
      await runTransaction(db, async (tx) => {
        const propRef = doc(db, "properties", id);
        const snap = await tx.get(propRef);
        if (!snap.exists()) throw new Error("Property not found");
        if (amount <= snap.data().currentBid) throw new Error("Someone outbid you! Refresh and try again.");
        tx.update(propRef, { currentBid: amount });
        // Add bid to sub-collection
        const bidRef = doc(collection(db, "bids"));
        tx.set(bidRef, {
          propertyId: id,
          bidderId: currentUser.uid,
          bidderName: currentUser.displayName || currentUser.email,
          amount,
          createdAt: serverTimestamp(),
        });
      });
      setSuccess("Bid placed successfully!");
      setBidAmount("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  // Sort bids by amount desc
  const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
  const topBidder = sortedBids[0];
  
  // Role & Privacy Checks
  const isWinner = topBidder && currentUser?.uid === topBidder.bidderId;
  const isSeller = currentUser?.uid === sellerId;
  const isAdmin = userRole === "admin";
  const canSeeFullHistory = !expired || isWinner || isSeller || isAdmin;
  const canBid = userRole !== "admin" && !isSeller && !expired;

  return (
    <div className="property-card" onClick={() => navigate(`/auction/${id}`)} style={{ cursor: "pointer" }}>
      {/* Image & Badges */}
      <div className="property-img">
        {imageUrls && imageUrls[0] ? (
          <img src={imageUrls[0]} alt={title} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a" }}>
            <span style={{ fontSize: 48, opacity: 0.15 }}>🏛</span>
          </div>
        )}
        
        {/* Status Overlays */}
        <div style={{ position: "absolute", top: 16, left: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {status === "sold" && <span style={{ background: "rgba(74, 222, 128, 0.95)", color: "#000", fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 1 }}>Sold</span>}
          {status === "contract_pending" && <span style={{ background: "rgba(168, 85, 247, 0.95)", color: "#fff", fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 1 }}>Closing</span>}
          {expired && (status === "live" || status === "contract_pending" || status === "sold") && <span style={{ background: "rgba(0, 0, 0, 0.6)", color: "#fff", fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 6, textTransform: "uppercase", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", letterSpacing: 1 }}>Ended</span>}
          {status === "scheduled" && <span style={{ background: "rgba(59, 130, 246, 0.95)", color: "#fff", fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 1 }}>Upcoming</span>}
          {status === "approved" && <span style={{ background: "rgba(251, 191, 36, 0.92)", color: "#000", fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 1 }}>⏳ Pending Schedule</span>}
        </div>

        {/* Price Tag Floating */}
        <div style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 16px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5 }}>{expired ? "Final Bid" : "Current Bid"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "var(--font-display)" }}>₹{currentBid.toLocaleString()}</div>
        </div>
      </div>

      <div className="property-body">
        {/* Winner Section for Ended Auctions */}
        {expired && topBidder && (
          <div style={{
            background: isWinner ? "rgba(74, 222, 128, 0.08)" : "rgba(251, 191, 36, 0.05)",
            border: `1px solid ${isWinner ? "rgba(74, 222, 128, 0.2)" : "rgba(251, 191, 36, 0.15)"}`,
            padding: "12px 16px",
            borderRadius: "16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <span style={{ fontSize: "22px" }}>🏆</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: isWinner ? "#4ade80" : "#fbbf24", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {isWinner ? "Winner: You" : "Winner: " + (topBidder.bidderName?.split(' ')[0] || "Anonymous")}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "1px" }}>
                Property securing agreement phase
              </div>
            </div>
          </div>
        )}

        <div className="property-title">{title}</div>
        <div className="property-location">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {location}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                    {status === "live" ? "Time Remaining" : "Status"}
                </span>
                {status === "live" && !expired && timeLeft ? (
                    <div className="countdown" style={{ fontSize: 16 }}>
                        {timeLeft.d > 0 && `${timeLeft.d}d `}
                        {String(timeLeft.h).padStart(2,"0")}:{String(timeLeft.m).padStart(2,"0")}:{String(timeLeft.s).padStart(2,"0")}
                    </div>
                ) : (
                    <span style={{ 
                        fontSize: 13, 
                        fontWeight: 700, 
                        color: status === "live" ? "rgba(255,255,255,0.3)" : status === "scheduled" ? "var(--blue)" : status === "approved" ? "#fbbf24" : "var(--green)" 
                    }}>
                        {status === "live" ? "Auction Ended" : status === "scheduled" ? "Scheduled" : status === "approved" ? "Awaiting Schedule" : status.toUpperCase()}
                    </span>
                )}
            </div>
            
            <button 
                className="btn-primary" 
                style={{ 
                    width: "auto", 
                    padding: "10px 20px", 
                    borderRadius: 12, 
                    fontSize: 12, 
                    height: "unset", 
                    background: !canBid ? "rgba(255,255,255,0.05)" : "var(--red)", 
                    color: !canBid ? "rgba(255,255,255,0.4)" : "#fff", 
                    border: !canBid ? "1px solid rgba(255,255,255,0.1)" : "none",
                    cursor: canBid ? "pointer" : "default"
                }}
                onClick={(e) => { e.stopPropagation(); navigate(`/auction/${id}`); }}
            >
                {expired ? "VIEW RESULTS" : status === "approved" ? "COMING SOON" : (status === "scheduled" ? "REGISTER" : (isAdmin || isSeller) ? "VIEW AUCTION" : "JOIN AUCTION")}
            </button>
        </div>

        {/* Quick Bid Info Section - Only visible to stakeholders after end */}
        {canSeeFullHistory ? (
          <>
            {!expired && topBidder && variant !== "manage" && (
                <div style={{ 
                    marginTop: 20, 
                    paddingTop: 16, 
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 10px var(--green)" }} />
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Highest: <strong>{topBidder.bidderName?.split(' ')[0] || "User"}</strong></span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                        {bids.length} BIDS
                    </div>
                </div>
            )}
          </>
        ) : (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
            Bid history restricted to seller and winner.
          </div>
        )}
      </div>
    </div>
  );
}
