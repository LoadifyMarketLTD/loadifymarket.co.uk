/**
 * MobileAppLayout — mobile-first shell used on viewports < 768 px by both the
 * mobile website and the Capacitor app.
 *
 * Provides:
 *  - warm light marketplace background matching the public web identity;
 *  - bottom safe-area padding so content is never hidden behind the nav bar;
 *  - MobileBottomNav fixed at the bottom;
 *  - a spacer above MobileBottomNav so the final content remains reachable.
 *
 * Individual pages remain responsible for their own page-level mobile headers.
 */

import type { ReactNode } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";

interface MobileAppLayoutProps {
  children: ReactNode;
}

export default function MobileAppLayout({ children }: MobileAppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#0A234F]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-[#0A234F] focus:text-white focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {children}

      <div className="h-[70px]" aria-hidden="true" />

      <MobileBottomNav />
    </div>
  );
}
