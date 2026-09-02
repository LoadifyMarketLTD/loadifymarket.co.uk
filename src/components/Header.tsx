import { useLocation } from "react-router-dom";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";

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

export default function Header() {
  const { pathname } = useLocation();
  if (presentationPaths.has(pathname)) return null;
  return <MarketplaceHeader />;
}
