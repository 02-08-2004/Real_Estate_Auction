import { useAuth } from "../../context/AuthContext";
import { useBuyerStatus } from "../../hooks/useBuyerStatus";
import MarketplaceView from "../../components/MarketplaceView";
import LoadingIndicator from "../../components/LoadingIndicator";

export default function MarketplacePage() {
  const { currentUser, userData } = useAuth();
  const { loading, marketplaceAuctions = [] } = useBuyerStatus(currentUser, userData) || {};

  if (loading) return <LoadingIndicator message="Opening Marketplace..." />;
  return (
    <div className="dashboard-content-wrapper" style={{ padding: "0 2rem 2rem" }}>
      <MarketplaceView marketplaceAuctions={marketplaceAuctions} />
    </div>
  );
}
