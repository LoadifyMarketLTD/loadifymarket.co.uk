import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CountdownBanner from "@/components/CountdownBanner";
import TrustSection from "@/components/TrustSection";
import WhySellSection from "@/components/WhySellSection";
import ForBuyersSection from "@/components/ForBuyersSection";
import FeaturesSection from "@/components/FeaturesSection";
import StatsSection from "@/components/StatsSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import CategoriesSection from "@/components/CategoriesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <CountdownBanner variant="homepage" />
      <TrustSection />
      <WhySellSection />
      <ForBuyersSection />
      <FeaturesSection />
      <StatsSection />
      <HowItWorksSection />
      <CategoriesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
