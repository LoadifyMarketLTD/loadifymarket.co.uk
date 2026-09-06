import { Navigate, useLocation } from "react-router-dom";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import { isCapacitorNative } from "@/lib/capacitorUtils";

const presentationPaths = new Set([
  "/",
  "/platform",
  "/buyers",
  "/sellers",
  "/business",
  "/trade",
  "/suppliers",
  "/technology",
  "/integrations",
  "/partners",
  "/developers",
  "/how-it-works",
  "/trust",
]);

const nativeProfessionalPaths = new Set([
  ...presentationPaths,
  "/trade-account",
  "/wholesale-info",
  "/dashboard",
  "/seller",
  "/seller/setup",
  "/seller/analytics",
  "/seller/payouts",
  "/seller/promote",
]);

const nativeProfessionalPrefixes = [
  "/admin",
  "/buyer",
  "/seller/products",
  "/seller/orders",
  "/seller/shipments",
  "/seller/returns",
  "/seller/reviews",
  "/seller/settings",
  "/seller/notifications",
  "/seller/messages",
];

function isNativeProfessionalRoute(pathname: string): boolean {
  return nativeProfessionalPaths.has(pathname) || nativeProfessionalPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function Header() {
  const { pathname } = useLocation();

  if (isCapacitorNative() && isNativeProfessionalRoute(pathname)) {
    return <Navigate to="/marketplace" replace />;
  }

  if (presentationPaths.has(pathname)) return null;
  return <MarketplaceHeader />;
}