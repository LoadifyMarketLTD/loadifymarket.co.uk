/**
 * src/pages/Home.tsx — root "/" route
 *
 * Canonical homepage for Loadify Market.
 * Section order matches approved mockup:
 *
 *  1. TopBar + Header (fixed, pt-[152px] spacer to clear them)
 *  2. Hero
 *  3. Category slider
 *  4. Trust strip
 *  5. Browse the Marketplace (FeaturedProducts)
 *  6. Shop by Category (CategoryGrid)
 *  7. Featured Listings — 3 feature image cards
 *  8. Why Choose Loadify Market — same visual weight
 *  9. How Selling Works — 3 step cards + CTA
 * 10. How It Works — buyer flow
 * 11. Platform Features — buyer vs seller
 * 12. CTA — Start Selling Today
 * 13. Footer
 */

import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategorySlider from "@/components/CategorySlider";
import TrustStrip from "@/components/TrustStrip";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import FeaturesSection from "@/components/FeaturesSection";
import SellerJourneySection from "@/components/SellerJourneySection";
import HowItWorks from "@/components/HowItWorks";
import PlatformFeatures from "@/components/PlatformFeatures";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1930] font-sans antialiased">
      <TopBar />
      <Header />
      {/* spacer: 40px top bar + 64px header row + 48px category nav */}
      <div className="pt-[152px]" />
      <main>
        <HeroSection />

        {/* Category strip — horizontal scroll, icon + label per category */}
        <CategorySlider />

        {/* Trust strip — credibility before visual browsing */}
        <TrustStrip />

        {/* Browse the Marketplace — 3 product cards with prices */}
        <LazySection>
          <FeaturedProducts />
        </LazySection>

        {/* Shop by Category — 3 large category cards + 4 product cards */}
        <LazySection>
          <CategoryGrid />
        </LazySection>

        {/* Featured Listings — 3 wide feature image cards */}
        <LazySection>
          <FeaturedListings />
        </LazySection>

        {/* Why Choose — same visual weight as Featured Listings */}
        <LazySection>
          <FeaturesSection />
        </LazySection>

        {/* How Selling Works — 3 step cards + Start Selling Today CTA */}
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

