import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import CategoryBrowseSection from "@/components/catalog/CategoryBrowseSection";
import CategoryRouteVisualBanner from "@/components/catalog/CategoryRouteVisualBanner";
import "@/styles/visual-restore-homepage.css";

interface PublicPixelPerfectLayoutProps {
  children: ReactNode;
  navbar: ReactNode;
}

export default function PublicPixelPerfectLayout({ children, navbar }: PublicPixelPerfectLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add("pixel-perfect-public-active");
    return () => document.body.classList.remove("pixel-perfect-public-active");
  }, []);

  return (
    <div className="pixel-perfect-public min-h-screen bg-background text-foreground">
      {navbar}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[99999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <CategoryRouteVisualBanner />
      {location.pathname === "/catalog" ? (
        <div className="pt-16">
          <CategoryBrowseSection compact />
        </div>
      ) : null}
      {children}
      <Footer />
    </div>
  );
}
