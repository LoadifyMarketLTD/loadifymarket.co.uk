import { Link } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import {
  ArrowRight, Package, Layers,
  Flame, Truck, Store, Home, Wrench,
  Shirt, LayoutGrid, UserPlus, ListPlus, Wallet,
  Cpu, Car, Wheat, Factory, Briefcase, Tag,
  ShieldCheck, BadgeCheck, Lock,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';

const TrendingProducts = lazy(() => import('../components/TrendingProducts'));

// ── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Electronics & Tech', icon: Cpu, href: '/shop?category=electronics', iconColor: 'text-blue-500' },
  { name: 'Home & Garden', icon: Home, href: '/shop?category=home-garden', iconColor: 'text-emerald-500' },
  { name: 'Clothing & Fashion', icon: Shirt, href: '/shop?category=fashion', iconColor: 'text-pink-500' },
  { name: 'Tools & DIY', icon: Wrench, href: '/shop?category=tools', iconColor: 'text-orange-500' },
  { name: 'Automotive & Parts', icon: Car, href: '/shop?category=vehicles', iconColor: 'text-red-500' },
  { name: 'Agriculture & Farming', icon: Wheat, href: '/shop?category=agriculture', iconColor: 'text-lime-600' },
  { name: 'Industrial Equipment', icon: Factory, href: '/shop?category=industrial', iconColor: 'text-slate-500' },
  { name: 'Business Supplies', icon: Briefcase, href: '/shop?category=business', iconColor: 'text-indigo-500' },
  { name: 'Wholesale & Bulk', icon: Layers, href: '/bulk', iconColor: 'text-[#F4C400]' },
  { name: 'Clearance & Offers', icon: Tag, href: '/catalog?type=clearance', iconColor: 'text-yellow-500' },
];

// ── Seller steps ─────────────────────────────────────────────────────────────
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

// ── Trust items ───────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: Lock, title: 'Secure Payments', description: 'Powered by Stripe. Every transaction is encrypted and fully protected.' },
  { icon: BadgeCheck, title: 'Verified Sellers', description: 'All sellers are vetted and verified before listing on the platform.' },
  { icon: Truck, title: 'UK Wide Delivery', description: 'Flexible delivery and collection options for orders of any size.' },
  { icon: ShieldCheck, title: 'Buyer Protection', description: 'Every order is covered by our buyer protection policy.' },
];

