/**
 * DesktopLayout — desktop shell used on viewports >= 768 px.
 *
 * Provides:
 *  - Transparent background (pages set their own backgrounds)
 *  - Desktop Footer at the bottom of every page
 *
 * Does NOT include:
 *  - The desktop Header — that is rendered globally in App.tsx so it sits at
 *    z-index 40 above all page content without being inside the scroll flow.
 *  - MobileBottomNav (desktop has no bottom nav)
 *
 * Pages that use DesktopLayout are expected to offset their top-level <main>
 * element by `md:pt-28` (or similar) to clear the fixed desktop Header.
 */

import type { ReactNode } from "react";
import Footer from "@/components/Footer";

interface DesktopLayoutProps {
  children: ReactNode;
}

export default function DesktopLayout({ children }: DesktopLayoutProps) {
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

      <Footer />
    </div>
  );
}
