/**
 * src/pages/Home.tsx — root "/" route
 *
 * Section order:
 *  1. Hero Section       — headline, CTAs, payment badges, product image
 *  2. TrustStrip         — 4 trust items (full-width)
 *  3. HowItWorksSection  — buyers + sellers side by side
 *  4. Features + Security — two panels side by side
 *  5. SellerCTA          — green full-width CTA banner
 *  6. Footer             — rendered by MainLayout
 */

import { Helmet } from "react-helmet-async";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SellerCTA from "@/components/SellerCTA";

export default function Home() {
  return (
    <MainLayout>
      {/* Preload the LCP hero image only on the homepage */}
      <Helmet>
        <link
          rel="preload"
          as="image"
          href="/hero-marketplace.jpg"
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

        {/* ── 2. Trust Strip ───────────────────────────────────────────── */}
        <TrustStrip />

        {/* ── 3. How It Works (Buyers + Sellers) ───────────────────────── */}
        <HowItWorksSection />

        {/* ── 4. Features + Security (side by side) ────────────────────── */}
        <section className="py-10 md:py-12 lg:py-14 bg-[#0A1930]">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 xl:px-14">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <FeaturesGrid />
              <SecurityTrust />
            </div>
          </div>
        </section>

        {/* ── 5. Seller CTA ────────────────────────────────────────────── */}
        <SellerCTA />

        {/* ── 6. Footer — rendered by MainLayout ───────────────────────── */}

      </main>
    </MainLayout>
  );
}
