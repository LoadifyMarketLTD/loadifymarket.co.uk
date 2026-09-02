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
  "/integrations",
  "/partners",
  "/developers",
  "/how-it-works",
  "/trust",
]);

export default function Header() {
  const { pathname } = useLocation();

  // Corporate presentation pages own their header/footer through PresentationLayout.
  // The global app header is reserved for marketplace/commercial routes only.
  if (presentationPaths.has(pathname)) return null;

  return <MarketplaceHeader />;
}
