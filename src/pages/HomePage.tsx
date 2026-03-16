import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowRight, Package, Layers,
  Truck, Store, Home, Wrench,
  Shirt, LayoutGrid, UserPlus, ShoppingCart,
  Cpu, Car, Briefcase, Tag,
  ShieldCheck, BadgeCheck, Lock,
  RotateCcw,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Amazon Returns',    icon: RotateCcw,  href: '/catalog?type=lot',           iconColor: 'text-orange-500' },
  { name: 'Wholesale & Bulk',  icon: Layers,     href: '/bulk',                       iconColor: 'text-[#F4C400]'  },
  { name: 'Clearance Stock',   icon: Tag,        href: '/catalog?type=clearance',     iconColor: 'text-red-500'    },
  { name: 'Electronics',       icon: Cpu,        href: '/shop?category=electronics',  iconColor: 'text-blue-500'   },
  { name: 'Home & Garden',     icon: Home,       href: '/shop?category=home-garden',  iconColor: 'text-emerald-500'},
  { name: 'Tools & DIY',       icon: Wrench,     href: '/shop?category=tools',        iconColor: 'text-amber-600'  },
  { name: 'Business Supplies', icon: Briefcase,  href: '/shop?category=business',     iconColor: 'text-indigo-500' },
  { name: 'Fashion',           icon: Shirt,      href: '/shop?category=fashion',      iconColor: 'text-pink-500'   },
  { name: 'Automotive Parts',  icon: Car,        href: '/shop?category=vehicles',     iconColor: 'text-red-500'    },
  { name: 'Mixed Job Lots',    icon: Package,    href: '/catalog?type=lot',           iconColor: 'text-slate-500'  },
];

// ── How It Works steps ────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    icon: UserPlus,
    step: '1',
    title: 'Create account',
    description: 'Sign up free and complete your profile in minutes. Open to all UK buyers and sellers.',
  },
  {
    icon: ShoppingCart,
    step: '2',
    title: 'Buy or list products',
    description: 'Browse thousands of listings or list your own stock — single items, pallets, or wholesale lots.',
  },
  {
    icon: Truck,
    step: '3',
    title: 'Arrange delivery',
    description: 'Arrange collection and delivery across the UK through our trusted logistics network.',
  },
];

// ── Trust items ───────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: Lock,        title: 'Secure Payments',     description: 'Powered by Stripe. Every transaction is encrypted and fully protected.'  },
  { icon: BadgeCheck,  title: 'Verified Sellers',    description: 'All sellers are vetted and verified before listing on the platform.'     },
  { icon: ShieldCheck, title: 'Buyer Protection',    description: 'Every order is covered by our buyer protection policy.'                  },
  { icon: Truck,       title: 'UK Delivery Support', description: 'Flexible delivery and collection options for orders of any size.'        },
];

