/**
 * MobileAppLayout — mobile-first shell used on viewports < 768 px.
 *
 * The shell owns the Android/mobile viewport instead of letting the document
 * body scroll underneath the OS status/navigation bars.  This gives every page
 * one predictable scroll region and one owner for the top safe-area inset.
 *
 * Provides:
 *  - 100dvh application viewport
 *  - Top safe-area ownership for edge-to-edge Android windows
 *  - A dedicated vertical scroll region for page content
 *  - Bottom reachability above MobileBottomNav
 *  - MobileBottomNav fixed at the bottom
 *
 * Individual pages still own their page-level headers/content.  They must not
 * add a second top safe-area inset when rendered inside this shell.
 */

import type { ReactNode } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";

interface MobileAppLayoutProps {
  children: ReactNode;
}

export default function MobileAppLayout({ children }: MobileAppLayoutProps) {
  return (
    <div
      className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Skip-to-content link — visible only on keyboard focus (WCAG 2.1 SC 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        data-mobile-scroll-region
      >
        {children}

        {/*
         * Keep the final content reachable above the fixed navigation bar.
         * The nav itself owns the bottom safe-area padding; this spacer mirrors
         * only the occupied visual space so pages do not need magic 70px pads.
         */}
        <div
          style={{
            height: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
          }}
          aria-hidden="true"
        />
      </div>

      <MobileBottomNav />
    </div>
  );
}
