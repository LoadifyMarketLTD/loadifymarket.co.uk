import { useEffect } from 'react';
import SEO from '@/components/SEO';
import FocusedHomepageNavbar from '@/components/FocusedHomepageNavbar';
import HeroSection from '@/components/HeroSection';
import {
  FocusedCTASection,
  FocusedCategoriesSection,
  FocusedFeaturesSection,
  FocusedHomepageFooter,
  FocusedHowItWorksSection,
  FocusedStatsSection,
  FocusedTrustSection,
  FocusedWhySellSection,
} from '@/components/FocusedHomepageSections';
import { trackViewHome } from '@/lib/analytics';

export default function Home() {
  useEffect(() => {
    trackViewHome();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="UK Marketplace for Buyers & Sellers | Loadify Market"
        description="Browse current marketplace listings or start selling on Loadify Market, a UK-operated marketplace connecting buyers and sellers."
        canonical="/"
      />

      <FocusedHomepageNavbar />

      <main id="main-content">
        <HeroSection />
        <FocusedTrustSection />
        <FocusedWhySellSection />
        <FocusedFeaturesSection />
        <FocusedStatsSection />
        <FocusedHowItWorksSection />
        <FocusedCategoriesSection />
        <FocusedCTASection />
      </main>

      <FocusedHomepageFooter />
    </div>
  );
}
