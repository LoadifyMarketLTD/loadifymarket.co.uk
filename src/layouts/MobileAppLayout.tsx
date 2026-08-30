/**
 * MobileAppLayout — mobile-first shell used on viewports < 768 px.
 *
 * Mobile web uses the current premium light marketplace identity.
 * Capacitor keeps the existing installed-app shell and bottom navigation until
 * its separate device-update gate is complete.
 */

import type { ReactNode } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";
import WebMobileBottomNav from "@/components/WebMobileBottomNav";
import { isCapacitorContext } from "@/lib/capacitorUtils";

interface MobileAppLayoutProps {
  children: ReactNode;
}

export default function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const isNativeApp = isCapacitorContext();

  return (
    <div className={`min-h-screen ${isNativeApp ? 'bg-background' : 'bg-[#F8F7F4] text-[#0A234F]'}`}>
      <a
        href="#main-content"
        className={isNativeApp
          ? "sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:font-semibold focus:shadow-lg"
          : "sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-[#0A234F] focus:text-white focus:font-semibold focus:shadow-lg"}
      >
        Skip to main content
      </a>

      {children}

      <div className="h-[70px]" aria-hidden="true" />

      {isNativeApp ? <MobileBottomNav /> : <WebMobileBottomNav />}
    </div>
  );
}
