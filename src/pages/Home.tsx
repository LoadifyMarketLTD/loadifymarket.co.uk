/**
 * src/pages/Home.tsx — root "/" route
 *
 * Stage 3: B2B wholesale marketplace homepage.
 * Design: structured, business-first, no gradients or startup style.
 *
 * Section order:
 *  1. Announcement bar
 *  2. HeroSection        — compact navy hero + category quick panel
 *  3. FeaturedProducts   — real DB product cards (immediately under hero)
 *  4. TrustStrip         — white bar with 4 trust items
 *  5. CategoryGrid       — flat global category tile grid
 *  6. How It Works       — inline 3-step buyer guide
 *  7. Seller CTA banner  — navy strip, register as supplier
 */

import { Link } from "react-router-dom";
import { Search, CreditCard, Package } from "lucide-react";
import { Helmet } from "react-helmet-async";

import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryGrid from "@/components/CategoryGrid";
import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

const HOW_IT_WORKS = [
  {
    num: 1,
    icon: Search,
    title: "Browse & Discover",
    desc: "Find wholesale products from verified UK trade suppliers across a global 10-category tree.",
  },
  {
    num: 2,
    icon: CreditCard,
    title: "Secure Checkout",
    desc: "Place orders securely via Stripe. All transactions are encrypted and protected.",
  },
  {
    num: 3,
    icon: Package,
    title: "Delivered to You",
    desc: "Seller ships directly to your address. Track progress from your buyer account.",
  },
];

const SELLER_BENEFITS = [
  "Free to list",
  "0% Commission until 31 December 2026",
  "Fast Stripe payouts",
  "Seller dashboard included",
];

export default function Home() {
  return (
    <MainLayout forceOpaque={true}>
      {/* Preload the LCP hero image only on the homepage — avoids "preloaded but
          not used" warnings on all other routes where hero.webp is never loaded. */}
      <Helmet>
        <link
          rel="preload"
          as="image"
          href="/hero.webp"
          type="image/webp"
          // @ts-expect-error — imagesrcset/imagesizes are valid preload attrs not yet in React types
          imagesrcset="/hero-640.webp 640w, /hero.webp 1536w"
          imagesizes="(max-width: 640px) 640px, 1536px"
          fetchpriority="high"
        />
      </Helmet>
      <SEO
        title="Loadify Market | UK Wholesale B2B Marketplace for Trade Buyers & Suppliers"
        description="Buy and sell wholesale goods on Loadify Market — the UK's B2B trade marketplace. Browse listings from verified UK suppliers or register your trade business today."
        canonical="/"
      />

      {/* Clears fixed header — see .pt-header-spacer in index.css */}
      <div className="pt-header-spacer" />

      {/* ── Announcement bar ─────────────────────────────────────────── */}
      <div className="bg-[#0d2240] border-b border-[#22C55E]/30 text-center py-1.5">
        <span className="text-[11px] font-semibold text-[#22C55E]">
          🚀 0% Commission for early trade sellers — until 31 December 2026
        </span>
      </div>

      <main id="main-content" className="bg-[#f4f5f7]">

        {/* ── 1. Hero ──────────────────────────────────────────────────── */}
        <HeroSection />

        {/* ── 2. Real products — immediately under hero ────────────────── */}
        <FeaturedProducts />

        <div
          className="relative bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-marketplace-flipped.jpg')" }}
        >
          <div className="absolute inset-0 bg-white/85" aria-hidden="true" />

          <div className="relative z-10">
            {/* ── 3. Trust bar ───────────────────────────────────────────── */}
            <TrustStrip />

            {/* ── 4. Category grid ───────────────────────────────────────── */}
            <CategoryGrid />

            {/* ── 5. How It Works ────────────────────────────────────────── */}
            <section className="bg-transparent border-b border-gray-200" aria-labelledby="how-heading">
              <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10">

                <div className="mb-6">
                  <h2
                    id="how-heading"
                    className="text-[13px] font-black text-gray-900 uppercase tracking-widest"
                  >
                    How It Works — For Buyers
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    From browsing to delivery in three simple steps
                  </p>
                </div>

                {/* 3-step grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-300">
                  {HOW_IT_WORKS.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.num} className="bg-white px-6 py-6 flex flex-col gap-4">
                        {/* Step badge + icon row */}
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 bg-[#0d2240] text-white text-base font-black flex items-center justify-center shrink-0">
                            {step.num}
                          </span>
                          <span className="w-10 h-10 bg-[#f4f5f7] flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5 text-[#0d2240]" aria-hidden="true" />
                          </span>
                        </div>
                        {/* Text */}
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-wide mb-1.5">
                            {step.title}
                          </p>
                          <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CTA row */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/catalog"
                    className="px-7 py-2.5 bg-[#0d2240] text-white text-xs font-black uppercase tracking-wide hover:bg-[#1a3a5c] transition-colors text-center"
                  >
                    Browse Marketplace
                  </Link>
                  <Link
                    to="/register"
                    className="px-7 py-2.5 border border-[#0d2240] text-[#0d2240] text-xs font-black uppercase tracking-wide hover:bg-[#0d2240] hover:text-white transition-colors text-center"
                  >
                    Create Buyer Account
                  </Link>
                </div>

              </div>
            </section>
          </div>
        </div>

        {/* ── 6. Seller CTA banner ─────────────────────────────────────── */}
        <section className="bg-[#0d2240]" aria-label="Seller registration">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

              <div>
                <h2 className="text-white text-xl font-black uppercase tracking-tight">
                  Start Selling on Loadify Market
                </h2>
                <p className="text-white/60 text-sm mt-1 max-w-[500px] leading-relaxed">
                   Register your trade business and list wholesale products. 0% Commission
                  until 31 December 2026 — then a simple 7% on completed sales.
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                  {SELLER_BENEFITS.map((t) => (
                    <span key={t} className="text-[11px] text-white/45 flex items-center gap-1.5">
                      <span className="text-[#22C55E] font-bold">✓</span> {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  to="/register?type=seller"
                  className="inline-block px-10 py-3 bg-[#22C55E] text-[#0d2240] text-sm font-black uppercase tracking-wide hover:bg-[#16a34a] transition-colors"
                >
                  Register as Supplier →
                </Link>
              </div>

            </div>
          </div>
        </section>

      </main>
    </MainLayout>
  );
}
