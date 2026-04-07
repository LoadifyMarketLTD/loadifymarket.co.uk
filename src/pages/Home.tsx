/**
 * src/pages/Home.tsx — root "/" route
 *
 * Canonical homepage for Loadify Market.
 * Section order:
 *
 *  1. Header (fixed, pt-[112px] spacer to clear it)
 *  2. Hero
 *  3. Trust/Benefits strip — immediately under hero
 *  4. Marketplace block
 *     4a. Category slider
 *     4b. Browse the Marketplace (FeaturedProducts)
 *     4c. Shop by Category (CategoryGrid)
 *     4d. Featured Listings — 3 feature image cards
 *  5. Why + How block
 *     5a. Why Choose Loadify Market (FeaturesSection)
 *     5b. Platform Features — buyer vs seller
 *     5c. How It Works — buyer flow
 *  6. Seller Journey CTA
 *  7. Footer
 */

import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import CategorySlider from "@/components/CategorySlider";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import FeaturesSection from "@/components/FeaturesSection";
import PlatformFeatures from "@/components/PlatformFeatures";
import HowItWorks from "@/components/HowItWorks";
import SellerJourneySection from "@/components/SellerJourneySection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1930] font-sans antialiased">
      <Header />
      {/* spacer: 64px header row + 48px category nav */}
      <div className="pt-[112px]" />
      <main>
        {/* 1 — Hero */}
        <HeroSection />

        {/* 2 — Trust/Benefits — immediately below hero */}
        <TrustStrip />

        {/* 3 — Marketplace block: categories → products → grid → featured */}
        <LazySection>
          <CategorySlider />
        </LazySection>

        <LazySection>
          <FeaturedProducts />
        </LazySection>

        <LazySection>
          <CategoryGrid />
        </LazySection>

        <LazySection>
          <FeaturedListings />
        </LazySection>

        {/* 4 — Why + How block */}
        <LazySection>
          <FeaturesSection />
        </LazySection>

        <LazySection>
          <PlatformFeatures />
        </LazySection>

        <LazySection>
          <HowItWorks />
        </LazySection>

        {/* 5 — Seller Journey CTA */}
        <LazySection>
          <SellerJourneySection />
        </LazySection>
      </main>

      <LazySection>
        <Footer />
      </LazySection>
    </div>
  );
}

