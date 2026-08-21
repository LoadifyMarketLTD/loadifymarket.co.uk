import { useEffect, useRef } from "react";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

import MobileAppHeader from "@/components/MobileAppHeader";
import MobileCategoryShortcuts from "@/components/MobileCategoryShortcuts";
import MobileHeroBanner from "@/components/MobileHeroBanner";
import MobileGridCard from "@/components/MobileGridCard";
import { useMobileGrid } from "@/hooks/useMobileGrid";

import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import ShopByCategory from "@/components/ShopByCategory";
import FeaturedProducts from "@/components/FeaturedProducts";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SellerCTA from "@/components/SellerCTA";
import LazySection from "@/components/LazySection";
import { trackViewHome } from "@/lib/analytics";

function SkeletonGridCard() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="rounded-xl animate-pulse flex flex-col gap-2 w-full aspect-square bg-white/[0.06]" />
      <div className="h-3 rounded-md bg-white/[0.06] w-[80%]" />
      <div className="h-3.5 rounded-md bg-white/[0.06] w-[50%]" />
    </div>
  );
}

function MobileProductGrid({ products, startIndex = 0 }: { products: ReturnType<typeof useMobileGrid>["products"]; startIndex?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(10px, 3vw, 14px)',
      }}
    >
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

function MobileHome() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileGrid();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const leadProducts = products.slice(0, 6);
  const remainingProducts = products.slice(6);

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
    <div className="md:hidden min-h-screen bg-[#F7F9FC]">
      <MobileAppHeader />
      <MobileHeroBanner />

      <div className="px-[var(--mob-side,16px)] pb-5 pt-1">
        <TrustStrip />
      </div>

      <div className="bg-[#071B3A] pb-7 pt-3">
        <MobileCategoryShortcuts />

        <section
          aria-label="Marketplace products"
          style={{ paddingInline: 'var(--mob-side, 16px)', paddingTop: 18 }}
        >
          <div style={{ marginBottom: 14 }}>
            <p className="text-[#F5A300]" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
              Live on Loadify
            </p>
            <h2 className="text-white" style={{ fontSize: 20, fontWeight: 820, lineHeight: 1.2 }}>
              Products you can explore now
            </h2>
            <p className="text-white/60" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
              Browse current marketplace listings and discover what’s available.
            </p>
          </div>

          {loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'clamp(10px, 3vw, 14px)',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => <SkeletonGridCard key={i} />)}
            </div>
          ) : (
            <MobileProductGrid products={leadProducts} />
          )}
        </section>
      </div>

      <SellerCTA />

      <section className="px-[var(--mob-side,16px)] pb-6" aria-label="Seller platform value">
        <FeaturesGrid />
      </section>

      <section className="px-[var(--mob-side,16px)] pb-8" aria-label="Loadify Intelligence direction">
        <SecurityTrust />
      </section>

      <section
        aria-label="More marketplace products"
        className="bg-[#071B3A]"
        style={{
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: remainingProducts.length > 0 ? 24 : 0,
          paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px) + 20px)',
        }}
      >
        {remainingProducts.length > 0 && (
          <>
            <div style={{ marginBottom: 14 }}>
              <p className="text-[#F5A300]" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
                Keep exploring
              </p>
              <h2 className="text-white" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
                More from the marketplace
              </h2>
            </div>
            <MobileProductGrid products={remainingProducts} startIndex={6} />
          </>
        )}

        {loadingMore && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'clamp(10px, 3vw, 14px)',
              marginTop: 12,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => <SkeletonGridCard key={`more-${i}`} />)}
          </div>
        )}

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
      <SEO
        title="UK Marketplace Built for Buyers & Serious Sellers | Loadify Market"
        description="Shop across categories or start selling on Loadify Market. Stripe-powered checkout, order tracking and seller tools in one UK-operated marketplace."
        canonical="/"
      />

      <main id="main-content">
        <MobileHome />

        <div className="hidden md:block">
          <HeroSection />

          <section className="bg-[#F7F9FC] pb-10" aria-label="Loadify Market trust signals">
            <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
              <TrustStrip />
            </div>
          </section>

          <section className="bg-[#071B3A] py-8" aria-label="Shop Loadify Market">
            <ShopByCategory />
            <div className="mt-1">
              <FeaturedProducts />
            </div>
          </section>

          <section className="bg-[#F7F9FC] py-12" aria-label="Why Loadify is different">
            <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
              <FeaturesGrid />
            </div>

            <LazySection rootMargin="320px">
              <div className="mx-auto mt-8 w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
                <HowItWorksSection />
              </div>
              <div className="mx-auto mt-8 w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
                <SecurityTrust />
              </div>
            </LazySection>
          </section>

          <SellerCTA />
        </div>
      </main>
    </MainLayout>
  );
}
