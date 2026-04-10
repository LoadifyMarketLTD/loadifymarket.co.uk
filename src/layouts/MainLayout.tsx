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
      <Header forceOpaque={forceOpaque} />
      {children}
      <Footer />
    </div>
  );
}
