import { Link } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import {
  BadgeCheck, Lock, ArrowRight, Package, Layers,
  Flame, Truck, CheckCircle2, Store, Home, Wrench,
  Shirt, LayoutGrid, UserPlus, ListPlus, Wallet,
  Cpu, Car, Wheat, Factory, Briefcase, Tag,
  ShoppingBag, TrendingUp, Globe,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';

// Lazy load below-the-fold components
const TrendingProducts = lazy(() => import('../components/TrendingProducts'));

// ── Section 3: 10 marketplace categories ───────────────────────────────────
const CATEGORIES = [
  {
    name: 'Electronics & Tech',
    icon: Cpu,
    href: '/shop?category=electronics',
    bg: 'bg-blue-500/10 group-hover:bg-blue-500/20',
    iconColor: 'text-blue-400',
    hoverText: 'group-hover:text-blue-400',
    border: 'border-blue-500/20 hover:border-blue-400/50',
  },
  {
    name: 'Home & Garden',
    icon: Home,
    href: '/shop?category=home-garden',
    bg: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    hoverText: 'group-hover:text-emerald-400',
    border: 'border-emerald-500/20 hover:border-emerald-400/50',
  },
  {
    name: 'Clothing & Fashion',
    icon: Shirt,
    href: '/shop?category=fashion',
    bg: 'bg-pink-500/10 group-hover:bg-pink-500/20',
    iconColor: 'text-pink-400',
    hoverText: 'group-hover:text-pink-400',
    border: 'border-pink-500/20 hover:border-pink-400/50',
  },
  {
    name: 'Tools & DIY',
    icon: Wrench,
    href: '/shop?category=tools',
    bg: 'bg-orange-500/10 group-hover:bg-orange-500/20',
    iconColor: 'text-orange-400',
    hoverText: 'group-hover:text-orange-400',
    border: 'border-orange-500/20 hover:border-orange-400/50',
  },
  {
    name: 'Automotive & Parts',
    icon: Car,
    href: '/shop?category=vehicles',
    bg: 'bg-red-500/10 group-hover:bg-red-500/20',
    iconColor: 'text-red-400',
    hoverText: 'group-hover:text-red-400',
    border: 'border-red-500/20 hover:border-red-400/50',
  },
  {
    name: 'Agriculture & Farming',
    icon: Wheat,
    href: '/shop?category=agriculture',
    bg: 'bg-lime-500/10 group-hover:bg-lime-500/20',
    iconColor: 'text-lime-400',
    hoverText: 'group-hover:text-lime-400',
    border: 'border-lime-500/20 hover:border-lime-400/50',
  },
  {
    name: 'Industrial Equipment',
    icon: Factory,
    href: '/shop?category=industrial',
    bg: 'bg-slate-500/10 group-hover:bg-slate-500/20',
    iconColor: 'text-slate-300',
    hoverText: 'group-hover:text-slate-300',
    border: 'border-slate-500/20 hover:border-slate-400/50',
  },
  {
    name: 'Business Supplies',
    icon: Briefcase,
    href: '/shop?category=business',
    bg: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
    iconColor: 'text-indigo-400',
    hoverText: 'group-hover:text-indigo-400',
    border: 'border-indigo-500/20 hover:border-indigo-400/50',
  },
  {
    name: 'Wholesale & Bulk',
    icon: Layers,
    href: '/bulk',
    bg: 'bg-gold/10 group-hover:bg-gold/20',
    iconColor: 'text-gold',
    hoverText: 'group-hover:text-gold',
    border: 'border-gold/20 hover:border-gold/50',
  },
  {
    name: 'Clearance & Offers',
    icon: Tag,
    href: '/catalog?type=clearance',
    bg: 'bg-yellow-500/10 group-hover:bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    hoverText: 'group-hover:text-yellow-400',
    border: 'border-yellow-500/20 hover:border-yellow-400/50',
  },
];

// ── Marketplace stats strip ─────────────────────────────────────────────────
const STATS = [
  { icon: ShoppingBag, label: 'Multiple Categories', sub: 'Electronics to Agriculture' },
  { icon: BadgeCheck,  label: 'Verified Sellers',    sub: 'Vetted UK businesses' },
  { icon: Globe,       label: 'Nationwide Delivery', sub: 'Collections & drop-offs' },
  { icon: TrendingUp,  label: 'New Listings Daily',  sub: 'Fresh stock every day' },
];

// ── Section 6: 3 trust cards ────────────────────────────────────────────────
const TRUST_ITEMS = [
  {
    icon: Lock,
    title: 'Secure Payments',
    description: 'Powered by Stripe. Every transaction is encrypted and fully protected — buy and sell with confidence.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Sellers',
    description: 'All sellers are vetted and verified before listing on the platform, across every category.',
  },
  {
    icon: Truck,
    title: 'UK Wide Delivery',
    description: 'Flexible delivery and collection options available for orders of any size, anywhere in the UK.',
  },
];

// ── Section 8: Seller 3-step flow ───────────────────────────────────────────
const SELLER_STEPS = [
  {
    icon: UserPlus,
    step: '1',
    title: 'Create seller account',
    description: 'Sign up free and complete your seller profile in minutes. Open to all UK businesses and individuals.',
  },
  {
    icon: ListPlus,
    step: '2',
    title: 'List your products',
    description: 'List anything — single products, clearance stock, wholesale lots, equipment, parts or machinery.',
  },
  {
    icon: Wallet,
    step: '3',
    title: 'Get paid automatically',
    description: 'Stripe handles payments. Funds are transferred directly to your account after each sale.',
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
  const [latestDeals, setLatestDeals] = useState<Product[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [latestLoading, setLatestLoading] = useState(true);
  const [trendingCount, setTrendingCount] = useState<number | null>(null);
  const bulkSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch featured products (top-viewed) then fetch latest deals excluding those IDs
    const fetchAll = async () => {
      // Step 1: Featured — top 5 by views
      let featuredIds: string[] = [];
      try {
        const { data } = await supabase
          .from('products')
          .select(PRODUCT_QUERY_FIELDS)
          .eq('isActive', true)
          .eq('isApproved', true)
          .order('views', { ascending: false })
          .limit(5);
        if (data) {
          const transformed = transformProductRows(data as ProductRow[]);
          setFeaturedProducts(transformed);
          featuredIds = transformed.map((p) => p.id);
        }
      } catch {
        // silently swallow — section will stay empty / hidden
      } finally {
        setDealsLoading(false);
      }

      // Step 2: Latest Deals — newest listings NOT already shown in Featured
      try {
        const query = supabase
          .from('products')
          .select(PRODUCT_QUERY_FIELDS)
          .eq('isActive', true)
          .eq('isApproved', true)
          .order('createdAt', { ascending: false })
          .limit(10);
        const { data } = featuredIds.length > 0
          ? await query.not('id', 'in', `(${featuredIds.join(',')})`)
          : await query;
        if (data) setLatestDeals(transformProductRows(data as ProductRow[]));
      } catch {
        // silently swallow
      } finally {
        setLatestLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <div className="bg-jet">

      {/* ── Section 2: Hero Banner ─────────────────────────────────────────── */}
      <CinematicHero />

      {/* ── Marketplace Stats Strip ───────────────────────────────────────── */}
      <section className="bg-graphite/40 border-y border-white/8 py-5">
        <div className="container-cinematic">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-premium-sm bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white leading-tight">{stat.label}</p>
                    <p className="text-xs text-white/50 truncate">{stat.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 3: Categories ─────────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                <span className="text-gold text-xs font-medium">Browse by Category</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">What are you looking for?</h2>
              <p className="text-white/50 text-sm mt-1">10 categories · Electronics to Agriculture</p>
            </div>
            <Link to="/shop" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1 flex-shrink-0">
              All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 10 categories — 2-col mobile, 3-col tablet, 5-col desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className={`group flex flex-col items-center gap-3 p-4 md:p-5 rounded-premium-md border transition-all duration-300 text-center bg-graphite/50 hover:bg-graphite/80 hover:-translate-y-1 ${cat.border}`}
                >
                  <div className={`w-12 h-12 rounded-premium-sm flex items-center justify-center flex-shrink-0 transition-colors ${cat.bg}`}>
                    <Icon className={`w-6 h-6 ${cat.iconColor}`} />
                  </div>
                  <span className={`text-sm font-bold text-white transition-colors duration-200 ${cat.hoverText} leading-tight`}>{cat.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link to="/shop" className="btn-secondary inline-flex items-center gap-2 text-sm px-6 py-3">
              View All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 4: Featured Products ──────────────────────────────────── */}
      {(dealsLoading || featuredProducts.length > 0) && (
        <section className="py-10 md:py-12 bg-graphite/20 border-t border-white/5">
          <div className="container-cinematic">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-premium-sm bg-gold/10 border border-gold/20">
                  <Flame className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Featured Products</h2>
                  <p className="text-white/50 text-sm">Top picks from verified UK sellers</p>
                </div>
              </div>
              <Link to="/catalog" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1 flex-shrink-0">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {dealsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-graphite aspect-[3/2] rounded-premium-sm mb-2" />
                    <div className="bg-graphite h-4 rounded mb-1" />
                    <div className="bg-graphite h-4 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : featuredProducts.length === 1 ? (
              <div className="flex justify-center">
                <div className="w-full max-w-xs">
                  <ProductCard product={featuredProducts[0]} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <div className="mt-5 text-center sm:hidden">
              <Link to="/catalog" className="btn-secondary inline-flex items-center gap-2 text-sm px-6 py-3">
                View All Listings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 5: Latest Deals (grid) ───────────────────────────────── */}
      {(latestLoading || latestDeals.length > 0) && (
        <section className="py-10 md:py-12 bg-jet border-t border-white/5">
          <div className="container-cinematic">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-premium-sm bg-gold/10 border border-gold/20">
                  <Package className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Latest Deals &amp; Offers</h2>
                  <p className="text-white/50 text-sm">Fresh stock added daily — all categories</p>
                </div>
              </div>
              <Link to="/catalog" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1 flex-shrink-0">
                View All Deals <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {latestLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-graphite aspect-[3/2] rounded-premium-sm mb-2" />
                    <div className="bg-graphite h-4 rounded mb-1" />
                    <div className="bg-graphite h-4 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : latestDeals.length === 1 ? (
              <div className="flex justify-center">
                <div className="w-full max-w-xs">
                  <ProductCard product={latestDeals[0]} />
                </div>
              </div>
            ) : (
              <div
                ref={bulkSliderRef}
                className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4"
              >
                {latestDeals.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <div className="mt-6 text-center">
              <Link to="/catalog" className="btn-primary inline-flex items-center gap-2">
                <LayoutGrid className="w-5 h-5" />
                Browse All Listings
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Trending Products ──────────────────────────────────────────────── */}
      {(trendingCount === null || trendingCount > 0) && (
        <section className="py-10 md:py-12 bg-graphite/20 border-t border-white/5">
          <div className="container-cinematic">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-premium-sm bg-orange-500/15 border border-orange-500/20">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Trending Now</h2>
                  <p className="text-white/50 text-sm">Most viewed listings this week</p>
                </div>
              </div>
              <Link to="/catalog?sort=trending" className="text-orange-400 text-sm font-semibold hover:underline hidden sm:flex items-center gap-1 flex-shrink-0">
                View Trending <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[220px]" />}>
              <TrendingProducts
                maxProducts={5}
                days={7}
                mode="trending"
                onDataLoaded={setTrendingCount}
                excludeIds={[...featuredProducts.map((p) => p.id), ...latestDeals.map((p) => p.id)]}
              />
            </Suspense>
          </div>
        </section>
      )}

      {/* ── Section 6: Trust / Security ───────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-4">
              <BadgeCheck className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-medium">Why Loadify Market</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Trade with Confidence on{' '}
              <span className="text-gradient-gold">Loadify Market</span>
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">
              Built for buyers and sellers across every product category — from retail to industrial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card-glass text-center hover:scale-[1.02] transition-all duration-500 group">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm mb-5 group-hover:bg-gold/20 transition-colors">
                    <Icon className="h-7 w-7 text-gold" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 7: Transport / Logistics ──────────────────────────────── */}
      <section className="py-10 md:py-14 bg-graphite/25 border-t border-white/5">
        <div className="container-cinematic">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-5">
              <Truck className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-medium">UK Logistics Network</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Need delivery or transport support?
            </h2>
            <p className="text-white/60 text-base mb-8 max-w-xl mx-auto">
              Arrange logistics across the UK for products, stock, equipment or bulk items.
              We connect you with trusted delivery and freight partners for collections and deliveries nationwide.
            </p>
            <Link to="/transport-quote" className="btn-primary inline-flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Request Transport Quote
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 8: Sell on Loadify — 3-step flow ──────────────────────── */}
      <section className="py-10 md:py-14 bg-jet border-t border-white/5">
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
              Join UK sellers listing anything from single retail products and clearance stock to wholesale lots, automotive parts and farm equipment.
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
      <section className="py-10 md:py-16 bg-graphite/30 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gold/5 rounded-full blur-[120px]" />
        </div>
        <div className="container-cinematic relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-5">
              Buy &amp; sell anything on Loadify Market
            </h2>
            <p className="text-white/60 text-base mb-8">
              Browse products, list your inventory and arrange delivery — all in one place.
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
