/**
 * src/pages/Home.tsx — root "/" route
 *
 * Section order:
 *  1. Hero Section       — headline, subheadline, primary + secondary CTA
 *  2. HowItWorksBuyers   — 3-step buyer guide
 *  3. HowItWorksSellers  — 3-step seller guide
 *  4. FeaturesGrid       — 6-feature grid
 *  5. SecurityTrust      — 4-item trust grid
 *  6. SellerCTA          — green full-width CTA banner
 *  7. Footer             — rendered by MainLayout
 */

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";
import HowItWorksBuyers from "@/components/HowItWorksBuyers";
import HowItWorksSellers from "@/components/HowItWorksSellers";
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
        title="Sell in the UK Marketplace — 0% Commission | Loadify Market"
        description="Start selling your products and services across the UK — free to list, 0% commission until 31 Dec 2026. Secure Stripe payouts."
        canonical="/"
      />

      <main id="main-content">

        {/* ── 1. Hero ──────────────────────────────────────────────────── */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              The UK Marketplace Built for Modern Sellers
            </h1>
            <p className="text-xl text-gray-600 mb-10">
              Sell products, manage orders, and get paid — all in one secure platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register?role=seller"
                className="bg-green-600 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
              >
                Start Selling Today
              </Link>
              <Link
                to="/catalog"
                className="text-gray-700 hover:underline"
              >
                Browse the Marketplace
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. How It Works — Buyers ─────────────────────────────────── */}
        <HowItWorksBuyers />

        {/* ── 3. How It Works — Sellers ────────────────────────────────── */}
        <HowItWorksSellers />

        {/* ── 4. Features Grid ─────────────────────────────────────────── */}
        <FeaturesGrid />

        {/* ── 5. Security & Trust ──────────────────────────────────────── */}
        <SecurityTrust />

        {/* ── 6. Seller CTA ────────────────────────────────────────────── */}
        <SellerCTA />

        {/* ── 7. Footer — rendered by MainLayout ───────────────────────── */}

      </main>
    </MainLayout>
  );
}
