import { Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Package, TrendingUp, Users, ShieldCheck, RefreshCw, MapPin, ArrowRight, Star } from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';

// Lazy load below-the-fold components
const CinematicMarketplaceSwitch = lazy(() => import('../components/cinematic/CinematicMarketplaceSwitch'));
const CinematicStoryStrip = lazy(() => import('../components/cinematic/CinematicStoryStrip'));
const TrendingProducts = lazy(() => import('../components/TrendingProducts'));
const RecentlyViewed = lazy(() => import('../components/RecentlyViewed'));

export default function HomePage() {
  return (
    <div className="bg-jet">
      {/* Cinematic Hero */}
      <CinematicHero />

      {/* Category Navigation - Lazy Loaded */}
      <Suspense fallback={<div className="py-12 bg-graphite/30 min-h-[400px]" />}>
        <CinematicMarketplaceSwitch />
      </Suspense>

      {/* Story Strip - How It Works - Lazy Loaded */}
      <Suspense fallback={<div className="py-12 bg-jet min-h-[400px]" />}>
        <CinematicStoryStrip />
      </Suspense>

      {/* Trending Products Section - Lazy Loaded */}
      <section className="py-12 bg-graphite/30">
        <div className="container-cinematic">
          <Suspense fallback={<div className="min-h-[300px]" />}>
            <TrendingProducts maxProducts={8} days={7} />
          </Suspense>
        </div>
      </section>

      {/* Recently Viewed Section - Lazy Loaded */}
      <section className="py-12 bg-jet">
        <div className="container-cinematic">
          <Suspense fallback={<div className="min-h-[300px]" />}>
            <RecentlyViewed maxProducts={8} />
          </Suspense>
        </div>
      </section>

      {/* Why Loadify Market */}
      <section className="py-20 bg-jet">
        <div className="container-cinematic">
          <div className="text-center mb-16">
            <h2 className="heading-section text-white mb-4">
              Why <span className="text-gradient-gold">Loadify Market</span>?
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              The UK&apos;s complete multi-category marketplace for individuals and businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card-glass text-center hover:scale-[1.03] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-6">
                <Package className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">B2C &amp; B2B</h3>
              <p className="text-white/70">
                Shop individual products or buy in bulk – everything in one marketplace.
              </p>
            </div>

            <div className="card-glass text-center hover:scale-[1.03] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-6">
                <ShieldCheck className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Verified Sellers</h3>
              <p className="text-white/70">
                All sellers are verified. Shop with confidence and full buyer protection.
              </p>
            </div>

            <div className="card-glass text-center hover:scale-[1.03] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-6">
                <TrendingUp className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Best Deals</h3>
              <p className="text-white/70">
                Thousands of products, bulk lots and pallet deals updated daily.
              </p>
            </div>

            <div className="card-glass text-center hover:scale-[1.03] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-6">
                <Users className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Grow Your Business</h3>
              <p className="text-white/70">
                Register as a seller and reach thousands of buyers across the UK.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-graphite/30">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              Shop with <span className="text-gradient-gold">Confidence</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="card-glass flex flex-col items-center text-center p-6 hover:scale-[1.02] transition-all duration-300">
              <ShieldCheck className="h-10 w-10 text-gold mb-4" />
              <h4 className="font-bold text-white mb-2">Secure Payments</h4>
              <p className="text-white/60 text-sm">Stripe-powered encrypted checkout</p>
            </div>
            <div className="card-glass flex flex-col items-center text-center p-6 hover:scale-[1.02] transition-all duration-300">
              <Star className="h-10 w-10 text-gold mb-4" />
              <h4 className="font-bold text-white mb-2">Verified Sellers</h4>
              <p className="text-white/60 text-sm">All sellers approved &amp; rated</p>
            </div>
            <div className="card-glass flex flex-col items-center text-center p-6 hover:scale-[1.02] transition-all duration-300">
              <ShieldCheck className="h-10 w-10 text-gold mb-4" />
              <h4 className="font-bold text-white mb-2">Buyer Protection</h4>
              <p className="text-white/60 text-sm">Full refund if item not as described</p>
            </div>
            <div className="card-glass flex flex-col items-center text-center p-6 hover:scale-[1.02] transition-all duration-300">
              <RefreshCw className="h-10 w-10 text-gold mb-4" />
              <h4 className="font-bold text-white mb-2">Return System</h4>
              <p className="text-white/60 text-sm">Easy 14-day hassle-free returns</p>
            </div>
            <div className="card-glass flex flex-col items-center text-center p-6 hover:scale-[1.02] transition-all duration-300">
              <MapPin className="h-10 w-10 text-gold mb-4" />
              <h4 className="font-bold text-white mb-2">Order Tracking</h4>
              <p className="text-white/60 text-sm">Real-time delivery updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-jet relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[120px]" />
        </div>

        <div className="container-cinematic relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="heading-section text-white mb-6">
              Ready to <span className="text-gradient-gold">Get Started</span>?
            </h2>
            <p className="text-xl text-white/60 mb-10">
              Create an account and start buying or selling products, bulk lots and pallets today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register?type=seller" className="btn-primary inline-flex items-center gap-2">
                Start Selling
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/shop" className="btn-secondary inline-flex items-center gap-2">
                Shop Products
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/contact" className="btn-glass inline-flex items-center gap-2">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
