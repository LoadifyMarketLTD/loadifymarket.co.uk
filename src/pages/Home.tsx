/**
 * src/pages/Home.tsx — root "/" route
 *
 * Product-first marketplace layout:
 *  Header (global, rendered by App.tsx)
 *  Hero
 *  CategoryGrid
 *  TrendingProducts
 *  LatestListings
 *  SellerCTA
 *  BottomNav
 */

import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import CategoryGrid from "@/components/CategoryGrid";
import TrendingProducts from "@/components/TrendingProducts";
import LatestListings from "@/components/LatestListings";
import SellerCTA from "@/components/SellerCTA";
import BottomNav from "@/components/BottomNav";

export default function Home() {
  return (
    <>
      <SEO
        title="Buy & Sell Across the UK — Loadify Market"
        description="Browse trending products, the latest listings and top UK sellers. Fast. Secure. Simple."
        canonical="/"
      />

      <main
        id="main-content"
        className="min-h-screen"
        style={{ background: "#0B0F1A", paddingTop: 122 /* header height */ }}
      >
        {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
        <HeroSection />

        {/* ── 2. Category Grid ────────────────────────────────────────────── */}
        <CategoryGrid />

        {/* ── 3. Trending Products ────────────────────────────────────────── */}
        <TrendingProducts />

        {/* ── 4. Latest Listings ──────────────────────────────────────────── */}
        <LatestListings />

        {/* ── 5. Seller CTA ───────────────────────────────────────────────── */}
        <SellerCTA />

        {/* Spacer so content isn't hidden behind fixed BottomNav */}
        <div className="h-20" aria-hidden="true" />
      </main>

      {/* ── 6. Bottom Nav ───────────────────────────────────────────────── */}
      <BottomNav />
    </>
  );
}
