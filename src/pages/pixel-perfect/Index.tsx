import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategorySlider from "@/components/CategorySlider";
import FeaturedProducts from "@/components/FeaturedProducts";
import TrustStrip from "@/components/TrustStrip";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import SellerJourneySection from "@/components/SellerJourneySection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import PlatformFeatures from "@/components/PlatformFeatures";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";

export default function PixelPerfectIndex() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] font-sans antialiased">
      <Header />
      {/* spacer: 64px header row + 48px category nav */}
      <div className="pt-[112px]" />
      <main>
        <HeroSection />
        {/* Category strip — horizontal scroll, icon + label per category */}
        <CategorySlider />
        {/* Featured products — dark cinematic showcase */}
        <FeaturedProducts />
        {/* Trust strip — light transition */}
        <TrustStrip />
        {/* Below-fold sections deferred with IntersectionObserver to reduce
            initial DOM size. Components mount only when the user scrolls
            near them (rootMargin keeps a 300 px look-ahead). */}
        <LazySection>
          <CategoryGrid />
        </LazySection>
        <LazySection>
          <FeaturedListings />
        </LazySection>
        {/* Seller onboarding — visually continues FeaturedListings dark block */}
        <LazySection>
          <SellerJourneySection />
        </LazySection>
        <LazySection>
          <FeaturesSection />
        </LazySection>
        <LazySection>
          <HowItWorks />
        </LazySection>
        <LazySection>
          <PlatformFeatures />
        </LazySection>
        <LazySection>
          <CTASection />
        </LazySection>
      </main>
      <LazySection>
        <Footer />
      </LazySection>
    </div>
  );
}
