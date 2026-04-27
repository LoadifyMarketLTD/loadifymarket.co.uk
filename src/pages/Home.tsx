/**
 * src/pages/Home.tsx — root "/" route
 *
 * Section order:
 *  1. Hero Section       — headline, CTAs, payment badges, product image
 *  2–4. Dark platform overview (bg-[#0A1930]):
 *       TrustStrip → HowItWorksSection → FeaturesGrid + SecurityTrust
 *       All spaced with mt-8 md:mt-10 lg:mt-12 inside one section wrapper
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
import SocialFollowSection from "@/components/SocialFollowSection";
import SellerCTA from "@/components/SellerCTA";

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

        {/* ── 2–4. Dark-bg platform overview (Trust → HowItWorks → Features+Security) ── */}
        <section className="bg-[#020617] py-8 px-8" aria-label="Platform overview">

          {/* Trust Strip */}
          <TrustStrip />

          {/* How It Works */}
          <div className="mt-8">
            <HowItWorksSection />
          </div>

          {/* Features + Security */}
          <div className="mt-8 grid grid-cols-2 gap-8">
            <FeaturesGrid />
            <SecurityTrust />
          </div>

          {/* Social Follow */}
          <div className="mt-8">
            <SocialFollowSection />
          </div>

        </section>

        {/* ── 5. Seller CTA ────────────────────────────────────────────── */}
        <SellerCTA />

        {/* ── 6. Footer — rendered by MainLayout ───────────────────────── */}

      </main>
    </MainLayout>
  );
}
