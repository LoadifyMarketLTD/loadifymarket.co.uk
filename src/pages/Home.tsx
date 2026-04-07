/**
 * src/pages/Home.tsx — root "/" route
 *
 * Canonical homepage for Loadify Market.
 * Section order:
 *
 *  1. Header (fixed, pt-[112px] spacer to clear it)
 *  2. UrgencyBar — 0% commission banner
 *  3. Hero
 *  4. SocialProof strip — stats under hero
 *  5. Trust/Benefits strip
 *  6. Marketplace block (single shared wrapper)
 *     6a. Browse the Marketplace (FeaturedProducts) → MicroCTA
 *     6b. Shop by Category (CategoryGrid)
 *     6c. Featured Listings — 3 feature image cards
 *  7. Why Choose Loadify Market (FeaturesSection)
 *  8. Why + How block (single shared wrapper)
 *     8a. Platform Features — buyer vs seller → MicroCTA
 *     8b. How It Works — buyer flow
 *  9. Seller Journey CTA
 * 10. Footer
 * 11. StickyCTA — mobile-only fixed bottom button
 */

import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import FeaturesSection from "@/components/FeaturesSection";
import PlatformFeatures from "@/components/PlatformFeatures";
import HowItWorks from "@/components/HowItWorks";
import SellerJourneySection from "@/components/SellerJourneySection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";
import UrgencyBar from "@/components/UrgencyBar";
import SocialProof from "@/components/SocialProof";
import MicroCTA from "@/components/ui/MicroCTA";
import StickyCTA from "@/components/StickyCTA";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1930] font-sans antialiased">
      <Header />
      {/* spacer: 64px header row + 48px category nav */}
      <div className="pt-[112px]" />

      {/* Urgency bar — immediately below header */}
      <UrgencyBar />

      <main>
        {/* 1 — Hero */}
        <HeroSection />

        {/* 2 — Social proof stats — immediately under hero */}
        <SocialProof />

        {/* 3 — Trust/Benefits */}
        <TrustStrip />

        {/* 4 — Marketplace block: all discovery content in one shared wrapper */}
        <LazySection>
          <div>
            <FeaturedProducts />
            <MicroCTA text="Browse All Listings" link="/catalog" />
            <CategoryGrid />
            <FeaturedListings />
          </div>
        </LazySection>

        {/* 5 — Why Choose Loadify Market */}
        <LazySection>
          <FeaturesSection />
        </LazySection>

        {/* 6 — Why + How block: platform features + buyer flow in one shared wrapper */}
        <LazySection>
          <div>
            <PlatformFeatures />
            <MicroCTA text="Start Selling Today" link="/register" />
            <div className="h-px bg-white/10 w-full" />
            <HowItWorks />
          </div>
        </LazySection>

        {/* 7 — Seller Journey CTA */}
        <LazySection>
          <SellerJourneySection />
        </LazySection>
      </main>

      <LazySection>
        <Footer />
      </LazySection>

      {/* Mobile-only sticky CTA */}
      <StickyCTA />
    </div>
  );
}

