import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { isCapacitorContext } from "@/lib/capacitorUtils";
import MobileAppLayout from "./MobileAppLayout";
import DesktopLayout from "./DesktopLayout";
import PresentationLayout from "./PresentationLayout";

const presentationPaths = new Set([
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

interface MainLayoutProps { children: ReactNode; }

export default function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const isNativeApp = isCapacitorContext();
  const { pathname } = useLocation();

  if (isNativeApp) return <MobileAppLayout>{children}</MobileAppLayout>;
  if (presentationPaths.has(pathname)) return <PresentationLayout>{children}</PresentationLayout>;
  return isMobile ? <MobileAppLayout>{children}</MobileAppLayout> : <DesktopLayout>{children}</DesktopLayout>;
}
