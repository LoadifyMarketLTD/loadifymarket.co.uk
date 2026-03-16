import { Link } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import {
  ArrowRight, Package, Layers,
  Home, Wrench,
  Shirt, LayoutGrid,
  Cpu, Car, Briefcase, Tag,
  RotateCcw,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import { supabase } from '../lib/supabase';
import { buildSrcSet } from '../lib/imageOptimization';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';

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


// ── Placeholder images (shown when sections have no live products) ─────────────
// Each section uses 4 completely distinct images — no cross-section repeats.
const PLACEHOLDER_FEATURED = [
  { id: 'pf-1', title: 'Electronics Pallet — Mixed Stock',       image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-2', title: 'Fashion & Clothing — Wholesale Lot',     image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-3', title: 'Tools & DIY — Trade Bundle',             image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop' },
  { id: 'pf-4', title: 'Industrial Equipment — End of Line',     image: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=400&q=65&auto=format&fit=crop' },
];

const PLACEHOLDER_AMAZON = [
  { id: 'az-1', title: 'Amazon Returns Pallet — Warehouse Stock', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-2', title: 'Mixed Returns Lot — Household Goods',    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-3', title: 'Amazon Returns — Clothing & Apparel',    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=65&auto=format&fit=crop' },
  { id: 'az-4', title: 'Returns Pallet — Small Appliances',      image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&q=65&auto=format&fit=crop' },
];

const PLACEHOLDER_CLEARANCE = [
  { id: 'cl-1', title: 'Clearance — Toys & Games',               image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-2', title: 'Clearance — Sports & Fitness',           image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-3', title: 'Clearance — Health & Beauty',            image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=65&auto=format&fit=crop' },
  { id: 'cl-4', title: 'Clearance — Accessories & Fashion',      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=65&auto=format&fit=crop' },
];

const PLACEHOLDER_WHOLESALE = [
  { id: 'ws-1', title: 'Wholesale — Artisan & Craft Goods',      image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-2', title: 'Food & Beverage — Wholesale Case',       image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-3', title: 'Office & Business Supplies — Bulk',      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-4', title: 'Wholesale Logistics & Shipping',         image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&q=65&auto=format&fit=crop' },
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Link
          key={item.id}
          to={href}
          className="group block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-[#F4C400] transition-all duration-200"
        >
          <div className="aspect-[4/3] overflow-hidden bg-gray-100">
            <img
              src={item.image}
              srcSet={buildSrcSet(item.image, [200, 300, 400]) || undefined}
              sizes="(max-width: 767px) calc(50vw - 1.5rem), (max-width: 1023px) calc(33vw - 1.5rem), 300px"
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
function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
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

  useEffect(() => {
    const fetchAll = async () => {
      // ── Phase 1: fetch featured products immediately ──────────────────
      let featured: ReturnType<typeof transformProductRows> = [];
      try {
        const featuredRes = await supabase
          .from('products').select(PRODUCT_QUERY_FIELDS)
          .eq('isActive', true).eq('isApproved', true)
          .order('views', { ascending: false }).limit(4);

        featured = featuredRes.data
          ? transformProductRows(featuredRes.data as ProductRow[])
          : [];
        setFeaturedProducts(featured);
      } catch {
        // silently swallow — section will show placeholder content
      } finally {
        setLoading(false);
      }

      // ── Phase 2: fetch secondary sections after initial render ────────
      // The await above yields to the event loop, allowing React to commit
      // the Phase 1 state updates and render the above-the-fold content
      // before the secondary network requests begin.
      try {
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
      } catch {
        // silently swallow — sections will show placeholder content
      } finally {
        setSecondaryLoading(false);
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

          {secondaryLoading ? (
            <ProductGridSkeleton />
          ) : amazonProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

          {secondaryLoading ? (
            <ProductGridSkeleton />
          ) : clearanceProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clearanceProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <PlaceholderGrid
              items={PLACEHOLDER_CLEARANCE}
              href="/catalog?type=clearance"
              badge="Clearance"
              badgeColor="bg-red-100 text-red-800 font-semibold"
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

          {secondaryLoading ? (
            <ProductGridSkeleton />
          ) : wholesaleProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* ── Below-fold sections (lazy loaded) ──────────────────────────── */}
      <Suspense fallback={null}>
        <HomeBelowFold />
      </Suspense>

    </div>
  );
}
