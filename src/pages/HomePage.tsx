import { Link } from 'react-router-dom';
import { Package, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import CinematicCategoryPanels from '../components/cinematic/CinematicCategoryPanels';
import CinematicMarketplaceSwitch from '../components/cinematic/CinematicMarketplaceSwitch';
import CinematicStoryStrip from '../components/cinematic/CinematicStoryStrip';
import DailyTrendingHandmade from '../components/cinematic/DailyTrendingHandmade';

export default function HomePage() {
  return (
    <div className="bg-smoke">
      {/* New Cinematic Hero */}
      <CinematicHero />

      {/* 3 Cinematic Category Panels */}
      <CinematicCategoryPanels />

      {/* Marketplace Mode Switch */}
      <CinematicMarketplaceSwitch />

      {/* Story Strip - How It Works */}
      <CinematicStoryStrip />

      {/* Daily Trending Handmade Section */}
      <DailyTrendingHandmade />

      {/* Features Section - Redesigned with Gold Icons */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-display font-bold text-center mb-4 text-jet">
            Why Choose Loadify Market?
          </h2>
          <p className="text-center text-gray-600 mb-16 text-lg max-w-2xl mx-auto">
            The premium marketplace trusted by thousands of buyers and sellers worldwide
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-500 text-white rounded-cinematic-md mb-6 shadow-cinematic group-hover:shadow-cinematic-glow transition-all duration-300 group-hover:scale-110">
                <Package className="h-10 w-10" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-jet">Wide Selection</h3>
              <p className="text-gray-600 leading-relaxed">
                From individual products to bulk pallets, find everything you need in one place.
              </p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-500 text-white rounded-cinematic-md mb-6 shadow-cinematic group-hover:shadow-cinematic-glow transition-all duration-300 group-hover:scale-110">
                <ShieldCheck className="h-10 w-10" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-jet">Secure Payments</h3>
              <p className="text-gray-600 leading-relaxed">
                Safe and secure transactions with comprehensive buyer protection.
              </p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-500 text-white rounded-cinematic-md mb-6 shadow-cinematic group-hover:shadow-cinematic-glow transition-all duration-300 group-hover:scale-110">
                <TrendingUp className="h-10 w-10" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-jet">Competitive Prices</h3>
              <p className="text-gray-600 leading-relaxed">
                Best deals on quality products from verified professional sellers.
              </p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-500 text-white rounded-cinematic-md mb-6 shadow-cinematic group-hover:shadow-cinematic-glow transition-all duration-300 group-hover:scale-110">
                <Users className="h-10 w-10" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-jet">Trusted Community</h3>
              <p className="text-gray-600 leading-relaxed">
                Join thousands of satisfied buyers and sellers in our marketplace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Redesigned */}
      <section className="relative bg-gradient-to-br from-jet via-graphite to-jet text-white py-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Ready to Start Selling?
          </h2>
          <p className="text-xl md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Join our premium marketplace and reach thousands of potential customers worldwide.
          </p>
          <Link 
            to="/register?type=seller" 
            className="inline-flex items-center justify-center px-12 py-5 bg-gold-400 hover:bg-gold-500 text-jet font-display font-bold rounded-cinematic-md shadow-cinematic-lg hover:shadow-cinematic-glow transition-all duration-300 hover:scale-105 text-lg"
          >
            Register as Seller
          </Link>
        </div>
      </section>
    </div>
  );
}
