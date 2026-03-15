import { Link } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import {
  BadgeCheck, Lock, ArrowRight, Package, Layers,
  Flame, Truck, CheckCircle2, Store, Zap, Home, Wrench,
  Shirt, LayoutGrid, UserPlus, ListPlus, Wallet,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';

// Lazy load below-the-fold components
const TrendingProducts = lazy(() => import('../components/TrendingProducts'));

// ── Section 3: 6 wholesale-focused categories ──────────────────────────────
const CATEGORIES = [
  { name: 'Pallet Deals',    icon: Layers,   href: '/bulk?type=pallet' },
  { name: 'Electronics',     icon: Zap,      href: '/shop?category=electronics' },
  { name: 'Clothing',        icon: Shirt,    href: '/shop?category=fashion' },
  { name: 'Home & Garden',   icon: Home,     href: '/shop?category=home-garden' },
  { name: 'Tools & DIY',     icon: Wrench,   href: '/shop?category=tools' },
  { name: 'Mixed Job Lots',  icon: Package,  href: '/bulk?type=lot' },
];

// ── Section 6: 3 trust cards ────────────────────────────────────────────────
const TRUST_ITEMS = [
  {
    icon: Lock,
    title: 'Secure Payments',
    description: 'Powered by Stripe. Every transaction is encrypted and protected.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Sellers',
    description: 'All sellers are verified before listing stock on the platform.',
  },
  {
    icon: Truck,
    title: 'UK Delivery',
    description: 'Transport options available for pallets and bulk collections across the UK.',
  },
];

// ── Section 8: Seller 3-step flow ───────────────────────────────────────────
const SELLER_STEPS = [
  { icon: UserPlus, step: '1', title: 'Create seller account', description: 'Sign up free and complete your seller profile in minutes.' },
  { icon: ListPlus, step: '2', title: 'List your stock',       description: 'Upload products, pallets and bulk lots with photos and pricing.' },
  { icon: Wallet,   step: '3', title: 'Get paid automatically', description: 'Stripe handles payments. Funds are transferred to your account after each sale.' },
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
  seller:seller_profiles!left(
    businessName,
    isApproved,
    rating,
    marketplaceRole,
    paymentBehaviour,
    userId
  ),
  store:seller_stores!left(
    storeSlug
  )
`;

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bulkDeals, setBulkDeals] = useState<Product[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(true);
  const [trendingCount, setTrendingCount] = useState<number | null>(null);
  const bulkSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch featured products: most-viewed active products
    const fetchFeatured = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select(PRODUCT_QUERY_FIELDS)
          .eq('isActive', true)
          .eq('isApproved', true)
          .order('views', { ascending: false })
          .limit(4);
        if (data) setFeaturedProducts(transformProductRows(data as ProductRow[]));
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
          .limit(8);
        if (data) setBulkDeals(transformProductRows(data as ProductRow[]));
      } catch {
        // silently swallow
      } finally {
        setBulkLoading(false);
      }
    };

    fetchFeatured();
    fetchBulk();
  }, []);

  return (
    <div className="bg-jet">

      {/* ── Section 2: Hero Banner ─────────────────────────────────────────── */}
      <CinematicHero />

      {/* ── Section 3: Categories ─────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-graphite/20 border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-6">
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

          {/* 6 categories — 1-col mobile, 2-col tablet, 3-col desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="group flex items-center gap-4 p-4 md:p-5 rounded-premium-md bg-graphite/60 border border-gold/20 hover:border-gold/60 hover:bg-graphite/80 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-premium-sm bg-gold/15 flex items-center justify-center flex-shrink-0 group-hover:bg-gold/30 transition-colors">
                    <Icon className="w-6 h-6 text-gold" />
                  </div>
                  <span className="text-base font-bold text-white group-hover:text-gold transition-colors">{cat.name}</span>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-gold ml-auto transition-all group-hover:translate-x-1" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 4: Featured Products ──────────────────────────────────── */}
      {(dealsLoading || featuredProducts.length > 0) && (
        <section className="py-10 md:py-12 bg-jet border-t border-white/5">
          <div className="container-cinematic">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-premium-sm bg-gold/10 border border-gold/20">
                  <Flame className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">Featured Products</h2>
                  <p className="text-white/50 text-sm">Top picks from verified UK sellers</p>
                </div>
              </div>
              <Link to="/catalog" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {dealsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-graphite aspect-square rounded-premium-sm mb-2" />
                    <div className="bg-graphite h-4 rounded mb-1" />
                    <div className="bg-graphite h-4 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <div className="mt-6 text-center sm:hidden">
              <Link to="/catalog" className="btn-secondary inline-flex items-center gap-2 text-sm">
                View All Listings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 5: Bulk / Pallet Deals (horizontal slider) ────────────── */}
      {(bulkLoading || bulkDeals.length > 0) && (
        <section className="py-10 md:py-12 bg-graphite/25 border-t border-white/5">
          <div className="container-cinematic">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-premium-sm bg-gold/10 border border-gold/20">
                  <Package className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">Bulk &amp; Pallet Deals</h2>
                  <p className="text-white/50 text-sm">Wholesale pallets, lots &amp; clearance bundles</p>
                </div>
              </div>
              <Link to="/bulk" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
                All Bulk Deals <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Horizontal slider */}
            <div
              ref={bulkSliderRef}
              className="flex gap-4 overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {bulkLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex-shrink-0 w-64 snap-start">
                      <div className="bg-graphite aspect-[4/3] rounded-premium-sm mb-2" />
                      <div className="bg-graphite h-4 rounded mb-1" />
                      <div className="bg-graphite h-4 rounded w-2/3" />
                    </div>
                  ))
                : bulkDeals.map((product) => (
                    <div key={product.id} className="flex-shrink-0 w-64 snap-start">
                      <ProductCard product={product} />
                    </div>
                  ))
              }
            </div>

            <div className="mt-6 text-center">
              <Link to="/bulk" className="btn-primary inline-flex items-center gap-2">
                <Package className="w-5 h-5" />
                Browse All Bulk &amp; Pallet Deals
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Trending Products ──────────────────────────────────────────────── */}
      {(trendingCount === null || trendingCount > 0) && (
        <section className="py-10 md:py-12 bg-jet border-t border-white/5">
          <div className="container-cinematic">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-premium-sm bg-orange-500/15 border border-orange-500/20">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">Trending Stock</h2>
                  <p className="text-white/50 text-sm">Most viewed this week</p>
                </div>
              </div>
              <Link to="/catalog?sort=trending" className="text-orange-400 text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
                View Trending <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 gap-4 min-h-[220px]" />}>
              <TrendingProducts maxProducts={4} days={7} mode="trending" onDataLoaded={setTrendingCount} />
            </Suspense>
          </div>
        </section>
      )}

      {/* ── Section 6: Trust / Security ───────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-graphite/20 border-t border-white/5">
        <div className="container-cinematic">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Trade with Confidence on{' '}
              <span className="text-gradient-gold">Loadify Market</span>
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">
              Built for serious UK wholesale buyers and sellers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card-glass text-center hover:scale-[1.03] transition-all duration-500 group">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm mb-4 group-hover:bg-gold/20 transition-colors">
                    <Icon className="h-7 w-7 text-gold" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 7: Transport / Logistics ──────────────────────────────── */}
      <section className="py-10 md:py-12 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-5">
              <Truck className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-medium">UK Logistics Network</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Need transport for your stock?
            </h2>
            <p className="text-white/60 text-base mb-8">
              Arrange delivery across the UK. We connect you with trusted pallet and bulk delivery
              partners for collections and deliveries nationwide.
            </p>
            <Link to="/transport-quote" className="btn-primary inline-flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Request Transport Quote
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 8: Sell on Loadify — 3-step flow ──────────────────────── */}
      <section className="py-10 md:py-12 bg-graphite/30 border-t border-white/5">
        <div className="container-cinematic">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-4">
              <Store className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-medium">Sell on Loadify Market</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Start selling in three simple steps
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">
              Join thousands of UK sellers listing pallets, clearance stock and wholesale inventory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {SELLER_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="card-glass text-center relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 border border-gold/20 rounded-full mb-4">
                    <Icon className="w-7 h-7 text-gold" />
                  </div>
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                    <span className="text-gold text-xs font-bold">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Link to="/register?type=seller" className="btn-primary inline-flex items-center gap-2">
              <Store className="w-5 h-5" />
              Start Selling
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 9: Final CTA ───────────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-jet border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gold/5 rounded-full blur-[120px]" />
        </div>
        <div className="container-cinematic relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-5">
              Start trading wholesale today
            </h2>
            <p className="text-white/60 text-base mb-8">
              Buy stock. Sell products. Arrange delivery. All on Loadify Market.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/catalog" className="btn-primary inline-flex items-center gap-2">
                <LayoutGrid className="w-5 h-5" />
                Browse Marketplace
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/register?type=seller" className="btn-secondary inline-flex items-center gap-2">
                <Store className="w-5 h-5" />
                Start Selling
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
