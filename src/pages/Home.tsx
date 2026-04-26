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

          </div>
        </section>

        {/* ── 4. How It Works — For Sellers ────────────────────────────── */}
        <section className="bg-[#f9fafb] border-b border-gray-200" aria-labelledby="how-sellers-heading">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">

            <div className="mb-4">
              <h2
                id="how-sellers-heading"
                className="text-[13px] font-black text-gray-900 uppercase tracking-widest"
              >
                How It Works — For Sellers
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Start selling in three simple steps — free until 31 December 2026
              </p>
            </div>

            {/* 3-step grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-300">
              {HOW_IT_WORKS_SELLERS.map((step) => {
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

          </div>
        </section>

      </main>
    </MainLayout>
  );
}
