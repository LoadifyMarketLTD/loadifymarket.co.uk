/**
 * MobileAppLayout — mobile layout boundary.
 *
 * Capacitor keeps the established application navigation/interaction structure,
 * while both native and mobile web use the current Loadify Market colour system.
 */

import type { ReactNode } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { isCapacitorContext } from "@/lib/capacitorUtils";

interface MobileAppLayoutProps {
  children: ReactNode;
}

export default function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const isNativeApp = isCapacitorContext();

  return (
    <div
      className="min-h-screen bg-[#F8F7F4] text-[#0A234F]"
      data-surface={isNativeApp ? "capacitor-app" : "mobile-web"}
    >
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
