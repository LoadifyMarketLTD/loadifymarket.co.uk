import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import PaymentTrustSection from "@/components/PaymentTrustSection";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import PlatformFeatures from "@/components/PlatformFeatures";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";

export default function PixelPerfectIndex() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] font-sans antialiased">
      <TopBar />
      <Header />
      {/* spacer: 40px top bar + 64px header row + 40px category nav */}
      <div className="pt-[144px]" />
      <main>
        <HeroSection />
        <TrustStrip />
        <PaymentTrustSection />
        <CategoryGrid />
        {/* Below-fold sections: deferred with IntersectionObserver to reduce
            the initial DOM node count from ~1,200 down toward the recommended
            maximum of 800 elements. Components mount only when the user
            scrolls near them (rootMargin keeps a 300 px look-ahead). */}
        <LazySection>
          <FeaturedListings />
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
