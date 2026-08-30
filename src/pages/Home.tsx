import { useEffect } from "react";

import SEO from "@/components/SEO";
import MainLayout from "@/layouts/MainLayout";
import WebMobileNativeHome from "@/components/WebMobileNativeHome";
import { useIsMobile } from "@/hooks/use-mobile";

import HeroSection from "@/components/HeroSection";
import DesktopTrustStrip from "@/components/DesktopTrustStrip";
import FeaturedProducts from "@/components/FeaturedProducts";
import VisualMarketplaceCategories from "@/components/VisualMarketplaceCategories";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import SecurityTrust from "@/components/SecurityTrust";
import SellerCTA from "@/components/SellerCTA";
import LazySection from "@/components/LazySection";
import { trackViewHome } from "@/lib/analytics";

function DesktopHome() {
  return (
    <>
      <HeroSection />

      <section className="bg-[#F8F7F4] pb-10" aria-label="Loadify Market trust signals">
        <div className="mx-auto w-full max-w-[1480px] px-6 lg:px-10">
          <DesktopTrustStrip />
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

  useEffect(() => {
    trackViewHome();
  }, []);

  return (
    <MainLayout>
      <SEO
        title="UK Marketplace for Buyers & Serious Sellers | Loadify Market"
        description="Shop live products or start selling on Loadify Market. Stripe-powered checkout, order tracking and seller tools in one UK-operated marketplace."
        canonical="/"
      />

      <main id="main-content">
        {isMobile ? <WebMobileNativeHome /> : <DesktopHome />}
      </main>
    </MainLayout>
  );
}
