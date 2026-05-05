/**
 * MainLayout — universal layout wrapper.
 *
 * Dynamically switches between two layout shells based on the current viewport:
 *
 *   Mobile (< 768 px) → MobileAppLayout
 *     Dark app background, MobileBottomNav, no desktop Footer, no desktop Header.
 *     Matches the APK experience exactly.
 *
 *   Desktop (>= 768 px) → DesktopLayout
 *     Transparent background, desktop Footer.
 *     The desktop Header is rendered globally in App.tsx.
 *
 * Usage is unchanged — pages wrap their content in <MainLayout> as before.
 */

import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileAppLayout from "./MobileAppLayout";
import DesktopLayout from "./DesktopLayout";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();

  return isMobile
    ? <MobileAppLayout>{children}</MobileAppLayout>
    : <DesktopLayout>{children}</DesktopLayout>;
}
