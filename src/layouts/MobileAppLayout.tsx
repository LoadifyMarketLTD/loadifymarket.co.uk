/**
 * MobileAppLayout — mobile layout boundary.
 *
 * Mobile web keeps the current public marketplace shell. Capacitor keeps the
 * established installed-app shell and must not inherit website visual redesigns.
 */

import type { ReactNode } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { LegacyNativeBottomNav } from "@/components/native/LegacyNativeMarketplace";
import { isCapacitorContext } from "@/lib/capacitorUtils";

interface MobileAppLayoutProps {
  children: ReactNode;
}

export default function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const isNativeApp = isCapacitorContext();

  return (
    <div
      className={isNativeApp ? "min-h-screen text-white" : "min-h-screen bg-[#F8F7F4] text-[#0A234F]"}
      style={isNativeApp ? { background: '#0A0E1A' } : undefined}
    >
      <a
        href="#main-content"
        className={isNativeApp
          ? "sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-[#F2B84B] focus:text-black focus:font-semibold focus:shadow-lg"
          : "sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-[#0A234F] focus:text-white focus:font-semibold focus:shadow-lg"}
      >
        Skip to main content
      </a>

      {children}

      <div className="h-[70px]" aria-hidden="true" />

      {isNativeApp ? <LegacyNativeBottomNav /> : <MobileBottomNav />}
    </div>
  );
}
