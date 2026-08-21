import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

import MobileAppHeader from "@/components/MobileAppHeader";
import MobileCategoryShortcuts from "@/components/MobileCategoryShortcuts";
import MobileHeroBanner from "@/components/MobileHeroBanner";
import MobileGridCard from "@/components/MobileGridCard";
import { useMobileGrid } from "@/hooks/useMobileGrid";

import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import FeaturedProducts from "@/components/FeaturedProducts";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SellerCTA from "@/components/SellerCTA";
import LazySection from "@/components/LazySection";
import { trackViewHome } from "@/lib/analytics";

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
      <div className="rounded-xl animate-pulse flex flex-col gap-2 w-full aspect-square bg-white/[0.10]" />
      <div className="h-3 rounded-md bg-white/[0.10] w-[80%]" />
      <div className="h-3.5 rounded-md bg-white/[0.10] w-[50%]" />
    </div>
  );
}

function MobileHome() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileGrid();
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    <div className="md:hidden min-h-screen bg-[#0A234F]">
      <MobileAppHeader />
      <MobileCategoryShortcuts />
      <MobileHeroBanner />

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
          {loadingMore && Array.from({ length: 4 }).map((_, i) => <SkeletonGridCard key={`more-${i}`} />)}
        </div>

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
      <Helmet>
        <link
          rel="preload"
          as="image"
          href="/hero-gold.webp"
          type="image/webp"
          media="(min-width: 768px)"
          // @ts-expect-error fetchpriority is a valid HTML attr not yet in React types
          fetchpriority="high"
        />
      </Helmet>
      <SEO
        title="Sell in the UK with 0% Commission | Loadify Market"
        description="List products for free, sell at fixed prices, and get paid through Stripe. Buyers can shop trusted UK marketplace sellers with secure checkout."
        canonical="/"
      />

      <main id="main-content">
        <MobileHome />

        <div className="hidden md:block bg-[#0A234F]">
          <HeroSection />

          <section
            className="bg-[#0A234F] py-6 px-8"
            aria-label="Platform overview"
          >
            <TrustStrip />

            <div className="mt-8">
              <FeaturedProducts />
            </div>

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

          <SellerCTA />
        </div>
      </main>
    </MainLayout>
  );
}
