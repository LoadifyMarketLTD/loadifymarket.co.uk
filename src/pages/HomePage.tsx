import { Link } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import {
  ArrowRight, Package, Layers,
  Home, Wrench,
  Shirt, LayoutGrid,
  Cpu, Car, Briefcase, Tag,
  RotateCcw, Settings, Leaf,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';

// Lazy load below-the-fold sections to reduce initial bundle
const HomeBelowFold = lazy(() => import('../components/HomeBelowFold'));

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

// ── Popular Categories (discovery section) ────────────────────────────────────
const POPULAR_CATEGORIES = [
  {
    name: 'Amazon Returns Pallets',
    description: 'Unclaimed and customer return pallets from major retailers at wholesale prices.',
    icon: RotateCcw,
    href: '/catalog?type=lot',
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  {
    name: 'Electronics Clearance',
    description: 'End-of-line electronics, refurbished tech and surplus stock at clearance prices.',
    icon: Cpu,
    href: '/shop?category=electronics',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    name: 'Fashion Wholesale',
    description: 'Branded and unbranded clothing, footwear and accessories in bulk quantities.',
    icon: Shirt,
    href: '/shop?category=fashion',
    iconColor: 'text-pink-500',
    bgColor: 'bg-pink-50',
  },
  {
    name: 'Home & Garden Stock',
    description: 'Furniture, homeware, garden tools and décor from verified UK wholesalers.',
    icon: Leaf,
    href: '/shop?category=home-garden',
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
  },
  {
    name: 'Industrial Equipment',
    description: 'Machinery, tools and industrial supplies for trade and commercial buyers.',
    icon: Settings,
    href: '/shop?category=tools',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    name: 'Automotive Parts',
    description: 'Vehicle parts, accessories and automotive wholesale from trusted suppliers.',
    icon: Car,
    href: '/shop?category=vehicles',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
  },
];

// ── Placeholder images (shown when sections have no live products) ─────────────
const PLACEHOLDER_FEATURED = [
  { id: 'pf-1', title: 'Electronics Pallet — Mixed Stock',       image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-2', title: 'Clearance Clothing — Wholesale Lot',     image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-3', title: 'Tools & DIY — Trade Bundle',             image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-4', title: 'Industrial Equipment — End of Line',     image: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=400&q=65&auto=format&fit=crop' },
];

const PLACEHOLDER_AMAZON = [
  { id: 'az-1', title: 'Amazon Returns Pallet — Electronics',    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-2', title: 'Mixed Returns Lot — Household',          image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-3', title: 'Amazon Customer Returns — Clothing',     image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-4', title: 'Returns Pallet — Small Appliances',      image: 'https://images.unsplash.com/photo-1556909114-44e3e9e0f46f?w=400&q=65&auto=format&fit=crop' },
];

const PLACEHOLDER_CLEARANCE = [
  { id: 'cl-1', title: 'End of Line — Kitchen Appliances',       image: 'https://images.unsplash.com/photo-1556909114-44e3e9e0f46f?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-2', title: 'Clearance Furniture — Flat Pack',        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-3', title: 'Clothing Clearance — Mixed Sizes',       image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-4', title: 'Clearance Electronics — Accessories',    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
];

const PLACEHOLDER_WHOLESALE = [
  { id: 'ws-1', title: 'Wholesale Clothing — 500 Mixed Units',   image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-2', title: 'Electronics Bulk Lot — 100 Units',       image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-3', title: 'Wholesale Homeware — Trade Pallet',      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-4', title: 'Food & Beverage — Wholesale Case',       image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=65&auto=format&fit=crop' },
];

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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
          <div className="p-2.5">
            <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight mb-1">{item.title}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${badgeColor}`}>{badge}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-200 aspect-[4/3]" />
          <div className="p-2.5 space-y-2">
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
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-700">{subtitle}</p>}
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
  const [secondaryLoading, setSecondaryLoading] = useState(true);

  // Phase 1: Fetch above-the-fold featured products immediately
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await supabase
          .from('products').select(PRODUCT_QUERY_FIELDS)
          .eq('isActive', true).eq('isApproved', true)
          .order('views', { ascending: false }).limit(4);

        const featured = data ? transformProductRows(data as ProductRow[]) : [];
        setFeaturedProducts(featured);
        setLoading(false);

        // Phase 2: Defer below-fold product fetches
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

        try {
          const [amazonRes, clearanceRes, wholesaleRes] = await Promise.all([
            supabase
              .from('products').select(PRODUCT_QUERY_FIELDS)
              .eq('isActive', true).eq('isApproved', true)
              .eq('type', 'lot')
              .order('createdAt', { ascending: false }).limit(4),
            supabase
              .from('products').select(PRODUCT_QUERY_FIELDS)
              .eq('isActive', true).eq('isApproved', true)
              .eq('type', 'clearance')
              .order('createdAt', { ascending: false }).limit(4),
            supabase
              .from('products').select(PRODUCT_QUERY_FIELDS)
              .eq('isActive', true).eq('isApproved', true)
              .in('type', ['pallet', 'wholesale'])
              .order('createdAt', { ascending: false }).limit(4),
          ]);
          setAmazonProducts(takeUnique(amazonRes.data as ProductRow[] | null, 4));
          setClearanceProducts(takeUnique(clearanceRes.data as ProductRow[] | null, 4));
          setWholesaleProducts(takeUnique(wholesaleRes.data as ProductRow[] | null, 4));
        } finally {
          setSecondaryLoading(false);
        }
      } catch {
        setLoading(false);
        setSecondaryLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <CinematicHero />

      {/* ── Category Cards ──────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-6 border-b border-gray-200">
        <div className="container-market">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="group flex flex-col items-center gap-1.5 p-3 bg-white border border-gray-200 rounded-lg hover:border-[#F4C400] hover:shadow-sm transition-all duration-200 text-center"
                >
                  <Icon className={`w-6 h-6 ${cat.iconColor}`} />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#1E3A5F] leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Popular Categories (Discovery) ────────────────────────────── */}
      <section className="bg-white py-6 border-b border-gray-200">
        <div className="container-market">
          <div className="mb-3">
            <h2 className="text-xl font-bold text-gray-900">Popular Categories</h2>
            <p className="text-sm text-gray-700">Explore top marketplace categories</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {POPULAR_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="group flex items-start gap-3 p-4 bg-[#F8F9FA] border border-gray-200 rounded-lg hover:border-[#F4C400] hover:shadow-sm transition-all duration-200"
                >
                  <div className={`w-10 h-10 ${cat.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${cat.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#1E3A5F] mb-0.5">{cat.name}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{cat.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Featured Products ───────────────────────────────────────────── */}
      <section className="bg-white py-6 border-b border-gray-200">
        <div className="container-market">
          <SectionHeader
            title="Featured Products"
            subtitle="Top picks from verified UK sellers"
            viewAllHref="/catalog"
          />

          {loading ? (
            <ProductGridSkeleton />
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <PlaceholderGrid items={PLACEHOLDER_FEATURED} href="/catalog" badge="Coming Soon" />
          )}

          <div className="mt-4 text-center">
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
      <section className="bg-[#F5F6F7] py-6 border-b border-gray-200">
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

          {secondaryLoading ? (
            <ProductGridSkeleton />
          ) : amazonProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
      <section className="bg-white py-6 border-b border-gray-200">
        <div className="container-market">
          <SectionHeader
            title="Clearance Deals"
            subtitle="End-of-line stock and discounted listings"
            viewAllHref="/catalog?type=clearance"
          />

          {secondaryLoading ? (
            <ProductGridSkeleton />
          ) : clearanceProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
      <section className="bg-[#F5F6F7] py-6 border-b border-gray-200">
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

          {secondaryLoading ? (
            <ProductGridSkeleton />
          ) : wholesaleProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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

      {/* ── Below-the-fold sections (lazy loaded) ─────────────────────── */}
      <Suspense fallback={null}>
        <HomeBelowFold />
      </Suspense>

    </div>
  );
}
