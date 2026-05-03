/**
 * src/pages/Home.tsx — root "/" route
 *
 * MOBILE (< md / 768 px):
 *   MobileAppHeader → search bar → MobileCategoryShortcuts → MobileHeroBanner →
 *   Trending Now → New Arrivals → MobileBottomNav (via MainLayout)
 *
 * DESKTOP (>= md / 768 px):
 *   GlobalHeader → HeroSection (full-screen) → TrustStrip → FeaturesGrid →
 *   SocialFollowSection → HowItWorksSection → SecurityTrust → SellerCTA → Footer
 */

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { TrendingUp, Sparkles } from "lucide-react";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

// Mobile-only components
import MobileAppHeader from "@/components/MobileAppHeader";
import MobileCategoryShortcuts from "@/components/MobileCategoryShortcuts";
import MobileHeroBanner from "@/components/MobileHeroBanner";
import MobileProductCard from "@/components/MobileProductCard";
import { useMobileProducts } from "@/hooks/useMobileProducts";
import type { Product } from "@/components/catalog/ProductCard";

// Desktop-only components
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SocialFollowSection from "@/components/SocialFollowSection";
import SellerCTA from "@/components/SellerCTA";
import LazySection from "@/components/LazySection";

// ── Mobile skeleton cards ─────────────────────────────────────────────────────
function SkeletonProductCard() {
  return (
    <div
      className="flex-shrink-0 snap-start rounded-2xl bg-white/[0.04] animate-pulse"
      style={{ width: 'clamp(148px, 42vw, 180px)', height: 'clamp(200px, 52vw, 220px)' }}
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

      {/* 2. Category row */}
      <MobileCategoryShortcuts />

      {/* 3. Hero Banner */}
      <MobileHeroBanner />

      {/* 5. Trending Now */}
      <section className="pt-5 pb-2" aria-label="Trending products">
        <div className="flex items-center justify-between mb-3" style={{ paddingInline: 'var(--mob-side, 16px)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp
              style={{ width: 18, height: 18, color: '#F2B84B' }}
              aria-hidden="true"
            />
          <span style={{ fontSize: 'clamp(15px, 4.2vw, 17px)', fontWeight: 700, color: '#FFFFFF' }}>Trending Now</span>
          </div>
          <Link
            to="/catalog?filter=trending"
            className="text-[13px] font-semibold"
            style={{ color: '#F2B84B' }}
          >
            See all
          </Link>
        </div>
        {/* overflow-x scroll with proper snap + leading/trailing padding via spacers */}
        <div
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
          style={{
            paddingInlineStart: 'var(--mob-side, 16px)',
            scrollPaddingInlineStart: 'var(--mob-side, 16px)',
            scrollPaddingInlineEnd: 'var(--mob-side, 16px)',
          }}
        >
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
          {/* Trailing spacer so last card clears the container edge */}
          <div style={{ minWidth: 'var(--mob-side, 16px)', flexShrink: 0 }} aria-hidden="true" />
        </div>
      </section>

      {/* 6. New Arrivals */}
      <section
        className="pt-2"
        style={{ paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px) + 16px)' }}
        aria-label="New arrivals"
      >
        <div className="flex items-center justify-between mb-3" style={{ paddingInline: 'var(--mob-side, 16px)' }}>
          <div className="flex items-center gap-2">
            <Sparkles
              style={{ width: 18, height: 18, color: '#F2B84B' }}
              aria-hidden="true"
            />
          <span style={{ fontSize: 'clamp(15px, 4.2vw, 17px)', fontWeight: 700, color: '#FFFFFF' }}>New Arrivals</span>
          </div>
          <Link
            to="/catalog?filter=latest"
            className="text-[13px] font-semibold"
            style={{ color: '#F2B84B' }}
          >
            See all
          </Link>
        </div>
        <div
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
          style={{
            paddingInlineStart: 'var(--mob-side, 16px)',
            scrollPaddingInlineStart: 'var(--mob-side, 16px)',
            scrollPaddingInlineEnd: 'var(--mob-side, 16px)',
          }}
        >
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
          {/* Trailing spacer so last card clears the container edge */}
          <div style={{ minWidth: 'var(--mob-side, 16px)', flexShrink: 0 }} aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <MainLayout>
      {/* Preload LCP hero image for desktop — WebP for capable browsers, JPEG fallback */}
      <Helmet>
        <link
          rel="preload"
          as="image"
          href="/hero-gold.webp"
          type="image/webp"
          // @ts-expect-error — fetchpriority is a valid HTML attr not yet in React types
          fetchpriority="high"
        />
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

        {/* ── Desktop-only layout (>= md) — unchanged ──────────────────────── */}
        <div className="hidden md:block">

          {/* Full-screen hero with gold background image */}
          <HeroSection />

          {/* Platform overview section */}
          <section
            className="bg-[#020617] py-6 px-8"
            aria-label="Platform overview"
          >
            <TrustStrip />

            <div className="mt-8">
              <FeaturesGrid />
            </div>

            <div className="mt-8">
              <SocialFollowSection />
            </div>

            <LazySection rootMargin="300px">
              <div className="mt-8">
                <HowItWorksSection />
              </div>
              <div className="mt-8">
                <SecurityTrust />
              </div>
            </LazySection>
          </section>

          {/* Seller call-to-action */}
          <SellerCTA />

        </div>

      </main>
    </MainLayout>
  );
}
