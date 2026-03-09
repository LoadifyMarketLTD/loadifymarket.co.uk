import { Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import {
  ShieldCheck, RotateCcw, MapPin, BadgeCheck, Lock,
  ArrowRight, Cpu, Shirt, Home, Wrench, Car, Package, Layers, Sparkles,
  TrendingUp, Clock, Star, Truck,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';

// Lazy load below-the-fold components
const CinematicMarketplaceSwitch = lazy(() => import('../components/cinematic/CinematicMarketplaceSwitch'));
const CinematicStoryStrip = lazy(() => import('../components/cinematic/CinematicStoryStrip'));
const TrendingProducts = lazy(() => import('../components/TrendingProducts'));
const RecentlyViewed = lazy(() => import('../components/RecentlyViewed'));

const CATEGORIES = [
  { name: 'Electronics', icon: Cpu, slug: 'electronics', count: '2,400+' },
  { name: 'Fashion', icon: Shirt, slug: 'fashion', count: '5,100+' },
  { name: 'Home & Garden', icon: Home, slug: 'home-garden', count: '3,800+' },
  { name: 'Tools', icon: Wrench, slug: 'tools', count: '1,200+' },
  { name: 'Vehicles', icon: Car, slug: 'vehicles', count: '890+' },
  { name: 'Bulk Lots', icon: Package, slug: 'bulk-lots', count: '640+' },
  { name: 'Pallet Deals', icon: Layers, slug: 'pallet-deals', count: '320+' },
  { name: 'Handmade', icon: Sparkles, slug: 'handmade', count: '1,700+' },
];

const TRUST_ITEMS = [
  {
    icon: Lock,
    title: 'Secure Payments',
    description: 'Stripe-powered checkout with full encryption and fraud protection on every transaction.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Sellers',
    description: 'All sellers are identity-verified before listing. Ratings and reviews are authentic.',
  },
  {
    icon: ShieldCheck,
    title: 'Buyer Protection',
    description: 'If something goes wrong, our buyer protection policy ensures you are covered.',
  },
  {
    icon: RotateCcw,
    title: 'Returns System',
    description: 'Easy 14-day returns. Raise a return request online and track it every step of the way.',
  },
  {
    icon: MapPin,
    title: 'Order Tracking',
    description: 'Real-time order tracking from dispatch to delivery with proof-of-delivery upload.',
  },
];

const TOP_DEALS = [
  { id: 1, title: 'Electronics Mixed Pallet', discount: 60, price: 4999, rrp: 12500, tag: 'Top Deal', category: 'Electronics' },
  { id: 2, title: "Women's Fashion Bundle", discount: 64, price: 6499, rrp: 18000, tag: 'Hot', category: 'Fashion' },
  { id: 3, title: 'Home & Kitchen Appliances Lot', discount: 65, price: 3299, rrp: 9500, tag: 'New', category: 'Home & Garden' },
  { id: 4, title: 'Tools Wholesale Clearance', discount: 55, price: 1899, rrp: 4200, tag: 'Clearance', category: 'Tools' },
];

export default function HomePage() {
  return (
    <div className="bg-jet">
      {/* Hero Section */}
      <CinematicHero />

      {/* Category Navigation Grid */}
      <section className="py-16 bg-graphite/20">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Shop by Category</h2>
              <p className="text-white/50 text-sm mt-1">Explore thousands of products across all categories</p>
            </div>
            <Link to="/shop" className="text-gold text-sm font-semibold hover:underline flex items-center gap-1">
              All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to={`/shop?category=${cat.slug}`}
                  className="group flex flex-col items-center justify-center p-4 rounded-premium-sm bg-graphite/40 border border-white/5 hover:border-gold/40 hover:bg-graphite/70 transition-all duration-300 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mb-2 group-hover:bg-gold/20 transition-colors">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <span className="text-xs font-semibold text-white leading-tight">{cat.name}</span>
                  <span className="text-[10px] text-white/40 mt-0.5">{cat.count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Marketplace Mode Switch - Lazy Loaded */}
      <Suspense fallback={<div className="py-12 bg-graphite/30 min-h-[400px]" />}>
        <CinematicMarketplaceSwitch />
      </Suspense>

      {/* Top Deals Section */}
      <section className="py-16 bg-jet">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-premium-sm bg-gold/10">
                <TrendingUp className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Top Deals</h2>
                <p className="text-white/50 text-sm">Limited-time bulk and pallet offers</p>
              </div>
            </div>
            <Link to="/bulk" className="text-gold text-sm font-semibold hover:underline flex items-center gap-1">
              View All Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TOP_DEALS.map((deal) => (
              <Link key={deal.id} to="/bulk" className="card-product group block">
                <div className="aspect-square bg-gradient-to-br from-graphite to-jet relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="w-20 h-20 text-white/10 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="text-xs font-bold bg-gold text-jet px-2 py-1 rounded-full">{deal.tag}</span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold bg-red-500/90 text-white px-2 py-1 rounded-full">-{deal.discount}%</span>
                  </div>
                  <div className="card-product-overlay" />
                </div>
                <div className="p-4">
                  <p className="text-xs text-gold/80 mb-1">{deal.category}</p>
                  <h3 className="font-bold text-white text-sm mb-2 line-clamp-2">{deal.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-gold">£{deal.price.toLocaleString()}</span>
                    <span className="text-xs text-white/40 line-through">£{deal.rrp.toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products Section - Lazy Loaded */}
      <section className="py-12 bg-graphite/20">
        <div className="container-cinematic">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-premium-sm bg-gold/10">
              <Star className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Latest Products</h2>
              <p className="text-white/50 text-sm">Fresh listings added by verified sellers</p>
            </div>
          </div>
          <Suspense fallback={<div className="min-h-[300px]" />}>
            <TrendingProducts maxProducts={8} days={7} />
          </Suspense>
        </div>
      </section>

      {/* Story Strip - How It Works - Lazy Loaded */}
      <Suspense fallback={<div className="py-12 bg-jet min-h-[400px]" />}>
        <CinematicStoryStrip />
      </Suspense>

      {/* Recently Viewed Section - Lazy Loaded */}
      <section className="py-12 bg-graphite/20">
        <div className="container-cinematic">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-premium-sm bg-gold/10">
              <Clock className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Recently Viewed</h2>
              <p className="text-white/50 text-sm">Continue where you left off</p>
            </div>
          </div>
          <Suspense fallback={<div className="min-h-[300px]" />}>
            <RecentlyViewed maxProducts={8} />
          </Suspense>
        </div>
      </section>

      {/* Marketplace + Logistics Support Section (XDrive Integration) */}
      <section className="py-20 bg-graphite/30 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[120px]" />
        </div>
        <div className="container-cinematic relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Text block */}
              <div>
                <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-6">
                  <Truck className="w-4 h-4 text-gold" />
                  <span className="text-gold text-xs font-medium">Marketplace + Logistics Support</span>
                </div>
                <h2 className="heading-section text-white mb-5">
                  Trading Made Easy.{' '}
                  <span className="text-gradient-gold">Delivery Sorted.</span>
                </h2>
                <p className="text-white/60 text-base leading-relaxed mb-8">
                  Loadify Market helps buyers and sellers trade products, pallet deals, and wholesale
                  stock. Transport support and delivery coordination can be arranged via{' '}
                  <span className="text-white/80 font-medium">XDrive Logistics</span>.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Browse Marketplace
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/transport-quote" className="btn-secondary inline-flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Request Transport Quote
                  </Link>
                </div>
              </div>

              {/* Feature list */}
              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    icon: Package,
                    title: 'Pallet & Bulk Orders',
                    desc: 'Find wholesale and pallet deals from verified UK sellers.',
                  },
                  {
                    icon: Truck,
                    title: 'Delivery Coordination',
                    desc: 'Collection and delivery support powered by XDrive Logistics.',
                  },
                  {
                    icon: MapPin,
                    title: 'UK-Wide Coverage',
                    desc: 'Transport quotes for any UK postcode — fast turnaround.',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="card-glass flex items-start gap-4 py-4 px-5"
                    >
                      <div className="p-2 rounded-premium-sm bg-gold/10 flex-shrink-0">
                        <Icon className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">
                        {item.title}
                      </h4>
                        <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-jet">
        <div className="container-cinematic">
          <div className="text-center mb-14">
            <h2 className="heading-section text-white mb-4">
              Why Shop on <span className="text-gradient-gold">Loadify Market</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              We've built every layer of the platform with buyer and seller protection in mind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card-glass text-center hover:scale-[1.03] transition-all duration-500 group">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm mb-5 group-hover:bg-gold/20 transition-colors">
                    <Icon className="h-7 w-7 text-gold" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/60 text-xs leading-relaxed">{item.description}</p>
                </div>
              );
            })}
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
              Join thousands of buyers and sellers on the UK's fastest-growing marketplace.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
                Start Shopping
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/register?type=seller" className="btn-secondary inline-flex items-center gap-2">
                Become a Seller
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/contact" className="btn-outline inline-flex items-center gap-2">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
