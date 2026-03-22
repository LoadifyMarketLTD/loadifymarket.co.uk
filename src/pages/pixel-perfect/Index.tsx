import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
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
      <Header />
      {/* spacer for fixed navbar */}
      <div className="pt-16" />
      <main>
        <HeroSection />
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
