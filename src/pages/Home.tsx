/**
 * src/pages/Home.tsx — root "/" route
 *
 * MOBILE (< md / 768 px):
 *   MobileTopBar (fixed) → Search → Categories → HeroBanner → InfiniteFeed → BottomNav
 *
 * DESKTOP (>= md / 768 px):
 *   GlobalHeader → HeroSection (full-screen) → TrustStrip → FeaturesGrid →
 *   SocialFollowSection → HowItWorksSection → SecurityTrust → SellerCTA → Footer
 */

import { Helmet } from "react-helmet-async";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

// Mobile-only components
import MobileTopBar from "@/components/MobileTopBar";
import MobileSearchBar from "@/components/MobileSearchBar";
import MobileCategoryShortcuts from "@/components/MobileCategoryShortcuts";
import MobileHeroBanner from "@/components/MobileHeroBanner";
import MobileInfiniteFeed from "@/components/MobileInfiniteFeed";

// Desktop-only components
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SocialFollowSection from "@/components/SocialFollowSection";
import SellerCTA from "@/components/SellerCTA";
import LazySection from "@/components/LazySection";

export default function Home() {
  return (
    <MainLayout>
      {/* Preload LCP hero image for desktop */}
      <Helmet>
        <link
          rel="preload"
          as="image"
          href="/hero-gold.jpeg"
          type="image/jpeg"
          // @ts-expect-error — fetchpriority is a valid HTML attr not yet in React types
          fetchpriority="high"
        />
      </Helmet>
      <SEO
        title="The UK Marketplace Built for Modern Sellers — 0% Commission | Loadify Market"
        description="Sell products, manage orders, and get paid — all in one secure platform. 0% commission until 31 December 2026. Free to list, no monthly charges."
        canonical="/"
      />

      {/* Fixed mobile top bar (hidden on desktop) */}
      <MobileTopBar />

      <main id="main-content">

        {/* ── MOBILE layout (< md) ─────────────────────────────────────────
            Stacks below the fixed 56px top bar via pt-14.
            No product sections from the marketing layout here — just the
            0% commission hero and the continuous infinite product feed.
        ───────────────────────────────────────────────────────────────── */}
        <div className="md:hidden bg-[#0B0B0F] pt-14">

          {/* Search input */}
          <MobileSearchBar />

          {/* Horizontal category shortcuts */}
          <MobileCategoryShortcuts />

          {/* 0% COMMISSION hero banner */}
          <MobileHeroBanner />

          {/* Continuous 2-column infinite product feed */}
          <MobileInfiniteFeed />

          {/* Spacer so content isn't hidden behind the fixed bottom nav */}
          <div className="h-24" aria-hidden="true" />

        </div>

        {/* ── DESKTOP layout (>= md) — unchanged ──────────────────────────
            HeroSection is desktop-only; the mobile banner is above.
        ───────────────────────────────────────────────────────────────── */}
        <div className="hidden md:block">

          {/* Full-screen hero with gold background image */}
          <HeroSection />

          {/* Platform overview section */}
          <section
            className="bg-[#020617] py-6 px-8"
            aria-label="Platform overview"
          >
            <TrustStrip />

            <div className="mt-8">
              <FeaturesGrid />
            </div>

            <div className="mt-8">
              <SocialFollowSection />
            </div>

            <LazySection rootMargin="300px">
              <div className="mt-8">
                <HowItWorksSection />
              </div>
              <div className="mt-8">
                <SecurityTrust />
              </div>
            </LazySection>
          </section>

          {/* Seller call-to-action */}
          <SellerCTA />

        </div>

      </main>
    </MainLayout>
  );
}
