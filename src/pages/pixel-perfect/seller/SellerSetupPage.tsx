import { Navigate, useLocation } from "react-router-dom";

/**
 * Legacy Stripe return bridge.
 *
 * Historical Stripe Account Links may still return to /seller/setup.
 * Keep the URL valid but route into the single canonical Marketplace
 * Seller onboarding/readiness surface.
 */
const SellerSetupPage = () => {
  const location = useLocation();

  return (
    <Navigate
      to={`/onboarding${location.search}`}
      replace
    />
  );
};

export default SellerSetupPage;