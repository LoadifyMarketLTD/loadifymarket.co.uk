import { useEffect, useRef } from "react";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";

import MobileAppHeader from "@/components/MobileAppHeader";
import MobileHeroBanner from "@/components/MobileHeroBanner";
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
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";
import { trackViewHome } from "@/lib/analytics";

function SkeletonGridCard() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="rounded-xl animate-pulse flex flex-col gap-2 w-full aspect-square bg-[#E9E6DF]" />
      <div className="h-3 rounded-md bg-[#E9E6DF] w-[80%]" />
      <div className="h-3.5 rounded-md bg-[#E9E6DF] w-[50%]" />
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
    <div className="min-h-screen bg-[#F8F7F4]">
      <MobileAppHeader />
      <MobileHeroBanner products={leadProducts} loading={loading} />

      <div className="px-[var(--mob-side,16px)] pb-5 pt-1">
        <TrustStrip />
      </div>

      <div className="px-[var(--mob-side,16px)] pb-8 pt-2">
        <section aria-label="Marketplace products" className="bg-[#F8F7F4]">
          <div className="mb-5">
            <p
              className="text-[#6B7280]"
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 7 }}
            >
              Live on Loadify
            </p>
            <h2
              className="text-[#0A234F]"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 25,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                lineHeight: 1.08,
              }}
            >
              Products you can explore now
            </h2>
            <p className="text-[#667085]" style={{ fontSize: 12.5, marginTop: 7, lineHeight: 1.5 }}>
              Current approved marketplace listings.
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px, 3vw, 14px)' }}>
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
        className="bg-[#F8F7F4] px-[var(--mob-side,16px)]"
        style={{
          paddingTop: remainingProducts.length > 0 ? 8 : 0,
          paddingBottom: remainingProducts.length > 0 || loadingMore ? 28 : 0,
        }}
      >
        {(remainingProducts.length > 0 || loadingMore) && (
          <div>
            {remainingProducts.length > 0 && (
              <>
                <div className="mb-5">
                  <p
                    className="text-[#6B7280]"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 7 }}
                  >
                    Keep exploring
                  </p>
                  <h2
                    className="text-[#0A234F]"
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: 23,
                      fontWeight: 600,
                      letterSpacing: '-0.025em',
                      lineHeight: 1.1,
                    }}
                  >
                    More from the marketplace
                  </h2>
                </div>
                <MobileProductGrid products={remainingProducts} startIndex={6} />
              </>
            )}

            {loadingMore && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px, 3vw, 14px)', marginTop: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonGridCard key={`more-${i}`} />)}
              </div>
            )}
          </div>
        )}

        {!loading && hasMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}
      </section>

      <Footer />
    </div>
  );
}

function DesktopHome() {
  return (
    <>
      <HeroSection />

      <section className="bg-[#F8F7F4] pb-10" aria-label="Loadify Market trust signals">
        <div className="mx-auto w-full max-w-[1480px] px-6 lg:px-10">
          <TrustStrip />
        </div>
      </section>

      <VisualMarketplaceCategories />

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
