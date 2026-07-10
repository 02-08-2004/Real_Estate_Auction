import { useAuth } from "../../context/AuthContext";
import { useBuyerStatus } from "../../hooks/useBuyerStatus";
import PropertyCard from "../../components/PropertyCard";
import LoadingIndicator from "../../components/LoadingIndicator";

export default function SavedPage() {
  const { currentUser, userData } = useAuth();
  const { loading, savedProperties = [] } = useBuyerStatus(currentUser, userData) || {};

  if (loading) return <LoadingIndicator message="Opening Watchlist..." />;

  return (
    <div className="dashboard-content-wrapper" style={{ padding: "0 2rem 4rem" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: 0, fontWeight: 500 }}>Property Watchlist</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Track properties of interest and get notified about upcoming auction schedules.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 32 }}>
        {savedProperties.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "100px", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>❤️</div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>Your watchlist is empty. Save properties of interest to track them здесь.</div>
          </div>
        ) : (
          savedProperties.map(p => <PropertyCard key={p.id} property={p} />)
        )}
      </div>
    </div>
  );
}
