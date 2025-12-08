import { Link } from 'react-router-dom';
import { Package, TrendingUp, Users, ShieldCheck } from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import CinematicMarketplaceSwitch from '../components/cinematic/CinematicMarketplaceSwitch';
import CinematicStoryStrip from '../components/cinematic/CinematicStoryStrip';
import DailyTrendingHandmade from '../components/cinematic/DailyTrendingHandmade';

export default function HomePage() {
  return (
    <div>
      {/* New Cinematic Hero */}
      <CinematicHero />

      {/* Marketplace Mode Switch */}
      <CinematicMarketplaceSwitch />

      {/* Story Strip - How It Works */}
      <CinematicStoryStrip />

      {/* Daily Trending Handmade Section */}
      <DailyTrendingHandmade />

      {/* Original Hero Section - Keeping as backup */}
      <section className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-navy-600 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 py-12 md:py-16 lg:py-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Your B2B & B2C Marketplace for{' '}
                <span className="text-gold-400">Pallets, Lots & Products</span>
              </h1>
              <p className="text-base md:text-lg lg:text-xl mb-6 text-gray-300 leading-relaxed">
                Discover unbeatable deals on quality products, bulk lots, and pallets. 
                Whether you're buying or selling, connect with a trusted global community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/catalog" className="btn-secondary text-base md:text-lg px-6 py-3 text-center shadow-lg hover:shadow-xl">
                  Browse Catalog
                </Link>
                <Link to="/register?type=seller" className="btn-outline text-base md:text-lg px-6 py-3 text-center bg-white/10 border-2 border-white text-white hover:bg-white hover:text-navy-900 shadow-lg hover:shadow-xl">
                  Become a Seller
                </Link>
              </div>
            </div>

            {/* Right Visual Element */}
            <div className="hidden lg:block relative">
              <div className="relative w-full h-64 lg:h-80">
                {/* Pallet/Box Icon Illustration */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Main box */}
                    <div className="w-48 h-48 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg shadow-2xl transform rotate-6 hover:rotate-12 transition-transform duration-300">
                      <div className="absolute inset-4 border-2 border-white/30 rounded-md"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <Package className="w-16 h-16 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                    {/* Stacked boxes effect */}
                    <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-navy-600 to-navy-700 rounded-lg shadow-xl transform -rotate-6">
                      <div className="absolute inset-2 border-2 border-gold-400/30 rounded-md"></div>
                    </div>
                    <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-gold-500/40 to-gold-600/40 rounded-lg shadow-lg transform rotate-12"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Loadify Market?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-100 text-navy-800 rounded-full mb-4">
                <Package className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Wide Selection</h3>
              <p className="text-gray-600">
                From individual products to bulk pallets, find everything you need.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-100 text-navy-800 rounded-full mb-4">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
              <p className="text-gray-600">
                Safe and secure transactions with buyer protection.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-100 text-navy-800 rounded-full mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Competitive Prices</h3>
              <p className="text-gray-600">
                Best deals on quality products from verified sellers.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-100 text-navy-800 rounded-full mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Trusted Community</h3>
              <p className="text-gray-600">
                Join thousands of satisfied buyers and sellers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Electronics', 'Home & Garden', 'Clothing', 'Pallets & Lots', 'Automotive', 'Sports', 'Books', 'Toys'].map((category) => (
              <Link
                key={category}
                to={`/catalog?category=${category.toLowerCase().replace(' ', '-')}`}
                className="card hover:shadow-lg transition-shadow text-center"
              >
                <h3 className="font-semibold text-lg">{category}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-navy-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-xl mb-8 text-gray-200">
            Join our marketplace and reach thousands of potential customers.
          </p>
          <Link to="/register?type=seller" className="btn-secondary text-lg">
            Register as Seller
          </Link>
        </div>
      </section>
    </div>
  );
}
