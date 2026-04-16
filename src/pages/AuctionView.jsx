// src/pages/AuctionView.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, runTransaction, serverTimestamp, collection, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import ParticipateAuctionModal from "../components/ParticipateAuctionModal";
import LoadingIndicator from "../components/LoadingIndicator";

const TABS = [
  { key: "overview",  label: "Overview" },
  { key: "details",   label: "Property Details" },
  { key: "bids",      label: "Bid History" },
];

export default function AuctionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();
  const [property, setProperty]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState("overview");
  const [bidAmount, setBidAmount]         = useState("");
  const [bidLoading, setBidLoading]       = useState(false);
  const [error, setError]                 = useState(null);
  const [success, setSuccess]             = useState(null);
  const [showRegModal, setShowRegModal]   = useState(false);
  const [bidderStatus, setBidderStatus]   = useState(null);
  const [timeLeft, setTimeLeft]           = useState("");
  const [allBids, setAllBids]             = useState([]);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [showLoserPopup, setShowLoserPopup]   = useState(false);
  const timerRef = useRef(null);

  const isAdmin   = userRole === "admin";
  const isSeller  = currentUser?.uid === property?.sellerId;
  const isWinner  = property?.winnerId === currentUser?.uid;
  const canParticipateRole = userRole !== "admin" && !isSeller;

  // ─── Data Subscriptions ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "properties", id), (snap) => {
      setProperty(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });

    let unsubBidder = () => {};
    if (currentUser) {
      unsubBidder = onSnapshot(
        doc(db, "properties", id, "registeredBidders", currentUser.uid),
        (snap) => setBidderStatus(snap.exists() ? snap.data().verificationStatus || "pending" : null)
      );
    }

    const unsubBids = onSnapshot(
      query(collection(db, "bids"), where("propertyId", "==", id)),
      (snap) => setAllBids(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.amount || 0) - (a.amount || 0)))
    );

    return () => { unsub(); unsubBidder(); unsubBids(); clearInterval(timerRef.current); };
  }, [id, currentUser]);

  // ─── Countdown Timer ───────────────────────────────────────────────────────
  function formatDuration(s) {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
          m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return `${d > 0 ? d + "d " : ""}${h}h ${m}m ${sec}s`;
  }

  const handleAuctionEnd = async (prop) => {
    if (prop.status !== "live" && prop.status !== "scheduled") return;
    try {
      await runTransaction(db, async (t) => {
        const pDoc = await t.get(doc(db, "properties", prop.id));
        const data = pDoc.data();
        if (data.status !== "live" && data.status !== "scheduled") return;
        t.update(pDoc.ref, {
          status: data.topBidderId ? "contract_pending" : "ended",
          winnerId: data.topBidderId || null,
          winnerName: data.topBidderName || null,
          winnerAmount: data.currentBid || null,
          endedAt: serverTimestamp(),
        });
      });
      if (prop.topBidderId === currentUser?.uid) setShowWinnerPopup(true);
      else if (allBids.some(b => b.bidderId === currentUser?.uid)) setShowLoserPopup(true);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!property?.endDate) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const startsAt = property.startDate ? new Date(property.startDate) : null;
      const endsAt   = new Date(property.endDate);
      const now      = new Date();
      if (startsAt && now < startsAt) {
        setTimeLeft(`Starts in ${formatDuration(Math.floor((startsAt - now) / 1000))}`);
      } else if (now < endsAt) {
        if (property.status === "scheduled") {
          runTransaction(db, t => { t.update(doc(db, "properties", property.id), { status: "live" }); return Promise.resolve(); }).catch(console.error);
        }
        setTimeLeft(`Ends in ${formatDuration(Math.floor((endsAt - now) / 1000))}`);
      } else {
        setTimeLeft("Auction Ended");
        clearInterval(timerRef.current);
        if (property.status === "live" || property.status === "scheduled") handleAuctionEnd(property);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [property, allBids]);

  // ─── Place Bid ─────────────────────────────────────────────────────────────
  const placeBid = async () => {
    setError(null); setSuccess(null);
    if (!currentUser)             return setError("Please log in to bid.");
    if (!canParticipateRole)      return setError("Sellers and admins cannot bid.");
    if (bidderStatus !== "approved") return setError(bidderStatus === "pending" ? "Your KYC is pending approval." : "You must be a registered & approved bidder.");
    const endsAt = property?.endDate ? new Date(property.endDate) : null;
    if (endsAt && new Date() >= endsAt) return setError("Auction has already ended.");
    const amount = parseInt(bidAmount);
    if (isNaN(amount) || amount <= 0) return setError("Enter a valid bid amount.");

    setBidLoading(true);
    try {
      await runTransaction(db, async (tx) => {
        const pDoc = await tx.get(doc(db, "properties", property.id));
        const pData = pDoc.data();
        const minInc = pData.bidIncrement || 1000;
        const minBid = (pData.currentBid || 0) + minInc;
        if (amount < minBid) throw new Error(`Minimum bid required: ₹${minBid.toLocaleString()}`);
        const bidRef = doc(collection(db, "bids"));
        tx.set(bidRef, { propertyId: property.id, bidderId: currentUser.uid, bidderName: userData?.name || currentUser.email, amount, createdAt: serverTimestamp() });
        tx.update(doc(db, "properties", property.id), { currentBid: amount, topBidderId: currentUser.uid, topBidderName: userData?.name || currentUser.email, lastBidAt: serverTimestamp() });
      });
      setSuccess("✓ You are the leading bidder!");
      setBidAmount("");
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) { setError(e.message || e.toString()); }
    finally { setBidLoading(false); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading)    return <LoadingIndicator message="Loading Auction..." fullScreen />;
  if (!property)  return <div style={{ color: "#fff", textAlign: "center", padding: "6rem" }}>Property not found.</div>;

  const endsAt    = property.endDate ? new Date(property.endDate) : null;
  const expired   = endsAt && endsAt <= new Date();
  const isLive    = property.status === "live";
  const isApproved = property.status === "approved";
  const canSeeLeaderboard = !expired || isWinner || isSeller || isAdmin;
  const minNextBid = (property.currentBid || 0) + (property.bidIncrement || 1000);

  return (
    <div className="dashboard-content-wrapper" style={{ padding: "0", minHeight: "100vh", background: "#080808" }}>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
        {property.imageUrls?.[0] ? (
          <img src={property.imageUrls[0]} alt={property.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.45)" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#111" }} />
        )}
        {/* Back button */}
        <button onClick={() => navigate(-1)}
          style={{ position: "absolute", top: 24, left: 32, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          ← Back
        </button>

        {/* Hero text */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 32px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            {isLive && !expired &&
              <span style={{ background: "#e8192c", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>● LIVE</span>}
            {property.status === "scheduled" &&
              <span style={{ background: "#3b82f6", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>Upcoming</span>}
            {isApproved &&
              <span style={{ background: "#fbbf24", color: "#000", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>⏳ Pending Schedule</span>}
            {expired &&
              <span style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>Ended</span>}
            {timeLeft && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{timeLeft}</span>}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 42, margin: 0, fontWeight: 600, color: "#fff", textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}>{property.title}</h1>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>📍 {property.location}</div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 0, maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>

        {/* LEFT: Tabs + Content */}
        <div style={{ paddingRight: 40 }}>

          {/* Horizontal Tab Bar */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", marginTop: 36, marginBottom: 32 }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "12px 24px", border: "none", background: "none",
                  color: activeTab === tab.key ? "#fff" : "rgba(255,255,255,0.4)",
                  fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 500,
                  cursor: "pointer", position: "relative", transition: "color 0.2s",
                  borderBottom: activeTab === tab.key ? "2px solid #e8192c" : "2px solid transparent",
                  marginBottom: -1,
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview ─────────────────────────────── */}
          {activeTab === "overview" && (
            <div style={{ animation: "fadeIn 0.2s ease" }}>
              {/* Description */}
              <section style={{ marginBottom: 36 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Description</h3>
                <p style={{ lineHeight: 1.85, color: "rgba(255,255,255,0.75)", fontSize: 15 }}>{property.description || "No description provided."}</p>
              </section>

              {/* Key Stats */}
              <section>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Key Info</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {[
                    { label: "Base Price", value: `₹${(property.basePrice || property.currentBid || 0).toLocaleString()}` },
                    { label: "Bid Increment", value: `₹${(property.bidIncrement || 1000).toLocaleString()}` },
                    { label: "Total Bids", value: allBids.length },
                    { label: "Plot Size", value: property.plotArea || "—" },
                    { label: "Property Type", value: property.propertyType || "—" },
                    { label: "Facing", value: property.facing || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px" }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Additional Images */}
              {property.imageUrls?.length > 1 && (
                <section style={{ marginTop: 36 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Gallery</h3>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {property.imageUrls.map((url, i) => (
                      <div key={i} style={{ width: 120, height: 80, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── Tab: Property Details ──────────────────────── */}
          {activeTab === "details" && (
            <div style={{ animation: "fadeIn 0.2s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  ["Survey / Plot No.", property.surveyNumber || property.plotNumber],
                  ["Legal Address", property.legalAddress],
                  ["Plot Area", property.plotArea],
                  ["Property Type", property.propertyType],
                  ["Facing Direction", property.facing],
                  ["Construction Year", property.constructionYear],
                  ["No. of Floors", property.floors],
                  ["Seller Name", property.sellerName || "—"],
                  ["Listed On", property.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"],
                  ["Auction Start", property.startDate ? new Date(property.startDate).toLocaleString("en-IN") : "—"],
                  ["Auction End", property.endDate ? new Date(property.endDate).toLocaleString("en-IN") : "—"],
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{value || "—"}</div>
                  </div>
                ))}
              </div>

              {/* Documents */}
              {(property.titleDeedUrl || property.ecCertUrl || property.taxReceiptUrl) && (
                <div style={{ marginTop: 28 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Documents</h3>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[["Title Deed", property.titleDeedUrl], ["EC Certificate", property.ecCertUrl], ["Tax Receipt", property.taxReceiptUrl]].filter(([, url]) => url).map(([name, url]) => (
                      <a key={name} href={url} target="_blank" rel="noreferrer"
                        style={{ padding: "10px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                        📄 {name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Bid History ───────────────────────────── */}
          {activeTab === "bids" && (
            <div style={{ animation: "fadeIn 0.2s ease" }}>
              {!canSeeLeaderboard ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
                  🔒 Bid history is visible only to the seller and the winner.
                </div>
              ) : allBids.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
                  No bids placed yet.
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 120px", gap: "0", background: "rgba(255,255,255,0.03)", borderRadius: "12px 12px 0 0", padding: "12px 20px", marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>#</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Bidder</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Amount</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Time</span>
                  </div>
                  {allBids.map((b, i) => (
                    <div key={b.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 120px", gap: 0, padding: "14px 20px", background: i === 0 ? "rgba(251,191,36,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderRadius: i === allBids.length - 1 ? "0 0 12px 12px" : 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "#fbbf24" : "rgba(255,255,255,0.35)" }}>{i + 1}</span>
                      <span style={{ fontSize: 14, color: i === 0 ? "#fbbf24" : "#fff", fontWeight: i === 0 ? 700 : 400 }}>{b.bidderName || "—"}{i === 0 && " 🏆"}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: i === 0 ? "#fbbf24" : "#fff" }}>₹{b.amount?.toLocaleString()}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "right" }}>{b.createdAt?.toDate?.()?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Bid Panel ────────────────────────────────── */}
        <div style={{ paddingTop: 36 }}>
          <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Current Bid Card */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "28px 28px 24px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
                {expired ? "Final Bid" : "Current Bid"}
              </div>
              <div style={{ fontSize: 40, fontWeight: 300, letterSpacing: -1, color: "#fff", fontFamily: "var(--font-display)", lineHeight: 1 }}>
                ₹{(property.currentBid || 0).toLocaleString()}
              </div>
              {!expired && (
                <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                  Min next bid: <strong style={{ color: "#fff" }}>₹{minNextBid.toLocaleString()}</strong>
                </div>
              )}
              {timeLeft && (
                <div style={{ marginTop: 16, padding: "10px 16px", background: expired ? "rgba(255,255,255,0.04)" : "rgba(232,25,44,0.1)", border: `1px solid ${expired ? "rgba(255,255,255,0.08)" : "rgba(232,25,44,0.25)"}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: expired ? "rgba(255,255,255,0.4)" : "#ff6b6b", textAlign: "center" }}>
                  {timeLeft}
                </div>
              )}
            </div>

            {/* ── Bidding Actions ─────────────────────────── */}
            {canParticipateRole && (
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "24px 28px" }}>
                {expired ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Auction has ended.</div>
                ) : bidderStatus === "approved" ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Place Your Bid</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 16, fontWeight: 600, pointerEvents: "none" }}>₹</span>
                        <input
                          type="number"
                          placeholder={minNextBid.toLocaleString()}
                          value={bidAmount}
                          onChange={e => setBidAmount(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && placeBid()}
                          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "14px 14px 14px 32px", color: "#fff", fontSize: 18, fontWeight: 600, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      <button
                        onClick={placeBid}
                        disabled={bidLoading}
                        style={{ background: bidLoading ? "rgba(232,25,44,0.4)" : "#e8192c", color: "#fff", border: "none", borderRadius: 12, padding: "0 22px", fontWeight: 800, fontSize: 14, cursor: bidLoading ? "default" : "pointer", letterSpacing: 1, transition: "background 0.2s" }}>
                        {bidLoading ? "..." : "BID"}
                      </button>
                    </div>
                    {/* Quick-bid helper buttons */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 2, 5].map(mult => (
                        <button key={mult} onClick={() => setBidAmount(String(minNextBid + (property.bidIncrement || 1000) * (mult - 1)))}
                          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 0", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          +{((property.bidIncrement || 1000) * mult / 1000).toFixed(0)}K
                        </button>
                      ))}
                    </div>
                  </>
                ) : bidderStatus === "pending" ? (
                  <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 14, padding: "18px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 8 }}>⏳</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>KYC Pending</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Your documents are under review. You'll be notified once approved.</div>
                  </div>
                ) : bidderStatus === "rejected" ? (
                  <div style={{ background: "rgba(232,25,44,0.08)", border: "1px solid rgba(232,25,44,0.2)", borderRadius: 14, padding: "18px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 8 }}>🚫</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e8192c", marginBottom: 4 }}>Registration Declined</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Please contact support for more information.</div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRegModal(true)}
                    style={{ width: "100%", background: "#e8192c", color: "#fff", border: "none", borderRadius: 14, padding: "18px", fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 0.5, boxShadow: "0 8px 24px rgba(232,25,44,0.25)", transition: "transform 0.1s" }}>
                    REGISTER FOR AUCTION
                  </button>
                )}

                {/* Status Messages */}
                {error   && <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.2)", borderRadius: 10, color: "#ff6b6b", fontSize: 13 }}>{error}</div>}
                {success && <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, color: "#4ade80", fontSize: 13, fontWeight: 600 }}>{success}</div>}
              </div>
            )}

            {/* Winner/Seller: Agreement */}
            {(isWinner || isSeller) && expired && (
              <button onClick={() => navigate(`/agreement/${id}`)}
                style={{ width: "100%", background: "#4ade80", color: "#000", border: "none", borderRadius: 14, padding: "18px", fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 0.5 }}>
                VIEW & SIGN AGREEMENT →
              </button>
            )}

            {/* Live Rankings (sidebar preview) */}
            {canSeeLeaderboard && allBids.length > 0 && !expired && (
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Live Rankings</div>
                {allBids.slice(0, 4).map((b, i) => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#fbbf24" : "rgba(255,255,255,0.25)", width: 18 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: i === 0 ? "#fff" : "rgba(255,255,255,0.6)" }}>{b.bidderName?.split(" ")[0] || "—"}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "#fbbf24" : "#fff" }}>₹{b.amount?.toLocaleString()}</span>
                  </div>
                ))}
                {allBids.length > 4 && (
                  <button onClick={() => setActiveTab("bids")}
                    style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", textAlign: "center" }}>
                    View all {allBids.length} bids →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Popups ─────────────────────────────────────────── */}
      {showWinnerPopup && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-box" style={{ textAlign: "center", padding: "48px 40px" }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginBottom: 8 }}>You Won!</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>Congratulations — you are the highest bidder.</p>
            <button className="btn-primary" onClick={() => setShowWinnerPopup(false)}>CLOSE</button>
          </div>
        </div>
      )}
      {showLoserPopup && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-box" style={{ textAlign: "center", padding: "48px 40px" }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🍀</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginBottom: 8 }}>Better Luck Next Time</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>The auction has ended. Thank you for participating.</p>
            <button className="btn-primary" onClick={() => setShowLoserPopup(false)}>CLOSE</button>
          </div>
        </div>
      )}

      {showRegModal && (
        <ParticipateAuctionModal
          property={property}
          onClose={() => setShowRegModal(false)}
          onRegisterSuccess={() => setShowRegModal(false)}
        />
      )}
    </div>
  );
}