// ── Placeholder images (shown when sections have no live products) ─────────────
const PLACEHOLDER_FEATURED = [
  { id: 'pf-1', title: 'Electronics Pallet — Mixed Stock',       image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-2', title: 'Clearance Clothing — Wholesale Lot',     image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-3', title: 'Tools & DIY — Trade Bundle',             image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-4', title: 'Industrial Equipment — End of Line',     image: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-5', title: 'Automotive Parts — Trade Lot',           image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=65&auto=format&fit=crop' },
];

const PLACEHOLDER_AMAZON = [
  { id: 'az-1', title: 'Amazon Returns Pallet — Electronics',    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-2', title: 'Mixed Returns Lot — Household',          image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-3', title: 'Amazon Customer Returns — Clothing',     image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-4', title: 'Returns Pallet — Small Appliances',      image: 'https://images.unsplash.com/photo-1556909114-44e3e9e0f46f?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-5', title: 'Trade Returns — Tools & Garden',         image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop' },
];

const PLACEHOLDER_CLEARANCE = [
  { id: 'cl-1', title: 'End of Line — Kitchen Appliances',       image: 'https://images.unsplash.com/photo-1556909114-44e3e9e0f46f?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-2', title: 'Clearance Furniture — Flat Pack',        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-3', title: 'Clothing Clearance — Mixed Sizes',       image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-4', title: 'Clearance Electronics — Accessories',    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-5', title: 'Garden Clearance — Seasonal Stock',      image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=65&auto=format&fit=crop' },
];

const PLACEHOLDER_WHOLESALE = [
  { id: 'ws-1', title: 'Wholesale Clothing — 500 Mixed Units',   image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-2', title: 'Electronics Bulk Lot — 100 Units',       image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-3', title: 'Wholesale Homeware — Trade Pallet',      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-4', title: 'Food & Beverage — Wholesale Case',       image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-5', title: 'Industrial Tools — Bulk Buy',            image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop' },
];

const LOGISTICS_IMG = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1400&q=70&auto=format&fit=crop&fm=webp';

// ── Supabase helpers ──────────────────────────────────────────────────────────
type ProductRow = Product & { store?: { storeSlug?: string } | null };

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

// ── Shared placeholder grid ───────────────────────────────────────────────────
function PlaceholderGrid({
  items,
  href,
  badge,
  badgeColor = 'bg-[#F4C400]/20 text-gray-700',
}: {
  items: { id: string; title: string; image: string }[];
  href: string;
  badge: string;
  badgeColor?: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => (
        <Link
          key={item.id}
          to={href}
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
            <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${badgeColor}`}>{badge}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function ProductGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
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
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'View All \u2192',
}: {
  title: React.ReactNode;
  subtitle?: string;
  viewAllHref: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <Link to={viewAllHref} className="text-sm text-[#1E3A5F] hover:underline font-medium whitespace-nowrap">
        {viewAllLabel}
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [amazonProducts,   setAmazonProducts]   = useState<Product[]>([]);
  const [clearanceProducts,setClearanceProducts] = useState<Product[]>([]);
  const [wholesaleProducts,setWholesaleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch more than needed to allow for deduplication
        const [featuredRes, amazonRes, clearanceRes, wholesaleRes] = await Promise.all([
          supabase
            .from('products').select(PRODUCT_QUERY_FIELDS)
            .eq('isActive', true).eq('isApproved', true)
            .order('views', { ascending: false }).limit(5),
          supabase
            .from('products').select(PRODUCT_QUERY_FIELDS)
            .eq('isActive', true).eq('isApproved', true)
            .eq('type', 'lot')
            .order('createdAt', { ascending: false }).limit(8),
          supabase
            .from('products').select(PRODUCT_QUERY_FIELDS)
            .eq('isActive', true).eq('isApproved', true)
            .eq('type', 'clearance')
            .order('createdAt', { ascending: false }).limit(8),
          supabase
            .from('products').select(PRODUCT_QUERY_FIELDS)
            .eq('isActive', true).eq('isApproved', true)
            .in('type', ['pallet', 'wholesale'])
            .order('createdAt', { ascending: false }).limit(8),
        ]);

        const featured = featuredRes.data
          ? transformProductRows(featuredRes.data as ProductRow[])
          : [];

        // Deduplicate: pick the first `maxCount` items not already in usedIds
        const usedIds = new Set(featured.map((p) => p.id));
        const takeUnique = (rows: ProductRow[] | null, maxCount: number) => {
          if (!rows) return [];
          const unique: ReturnType<typeof transformProductRows> = [];
          for (const p of transformProductRows(rows)) {
            if (!usedIds.has(p.id)) {
              usedIds.add(p.id);
              unique.push(p);
              if (unique.length >= maxCount) break;
            }
          }
          return unique;
        };

        const amazon    = takeUnique(amazonRes.data    as ProductRow[] | null, 5);
        const clearance = takeUnique(clearanceRes.data as ProductRow[] | null, 5);
        const wholesale = takeUnique(wholesaleRes.data as ProductRow[] | null, 5);

        setFeaturedProducts(featured);
        setAmazonProducts(amazon);
        setClearanceProducts(clearance);
        setWholesaleProducts(wholesale);
      } catch {
        // silently swallow — sections will show placeholder content
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <CinematicHero />

      {/* ── Category Cards ──────────────────────────────────────────────── */}
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

      {/* ── Featured Products ───────────────────────────────────────────── */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container-market">
          <SectionHeader
            title="Featured Products"
            subtitle="Top picks from verified UK sellers"
            viewAllHref="/catalog"
          />

          {loading ? (
            <ProductGridSkeleton />
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <PlaceholderGrid items={PLACEHOLDER_FEATURED} href="/catalog" badge="Coming Soon" />
          )}

          <div className="mt-6 text-center">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-3 rounded transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              Browse All Listings
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Amazon Returns Pallets ──────────────────────────────────────── */}
      <section className="bg-[#F5F6F7] py-8 border-b border-gray-200">
        <div className="container-market">
          <SectionHeader
            title={
              <span className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-orange-500" />
                Amazon Returns Pallets
              </span>
            }
            subtitle="Popular return stock and mixed retail pallets"
            viewAllHref="/catalog?type=lot"
          />

          {loading ? (
            <ProductGridSkeleton />
          ) : amazonProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {amazonProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <PlaceholderGrid
              items={PLACEHOLDER_AMAZON}
              href="/catalog?type=lot"
              badge="Returns Pallet"
              badgeColor="bg-orange-100 text-orange-700"
            />
          )}
        </div>
      </section>

      {/* ── Clearance Deals ─────────────────────────────────────────────── */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container-market">
          <SectionHeader
            title="Clearance Deals"
            subtitle="End-of-line stock and discounted listings"
            viewAllHref="/catalog?type=clearance"
          />

          {loading ? (
            <ProductGridSkeleton />
          ) : clearanceProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {clearanceProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <PlaceholderGrid
              items={PLACEHOLDER_CLEARANCE}
              href="/catalog?type=clearance"
              badge="Clearance"
              badgeColor="bg-[#C2410C]/10 text-[#C2410C] font-bold"
            />
          )}
        </div>
      </section>

      {/* ── Wholesale & Bulk Lots ───────────────────────────────────────── */}
      <section className="bg-[#F5F6F7] py-8 border-b border-gray-200">
        <div className="container-market">
          <SectionHeader
            title={
              <span className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#1E3A5F]" />
                Wholesale & Bulk Lots
              </span>
            }
            subtitle="Bulk pallet listings from verified UK wholesalers"
            viewAllHref="/bulk"
          />

          {loading ? (
            <ProductGridSkeleton />
          ) : wholesaleProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {wholesaleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <PlaceholderGrid
              items={PLACEHOLDER_WHOLESALE}
              href="/bulk"
              badge="Wholesale"
              badgeColor="bg-[#1E3A5F]/10 text-[#1E3A5F]"
            />
          )}
        </div>
      </section>

      {/* ── Transport Support ───────────────────────────────────────────── */}
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
                Arrange collection and delivery for pallets, wholesale stock and marketplace orders across the UK.
                We connect you with trusted freight partners for nationwide collections and deliveries.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/transport-quote"
                  className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2C4E73] text-white font-semibold px-6 py-3 rounded transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  Request Transport Quote
                </Link>
                <Link
                  to="/bulk"
                  className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white font-semibold px-6 py-3 rounded transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Wholesale & Bulk
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

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="bg-white py-10 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How It Works</h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Join thousands of UK buyers and sellers on Loadify Market — browse, list, and arrange delivery all in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {HOW_IT_WORKS.map((item) => {
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
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2C4E73] text-white font-semibold px-6 py-3 rounded transition-colors"
            >
              <Store className="w-4 h-4" />
              Start Selling
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Seller CTA (navy) ───────────────────────────────────────────── */}
      <section className="bg-[#1E3A5F] py-12">
        <div className="container-market">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Have pallets or clearance stock to sell?
            </h2>
            <p className="text-white/70 text-base mb-7">
              Reach thousands of UK buyers through Loadify Market.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-3 rounded transition-colors"
              >
                <Store className="w-4 h-4" />
                Start Selling
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-[#1E3A5F] font-semibold px-6 py-3 rounded transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Features ──────────────────────────────────────────────── */}
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
