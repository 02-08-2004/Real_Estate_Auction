import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import PropertyCard from "./PropertyCard";

export default function MarketplaceView({ marketplaceAuctions }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const trendingAuctions = [...marketplaceAuctions].sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0)).slice(0, 3);
  const trendingIds = trendingAuctions.map(p => p.id);
  
  const filteredAuctions = marketplaceAuctions.filter(p => 
    (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.location.toLowerCase().includes(searchQuery.toLowerCase())) &&
    !trendingIds.includes(p.id)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ marginBottom: -10 }}>
         <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: 0, fontWeight: 500 }}>Live Auctions</h1>
         <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Currently active properties scheduled by verified sellers.</p>
      </div>


      {/* TRENDING SECTION */}
      {trendingAuctions.length > 0 && !searchQuery && (
        <section style={{ paddingBottom: 80 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div>
                   <h3 className="text-label" style={{ color: "var(--primary)", marginBottom: 12 }}>Trending</h3>
                   <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: 0, fontWeight: 400 }}>Most Anticipated Auctions</h2>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>RANKED BY BIDDER INTEREST</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
                {trendingAuctions.map(p => <PropertyCard key={p.id} property={p} variant="featured" />)}
            </div>
        </section>
      )}

      {/* MAIN LISTINGS */}
      <section style={{ paddingBottom: 80 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h3 className="text-label" style={{ color: "var(--primary)", marginBottom: 12 }}>Inventory</h3>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: 0, fontWeight: 400 }}>
              {searchQuery ? `Search Results for "${searchQuery}"` : "Global Marketplace"}
            </h2>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
          {filteredAuctions.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "100px", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px dashed rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>🔎</div>
              <div style={{ fontSize: 16 }}>No matches found.</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Try adjusting your keywords or browsing categories.</div>
            </div>
          ) : (
            filteredAuctions.map(p => <PropertyCard key={p.id} property={p} />)
          )}
        </div>
      </section>
    </div>
  );
}
