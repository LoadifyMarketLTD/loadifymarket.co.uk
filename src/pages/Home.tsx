/**
 * src/pages/Home.tsx — root "/" route
 *
 * Stage 3: B2C + B2B online marketplace homepage.
 * Design: structured, open-marketplace style, no gradients or startup style.
 *
 * Section order:
 *  1. HeroSection        — split hero with CTAs + seller features
 *  2. TrustStrip         — white bar with 4 trust items
 *  3. How It Works       — inline 3-step buyer guide (no buttons)
 *  4. How It Works       — inline 3-step seller guide
 */

import { Link } from "react-router-dom";
import { Search, CreditCard, Package, UserPlus, ListPlus, Banknote } from "lucide-react";
import { Helmet } from "react-helmet-async";

import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

const HOW_IT_WORKS_SELLERS = [
  {
    num: 1,
    icon: UserPlus,
    title: "Create Your Free Account",
    desc: "Register as a seller in minutes. No setup fees, no monthly charges — free until 31 Dec 2026.",
  },
  {
    num: 2,
    icon: ListPlus,
    title: "List Products or Services",
    desc: "Add your listings with photos, pricing, and stock. Physical goods or services — both supported.",
  },
  {
    num: 3,
    icon: Banknote,
    title: "Get Paid via Stripe",
    desc: "Buyers pay securely through Stripe. Fast payouts directly to your bank account.",
  },
];

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

      <main id="main-content" className="bg-transparent">

        {/* ── 1. Hero ──────────────────────────────────────────────────── */}
        <HeroSection />

        {/* ── 2. Trust bar ─────────────────────────────────────────────── */}
        <TrustStrip />

        {/* ── 3. How It Works — For Buyers ─────────────────────────────── */}
        <section className="bg-white border-b border-gray-200" aria-labelledby="how-heading">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10">

            <div className="mb-6">
              <h2
                id="how-heading"
                className="text-xl lg:text-2xl font-bold text-gray-900"
              >
                How It Works — For Buyers
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                From browsing to delivery in three simple steps
              </p>
            </div>

            {/* 3-step grid with → connectors on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-200">
              {HOW_IT_WORKS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.num} className="relative bg-white px-6 py-6 flex flex-col gap-3">
                    {/* → connector between columns (desktop only) */}
                    {idx < HOW_IT_WORKS.length - 1 && (
                      <span className="hidden sm:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-gray-200 items-center justify-center text-gray-400 text-sm font-bold">
                        →
                      </span>
                    )}
                    {/* Step number + icon inline */}
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 bg-[#22C55E] text-white text-sm font-black flex items-center justify-center shrink-0">
                        {step.num}
                      </span>
                      <span className="w-9 h-9 bg-green-50 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-[#15803d]" aria-hidden="true" />
                      </span>
                    </div>
                    {/* Text */}
                    <div>
                      <p className="text-sm font-bold text-gray-900 mb-1.5">
                        {step.title}
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ── 4. How It Works — For Sellers ────────────────────────────── */}
        <section className="bg-[#f0fdf4] border-b border-gray-200" aria-labelledby="how-sellers-heading">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10">

            <div className="mb-6">
              <h2
                id="how-sellers-heading"
                className="text-xl lg:text-2xl font-bold text-gray-900"
              >
                How It Works — For Sellers
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Start selling in three simple steps — free until 31 December 2026
              </p>
            </div>

            {/* 3-step grid with → connectors on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-200">
              {HOW_IT_WORKS_SELLERS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.num} className="relative bg-white px-6 py-6 flex flex-col gap-3">
                    {idx < HOW_IT_WORKS_SELLERS.length - 1 && (
                      <span className="hidden sm:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-gray-200 items-center justify-center text-gray-400 text-sm font-bold">
                        →
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 bg-[#22C55E] text-white text-sm font-black flex items-center justify-center shrink-0">
                        {step.num}
                      </span>
                      <span className="w-9 h-9 bg-green-50 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-[#15803d]" aria-hidden="true" />
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 mb-1.5">
                        {step.title}
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA sub pași */}
            <div className="mt-6">
              <Link
                to="/register?role=seller"
                className="inline-flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-white text-sm font-bold px-5 py-2.5 transition-colors"
              >
                Start Selling — It's Free
              </Link>
            </div>

          </div>
        </section>

        {/* ── 5. Split CTA ─────────────────────────────────────────────── */}
        <section className="bg-[#0d2240]" aria-labelledby="split-cta-heading">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-14 text-center">
            <h2
              id="split-cta-heading"
              className="text-2xl lg:text-3xl font-bold text-white mb-2"
            >
              Join Loadify Market Today
            </h2>
            <p className="text-sm text-gray-300 mb-8">
              List your products for free and start reaching buyers across the UK — or browse thousands of listings right now.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register?role=seller"
                className="inline-flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-white text-sm font-bold px-6 py-3 transition-colors"
              >
                Start Selling — Free
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 border border-white/50 hover:border-white text-white text-sm font-bold px-6 py-3 transition-colors"
              >
                Browse Listings
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-6 italic">
              0% commission until 31 December 2026 — no card required to register
            </p>
          </div>
        </section>

      </main>
    </MainLayout>
  );
}
