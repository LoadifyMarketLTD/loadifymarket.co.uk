import { Link } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import {
  ArrowRight, Layers,
  LayoutGrid,
  RotateCcw, Tag,
  BadgeCheck, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';
import { supabase } from '../lib/supabase';
import { buildSrcSet } from '../lib/imageOptimization';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';

const HomeBelowFold = lazy(() => import('../components/HomeBelowFold'));


// ── Trust bar items ───────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: BadgeCheck, label: 'Verified Sellers',  desc: 'All sellers are vetted before listing' },
  { icon: ShieldCheck, label: 'Secure Payments',  desc: 'Payments powered by Stripe' },
  { icon: ShieldAlert, label: 'Buyer Protection', desc: 'Dispute resolution & purchase protection' },
];

// ── Consumer goods categories ────────────────────────────────────────────────
const CONSUMER_CATEGORIES = [
  { slug: 'electronics',    label: 'Electronics',       image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop' },
  { slug: 'home-garden',    label: 'Home & Garden',     image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop' },
  { slug: 'fashion',        label: 'Fashion',           image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=65&auto=format&fit=crop' },
  { slug: 'health-beauty',  label: 'Health & Beauty',   image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=65&auto=format&fit=crop' },
  { slug: 'sports-outdoors', label: 'Sports & Outdoors', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=65&auto=format&fit=crop' },
  { slug: 'automotive',     label: 'Automotive',        image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=65&auto=format&fit=crop' },
  { slug: 'toys',           label: 'Toys',              image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&q=65&auto=format&fit=crop' },
  { slug: 'baby-kids',      label: 'Baby & Kids',       image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=65&auto=format&fit=crop' },
  { slug: 'pets',           label: 'Pets',              image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&q=65&auto=format&fit=crop' },
  { slug: 'tools-diy',      label: 'Tools & DIY',       image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop' },
  { slug: 'food-drink',     label: 'Food & Drink',      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=65&auto=format&fit=crop' },
  { slug: 'handmade',       label: 'Handmade',          image: 'https://images.unsplash.com/photo-1547895749-888a559fc2af?w=400&q=65&auto=format&fit=crop' },
];

// ── Wholesale / bulk / clearance categories ───────────────────────────────────
const BULK_CATEGORIES = [
  { slug: 'wholesale',      label: 'Wholesale Lots',    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&q=65&auto=format&fit=crop', desc: 'Bulk pallets & trade bundles' },
  { slug: 'clearance',      label: 'Clearance Stock',   image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=65&auto=format&fit=crop', desc: 'End of line & overstock' },
  { slug: 'amazon-returns', label: 'Amazon Returns',    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=65&auto=format&fit=crop', desc: 'Grade A/B/C returns stock' },
  { slug: 'business-supplies', label: 'Business Supplies', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=65&auto=format&fit=crop', desc: 'Trade & commercial supplies' },
];


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
  { id: 'ws-1', title: 'Mixed Electronics Pallet — Wholesale Lot',   image: 'https://images.unsplash.com/photo-1570983939025-4caff7c43d36?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-2', title: 'Clothing & Fashion — Trade Bundle',          image: 'https://images.unsplash.com/photo-1532635241-17e820acc59f?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-3', title: 'Home & Garden — Wholesale Clearance Lot',    image: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=400&q=65&auto=format&fit=crop' },
  { id: 'ws-4', title: 'Tools & Hardware — Business Pallet',         image: 'https://images.unsplash.com/photo-1598970605070-a38a6ccd3a2d?w=400&q=65&auto=format&fit=crop' },
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
  seller:seller_profiles_public!left(
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

type TabKey = 'amazon' | 'clearance' | 'wholesale';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  iconClass: string;
  href: string;
  badge: string;
  badgeColor: string;
  products: Product[];
  placeholders: { id: string; title: string; image: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [amazonProducts,   setAmazonProducts]   = useState<Product[]>([]);
  const [clearanceProducts,setClearanceProducts] = useState<Product[]>([]);
  const [wholesaleProducts,setWholesaleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('amazon');

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

  // Always display exactly 4 cards in Featured — pad with placeholders if fewer real products
  const paddedFeatured = loading ? [] : [
    ...featuredProducts.slice(0, 4),
    ...PLACEHOLDER_FEATURED.slice(0, 4 - featuredProducts.slice(0, 4).length),
  ];

  // Tab config for the merged product section
  const TABS: TabConfig[] = [
    {
      key: 'amazon',
      label: 'Amazon Returns',
      icon: RotateCcw,
      iconClass: 'text-orange-500',
      href: '/category/amazon-returns',
      badge: 'Returns Pallet',
      badgeColor: 'bg-orange-100 text-orange-700',
      products: amazonProducts,
      placeholders: PLACEHOLDER_AMAZON,
    },
    {
      key: 'clearance',
      label: 'Clearance',
      icon: Tag,
      iconClass: 'text-red-500',
      href: '/category/clearance',
      badge: 'Clearance',
      badgeColor: 'bg-red-100 text-red-800 font-semibold',
      products: clearanceProducts,
      placeholders: PLACEHOLDER_CLEARANCE,
    },
    {
      key: 'wholesale',
      label: 'Wholesale',
      icon: Layers,
      iconClass: 'text-[#1E3A5F]',
      href: '/category/wholesale',
      badge: 'Wholesale',
      badgeColor: 'bg-[#1E3A5F]/10 text-[#1E3A5F]',
      products: wholesaleProducts,
      placeholders: PLACEHOLDER_WHOLESALE,
    },
  ];

  const activeTabData = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const activeTabCols =
    activeTabData.products.length <= 1 ? 1 :
    activeTabData.products.length === 2 ? 2 :
    activeTabData.products.length === 3 ? 3 : 4;

  return (
    <div className="bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <CinematicHero />

      {/* ── Trust Bar ───────────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] border-b border-gray-200 py-5">
        <div className="container-market">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 sm:divide-x sm:divide-gray-200">
            {TRUST_ITEMS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center justify-center gap-3 px-4 py-1">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#1E3A5F]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Shop by Category ────────────────────────────────────────────── */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container-market">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Shop by Category</h2>
              <p className="text-sm text-gray-500">Discover products across all categories</p>
            </div>
            <Link to="/catalog" className="text-sm text-[#1E3A5F] hover:underline font-medium whitespace-nowrap">
              All Categories →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {CONSUMER_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group block rounded-lg overflow-hidden border border-gray-200 hover:border-[#F4C400] hover:shadow-md transition-all duration-200"
              >
                <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-2 text-center bg-white">
                  <p className="text-xs font-semibold text-gray-800 truncate">{cat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wholesale & Bulk Trading ─────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-8 border-b border-gray-200">
        <div className="container-market">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Stock Opportunities</h2>
              <p className="text-sm text-gray-500">Wholesale lots, clearance, returns &amp; job lots — ready to resell</p>
            </div>
            <Link to="/category/wholesale" className="text-sm text-[#1E3A5F] hover:underline font-medium whitespace-nowrap">
              Browse All →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BULK_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group block rounded-xl overflow-hidden border border-gray-200 hover:border-[#1E3A5F]/40 hover:shadow-md transition-all duration-200 bg-white"
              >
                <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-gray-900 truncate">{cat.label}</p>
                  <p className="text-xs text-gray-500 truncate">{cat.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ───────────────────────────────────────────── */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container-market">
          <SectionHeader
            title="Featured Deals"
            subtitle="Top opportunities from verified UK sellers"
            viewAllHref="/catalog"
          />

          {loading ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paddedFeatured.map((item) =>
                'sellerId' in item ? (
                  <ProductCard key={item.id} product={item as Product} />
                ) : (
                  <Link
                    key={item.id}
                    to="/catalog"
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
                      <span className="inline-block text-xs px-2 py-0.5 rounded font-medium bg-[#F4C400]/20 text-gray-700">New Listing</span>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}

          <div className="mt-5 text-center">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-2.5 rounded transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              Browse All Listings
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Merged Product Sections (tabbed) ────────────────────────────── */}
      <section className="bg-[#F5F6F7] py-8 border-b border-gray-200">
        <div className="container-market">
          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-[#1E3A5F] text-[#1E3A5F] bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? tab.iconClass : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
            <div className="ml-auto pb-1">
              <Link
                to={activeTabData.href}
                className="text-sm text-[#1E3A5F] hover:underline font-medium whitespace-nowrap"
              >
                View All →
              </Link>
            </div>
          </div>

          {/* Tab content */}
          {secondaryLoading ? (
            <ProductGridSkeleton />
          ) : activeTabData.products.length > 0 ? (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${activeTabCols}, minmax(0, 1fr))` }}
            >
              {activeTabData.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <PlaceholderGrid
              items={activeTabData.placeholders}
              href={activeTabData.href}
              badge={activeTabData.badge}
              badgeColor={activeTabData.badgeColor}
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
