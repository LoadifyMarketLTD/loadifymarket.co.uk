/**
 * src/pages/Home.tsx — root "/" route
 *
 * Canonical homepage for Loadify Market.
 *
 * Sections (in order):
 *  1. TopBar + Header (fixed, pt-[152px] spacer to clear them)
 *  2. Hero — Browse Marketplace · Start Selling · Sign In
 *  3. Category slider
 *  4. Featured products (Browse the Marketplace)
 *  5. Trust strip
 *  6. Category grid (Shop by Category)
 *  7. Featured listings (tabbed)
 *  8. Seller Journey — transparent 5-step onboarding flow
 *  9. Why Choose — platform features
 * 10. How It Works — buyer purchase flow
 * 11. Platform Features comparison (buyer vs seller)
 * 12. CTA — Start Selling Today
 * 13. Footer
 */

import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategorySlider from "@/components/CategorySlider";
import FeaturedProducts from "@/components/FeaturedProducts";
import TrustStrip from "@/components/TrustStrip";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import SellerJourneySection from "@/components/SellerJourneySection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import PlatformFeatures from "@/components/PlatformFeatures";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";

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

        {/* Featured products — dark cinematic showcase */}
        <FeaturedProducts />

        {/* Trust strip — light transition */}
        <TrustStrip />

        {/* Below-fold sections deferred with IntersectionObserver to reduce
            initial DOM size. Components mount only when the user scrolls
            near them (rootMargin keeps a 300 px look-ahead). */}
        <LazySection>
          <CategoryGrid />
        </LazySection>

        <LazySection>
          <FeaturedListings />
        </LazySection>

        {/* Seller onboarding transparency — visually continues FeaturedListings dark block */}
        <LazySection>
          <SellerJourneySection />
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
