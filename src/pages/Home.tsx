/**
 * src/pages/Home.tsx — root "/" route
 *
 * Stage 3: B2B wholesale marketplace homepage.
 * Design: structured, business-first, no gradients or startup style.
 *
 * Section order:
 *  1. Announcement bar
 *  2. HeroSection        — compact navy hero + category quick panel
 *  3. TrustStrip         — white bar with 4 trust items
 *  4. CategoryGrid       — flat 17-category tile grid
 *  5. FeaturedProducts   — clean white product cards
 *  6. How It Works       — inline 3-step buyer guide
 *  7. Seller CTA banner  — navy strip, register as supplier
 */

import { Link } from "react-router-dom";
import { Search, CreditCard, Package } from "lucide-react";

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
    desc: "Find wholesale products from verified UK trade suppliers across 17 categories.",
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
  "0% commission until Aug 2026",
  "Fast Stripe payouts",
  "Seller dashboard included",
];

export default function Home() {
  return (
    <MainLayout forceOpaque={true}>
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
          🚀 0% commission for early trade sellers — until 31 August 2026
        </span>
      </div>

      <main id="main-content" className="bg-[#f4f5f7]">

        {/* ── 1. Hero ──────────────────────────────────────────────────── */}
        <HeroSection />

        {/* ── 2. Trust bar ─────────────────────────────────────────────── */}
        <TrustStrip />

        {/* ── 3. Category grid ─────────────────────────────────────────── */}
        <CategoryGrid />

        {/* ── 4. Featured products ─────────────────────────────────────── */}
        <FeaturedProducts />

        {/* ── 5. How It Works ──────────────────────────────────────────── */}
        <section className="bg-white border-b border-gray-200" aria-labelledby="how-heading">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">

            <div className="mb-5">
              <h2
                id="how-heading"
                className="text-[13px] font-black text-gray-900 uppercase tracking-widest"
              >
                How It Works — For Buyers
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                From browsing to delivery in three steps
              </p>
            </div>

            {/* 3-step grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-200">
              {HOW_IT_WORKS.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.num} className="bg-white px-5 py-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-7 h-7 bg-[#0d2240] text-white text-xs font-black flex items-center justify-center shrink-0">
                        {step.num}
                      </span>
                      <Icon className="h-4 w-4 text-[#0d2240]" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1.5">{step.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* CTA row */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link
                to="/catalog"
                className="px-6 py-2 bg-[#0d2240] text-white text-xs font-bold uppercase tracking-wide hover:bg-[#1a3a5c] transition-colors text-center sm:text-left"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/register"
                className="px-6 py-2 border border-[#0d2240] text-[#0d2240] text-xs font-bold uppercase tracking-wide hover:bg-[#0d2240] hover:text-white transition-colors text-center sm:text-left"
              >
                Create Buyer Account
              </Link>
            </div>

          </div>
        </section>

        {/* ── 6. Seller CTA banner ─────────────────────────────────────── */}
        <section className="bg-[#0d2240]" aria-label="Seller registration">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

              <div>
                <h2 className="text-white text-xl font-black uppercase tracking-tight">
                  Start Selling on Loadify Market
                </h2>
                <p className="text-white/60 text-sm mt-1 max-w-[500px] leading-relaxed">
                  Register your trade business and list wholesale products. 0% commission
                  until August 2026 — then a simple 7% on completed sales.
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
