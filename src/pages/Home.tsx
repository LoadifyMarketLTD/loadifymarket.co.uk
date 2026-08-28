import { useEffect, useRef } from "react";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

import MobileAppHeader from "@/components/MobileAppHeader";
import MobileGridCard from "@/components/MobileGridCard";
import { useMobileGrid } from "@/hooks/useMobileGrid";
import { useIsMobile } from "@/hooks/use-mobile";

import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import FeaturedProducts from "@/components/FeaturedProducts";
import VisualMarketplaceCategories from "@/components/VisualMarketplaceCategories";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SellerCTA from "@/components/SellerCTA";
import LazySection from "@/components/LazySection";
import { trackViewHome } from "@/lib/analytics";

function SkeletonGridCard() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="rounded-xl animate-pulse flex flex-col gap-2 w-full aspect-square bg-white/[0.08]" />
      <div className="h-3 rounded-md bg-white/[0.08] w-[80%]" />
      <div className="h-3.5 rounded-md bg-white/[0.08] w-[50%]" />
    </div>
  );
}

function MobileProductGrid({ products, startIndex = 0 }: { products: ReturnType<typeof useMobileGrid>["products"]; startIndex?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px, 3vw, 14px)' }}>
      {products.map((p, i) => (
        <MobileGridCard
          key={p.id}
          id={p.id}
          title={p.title}
          price={p.price}
          image={p.image}
          location={p.location}
          priority={startIndex + i < 4}
        />
      ))}
    </div>
  );
}

/**
 * Mobile Home is deliberately commerce-first.
 *
 * The mobile app should not reproduce the desktop marketing site. Its primary
 * job is to let people discover products quickly and move between the five
 * core app destinations using MobileBottomNav. Seller marketing, Intelligence,
 * corporate/legal footer content and duplicate product showcases remain on the
 * desktop/public website rather than extending the mobile shopping feed.
 */
function MobileHome() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileGrid();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '240px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <MobileAppHeader />

      <div className="px-[var(--mob-side,16px)] pb-6 pt-4">
        <section
          aria-label="Current marketplace listings"
          className="relative overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-[#0A234F] px-4 py-5 shadow-[0_20px_50px_rgba(10,35,79,0.16)]"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#F5A300]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#1D57D8]/25 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#F5A300]">
                Live on Loadify
              </p>
              <h2
                className="mt-1 text-[20px] font-black leading-tight"
                style={{ color: '#FFFFFF' }}
              >
                Current marketplace listings
              </h2>
            </div>

            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px, 3vw, 14px)' }}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonGridCard key={i} />)}
              </div>
            ) : products.length > 0 ? (
              <MobileProductGrid products={products} />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-white">No live listings yet.</p>
              </div>
            )}

            {loadingMore && (
              <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px, 3vw, 14px)' }}>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonGridCard key={`more-${i}`} />)}
              </div>
            )}

            {!loading && hasMore && <div ref={sentinelRef} className="h-px" aria-hidden="true" />}
          </div>
        </section>
      </div>
    </div>
  );
}

function DesktopHome() {
  return (
    <>
      <VisualMarketplaceCategories />

      <HeroSection />

      <section className="bg-[#F7F9FC] pb-6" aria-label="Loadify Market trust signals">
        <div className="w-full px-6">
          <TrustStrip />
        </div>
      </section>

      <FeaturedProducts />

      <section className="bg-[#F7F9FC] pb-6 pt-12" aria-label="Why Loadify is different">
        <div className="w-full px-6">
          <FeaturesGrid />
        </div>

        <LazySection rootMargin="320px">
          <div className="mt-6 w-full px-6">
            <HowItWorksSection />
          </div>
          <div className="mt-6 w-full px-6">
            <SecurityTrust />
          </div>
        </LazySection>
      </section>

      <SellerCTA />
    </>
  );
}

export default function Home() {
  const isMobile = useIsMobile();

  useEffect(() => { trackViewHome(); }, []);

  return (
    <MainLayout>
      <SEO
        title="UK Marketplace for Buyers & Serious Sellers | Loadify Market"
        description="Shop live products or start selling on Loadify Market. Stripe-powered checkout, order tracking and seller tools in one UK-operated marketplace."
        canonical="/"
      />

      <main id="main-content">
        {isMobile ? <MobileHome /> : <DesktopHome />}
      </main>
    </MainLayout>
  );
}
