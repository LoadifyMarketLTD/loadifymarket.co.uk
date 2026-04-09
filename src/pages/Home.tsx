/**
 * src/pages/Home.tsx — root "/" route
 *
 * Mobile-first marketplace layout (desktop keeps the traditional hero-first order
 * via CSS flex ordering — no duplicate DOM nodes, no hidden content).
 *
 * Mobile order  (< lg):
 *  1. Header spacer + UrgencyBar
 *  2. Quick Actions  — 2×2 action grid (Browse, Sell, Orders, Account)
 *  3. Categories     — CategoryGrid   (moved up)
 *  4. Products       — FeaturedProducts + FeaturedListings  (moved up)
 *  5. Trust strip    — TrustStrip (compact)
 *  6. Hero / Social  — minimised, below the fold
 *  7. Deferred sections (FeaturesSection, PlatformFeatures, HowItWorks, SellerJourney, Footer)
 *
 * Desktop order  (≥ lg):
 *  Hero → SocialProof → TrustStrip → FeaturedProducts → CategoryGrid
 *  → FeaturedListings → FeaturesSection → PlatformFeatures → HowItWorks
 *  → SellerJourneySection → Footer  (identical to previous behaviour)
 */

import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Store,
  Package,
  UserCircle,
} from "lucide-react";

import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import FeaturesSection from "@/components/FeaturesSection";
import PlatformFeatures from "@/components/PlatformFeatures";
import HowItWorks from "@/components/HowItWorksSection";
import SellerJourneySection from "@/components/SellerJourneySection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";
import UrgencyBar from "@/components/UrgencyBar";
import SocialProof from "@/components/SocialProof";
import MicroCTA from "@/components/ui/MicroCTA";

/* ── Quick Actions — mobile-only 2×2 grid ───────────────────────────────── */
const QUICK_ACTIONS = [
  {
    icon: ShoppingBag,
    label: "Browse Marketplace",
    to: "/catalog",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    cardBorder: "border-emerald-500/25",
  },
  {
    icon: Store,
    label: "Start Selling",
    to: "/signup?type=seller",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    cardBorder: "border-emerald-500/25",
  },
  {
    icon: Package,
    label: "My Orders",
    to: "/pp/buyer/orders",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    cardBorder: "border-white/[0.12]",
  },
  {
    icon: UserCircle,
    label: "My Account",
    to: "/pp/buyer",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    cardBorder: "border-white/[0.12]",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1930] font-sans antialiased">
      <Header />
      {/* spacer: clears fixed header — see .pt-header-spacer in index.css */}
      <div className="pt-header-spacer" />

      {/* Urgency bar — immediately below header */}
      <UrgencyBar />

      {/*
       * flex-col lets us use CSS `order-*` to reorder sections between
       * mobile and desktop WITHOUT duplicating DOM nodes.
       */}
      <main className="flex flex-col">

        {/* ── 1. Quick Actions ── mobile-only, always first ──────────────── */}
        <section
          aria-label="Quick actions"
          className="order-1 lg:hidden px-4 py-4 border-b border-white/[0.12]"
        >
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ icon: Icon, label, to, iconBg, iconColor, cardBorder }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3.5 py-3.5 rounded-xl bg-white/[0.07] border ${cardBorder} hover:bg-white/[0.12] hover:border-white/30 active:scale-95 transition-all duration-150`}
              >
                <span className={`shrink-0 w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-white leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 2. Hero + SocialProof ─────────────────────────────────────────
         *   Mobile: order-5  → below products (minimised, still SEO-present)
         *   Desktop: order-0  → first (traditional hero layout)               */}
        <div className="order-5 lg:order-[0]">
          <HeroSection />
          <SocialProof />
        </div>

        {/* ── 3. Categories ─────────────────────────────────────────────────
         *   Mobile: order-2  → immediately after Quick Actions
         *   Desktop: order-2  → after TrustStrip                              */}
        <div className="order-2 lg:order-2">
          <CategoryGrid />
        </div>

        {/* ── 4. Products + Listings ────────────────────────────────────────
         *   Mobile: order-3  → immediately after categories
         *   Desktop: order-3  → same                                          */}
        <div className="order-3 lg:order-3">
          <FeaturedProducts />
          <MicroCTA text="Browse All Listings" link="/catalog" />
          <FeaturedListings />
        </div>

        {/* ── 5. Trust Strip ────────────────────────────────────────────────
         *   Mobile: order-4  → compact row after products
         *   Desktop: order-1  → directly after hero                           */}
        <div className="order-4 lg:order-1">
          <TrustStrip />
        </div>

        {/* ── 6–9. Deferred lower sections (both viewports) ─────────────── */}
        <div className="order-6">
          <LazySection>
            <FeaturesSection />
          </LazySection>

          <LazySection>
            <div>
              <PlatformFeatures />
              <MicroCTA text="Start Selling Today" link="/register" />
              <div className="h-px bg-white/10 w-full" />
              <HowItWorks />
            </div>
          </LazySection>

          <LazySection>
            <SellerJourneySection />
          </LazySection>

          <LazySection>
            <Footer />
          </LazySection>
        </div>

      </main>
    </div>
  );
}