// ── Placeholder listings ─────────────────────────────────────────────────────
const PLACEHOLDER_LISTINGS = [
  { id: 'ph-1', title: 'Electronics Pallet — Mixed Stock', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'ph-2', title: 'Clearance Clothing — Wholesale Lot', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'ph-3', title: 'Tools & DIY — Trade Bundle', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop' },
  { id: 'ph-4', title: 'Industrial Equipment — End of Line', image: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=400&q=65&auto=format&fit=crop' },
  { id: 'ph-5', title: 'Automotive Parts — Trade Lot', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=65&auto=format&fit=crop' },
];

// ── Featured deal promo cards (shown when no live featured product) ────────────
const DEAL_PROMOS = [
  {
    label: 'Amazon Returns',
    sublabel: 'Mixed pallet lots',
    href: '/catalog?type=lot',
    bg: 'from-blue-600 to-blue-800',
    img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=65&auto=format&fit=crop',
  },
  {
    label: 'Clearance Stock',
    sublabel: 'End-of-line bargains',
    href: '/catalog?type=clearance',
    bg: 'from-orange-600 to-orange-800',
    img: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=65&auto=format&fit=crop',
  },
  {
    label: 'Wholesale Lots',
    sublabel: 'Bulk trade pricing',
    href: '/bulk',
    bg: 'from-emerald-600 to-emerald-800',
    img: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=600&q=65&auto=format&fit=crop',
  },
];

const LOGISTICS_IMG = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1400&q=70&auto=format&fit=crop&fm=webp';

// ── Supabase helpers ─────────────────────────────────────────────────────────
type ProductRow = Product & { store?: { storeSlug?: string } | null };

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(price);

function transformProductRows(data: ProductRow[]) {
  return data.map((product) => ({
    ...product,
    seller: product.seller
      ? { ...product.seller, storeSlug: product.store?.storeSlug }
      : undefined,
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
        const { data } = await supabase
          .from('products')
          .select(PRODUCT_QUERY_FIELDS)
          .eq('isActive', true)
          .eq('isApproved', true)
          .order('views', { ascending: false })
          .limit(6);

        if (data && data.length > 0) {
          const transformed = transformProductRows(data as ProductRow[]);
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

  const allShownIds = useMemo(
    () => [
      ...(featuredProduct ? [featuredProduct.id] : []),
      ...gridProducts.map((p) => p.id),
    ],
    [featuredProduct, gridProducts],
  );

  return (
    <div className="bg-white">
      <CinematicHero />

      {/* ── Category Cards ─────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-8 border-b border-gray-200">
        <div className="container-market">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="group flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:border-[#F4C400] hover:shadow-sm transition-all duration-200 text-center"
                >
                  <Icon className={`w-7 h-7 ${cat.iconColor}`} />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#1E3A5F] leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Featured Products ──────────────────────────────────────────── */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container-market">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Featured Products</h2>
              <p className="text-sm text-gray-500">Top picks from verified UK sellers</p>
            </div>
            <Link to="/catalog" className="text-sm text-[#1E3A5F] hover:underline font-medium">View All →</Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-200 aspect-[4/3]" />
                  <div className="p-3 space-y-2">
                    <div className="bg-gray-200 h-3 rounded w-full" />
                    <div className="bg-gray-200 h-3 rounded w-2/3" />
                    <div className="bg-gray-200 h-5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : gridProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {gridProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {PLACEHOLDER_LISTINGS.map((item) => (
                <Link
                  key={item.id}
                  to="/catalog"
                  className="group block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-[#F4C400] transition-all duration-200"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight mb-1">{item.title}</p>
                    <span className="inline-block text-xs bg-[#F4C400]/20 text-gray-700 px-2 py-0.5 rounded font-medium">Coming Soon</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/catalog" className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-3 rounded transition-colors">
              <LayoutGrid className="w-4 h-4" />
              Browse All Listings
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Deal ──────────────────────────────────────────────── */}
      <section className="bg-[#F5F6F7] py-8 border-b border-gray-200">
        <div className="container-market">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Featured Deal</h2>
              <p className="text-sm text-gray-500">Handpicked by our team</p>
            </div>
            <Link to="/catalog" className="text-sm text-[#1E3A5F] hover:underline font-medium">View All →</Link>
          </div>

          {loading ? (
            <div className="animate-pulse bg-white border border-gray-200 rounded-lg min-h-[200px]" />
          ) : featuredProduct ? (
            <Link
              to={`/product/${featuredProduct.id}`}
              className="group block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row min-h-[200px]">
                <div className="md:w-2/5 relative overflow-hidden bg-gray-100">
                  {featuredProduct.images?.[0] ? (
                    <img
                      src={featuredProduct.images[0]}
                      alt={featuredProduct.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 min-h-[180px]"
                    />
                  ) : (
                    <div className="w-full h-full min-h-[180px] bg-gray-200 flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-[#F4C400] text-gray-900 text-xs font-bold px-2 py-1 rounded">Featured</span>
                </div>
                <div className="md:w-3/5 flex flex-col justify-center p-6 md:p-8">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 line-clamp-2">{featuredProduct.title}</h3>
                  {featuredProduct.description && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{featuredProduct.description}</p>
                  )}
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-2xl font-bold text-[#1E3A5F]">{formatPrice(featuredProduct.price)}</span>
                    {featuredProduct.stockQuantity != null && featuredProduct.stockQuantity > 0 && (
                      <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">In Stock</span>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-bold text-sm px-5 py-2.5 rounded w-fit group-hover:bg-[#EAB308] transition-colors">
                    View Deal <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            /* Fallback: promo deal category grid */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DEAL_PROMOS.map((deal) => (
                <Link
                  key={deal.label}
                  to={deal.href}
                  className="group relative overflow-hidden rounded-lg aspect-[16/9] block"
                >
                  <img src={deal.img} alt="" role="presentation" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${deal.bg} opacity-60`} />
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <span className="inline-block text-xs font-bold bg-[#F4C400] text-gray-900 px-2 py-0.5 rounded mb-1 w-fit">Deal</span>
                    <p className="text-white font-bold text-base leading-tight">{deal.label}</p>
                    <p className="text-white/80 text-xs">{deal.sublabel}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Trending Now ───────────────────────────────────────────────── */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container-market">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Trending Now
              </h2>
              <p className="text-sm text-gray-500">Most viewed listings this week</p>
            </div>
            <Link to="/catalog?sort=trending" className="text-sm text-[#1E3A5F] hover:underline font-medium">View Trending →</Link>
          </div>
          {trendingCount === 0 ? (
            /* Fallback category cards when no trending products */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CATEGORIES.slice(0, 5).map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.name}
                    to={cat.href}
                    className="group flex flex-col items-center gap-2 p-4 bg-[#F8F9FA] border border-gray-200 rounded-lg hover:border-[#F4C400] hover:shadow-sm transition-all duration-200 text-center"
                  >
                    <Icon className={`w-8 h-8 ${cat.iconColor}`} />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#1E3A5F] leading-tight">{cat.name}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[200px]" />}>
              <TrendingProducts
                maxProducts={5}
                days={7}
                mode="trending"
                onDataLoaded={setTrendingCount}
                excludeIds={allShownIds}
              />
            </Suspense>
          )}
        </div>
      </section>

      {/* ── Transport Support ──────────────────────────────────────────── */}
      <section className="bg-[#F5F6F7] py-8 border-b border-gray-200">
        <div className="container-market">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                UK Logistics Network
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Need delivery or transport support?
              </h2>
              <p className="text-gray-600 text-sm md:text-base mb-6">
                Arrange logistics across the UK for products, stock, equipment or bulk items.
                We connect you with trusted freight partners for collections and deliveries nationwide.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/transport-quote" className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2C4E73] text-white font-semibold px-6 py-3 rounded transition-colors">
                  <Truck className="w-4 h-4" />
                  Request Transport Quote
                </Link>
                <Link to="/bulk" className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white font-semibold px-6 py-3 rounded transition-colors">
                  <Package className="w-4 h-4" />
                  Wholesale &amp; Bulk
                </Link>
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden shadow-md aspect-[16/9]">
              <img
                src={LOGISTICS_IMG}
                alt="UK logistics and delivery trucks"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section className="bg-white py-10 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Start selling in three simple steps</h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Join UK sellers listing anything from single retail products to wholesale lots, automotive parts and farm equipment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {SELLER_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative bg-[#F8F9FA] border border-gray-200 rounded-lg p-6 text-center">
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#F4C400] text-gray-900 text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-[#1E3A5F]/10 rounded-full mb-4">
                    <Icon className="w-6 h-6 text-[#1E3A5F]" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
          <div className="text-center">
            <Link to="/register?type=seller" className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2C4E73] text-white font-semibold px-6 py-3 rounded transition-colors">
              <Store className="w-4 h-4" />
              Start Selling
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Seller CTA (navy) ──────────────────────────────────────────── */}
      <section className="bg-[#1E3A5F] py-12">
        <div className="container-market">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Buy &amp; sell anything on Loadify Market
            </h2>
            <p className="text-white/70 text-base mb-7">
              Browse products, list your inventory and arrange delivery — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/catalog" className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-3 rounded transition-colors">
                <LayoutGrid className="w-4 h-4" />
                Browse Marketplace
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/register?type=seller" className="inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-[#1E3A5F] font-semibold px-6 py-3 rounded transition-colors">
                <Store className="w-4 h-4" />
                Start Selling
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Section ──────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-8 border-t border-gray-200">
        <div className="container-market">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex flex-col items-center text-center p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed hidden md:block">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
