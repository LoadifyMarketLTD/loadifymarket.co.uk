/**
 * src/pages/Home.tsx — root "/" route
 *
 * MOBILE (< md / 768 px):
 *   MobileAppHeader → MobileCategoryShortcuts → MobileHeroBanner →
 *   2-col product grid (infinite scroll) → MobileBottomNav (via MainLayout)
 *
 * DESKTOP (>= md / 768 px):
 *   GlobalHeader → HeroSection (full-screen) → TrustStrip → FeaturesGrid →
 *   HowItWorksSection → SecurityTrust → SellerCTA → Footer
 */

import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

// Mobile-only components
import MobileAppHeader from "@/components/MobileAppHeader";
import MobileCategoryShortcuts from "@/components/MobileCategoryShortcuts";
import MobileHeroBanner from "@/components/MobileHeroBanner";
import MobileGridCard from "@/components/MobileGridCard";
import { useMobileGrid } from "@/hooks/useMobileGrid";

// Desktop-only components
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SellerCTA from "@/components/SellerCTA";
import LazySection from "@/components/LazySection";
import { trackViewHome } from "@/lib/analytics";

// ── Mobile skeleton cards ─────────────────────────────────────────────────────
function SkeletonGridCard() {
  return (
    <div
      className="animate-pulse"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 12, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '80%' }} />
      <div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '50%' }} />
    </div>
  );
}

// ── Mobile home section ───────────────────────────────────────────────────────
function MobileHome() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileGrid();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="md:hidden min-h-screen" style={{ background: '#0A0E1A' }}>
      {/* 1. App Header */}
      <MobileAppHeader />

      {/* 2. Category chips */}
      <MobileCategoryShortcuts />

      {/* 3. Simple hero */}
      <MobileHeroBanner />

      {/* 4. 2-column product grid */}
      <section
        aria-label="Products"
        style={{
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 12,
          paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px) + 20px)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(10px, 3vw, 14px)',
          }}
        >
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonGridCard key={i} />)
            : products.map((p, i) => (
                <MobileGridCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  price={p.price}
                  image={p.image}
                  location={p.location}
                  priority={i < 4}
                />
              ))}
          {/* Loading-more skeletons */}
          {loadingMore && Array.from({ length: 4 }).map((_, i) => <SkeletonGridCard key={`more-${i}`} />)}
        </div>

        {/* Infinite-scroll sentinel */}
        {!loading && hasMore && (
          <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
        )}
      </section>
    </div>
  );
}

export default function Home() {
  useEffect(() => { trackViewHome(); }, []);

  return (
    <MainLayout>
      {/* Preload LCP hero image for desktop only — WebP only; JPEG is never used since
          all browsers that support <picture> also support WebP.
          HeroSection is inside `hidden md:block` so the image is only used on desktop. */}
      <Helmet>
        <link
          rel="preload"
          as="image"
          href="/hero-gold.webp"
          type="image/webp"
          media="(min-width: 768px)"
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
            className="bg-[#0A0E1A] py-6 px-8"
            aria-label="Platform overview"
          >
            <TrustStrip />

            <div className="mt-8">
              <FeaturesGrid />
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
