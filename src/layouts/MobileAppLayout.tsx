/**
 * MobileAppLayout — mobile-first shell used on viewports < 768 px.
 *
 * Provides:
 *  - Dark app background (#0A0E1A) consistent with the APK
 *  - Bottom safe-area padding so content is never hidden behind the nav bar
 *  - MobileBottomNav fixed at the bottom
 *  - A spacer element above MobileBottomNav so the last piece of content is reachable
 *
 * Does NOT include:
 *  - The desktop Header (hidden on mobile via Header's own `hidden md:block` class)
 *  - The desktop Footer
 *
 * Individual pages are responsible for their own page-level header on mobile
 * (e.g. MobileAppHeader on the home page, a back-button bar on product detail).
 */

import type { ReactNode } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";

interface MobileAppLayoutProps {
  children: ReactNode;
}

export default function MobileAppLayout({ children }: MobileAppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Skip-to-content link — visible only on keyboard focus (WCAG 2.1 SC 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {children}

      {/* Spacer so the last content row isn't hidden behind the fixed bottom nav */}
      <div className="h-[70px]" aria-hidden="true" />

      <MobileBottomNav />
    </div>
  );
}
