// src/pages/BuyerDashboard.jsx
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import PropertyCard from "../components/PropertyCard";

export default function BuyerDashboard() {
  const { currentUser, logout } = useAuth();
  const [properties, setProperties] = useState([]);
  const [bidsMap, setBidsMap] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "bids"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const bid = { id: d.id, ...d.data() };
        if (!map[bid.propertyId]) map[bid.propertyId] = [];
        map[bid.propertyId].push(bid);
      });
      setBidsMap(map);
    });
    return unsub;
  }, []);

  const filtered = properties.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.location?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="dashboard-layout">
      <div className="topbar">
        <div className="topbar-logo">Estate<span>Auction</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:16 }}>
          <div style={{ fontSize:13,color:"rgba(255,255,255,0.5)" }}>
            {currentUser?.displayName || currentUser?.email}
          </div>
          <button onClick={handleLogout} style={{
            background:"transparent",border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:8,padding:"6px 16px",color:"rgba(255,255,255,0.6)",
            fontSize:13,cursor:"pointer",fontFamily:"var(--font-body)",
            transition:"all 0.2s"
          }}
            onMouseEnter={e=>{ e.target.style.borderColor="var(--red)"; e.target.style.color="#fff"; }}
            onMouseLeave={e=>{ e.target.style.borderColor="rgba(255,255,255,0.1)"; e.target.style.color="rgba(255,255,255,0.6)"; }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding:"1.5rem 2rem 0" }}>
        <div style={{ position:"relative",maxWidth:400 }}>
          <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.3)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </span>
          <input
            style={{
              width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:10,padding:"10px 14px 10px 38px",color:"#fff",fontSize:14,
              fontFamily:"var(--font-body)",outline:"none"
            }}
            placeholder="Search properties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Heading */}
      <div style={{ padding:"1.5rem 2rem 0",display:"flex",alignItems:"baseline",gap:12 }}>
        <h2 style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:500 }}>Live Auctions</h2>
        <span style={{ fontSize:13,color:"rgba(255,255,255,0.3)" }}>{filtered.length} properties</span>
      </div>

      {loading ? (
        <div style={{ textAlign:"center",padding:"4rem",color:"rgba(255,255,255,0.3)",fontSize:14 }}>
          Loading properties...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center",padding:"4rem",color:"rgba(255,255,255,0.3)",fontSize:14 }}>
          No properties found.
        </div>
      ) : (
        <div className="properties-grid">
          {filtered.map(p => (
            <PropertyCard key={p.id} property={p} bids={bidsMap[p.id] || []} />
          ))}
        </div>
      )}
    </div>
  );
}
