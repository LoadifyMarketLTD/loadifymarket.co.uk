import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface MainLayoutProps {
  children: ReactNode;
  forceOpaque?: boolean;
}

export default function MainLayout({ children, forceOpaque = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Skip-to-content link — visible only on keyboard focus (WCAG 2.1 SC 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[99999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Header forceOpaque={forceOpaque} />
      {children}
      <Footer />
    </div>
  );
}
