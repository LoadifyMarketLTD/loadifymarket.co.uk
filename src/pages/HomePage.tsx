import { Link } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import {
  BadgeCheck, Lock, ArrowRight, Package, Layers,
  Flame, Truck, CheckCircle2, Store, Home, Wrench,
  Shirt, LayoutGrid, UserPlus, ListPlus, Wallet,
  Cpu, Car, Wheat, Factory, Briefcase, Tag,
  ShieldCheck, Star,
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
// (Removed — covered by Trust/Benefits section)

// ── Platform trust benefits ─────────────────────────────────────────────────
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
  {
    icon: ShieldCheck,
    title: 'Buyer Protection',
    description: 'Every order is covered by our buyer protection policy. Shop with total confidence.',
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

// ── Representative images for empty state ────────────────────────────────────
const WAREHOUSE_IMG  = 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=70&auto=format&fit=crop&fm=webp';
const PALLET_IMG     = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=70&auto=format&fit=crop&fm=webp';
const LOGISTICS_IMG  = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1400&q=70&auto=format&fit=crop&fm=webp';

// Placeholder cards shown in the product grid when no real listings exist yet
const PLACEHOLDER_LISTINGS = [
  { id: 'ph-1', title: 'Electronics Pallet — Mixed Stock',    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'ph-2', title: 'Clearance Clothing — Wholesale Lot',  image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'ph-3', title: 'Tools & DIY — Trade Bundle',           image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop' },
  { id: 'ph-4', title: 'Industrial Equipment — End of Line',   image: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=400&q=65&auto=format&fit=crop' },
  { id: 'ph-5', title: 'Automotive Parts — Trade Lot',         image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=65&auto=format&fit=crop' },
];

// ── Supabase query helpers ──────────────────────────────────────────────────
type ProductRow = Product & { store?: { storeSlug?: string } | null };

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(price);

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
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const [gridProducts, setGridProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingCount, setTrendingCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch top 6 active/approved products by views
        const { data } = await supabase
          .from('products')
          .select(PRODUCT_QUERY_FIELDS)
          .eq('isActive', true)
          .eq('isApproved', true)
          .order('views', { ascending: false })
          .limit(6);

        if (data && data.length > 0) {
          const transformed = transformProductRows(data as ProductRow[]);
          // First product → Featured Deal banner; rest → product grid
          setFeaturedProduct(transformed[0]);
          setGridProducts(transformed.slice(1));
        }
      } catch {
        // silently swallow — sections will show placeholder content
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Memoize so the array reference is stable — avoids re-triggering TrendingProducts' useEffect
  const allShownIds = useMemo(
    () => [
      ...(featuredProduct ? [featuredProduct.id] : []),
      ...gridProducts.map((p) => p.id),
    ],
    [featuredProduct, gridProducts],
  );

  return (
    <div className="bg-jet">

      {/* ═══ SECTION 1 · HERO ══════════════════════════════════════════════ */}
      <CinematicHero />

      {/* ═══ SECTION 2 · TRUST / PLATFORM BENEFITS ════════════════════════ */}
      <section className="py-10 md:py-12 bg-graphite/30 border-t border-white/5">
        <div className="container-cinematic">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-3">
              <BadgeCheck className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-medium">Why Loadify Market</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Trade with Confidence on{' '}
              <span className="text-gradient-gold">Loadify Market</span>
            </h2>
            <p className="text-white/55 text-sm max-w-xl mx-auto">
              Built for buyers and sellers across every product category — from retail to industrial.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card-glass text-center p-5 hover:scale-[1.02] transition-all duration-300 group">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gold/10 rounded-premium-sm mb-3 group-hover:bg-gold/20 transition-colors">
                    <Icon className="h-6 w-6 text-gold" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-white/50 text-xs leading-relaxed hidden md:block">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3 · FEATURED DEAL ════════════════════════════════════ */}
      <section className="py-10 md:py-12 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-premium-sm bg-gold/10 border border-gold/20">
                <Star className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Featured Deal</h2>
                <p className="text-white/50 text-sm">Handpicked by our team</p>
              </div>
            </div>
            <Link to="/catalog" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1 flex-shrink-0">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="animate-pulse rounded-premium-md overflow-hidden bg-graphite/50 w-full h-72 md:h-80" />
          ) : featuredProduct ? (
            /* Real product — wide featured card */
            <Link
              to={`/product/${featuredProduct.id}`}
              className="group block rounded-premium-md overflow-hidden border border-white/10 hover:border-gold/30 transition-all duration-300 hover:shadow-cinematic-gold"
            >
              <div className="relative flex flex-col md:flex-row min-h-[280px] md:min-h-[340px]">
                <div className="md:w-1/2 relative overflow-hidden bg-graphite/50 min-h-[200px] md:min-h-0">
                  {featuredProduct.images?.[0] ? (
                    <img
                      src={featuredProduct.images[0]}
                      alt={featuredProduct.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <img
                      src={WAREHOUSE_IMG}
                      alt="Featured listing"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-jet/80 hidden md:block" />
                </div>
                <div className="md:w-1/2 flex flex-col justify-center p-6 md:p-10 bg-graphite/30 md:bg-transparent">
                  <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/30 rounded-full px-3 py-1 mb-4 w-fit">
                    <Star className="w-3.5 h-3.5 text-gold" />
                    <span className="text-gold text-xs font-semibold">Featured Listing</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight line-clamp-3">
                    {featuredProduct.title}
                  </h3>
                  {featuredProduct.description && (
                    <p className="text-white/60 text-sm mb-4 line-clamp-2 hidden sm:block">
                      {featuredProduct.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-2xl md:text-3xl font-bold text-gold">
                      {formatPrice(featuredProduct.price)}
                    </span>
                    {featuredProduct.stockQuantity != null && featuredProduct.stockQuantity > 0 && (
                      <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                        In Stock
                      </span>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-2 bg-gold text-jet font-bold text-sm px-6 py-3 rounded-premium-sm w-fit group-hover:bg-gold/90 transition-colors">
                    View Deal <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            /* Placeholder — no live listings yet */
            <div className="relative rounded-premium-md overflow-hidden border border-white/10 min-h-[280px] md:min-h-[340px] flex flex-col md:flex-row">
              <div className="md:w-1/2 relative overflow-hidden min-h-[200px] md:min-h-0">
                <img src={PALLET_IMG} alt="Pallet warehouse stock" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-jet/90 hidden md:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-jet/80 to-transparent md:hidden" />
              </div>
              <div className="md:w-1/2 flex flex-col justify-center p-6 md:p-10 bg-graphite/30">
                <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/30 rounded-full px-3 py-1 mb-4 w-fit">
                  <Star className="w-3.5 h-3.5 text-gold" />
                  <span className="text-gold text-xs font-semibold">Be the First</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                  Premium Deals Coming Soon
                </h3>
                <p className="text-white/60 text-sm mb-6 max-w-sm">
                  We are onboarding our first verified UK sellers. Premium wholesale lots, clearance pallets and trade stock will appear here.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/catalog" className="btn-primary inline-flex items-center gap-2 text-sm">
                    <LayoutGrid className="w-4 h-4" /> Browse Listings
                  </Link>
                  <Link to="/register?type=seller" className="btn-secondary inline-flex items-center gap-2 text-sm">
                    <Store className="w-4 h-4" /> List Your Stock
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ SECTION 4 · FEATURED PRODUCTS ════════════════════════════════ */}
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

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-graphite aspect-[3/2] rounded-premium-sm mb-2" />
                  <div className="bg-graphite h-4 rounded mb-1" />
                  <div className="bg-graphite h-4 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : gridProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {gridProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* Placeholder grid when no live products yet */
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {PLACEHOLDER_LISTINGS.map((item) => (
                <Link
                  key={item.id}
                  to="/catalog"
                  className="group block rounded-premium-md overflow-hidden border border-white/10 hover:border-gold/30 transition-all duration-300 bg-graphite/40"
                >
                  <div className="aspect-[3/2] overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-jet/70 to-transparent" />
                    <div className="absolute bottom-2 left-2 text-xs font-semibold text-gold bg-jet/80 px-2 py-0.5 rounded-full border border-gold/20">
                      Coming Soon
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-white text-xs font-medium leading-tight line-clamp-2">{item.title}</p>
                    <p className="text-white/40 text-xs mt-1">Register to see pricing</p>
                  </div>
                </Link>
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

      {/* Trending — only shown when distinct trending products exist */}
      {(trendingCount === null || trendingCount > 0) && (
        <section className="py-10 md:py-12 bg-jet border-t border-white/5">
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
            <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[200px]" />}>
              <TrendingProducts
                maxProducts={5}
                days={7}
                mode="trending"
                onDataLoaded={setTrendingCount}
                excludeIds={allShownIds}
              />
            </Suspense>
          </div>
        </section>
      )}

      {/* ═══ SECTION 5 · TRANSPORT SUPPORT ════════════════════════════════ */}
      <section className="border-t border-white/5 overflow-hidden">
        <div className="relative min-h-[280px] md:min-h-[320px] flex items-center">
          <div className="absolute inset-0">
            <img
              src={LOGISTICS_IMG}
              alt="UK logistics and delivery"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(13,17,23,0.93) 0%, rgba(13,17,23,0.75) 60%, rgba(13,17,23,0.88) 100%)' }} />
          </div>
          <div className="container-cinematic relative z-10 py-12 md:py-16">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-4">
                <Truck className="w-4 h-4 text-gold" />
                <span className="text-gold text-xs font-medium">UK Logistics Network</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Need delivery or transport support?
              </h2>
              <p className="text-white/65 text-sm md:text-base mb-6 max-w-lg">
                Arrange logistics across the UK for products, stock, equipment or bulk items.
                We connect you with trusted freight partners for collections and deliveries nationwide.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/transport-quote" className="btn-primary inline-flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Request Transport Quote
                </Link>
                <Link to="/bulk" className="btn-secondary inline-flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Wholesale &amp; Bulk
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6 · CATEGORIES ════════════════════════════════════════ */}
      <section className="py-10 md:py-14 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-6">
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
          {/* 2-col mobile · 3-col tablet · 5-col desktop */}
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
                  <span className="text-sm font-bold text-white leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-5 text-center sm:hidden">
            <Link to="/shop" className="btn-secondary inline-flex items-center gap-2 text-sm px-6 py-3">
              View All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7 · START SELLING ══════════════════════════════════════ */}
      <section className="py-10 md:py-14 bg-graphite/20 border-t border-white/5">
        <div className="container-cinematic">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-3">
              <Store className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-medium">Sell on Loadify Market</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Start selling in three simple steps
            </h2>
            <p className="text-white/55 text-sm max-w-xl mx-auto">
              Join UK sellers listing anything from single retail products and clearance stock to wholesale lots, automotive parts and farm equipment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
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
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{item.description}</p>
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

      {/* ═══ SECTION 8 · FINAL CTA (pre-footer) ═══════════════════════════ */}
      <section className="py-10 md:py-14 bg-jet border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/4 rounded-full blur-[100px]" />
        </div>
        <div className="container-cinematic relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Buy &amp; sell anything on Loadify Market
            </h2>
            <p className="text-white/55 text-base mb-7">
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