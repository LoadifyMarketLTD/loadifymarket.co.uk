import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedListings from "@/components/FeaturedListings";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import PlatformFeatures from "@/components/PlatformFeatures";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function PixelPerfectIndex() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <TopBar />
      <Header />
      {/* spacer: 40px top bar + 64px navbar */}
      <div className="pt-[104px]" />
      <main>
        <HeroSection />
        <TrustStrip />
        <CategoryGrid />
        <FeaturedListings />
        <FeaturesSection />
        <HowItWorks />
        <PlatformFeatures />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
