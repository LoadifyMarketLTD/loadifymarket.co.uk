/**
 * src/pages/Home.tsx — root "/" route
 *
 * Section order:
 *  1. Hero Section       — headline, subheadline, primary + secondary CTA
 *  2. HowItWorksBuyers   — 3-step buyer guide
 *  3. HowItWorksSellers  — 3-step seller guide
 *  4. FeaturesGrid       — 9-feature grid
 *  5. SecurityTrust      — 8-item trust grid
 *  6. CategoriesOverview — all categories
 *  7. SellerCTA          — green full-width CTA banner
 *  8. Footer             — rendered by MainLayout
 */

import { Helmet } from "react-helmet-async";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";
import HeroSection from "@/components/HeroSection";
import HowItWorksBuyers from "@/components/HowItWorksBuyers";
import HowItWorksSellers from "@/components/HowItWorksSellers";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import CategoriesOverview from "@/components/CategoriesOverview";
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
        title="Sell in the UK Marketplace — 0% Commission | Loadify Market"
        description="Start selling your products and services across the UK — free to list, 0% commission until 31 Dec 2026. Secure Stripe payouts."
        canonical="/"
      />

      <main id="main-content">

        {/* ── 1. Hero ──────────────────────────────────────────────────── */}
        <HeroSection />

        {/* ── 2. How It Works — Buyers ─────────────────────────────────── */}
        <HowItWorksBuyers />

        {/* ── 3. How It Works — Sellers ────────────────────────────────── */}
        <HowItWorksSellers />

        {/* ── 4. Features Grid ─────────────────────────────────────────── */}
        <FeaturesGrid />

        {/* ── 5. Security & Trust ──────────────────────────────────────── */}
        <SecurityTrust />

        {/* ── 6. Categories Overview ───────────────────────────────────── */}
        <CategoriesOverview />

        {/* ── 7. Seller CTA ────────────────────────────────────────────── */}
        <SellerCTA />

        {/* ── 8. Footer — rendered by MainLayout ───────────────────────── */}

      </main>
    </MainLayout>
  );
}
