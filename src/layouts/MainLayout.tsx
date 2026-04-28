import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-transparent">
      {/* Skip-to-content link — visible only on keyboard focus (WCAG 2.1 SC 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      {children}
      <Footer />
      {/* Spacer so footer content isn't hidden behind the fixed bottom nav on mobile */}
      <div className="h-[70px] md:hidden" aria-hidden="true" />
      <MobileBottomNav />
    </div>
  );
}
