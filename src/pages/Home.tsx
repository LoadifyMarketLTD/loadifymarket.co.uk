/**
 * src/pages/Home.tsx — root "/" route
 *
 * Seller-first homepage for early-stage marketplace.
 * Same section order on mobile and desktop (no CSS order-* reordering needed).
 *
 * Order:
 *  1. UrgencyBar
 *  2. Quick Actions  — mobile-only 2×2 grid
 *  3. HeroSection
 *  4. SellerJourneySection  — right after hero (seller-first priority)
 *  5. TrustStrip
 *  6. FeaturedProducts      — real products only, max 6, no placeholders
 *  7. CategoryGrid          — navigation, not density proof
 *  8. PlatformFeatures      — For Buyers / For Sellers comparison
 *  9. HowItWorks            — simplified 3-step buyer flow
 * 10. Final CTA
 */

import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Store,
  Package,
  UserCircle,
} from "lucide-react";

import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryGrid from "@/components/CategoryGrid";
import PlatformFeatures from "@/components/PlatformFeatures";
import HowItWorks from "@/components/HowItWorksSection";
import SellerJourneySection from "@/components/SellerJourneySection";
import LazySection from "@/components/LazySection";
import UrgencyBar from "@/components/UrgencyBar";
import MicroCTA from "@/components/ui/MicroCTA";
import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

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
    <MainLayout forceOpaque={true}>
      <SEO
        title="Loadify Market | UK Multi-Category Marketplace for Buyers & Sellers"
        description="Buy and sell wholesale products on Loadify Market — the UK's leading multi-vendor marketplace. Browse thousands of listings from verified UK sellers or start selling today."
        canonical="/"
      />
      {/* spacer: clears fixed header — see .pt-header-spacer in index.css */}
      <div className="pt-header-spacer" />

      {/* Urgency bar — immediately below header */}
      <UrgencyBar />

      <main id="main-content" className="flex flex-col">

        {/* ── 1. Quick Actions — mobile-only ──────────────────────────────── */}
        <section
          aria-label="Quick actions"
          className="lg:hidden px-4 py-4 border-b border-white/[0.12] bg-[#0A1930]"
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

        {/* ── 2. Hero ─────────────────────────────────────────────────────── */}
        <HeroSection />

        {/* ── 3. Seller Journey — right after hero (seller-first priority) ── */}
        <SellerJourneySection />

        {/* ── 4. Trust Strip ──────────────────────────────────────────────── */}
        <TrustStrip />

        {/* ── 5. Featured Products — real products only, max 6 ────────────── */}
        <FeaturedProducts />

        {/* ── 6. Categories — navigation ──────────────────────────────────── */}
        <CategoryGrid />

        {/* ── 7–8. Deferred below-fold sections ───────────────────────────── */}
        <LazySection>
          <PlatformFeatures />
        </LazySection>

        <LazySection>
          <HowItWorks />
        </LazySection>

        {/* ── 9. Final CTA ────────────────────────────────────────────────── */}
        <MicroCTA text="Start Selling Today — 0% Commission" link="/signup?type=seller" />

      </main>
    </MainLayout>
  );
}

