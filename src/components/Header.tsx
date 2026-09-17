import { Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { isCapacitorContext } from "@/lib/capacitorUtils";

const MarketplaceHeader = lazy(() => import("@/components/marketplace/MarketplaceHeader"));

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

function isNativeSellerProductEditorRoute(pathname: string): boolean {
  return pathname === "/seller/products/new" || (pathname.startsWith("/seller/products/") && pathname.endsWith("/edit"));
}

export default function Header() {
  const { pathname } = useLocation();

  if (isCapacitorContext() && isNativeSellerProductEditorRoute(pathname)) {
    return null;
  }

  if (isCapacitorContext() && isNativeProfessionalRoute(pathname)) {
    return <Navigate to="/marketplace" replace />;
  }

  if (presentationPaths.has(pathname)) return null;
  return <Suspense fallback={null}><MarketplaceHeader /></Suspense>;
}