import { useLocation } from "react-router-dom";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import PresentationHeader from "@/components/presentation/PresentationHeader";

const presentationPaths = new Set([
  "/",
  "/platform",
  "/buyers",
  "/sellers",
  "/trade",
  "/suppliers",
  "/integrations",
  "/partners",
  "/developers",
  "/how-it-works",
  "/trust",
]);

export default function Header() {
  const { pathname } = useLocation();
  return presentationPaths.has(pathname) ? <PresentationHeader /> : <MarketplaceHeader />;
}
