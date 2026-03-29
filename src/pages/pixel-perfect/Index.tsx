import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";
import { Info, Building2 } from "lucide-react";

export default function PixelPerfectIndex() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] font-sans antialiased">
      <TopBar />
      <Header />
      {/* spacer: 40px top bar + 64px header row + 48px category nav */}
      <div className="pt-[152px]" />
      <main>
        {/* SECTION 3 — Hero */}
        <HeroSection />

        {/* SECTION 4 — Trust Bar */}
        <TrustStrip />

        {/* SECTION 5 — Category Grid */}
        <LazySection>
          <CategoryGrid />
        </LazySection>

        {/* SECTION 6 — Featured Listings */}
        <LazySection>
          <FeaturedListings />
        </LazySection>

        {/* SECTION 7 — Why Choose Loadify Market */}
        <LazySection>
          <FeaturesSection />
        </LazySection>

        {/* SECTION 8 — How It Works */}
        <LazySection>
          <HowItWorks />
        </LazySection>

        {/* SECTION 9 — Seller CTA Block */}
        <LazySection>
          <CTASection />
        </LazySection>

        {/* SECTION 10 — Marketplace Disclaimer / Legal Clarity */}
        <div className="bg-slate-50 border-y border-slate-200 py-8">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="flex items-start gap-3 flex-1">
                <Info className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] mb-1">
                    Marketplace Notice
                  </p>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Loadify Market does not hold or sell inventory. All products are listed, managed, and fulfilled by independent sellers.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 flex-1">
                <Building2 className="h-5 w-5 text-[#64748B] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] mb-1">
                    Legal Operator
                  </p>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Loadify Market is operated by XDrive Logistics Ltd (UK). Company No: 13171804.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* SECTION 11 — Footer */}
      <LazySection>
        <Footer />
      </LazySection>
    </div>
  );
}
