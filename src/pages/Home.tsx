/**
 * src/pages/Home.tsx — root "/" route
 *
 * Canonical homepage for Loadify Market.
 * Replaces the old stub page with the full production-grade layout.
 *
 * Sections (in order):
 *  1. TopBar + Header (fixed, pt-[152px] spacer to clear them)
 *  2. Hero — Browse Marketplace · Start Selling · Sign In
 *  3. Category slider
 *  4. Featured products
 *  5. Deals section
 *  6. Trust strip
 *  7. Marketplace disclaimer
 *  8. Payment / Stripe trust
 *  9. Category grid (Shop by Category)
 * 10. Featured listings (tabbed)
 * 11. Platform features (For Buyers · Trust · For Sellers)
 * 12. Seller Journey — transparent 5-step onboarding flow
 * 13. How It Works — buyer purchase flow
 * 14. Platform Features comparison (buyer vs seller)
 * 15. CTA — Start Selling Today
 * 16. Footer
 */

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
import SellerJourneySection from "@/components/SellerJourneySection";
import HowItWorks from "@/components/HowItWorks";
import PlatformFeatures from "@/components/PlatformFeatures";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";
import { Info } from "lucide-react";

export default function Home() {
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

        {/* Marketplace disclaimer — visible above the fold as required */}
        <div className="bg-blue-50 border-y border-blue-100">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-2 text-center">
            <Info className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
            <p className="text-xs sm:text-sm text-blue-700 font-medium">
              Loadify Market does not hold or sell inventory. All products are listed, managed, and fulfilled by independent sellers.
            </p>
          </div>
        </div>

        <PaymentTrustSection />

        {/* Below-fold sections deferred with IntersectionObserver to reduce
            initial DOM size. Components mount only when the user scrolls
            near them (rootMargin keeps a 300 px look-ahead). */}
        <LazySection>
          <CategoryGrid />
        </LazySection>

        <LazySection>
          <FeaturedListings />
        </LazySection>

        <LazySection>
          <FeaturesSection />
        </LazySection>

        {/* Seller onboarding transparency — real 5-step activation flow */}
        <LazySection>
          <SellerJourneySection />
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
