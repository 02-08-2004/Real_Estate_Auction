import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import PropertyCard from "../components/PropertyCard";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [allProperties, setAllProperties] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "properties"), where("status", "==", "active"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProperties(props);
      setResults(props);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = allProperties.filter(p => 
      p.title?.toLowerCase().includes(term) || 
      p.location?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
    setResults(filtered);
  }, [searchTerm, allProperties]);

  return (
    <div className="dashboard-content-wrapper" style={{ padding: "0 1.5rem 6rem" }}>
      <div style={{ maxWidth: 800, margin: "20px auto" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginBottom: 24, fontWeight: 500 }}>
          Search Properties
        </h1>
        
        <div style={{ 
          display: "flex", 
          gap: 12, 
          background: "rgba(255,255,255,0.05)", 
          padding: "12px 20px", 
          borderRadius: 16,
          border: "1px solid var(--glass-border)",
          marginBottom: 32,
          alignItems: "center"
        }}>
          <MagnifyingGlassIcon style={{ width: 24, color: "var(--text-muted)" }} />
          <input 
            type="text" 
            placeholder="Search by city, title, or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              background: "none", 
              border: "none", 
              color: "#fff", 
              flex: 1, 
              fontSize: 16, 
              outline: "none" 
            }}
          />
          <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <FunnelIcon style={{ width: 20 }} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <div className="loading-spinner" style={{ margin: "0 auto 16px" }}></div>
            <p style={{ color: "var(--text-muted)" }}>Finding architectural gems...</p>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span className="text-label">{results.length} Properties Found</span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {results.map(p => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
