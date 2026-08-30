/**
 * MobileAppLayout — app-style shell for all mobile viewports.
 *
 * Mobile web intentionally mirrors the native application structure: compact
 * content surfaces, fixed bottom app navigation and no desktop website footer.
 */

import type { ReactNode } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";

interface MobileAppLayoutProps {
  children: ReactNode;
}

export default function MobileAppLayout({ children }: MobileAppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {children}

      <div className="h-[70px]" aria-hidden="true" />

      <MobileBottomNav />
    </div>
  );
}
