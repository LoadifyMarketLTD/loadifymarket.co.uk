/**
 * src/pages/Home.tsx — root "/" route
 *
 * Mobile (< md / 768 px):
 *   MobileAppHeader → search bar → MobileCategoryShortcuts → MobileHeroBanner →
 *   Trending Now → New Arrivals → MobileBottomNav (via MainLayout)
 *
 * Desktop (>= md / 768 px) — unchanged:
 *   Hero → TrustStrip → SocialFollowSection → HowItWorksSection →
 *   FeaturesGrid + SecurityTrust → SellerCTA → Footer
 */

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { TrendingUp, Sparkles, Search } from "lucide-react";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SocialFollowSection from "@/components/SocialFollowSection";
import SellerCTA from "@/components/SellerCTA";
import LazySection from "@/components/LazySection";
import MobileAppHeader from "@/components/MobileAppHeader";
import MobileCategoryShortcuts from "@/components/MobileCategoryShortcuts";
import MobileHeroBanner from "@/components/MobileHeroBanner";
import MobileProductCard from "@/components/MobileProductCard";
import { useMobileProducts } from "@/hooks/useMobileProducts";
import type { Product } from "@/components/catalog/ProductCard";

// ── Mobile skeleton cards ─────────────────────────────────────────────────────
function SkeletonProductCard() {
  return (
    <div
      className="flex-shrink-0 rounded-2xl bg-white/[0.04] animate-pulse"
      style={{ width: 168, height: 220 }}
    />
  );
}

// ── Mobile home section ───────────────────────────────────────────────────────
function MobileHome() {
  const { trending, latest, loading } = useMobileProducts();

  return (
    <div className="md:hidden min-h-screen" style={{ background: '#07080B' }}>
      {/* 1. App Header */}
      <MobileAppHeader />

      {/* 2. Search Bar */}
      <div className="px-4 pt-2 pb-1">
        <div
          className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5"
          style={{
            background: '#17181E',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Search
            style={{ width: 16, height: 16, color: '#6F737C', flexShrink: 0 }}
            aria-hidden="true"
          />
          <span style={{ fontSize: 14, color: '#6F737C' }}>
            Search Loadify Market…
          </span>
        </div>
      </div>

      {/* 3. Category row */}
      <MobileCategoryShortcuts />

      {/* 4. Hero Banner */}
      <MobileHeroBanner />

      {/* 5. Trending Now */}
      <section className="pt-5 pb-2" aria-label="Trending products">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp
              style={{ width: 18, height: 18, color: '#F2B84B' }}
              aria-hidden="true"
            />
            <span className="text-[17px] font-bold text-white">Trending Now</span>
          </div>
          <Link
            to="/catalog?filter=trending"
            className="text-[13px] font-semibold"
            style={{ color: '#F2B84B' }}
          >
            See all
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonProductCard key={i} />)
            : trending.map((p: Product) => (
                <MobileProductCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  price={p.price}
                  image={p.image}
                  distance={p.location}
                  sellerName={p.seller}
                  rating={p.rating}
                />
              ))}
        </div>
      </section>

      {/* 6. New Arrivals */}
      <section className="pt-2 pb-24" aria-label="New arrivals">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles
              style={{ width: 18, height: 18, color: '#F2B84B' }}
              aria-hidden="true"
            />
            <span className="text-[17px] font-bold text-white">New Arrivals</span>
          </div>
          <Link
            to="/catalog?filter=latest"
            className="text-[13px] font-semibold"
            style={{ color: '#F2B84B' }}
          >
            See all
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonProductCard key={i} />)
            : latest.map((p: Product) => (
                <MobileProductCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  price={p.price}
                  image={p.image}
                  distance={p.location}
                  sellerName={p.seller}
                  rating={p.rating}
                />
              ))}
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <MainLayout>
      {/* Preload the LCP hero image only on the homepage */}
      <Helmet>
        <link
          rel="preload"
          as="image"
          href="/hero-gold.jpeg"
          type="image/jpeg"
          // @ts-expect-error — fetchpriority is a valid HTML attr not yet in React types
          fetchpriority="high"
        />
      </Helmet>
      <SEO
        title="The UK Marketplace Built for Modern Sellers — 0% Commission | Loadify Market"
        description="Sell products, manage orders, and get paid — all in one secure platform. 0% commission until 31 December 2026. Free to list, no monthly charges."
        canonical="/"
      />

      <main id="main-content">

        {/* ── Mobile APK home UI (< md) ────────────────────────────────────── */}
        <MobileHome />

        {/* ── Desktop-only layout (>= md) ──────────────────────────────────── */}
        <div className="hidden md:block">

          {/* 1. Hero */}
          <HeroSection />

          {/* 2. Platform overview section */}
          <section className="bg-[#020617] py-6 px-4 sm:px-8" aria-label="Platform overview">

            {/* Trust Strip */}
            <TrustStrip />

            {/* Features */}
            <div className="mt-6 sm:mt-8">
              <FeaturesGrid />
            </div>

            {/* Social Follow */}
            <div className="mt-6 sm:mt-8">
              <SocialFollowSection />
            </div>

            {/* Desktop-only extra sections */}
            <LazySection rootMargin="300px">
              {/* How It Works */}
              <div className="mt-8">
                <HowItWorksSection />
              </div>

              {/* Security */}
              <div className="mt-8">
                <SecurityTrust />
              </div>
            </LazySection>

          </section>

          {/* 3. Seller CTA */}
          <SellerCTA />

        </div>

      </main>
    </MainLayout>
  );
}
