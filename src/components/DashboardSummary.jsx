import { useNavigate } from "react-router-dom";
import PropertyCard from "./PropertyCard";

export default function DashboardSummary({ userData, stats, activeBiddedProperties, bidsMap, currentUser }) {
  const navigate = useNavigate();
  const { wonCount, totalSpent, activeBidsCount, savedCount } = stats;

  const StatCard = ({ label, value, icon, color, accent }) => (
    <div style={{
      background: "rgba(255,255,255,0.08)",
      border: `1px solid ${accent || "rgba(255,255,255,0.12)"}`,
      borderRadius: 20,
      padding: "24px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      backdropFilter: "blur(12px)",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "default"
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 12px 40px ${accent || "rgba(255,255,255,0.05)"}40`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.55)", letterSpacing: 1.8, textTransform: "uppercase" }}>{label}</span>
        <span style={{
          fontSize: 22,
          width: 44, height: 44,
          background: accent ? `${accent}20` : "rgba(255,255,255,0.07)",
          borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || "#fff", letterSpacing: -0.5 }}>{value}</div>
    </div>
  );

  const registeredAuctions = activeBiddedProperties || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, margin: 0, fontWeight: 500, color: "#fff" }}>
          My Auctions
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>
          Your active registrations and auction performance at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-dashboard">
        <StatCard label="Active Bids" value={activeBidsCount} icon="🏦" color="var(--primary)" accent="rgba(210,31,60,0.6)" />
        <StatCard label="Won Auctions" value={wonCount} icon="🏆" color="#4ade80" accent="rgba(74,222,128,0.4)" />
        <StatCard label="Saved Items" value={savedCount} icon="❤️" color="#fb7185" accent="rgba(251,113,133,0.4)" />
        <StatCard label="Total Spent" value={`₹${(totalSpent || 0).toLocaleString()}`} icon="💳" color="#60a5fa" accent="rgba(96,165,250,0.4)" />
      </div>

      {/* Registered Auctions */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 500,
              color: "#fff",
              margin: 0
            }}>
              Registered Auctions
            </h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
              Auctions you have placed a bid on
            </p>
          </div>
          {registeredAuctions.length > 0 && (
            <span style={{
              background: "rgba(210,31,60,0.15)",
              border: "1px solid rgba(210,31,60,0.3)",
              color: "var(--primary)",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.5,
              padding: "5px 14px",
              borderRadius: 99
            }}>
              {registeredAuctions.length} ACTIVE
            </span>
          )}
        </div>

        {registeredAuctions.length === 0 ? (
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: 20,
            padding: "60px 40px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: 500, marginBottom: 8 }}>
              No Registered Auctions Yet
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "0 0 24px" }}>
              Browse the marketplace and place a bid to register for an auction.
            </p>
            <button
              onClick={() => navigate("/marketplace")}
              className="btn-primary"
              style={{ padding: "12px 28px", fontSize: 13 }}
            >
              Browse Marketplace →
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
            {registeredAuctions.map(p => (
              <PropertyCard key={p.id} property={p} bids={bidsMap?.[p.id] || []} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
