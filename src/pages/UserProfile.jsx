// src/pages/UserProfile.jsx
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { updatePassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { useSellerStatus } from "../hooks/useSellerStatus";
import PropertyCard from "../components/PropertyCard";
import ScheduleAuctionModal from "../components/ScheduleAuctionModal";

const LISTING_TABS = [
  { key: "active",   label: "Active & Approved", icon: "🏪", color: "#4ade80" },
  { key: "pending",  label: "Pending Review",     icon: "⏳", color: "#f59e0b" },
  { key: "waiting",  label: "Waiting List",       icon: "📋", color: "#60a5fa" },
  { key: "rejected", label: "Rejected",           icon: "❌", color: "#e8192c" },
  { key: "closed",   label: "Closed & Sold",      icon: "🏁", color: "rgba(255,255,255,0.4)" },
];

export default function UserProfile() {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [bids, setBids] = useState([]);
    const [registrations, setRegistrations] = useState([]); // KYC registrations per property
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState("");
    const [passLoading, setPassLoading] = useState(false);
    const [passMsg, setPassMsg] = useState({ type: "", text: "" });

    // Fetch all properties (to find won ones, listed ones, registered ones)
    useEffect(() => {
        return onSnapshot(query(collection(db, "properties"), orderBy("createdAt", "desc")), snap => {
            setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
    }, []);

    // Fetch user's bids
    useEffect(() => {
        if (!currentUser) return;
        return onSnapshot(
            query(collection(db, "bids"), where("bidderId", "==", currentUser.uid), orderBy("createdAt", "desc")),
            snap => setBids(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
    }, [currentUser]);

    // Fetch KYC registration records for bidder across all auctions
    useEffect(() => {
        if (!currentUser) return;
        // Check registeredBidders subcollection across properties
        const fetchRegistrations = async () => {
            const regs = [];
            for (const prop of properties) {
                try {
                    const regSnap = await getDocs(
                        query(collection(db, "properties", prop.id, "registeredBidders"), where("__name__", "==", currentUser.uid))
                    );
                    if (!regSnap.empty) {
                        regs.push({ propertyId: prop.id, propertyTitle: prop.title, ...regSnap.docs[0].data() });
                    }
                } catch(e) { /* subcollection may not exist for all */ }
            }
            setRegistrations(regs);
        };
        if (properties.length > 0) fetchRegistrations();
    }, [currentUser, properties]);

    async function handleWithdraw(propertyId) {
        if (!window.confirm("Withdraw your KYC registration from this auction? You can re-register later.")) return;
        try {
            await deleteDoc(doc(db, "properties", propertyId, "registeredBidders", currentUser.uid));
            setRegistrations(prev => prev.filter(r => r.propertyId !== propertyId));
        } catch(e) { alert("Error withdrawing registration: " + e.message); }
    }

    async function handleUpdatePassword() {
        if (!newPassword || newPassword.length < 6) return setPassMsg({ type: "error", text: "Password must be at least 6 characters." });
        setPassLoading(true);
        try {
            await updatePassword(currentUser, newPassword);
            setPassMsg({ type: "success", text: "Password updated successfully!" });
            setNewPassword("");
        } catch (e) {
            setPassMsg({ type: "error", text: e.message });
        }
        setPassLoading(false);
    }

    const myListedProperties = properties.filter(p => p.sellerId === currentUser?.uid);
    const wonProperties = properties.filter(p => p.winnerId === currentUser?.uid);
    const liveBids = bids.filter(b => {
        const prop = properties.find(p => p.id === b.propertyId);
        return prop?.status === "live";
    });

    const memberSince = currentUser?.metadata?.creationTime
        ? new Date(currentUser.metadata.creationTime).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
        : "N/A";

    const inputStyle = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: "var(--font-body)", outline: "none" };

    return (
        <div style={{ padding: "0 2rem 4rem", maxWidth: 1200, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500 }}>My Profile</h1>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Your registration details, KYC status, and activity.</div>
            </div>

            {/* Identity Card */}
            <div style={{ background: "rgba(15,15,15,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32, marginBottom: 24, backdropFilter: "blur(20px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
                    <div style={{ width: 72, height: 72, background: "linear-gradient(135deg, var(--red), #7e121b)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {userData?.name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                        <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{userData?.name || "User"}</h2>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{currentUser?.email}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <span style={{ padding: "3px 10px", background: "rgba(232,25,44,0.15)", border: "1px solid rgba(232,25,44,0.3)", color: "var(--red)", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                {(userData?.role || "user").toUpperCase()}
                            </span>
                            <span style={{ padding: "3px 10px", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                ✅ VERIFIED ACCOUNT
                            </span>
                        </div>
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                        <button 
                            onClick={() => {
                                if(window.confirm("Are you sure you want to log out?")) {
                                    auth.signOut().then(() => navigate('/login'));
                                }
                            }}
                            className="filter-btn" 
                            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", fontSize: 12, padding: "8px 20px" }}
                        >
                            Log Out 🚪
                        </button>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                    {[
                        ["Member Since", memberSince],
                        ["Email", currentUser?.email || "N/A"],
                        ["UID", currentUser?.uid?.substring(0, 12) + "..."],
                        ["Account Status", "Active"],
                    ].map(([label, val]) => (
                        <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14 }}>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 500, wordBreak: "break-all" }}>{val}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Activity Center */}
            <div style={{ background: "rgba(15,15,15,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28, marginBottom: 24, backdropFilter: "blur(20px)" }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>📦</span> Activity Center
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <button 
                        onClick={() => navigate('/history')}
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px", textAlign: "left", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                        onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    >
                        <div style={{ fontSize: 18, marginBottom: 8 }}>📜</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>Auction History</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>View your past bids, wins, and closed auctions.</div>
                    </button>
                    <button 
                        onClick={() => navigate('/watchlist')}
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px", textAlign: "left", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                        onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    >
                        <div style={{ fontSize: 18, marginBottom: 8 }}>❤️</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>My Watchlist</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Track premium properties you are interested in.</div>
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[
                    ["🏠 Listed", myListedProperties.length, "var(--red)"],
                    ["🏆 Won", wonProperties.length, "#4ade80"],
                    ["📋 Registered", registrations.length, "#60a5fa"],
                    ["⚡ Live Bids", liveBids.length, "#f59e0b"],
                ].map(([label, val, color]) => (
                    <div key={label} style={{ background: "rgba(15,15,15,0.6)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 16px", textAlign: "center", backdropFilter: "blur(10px)" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, color }}>{val}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* KYC Registration Details */}
            {registrations.length > 0 && (
                <div style={{ background: "rgba(15,15,15,0.6)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 20, padding: 28, marginBottom: 24, backdropFilter: "blur(20px)" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>📋</span> KYC Registration Records
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {registrations.map((reg, i) => {
                            const propDetails = properties.find(p => p.id === reg.propertyId);
                            const isStillLive = propDetails?.status === "live";
                            const hasBid = bids.some(b => b.propertyId === reg.propertyId);
                            const canWithdraw = isStillLive && !hasBid;
                            return (
                            <div key={i} style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.1)", borderRadius: 12, padding: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{reg.propertyTitle}</div>
                                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                                            Aadhar: <span style={{ color: "#60a5fa", fontWeight: 600 }}>{reg.aadharNumber?.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') || "N/A"}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                                            Address: {reg.address || "N/A"}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                                        <span style={{ fontSize: 10, padding: "3px 8px", background: "rgba(74,222,128,0.1)", color: "#4ade80", borderRadius: 4, fontWeight: 700 }}>✅ KYC VERIFIED</span>
                                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                                            {reg.registeredAt?.toDate?.()?.toLocaleDateString("en-IN") || "Recently"}
                                        </div>
                                        {canWithdraw && (
                                            <button
                                                onClick={() => handleWithdraw(reg.propertyId)}
                                                style={{ fontSize: 10, padding: "4px 10px", background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.25)", color: "var(--red)", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                                            >
                                                ✕ Withdraw
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}


            {/* Won Auctions */}
            {wonProperties.length > 0 && (
                <div style={{ background: "rgba(15,15,15,0.6)", border: "1px solid rgba(74,222,128,0.1)", borderRadius: 20, padding: 28, marginBottom: 24, backdropFilter: "blur(20px)" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "#4ade80", display: "flex", alignItems: "center", gap: 8 }}>
                        <span>🏆</span> Won Auctions
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {wonProperties.map(p => (
                            <div key={p.id} style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.1)", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Final Price: <strong style={{ color: "#4ade80" }}>₹{p.currentBid?.toLocaleString()}</strong></div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                                        Agreement: {p.agreementBuyerSigned && p.agreementSellerSigned ? "✅ Fully Executed" : p.agreementBuyerSigned ? "🖋️ Seller Pending" : "⏳ Awaiting Signature"}
                                    </div>
                                </div>
                                <button onClick={() => navigate(`/agreement/${p.id}`)} style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", padding: "8px 16px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                                    View Agreement →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Account Settings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                <div style={{ background: "rgba(15,15,15,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28, backdropFilter: "blur(20px)" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>🔒 Security & Password</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>New Password</label>
                            <input 
                                type="password" 
                                style={{ ...inputStyle, marginTop: 8 }} 
                                placeholder="Min. 6 characters" 
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                        </div>
                        {passMsg.text && (
                            <div style={{ fontSize: 12, color: passMsg.type === "error" ? "#ff6b7a" : "#4ade80", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                                {passMsg.text}
                            </div>
                        )}
                        <button 
                            onClick={handleUpdatePassword} 
                            disabled={passLoading}
                            className="btn-primary" 
                            style={{ width: "auto", padding: "12px 24px", fontSize: 13 }}
                        >
                            {passLoading ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                </div>

                <div style={{ background: "rgba(15,15,15,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28, backdropFilter: "blur(20px)" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>🔔 Preferences</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                            ["Bid Alerts", "Receive notifications when you are outbid."],
                            ["Auction Updates", "Get updates on property status changes."],
                            ["Marketing", "Receive periodic newsletters and market insights."],
                            ["Two-Factor Auth", "Enhanced security for your account (Email-based)."]
                        ].map(([title, desc], i) => (
                            <div key={title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{desc}</div>
                                </div>
                                <div style={{ width: 40, height: 20, background: i < 2 ? "var(--red)" : "rgba(255,255,255,0.1)", borderRadius: 20, position: "relative", cursor: "pointer" }}>
                                    <div style={{ width: 14, height: 14, background: "#fff", borderRadius: "50%", position: "absolute", top: 3, left: i < 2 ? 23 : 3, transition: "all 0.2s" }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {loading && <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "3rem" }}>Loading your profile...</div>}

            {!loading && myListedProperties.length === 0 && wonProperties.length === 0 && registrations.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "2px dashed rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}>
                    No activity yet. Start by listing a property or bidding on an auction!
                </div>
            )}
        </div>
    );
}
