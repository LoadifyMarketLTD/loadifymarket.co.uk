import { Link } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import {
  ShieldCheck, RotateCcw, MapPin, BadgeCheck, Lock,
  ArrowRight, Package, Layers, Sparkles,
  Flame, Clock, Truck, Tag, CheckCircle2, ArrowRightCircle, Users, Store,
  Zap, Home, Wrench, Car, Gamepad2, Heart, Briefcase, Leaf,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';

// Lazy load below-the-fold components
const CinematicStoryStrip = lazy(() => import('../components/cinematic/CinematicStoryStrip'));
const TrendingProducts = lazy(() => import('../components/TrendingProducts'));

const CATEGORIES = [
  { name: 'Electronics', icon: Zap, href: '/shop?type=product&category=electronics' },
  { name: 'Fashion', icon: Store, href: '/shop?type=product&category=fashion' },
  { name: 'Home & Garden', icon: Home, href: '/shop?type=product&category=home-garden' },
  { name: 'Tools', icon: Wrench, href: '/shop?type=product&category=tools' },
  { name: 'Vehicles', icon: Car, href: '/shop?type=product&category=vehicles' },
  { name: 'Toys', icon: Gamepad2, href: '/shop?type=product&category=toys' },
  { name: 'Health & Beauty', icon: Heart, href: '/shop?type=product&category=health-beauty' },
  { name: 'Pets', icon: Leaf, href: '/shop?type=product&category=pets' },
  { name: 'Office Supplies', icon: Briefcase, href: '/shop?type=product&category=office' },
  { name: 'Handmade', icon: Sparkles, href: '/shop?type=handmade' },
  { name: 'Bulk Lots', icon: Package, href: '/bulk?type=lot' },
  { name: 'Pallet Deals', icon: Layers, href: '/bulk?type=pallet' },
  { name: 'Clearance Stock', icon: Tag, href: '/bulk?type=clearance' },
];

const TRUST_ITEMS = [
  {
    icon: Lock,
    title: 'Secure Stripe Payments',
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

// Type alias for joined product rows from Supabase (before transforming storeSlug into seller)
type ProductRow = Product & { store?: { storeSlug?: string } | null };

// Helper to transform joined Supabase product rows into Product objects
function transformProductRows(data: ProductRow[]) {
  return data.map((product) => ({
    ...product,
    seller: product.seller ? {
      ...product.seller,
      storeSlug: product.store?.storeSlug,
    } : undefined,
  }));
}

const PRODUCT_QUERY_FIELDS = `
  *,
  seller:seller_profiles(
    businessName,
    isApproved,
    rating,
    marketplaceRole,
    paymentBehaviour,
    userId
  ),
  store:seller_stores(
    storeSlug
  )
`;

export default function HomePage() {
  const [featuredDeals, setFeaturedDeals] = useState<Product[]>([]);
  const [bulkDeals, setBulkDeals] = useState<Product[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(true);
  const [trendingCount, setTrendingCount] = useState<number | null>(null);
  const [newestCount, setNewestCount] = useState<number | null>(null);

  useEffect(() => {
    // Fetch featured deals: most-viewed active products
    const fetchDeals = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select(PRODUCT_QUERY_FIELDS)
          .eq('isActive', true)
          .eq('isApproved', true)
          .order('views', { ascending: false })
          .limit(6);
        if (data) setFeaturedDeals(transformProductRows(data as ProductRow[]));
      } catch {
        // silently swallow — section will stay empty / hidden
      } finally {
        setDealsLoading(false);
      }
    };

    // Fetch bulk deals: newest B2B listings
    const fetchBulk = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select(PRODUCT_QUERY_FIELDS)
          .eq('isActive', true)
          .eq('isApproved', true)
          .in('type', ['pallet', 'lot', 'wholesale', 'clearance'])
          .order('createdAt', { ascending: false })
          .limit(6);
        if (data) setBulkDeals(transformProductRows(data as ProductRow[]));
      } catch {
        // silently swallow
      } finally {
        setBulkLoading(false);
      }
    };

    fetchDeals();
    fetchBulk();
  }, []);
  return (
    <div className="bg-jet">
      {/* 1 — Hero */}
      <CinematicHero />

      {/* OPEN MARKETPLACE message */}
      <section className="bg-graphite/60 border-y border-white/5">
        <div className="container-cinematic py-5">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1 mb-3">
              <Users className="w-3.5 h-3.5 text-gold" />
              <span className="text-gold text-xs font-medium uppercase tracking-wider">Open Marketplace</span>
            </div>
            <p className="text-white/70 text-base leading-relaxed">
              Anyone can create an account, list products, and sell directly to buyers across the UK.
            </p>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm flex-wrap">
              <Link to="/register?type=seller" className="flex items-center gap-1.5 text-gold hover:underline font-semibold">
                <Store className="w-4 h-4" />
                Start Selling Free
              </Link>
              <Link to="/catalog" className="flex items-center gap-1.5 text-white/60 hover:text-gold transition-colors">
                <ArrowRight className="w-4 h-4" />
                Browse All Listings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Shop By Category */}
      <section className="py-8 md:py-10 bg-graphite/20">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                <span className="text-gold text-xs font-medium">Browse by Category</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">What are you looking for?</h2>
            </div>
            <Link to="/shop" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 13 categories — 2-col mobile, 4-col tablet, 5-col desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="group flex flex-col items-center justify-center p-3 md:p-4 rounded-premium-md bg-graphite/60 border border-gold/20 hover:border-gold/60 hover:bg-graphite/80 transition-all duration-300 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center mb-2 group-hover:bg-gold/30 transition-colors">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <span className="text-xs font-bold text-white leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 — Featured Deals — hidden when no data */}
      {(dealsLoading || featuredDeals.length > 0) && (
      <section className="py-8 md:py-10 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          {/* Deal accent bar */}
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-1 h-px bg-red-500/30" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Tag className="w-3 h-3" /> Flash Deals — Up to 65% Off
            </span>
            <div className="flex-1 h-px bg-red-500/30" />
          </div>
          <div className="flex items-center justify-between mb-5 mt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-premium-sm bg-red-500/15 border border-red-500/20">
                <Tag className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Featured Deals</h2>
                <p className="text-white/50 text-sm">Discounted bulk &amp; pallet offers — limited time</p>
              </div>
            </div>
            <Link to="/bulk" className="text-red-400 text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              View All Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {dealsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-graphite aspect-[4/3] rounded-premium-sm mb-2" />
                  <div className="bg-graphite h-4 rounded mb-1" />
                  <div className="bg-graphite h-4 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {featuredDeals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-5 text-center sm:hidden">
            <Link to="/bulk" className="btn-secondary inline-flex items-center gap-2 text-sm">
              View All Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* 4 — Trending Products — hidden when no data */}
      {(trendingCount === null || trendingCount > 0) && (
      <section className="py-8 md:py-10 bg-graphite/25 border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-premium-sm bg-orange-500/15 border border-orange-500/20">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Trending Products</h2>
                <p className="text-white/50 text-sm">Most viewed &amp; added to cart this week</p>
              </div>
            </div>
            <Link to="/catalog?sort=trending" className="text-orange-400 text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              View Trending <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-3 gap-4 min-h-[220px]" />}>
            <TrendingProducts maxProducts={6} days={7} mode="trending" onDataLoaded={setTrendingCount} />
          </Suspense>
        </div>
      </section>
      )}

      {/* 5 — New Listings — hidden when no data */}
      {(newestCount === null || newestCount > 0) && (
      <section className="py-8 md:py-10 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-premium-sm bg-emerald-500/15 border border-emerald-500/20">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">New Listings</h2>
                <p className="text-white/50 text-sm">Latest uploads from verified sellers</p>
              </div>
            </div>
            <Link to="/catalog?sort=createdAt_desc" className="text-emerald-400 text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              View Newest <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-3 gap-4 min-h-[220px]" />}>
            <TrendingProducts maxProducts={6} days={30} mode="newest" skip={6} onDataLoaded={setNewestCount} />
          </Suspense>
        </div>
      </section>
      )}

      {/* 6 — Bulk & Pallet Deals — hidden when no data */}
      {(bulkLoading || bulkDeals.length > 0) && (
      <section className="py-8 md:py-10 bg-graphite/25 border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-premium-sm bg-gold/10 border border-gold/20">
                <Package className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Bulk &amp; Pallet Lots</h2>
                <p className="text-white/50 text-sm">Wholesale inventory — pallets, lots &amp; clearance bundles</p>
              </div>
            </div>
            <Link to="/bulk" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              All Bulk Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {bulkLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-graphite aspect-[16/9] rounded-premium-sm mb-2" />
                  <div className="bg-graphite h-4 rounded mb-1" />
                  <div className="bg-graphite h-4 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {bulkDeals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-5 text-center">
            <Link to="/bulk" className="btn-primary inline-flex items-center gap-2">
              <Package className="w-5 h-5" />
              Browse All Bulk &amp; Pallet Deals
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* 7 — Trust Section (products first, info after) */}
      <section className="py-10 md:py-12 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">
              Why Buyers and Sellers Trust{' '}
              <span className="text-gradient-gold">Loadify Market</span>
            </h2>
            <p className="text-white/60 text-base max-w-2xl mx-auto">
              Every layer of the platform is built with buyer and seller protection in mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card-glass text-center hover:scale-[1.03] transition-all duration-500 group">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gold/10 rounded-premium-sm mb-4 group-hover:bg-gold/20 transition-colors">
                    <Icon className="h-6 w-6 text-gold" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/60 text-xs leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8 — How It Works */}
      <Suspense fallback={<div className="py-12 bg-jet min-h-[400px]" />}>
        <CinematicStoryStrip />
      </Suspense>

      <section className="py-10 md:py-12 bg-graphite/30 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px]" />
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gold/3 rounded-full blur-[100px]" />
        </div>

        <div className="container-cinematic relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-5">
              <Truck className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-medium">Marketplace + Logistics Support</span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
              Trade Stock.{' '}
              <span className="text-gradient-gold">Arrange Delivery.</span>
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">
              Loadify Market handles buying and selling. Delivery coordination for UK collections
              and deliveries can be arranged through our logistics partners.
            </p>
          </div>

          {/* Two-step workflow */}
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-0 items-center">
              {/* Step 1 */}
              <div className="card-glass p-6 md:p-7 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-full mb-5 mx-auto">
                  <Package className="w-7 h-7 text-gold" />
                </div>
                <div className="text-gold text-xs font-bold uppercase tracking-wider mb-2">Step 1</div>
                <h3 className="text-lg font-bold text-white mb-3">Find Stock on Loadify</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-5">
                  Browse products, pallets, bulk lots and wholesale stock from verified UK sellers.
                </p>
                <Link to="/shop" className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                  <Package className="w-4 h-4" />
                  Browse Marketplace
                </Link>
              </div>

              {/* Connector */}
              <div className="flex items-center justify-center px-4 py-2 md:py-0">
                <div className="flex flex-row md:flex-col items-center gap-2">
                  <div className="w-8 h-px md:w-px md:h-8 bg-gold/30" />
                  <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                    <ArrowRightCircle className="w-5 h-5 text-gold rotate-0 md:rotate-90" />
                  </div>
                  <div className="w-8 h-px md:w-px md:h-8 bg-gold/30" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="card-glass p-6 md:p-7 text-center border-gold/20">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-full mb-5 mx-auto">
                  <Truck className="w-7 h-7 text-gold" />
                </div>
                <div className="text-gold text-xs font-bold uppercase tracking-wider mb-2">Step 2</div>
                <h3 className="text-lg font-bold text-white mb-3">Arrange Delivery</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-5">
                  Request a transport quote for UK-wide collection and delivery of your purchased stock.
                </p>
                <Link to="/transport-quote" className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                  <Truck className="w-4 h-4" />
                  Request Transport Quote
                </Link>
              </div>
            </div>

            {/* Note */}
            <p className="text-center text-white/30 text-xs mt-6">
              Transport quotes are provided by our UK-wide pallet and bulk delivery partners.
            </p>
          </div>
        </div>
      </section>

      {/* 9 — Final CTA */}
      <section className="py-10 md:py-12 bg-jet relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gold/5 rounded-full blur-[120px]" />
        </div>

        <div className="container-cinematic relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-5">
              Ready to Start <span className="text-gradient-gold">Trading?</span>
            </h2>
            <p className="text-white/60 text-base mb-8">
              Buy stock. Sell products. Arrange delivery. All on Loadify Market.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/bulk" className="btn-primary inline-flex items-center gap-2">
                Browse Deals
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/register?type=seller" className="btn-secondary inline-flex items-center gap-2">
                Start Selling
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

