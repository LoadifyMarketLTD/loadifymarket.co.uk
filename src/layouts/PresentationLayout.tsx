import type { ReactNode } from "react";
import PresentationFooter from "@/components/presentation/PresentationFooter";

export default function PresentationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#0A234F]">
      {children}
      <PresentationFooter />
    </div>
  );
}
