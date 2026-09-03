import type { ReactNode } from "react";
import PresentationHeader from "@/components/presentation/PresentationHeader";
import Footer from "@/components/Footer";

export default function PresentationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#0A234F]">
      <PresentationHeader />
      {children}
      <Footer />
    </div>
  );
}
