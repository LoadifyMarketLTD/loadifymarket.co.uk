/**
 * src/pages/Home.tsx — root "/" route
 *
 * Stage 3: B2C + B2B online marketplace homepage.
 * Design: structured, open-marketplace style, no gradients or startup style.
 *
 * Section order:
 *  1. HeroSection        — compact navy hero + category quick panel
 *  2. TrustStrip         — white bar with 4 trust items
 *  3. How It Works       — inline 3-step buyer guide
 *  4. Seller CTA banner  — register as supplier row
 */

import { Link } from "react-router-dom";
import { Search, CreditCard, Package } from "lucide-react";
import { Helmet } from "react-helmet-async";

import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

const HOW_IT_WORKS = [
  {
    num: 1,
    icon: Search,
    title: "Browse & Discover",
    desc: "Find products from sellers across the UK.",
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
        title="Loadify Market | UK Multi-Category Marketplace for Buyers & Sellers"
        description="Buy and sell products across all categories in the UK marketplace — from individual items to bulk deals."
        canonical="/"
      />

      <main id="main-content" className="bg-transparent">

        {/* ── 1. Hero ──────────────────────────────────────────────────── */}
        <HeroSection />

        {/* ── 2. Trust bar ─────────────────────────────────────────────── */}
        <TrustStrip />

        {/* ── 3. How It Works ──────────────────────────────────────────── */}
        <section className="bg-white border-b border-gray-200" aria-labelledby="how-heading">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">

            <div className="mb-4">
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
                  <div key={step.num} className="bg-white px-6 py-5 flex flex-col gap-3">
                    {/* Step badge + icon row */}
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 bg-[#22C55E] text-white text-base font-black flex items-center justify-center shrink-0">
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
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link
                to="/catalog"
                className="px-7 py-2.5 bg-[#22C55E] text-white text-xs font-black uppercase tracking-wide hover:bg-[#16a34a] transition-colors text-center"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/register"
                className="px-7 py-2.5 border border-[#22C55E] text-[#15803d] text-xs font-black uppercase tracking-wide hover:bg-[#22C55E] hover:text-white transition-colors text-center"
              >
                Create Buyer Account
              </Link>
            </div>

          </div>
        </section>

        {/* ── 4. Seller CTA banner ─────────────────────────────────────── */}
        <section className="bg-white border-b border-gray-200" aria-label="Seller registration">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

              <div>
                <h2 className="text-gray-900 text-xl font-black uppercase tracking-tight">
                  Start Selling on Loadify Market
                </h2>
                <p className="text-gray-600 text-sm mt-1 max-w-[500px] leading-relaxed">
                   Start selling your products and reach buyers across the UK marketplace. 0% Commission
                  until 31 December 2026 — then a simple 7% on completed sales.
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                  {SELLER_BENEFITS.map((t) => (
                    <span key={t} className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <span className="text-[#15803d] font-bold">✓</span> {t}
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
