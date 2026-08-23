import { useEffect, type ReactNode } from "react";
import Footer from "@/components/Footer";
import "@/styles/visual-restore-homepage.css";

interface PublicPixelPerfectLayoutProps {
  children: ReactNode;
  navbar: ReactNode;
}

export default function PublicPixelPerfectLayout({ children, navbar }: PublicPixelPerfectLayoutProps) {
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
      {children}
      <Footer />
    </div>
  );
}
