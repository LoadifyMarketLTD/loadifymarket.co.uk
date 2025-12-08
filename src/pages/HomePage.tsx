import { Link } from 'react-router-dom';
import { Package, TrendingUp, Users, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import CinematicMarketplaceSwitch from '../components/cinematic/CinematicMarketplaceSwitch';
import CinematicStoryStrip from '../components/cinematic/CinematicStoryStrip';
import DailyTrendingHandmade from '../components/cinematic/DailyTrendingHandmade';

export default function HomePage() {
  return (
    <div className="bg-jet">
      {/* Cinematic Hero */}
      <CinematicHero />

      {/* Marketplace Mode Switch */}
      <CinematicMarketplaceSwitch />

      {/* Story Strip - How It Works */}
      <CinematicStoryStrip />

      {/* Daily Trending Handmade Section */}
      <DailyTrendingHandmade />

      {/* Features Section - Cinematic Redesign */}
      <section className="py-20 bg-jet">
        <div className="container-cinematic">
          <div className="text-center mb-16">
            <h2 className="heading-section text-white mb-4">
              Why Choose <span className="text-gradient-gold">Loadify Market</span>?
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              The UK's most trusted marketplace for logistics, wholesale, and handmade goods
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card-glass text-center hover:scale-[1.03] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-6">
                <Package className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Wide Selection</h3>
              <p className="text-white/50">
                From individual products to bulk pallets, find everything you need.
              </p>
            </div>

            <div className="card-glass text-center hover:scale-[1.03] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-6">
                <ShieldCheck className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Secure Payments</h3>
              <p className="text-white/50">
                Safe and secure transactions with buyer protection.
              </p>
            </div>

            <div className="card-glass text-center hover:scale-[1.03] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-6">
                <TrendingUp className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Competitive Prices</h3>
              <p className="text-white/50">
                Best deals on quality products from verified sellers.
              </p>
            </div>

            <div className="card-glass text-center hover:scale-[1.03] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-6">
                <Users className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Trusted Community</h3>
              <p className="text-white/50">
                Join thousands of satisfied buyers and sellers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section - Cinematic Redesign */}
      <section className="py-20 bg-graphite/30">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              Shop by <span className="text-gradient-gold">Category</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Electronics', 'Home & Garden', 'Clothing', 'Pallets & Lots', 'Automotive', 'Sports', 'Books', 'Toys'].map((category) => (
              <Link
                key={category}
                to={`/catalog?category=${category.toLowerCase().replace(' ', '-')}`}
                className="card-glass text-center hover:scale-[1.05] transition-all duration-500 group"
              >
                <div className="p-2">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-premium-sm bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <Sparkles className="w-6 h-6 text-gold" />
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-gold transition-colors">{category}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Cinematic Redesign */}
      <section className="py-20 bg-jet relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[120px]" />
        </div>

        <div className="container-cinematic relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="heading-section text-white mb-6">
              Ready to Start <span className="text-gradient-gold">Selling</span>?
            </h2>
            <p className="text-xl text-white/60 mb-10">
              Join our marketplace and reach thousands of potential customers across the UK. List your products, pallets, or services today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register?type=seller" className="btn-primary inline-flex items-center gap-2">
                Register as Seller
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/contact" className="btn-secondary inline-flex items-center gap-2">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
