import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategorySlider from "@/components/CategorySlider";
import FeaturedProducts from "@/components/FeaturedProducts";
import DealsSection from "@/components/DealsSection";
import TrustStrip from "@/components/TrustStrip";
import PaymentTrustSection from "@/components/PaymentTrustSection";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import PlatformFeatures from "@/components/PlatformFeatures";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";
import { Info } from "lucide-react";

export default function PixelPerfectIndex() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] font-sans antialiased">
      <TopBar />
      <Header />
      {/* spacer: 40px top bar + 64px header row + 48px category nav */}
      <div className="pt-[152px]" />
      <main>
        <HeroSection />
        {/* Category strip — horizontal scroll, icon + label per category */}
        <CategorySlider />
        {/* Featured products grid — 4 columns, 12 products */}
        <FeaturedProducts />
        {/* Deals / promo banner cards */}
        <DealsSection />
        <TrustStrip />
        {/* Marketplace disclaimer — visible on homepage as required */}
        <div className="bg-blue-50 border-y border-blue-100">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-2 text-center">
            <Info className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
            <p className="text-xs sm:text-sm text-blue-700 font-medium">
              Loadify Market does not hold or sell inventory. All products are listed, managed, and fulfilled by independent sellers.
            </p>
          </div>
        </div>
        <PaymentTrustSection />
        <LazySection>
          <CategoryGrid />
        </LazySection>
        {/* Below-fold sections: deferred with IntersectionObserver to reduce
            the initial DOM node count from ~1,200 down toward the recommended
            maximum of 800 elements. Components mount only when the user
            scrolls near them (rootMargin keeps a 300 px look-ahead). */}
        <LazySection>
          <FeaturedListings />
        </LazySection>
        <LazySection>
          <FeaturesSection />
        </LazySection>
        <LazySection>
          <HowItWorks />
        </LazySection>
        <LazySection>
          <PlatformFeatures />
        </LazySection>
        <LazySection>
          <CTASection />
        </LazySection>
      </main>
      <LazySection>
        <Footer />
      </LazySection>
    </div>
  );
}
