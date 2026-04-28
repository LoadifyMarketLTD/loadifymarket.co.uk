/**
 * src/pages/Home.tsx — root "/" route
 *
 * Mobile (< md / 768 px):
 *   Hero → MobileCategoryShortcuts → MobileProductSection →
 *   TrustStrip → SellerCTA → Footer → MobileBottomNav (via MainLayout)
 *
 * Desktop (>= md / 768 px) — unchanged:
 *   Hero → TrustStrip → SocialFollowSection → HowItWorksSection →
 *   FeaturesGrid + SecurityTrust → SellerCTA → Footer
 */

import { Helmet } from "react-helmet-async";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SocialFollowSection from "@/components/SocialFollowSection";
import SellerCTA from "@/components/SellerCTA";
import LazySection from "@/components/LazySection";
import MobileCategoryShortcuts from "@/components/MobileCategoryShortcuts";
import MobileProductSection from "@/components/MobileProductSection";

export default function Home() {
  return (
    <MainLayout>
      {/* Preload the LCP hero image only on the homepage */}
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

      <main id="main-content">

        {/* ── 1. Hero ──────────────────────────────────────────────────── */}
        <HeroSection />

        {/* ── 2. Mobile-only: Category shortcuts + Product sections ─────── */}
        <div className="md:hidden bg-[#020617]">
          <MobileCategoryShortcuts />
          <MobileProductSection />
        </div>

        {/* ── 3–6. Platform overview section ───────────────────────────── */}
        <section className="bg-[#020617] py-8 px-8" aria-label="Platform overview">

          {/* Trust Strip — visible on both mobile and desktop */}
          <TrustStrip />

          {/* Desktop-only marketing sections — lazy-loaded to avoid blocking
              initial render; hidden on mobile so IntersectionObserver never
              fires for them in the WebView */}
          <LazySection rootMargin="300px">
            <div className="hidden md:block">

              {/* Social Follow */}
              <div className="mt-8">
                <SocialFollowSection />
              </div>

              {/* How It Works */}
              <div className="mt-8">
                <HowItWorksSection />
              </div>

              {/* Features + Security */}
              <div className="mt-8 grid grid-cols-2 gap-8">
                <FeaturesGrid />
                <SecurityTrust />
              </div>

            </div>
          </LazySection>

        </section>

        {/* ── 7. Seller CTA ────────────────────────────────────────────── */}
        <SellerCTA />

        {/* ── 8. Footer — rendered by MainLayout ───────────────────────── */}

      </main>
    </MainLayout>
  );
}
