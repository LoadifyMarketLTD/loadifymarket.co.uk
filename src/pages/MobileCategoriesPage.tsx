/**
 * MobileCategoriesPage — /categories
 *
 * Mobile web keeps the current editorial category grid. Capacitor intentionally
 * renders the established dark installed-app category list instead, so web
 * visual polish cannot replace the Android application identity.
 */

import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  LayoutGrid,
  Smartphone,
  Laptop,
  Watch,
  Car,
  Shirt,
  Zap,
  Home,
  Dumbbell,
  Leaf,
  ShoppingBag,
  Cpu,
  Gamepad2,
  Baby,
  BookOpen,
  Tag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';
import { LegacyNativeBottomNav } from '@/components/native/LegacyNativeMarketplace';
import { useCategories } from '@/hooks/useCategories';
import { visualForCategory } from '@/data/marketplaceVisuals';
import { marketplaceCategorySlug } from '@/data/marketplaceTaxonomy';
import { isCapacitorContext } from '@/lib/capacitorUtils';

const SLUG_ICON_MAP: Record<string, LucideIcon> = {
  electronics: Zap,
  'phones-tablets': Smartphone,
  'laptops-computers': Laptop,
  'smart-tech': Cpu,
  gaming: Gamepad2,
  'watches-jewellery': Watch,
  accessories: Watch,
  automotive: Car,
  'clothing-fashion': Shirt,
  fashion: Shirt,
  'home-garden': Home,
  'home-living': Home,
  sports: Dumbbell,
  'sports-outdoors': Dumbbell,
  garden: Leaf,
  'health-beauty': Leaf,
  toys: Baby,
  baby: Baby,
  books: BookOpen,
  'bags-luggage': ShoppingBag,
};

function categoryIcon(slug: string): LucideIcon {
  return SLUG_ICON_MAP[slug] ?? Tag;
}

function LegacyNativeCategories() {
  const navigate = useNavigate();
  const { categories, loading } = useCategories();
  const visibleCategories = categories.slice(0, 12);
  const hasMoreCategories = categories.length > visibleCategories.length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="shrink-0 flex items-center gap-3 px-4 sticky top-0 z-10 bg-background/[0.97]"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '1rem',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl active:bg-white/10 transition-colors bg-white/[0.05]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-white" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-white font-bold text-lg pr-9">Categories</h1>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Link
          to="/catalog"
          className="flex items-center px-4 active:bg-white/[0.03] transition-colors"
          style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}
        >
          <LayoutGrid className="h-[22px] w-[22px] shrink-0 text-primary" aria-hidden="true" />
          <span className="flex-1 ml-3 text-[16px] font-medium text-white">All Categories</span>
          <ChevronRight className="h-[18px] w-[18px] shrink-0 text-foreground/30" aria-hidden="true" />
        </Link>

        {loading && Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center px-4 gap-3 animate-pulse"
            style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="h-[22px] w-[22px] rounded bg-white/10 shrink-0" />
            <div className="flex-1 h-4 rounded bg-white/10" />
          </div>
        ))}

        {!loading && visibleCategories.map((cat) => {
          const Icon = categoryIcon(cat.slug);
          return (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="flex items-center px-4 active:bg-white/[0.03] transition-colors"
              style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}
            >
              <Icon className="h-[22px] w-[22px] shrink-0 text-primary" aria-hidden="true" />
              <span className="flex-1 ml-3 text-[16px] font-medium text-white">{cat.name}</span>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-foreground/30" aria-hidden="true" />
            </Link>
          );
        })}

        {!loading && hasMoreCategories && (
          <Link
            to="/catalog"
            className="flex items-center px-4 active:bg-white/[0.03] transition-colors"
            style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}
          >
            <LayoutGrid className="h-[22px] w-[22px] shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1 ml-3 text-[16px] font-medium text-white">View All Categories</span>
            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-foreground/30" aria-hidden="true" />
          </Link>
        )}
      </div>

      <LegacyNativeBottomNav />
    </div>
  );
}

function MobileWebCategories() {
  const navigate = useNavigate();
  const { categories, loading } = useCategories();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC]">
      <div
        className="shrink-0 flex items-center gap-3 px-4 sticky top-0 z-10 bg-[#F7F9FC]/[0.97]"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(10,35,79,0.08)',
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '1rem',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl active:bg-[#0A234F]/5 transition-colors bg-white border border-[#0A234F]/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-[#0A234F]" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-[#0A234F] font-bold text-lg pr-9">Categories</h1>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Link
          to="/catalog"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-[#0A234F]/10 bg-white p-4 shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A234F]">
            <LayoutGrid className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold text-[#0A234F]">All Categories</div>
            <div className="mt-0.5 text-[11px] text-[#64748B]">Browse current approved marketplace listings</div>
          </div>
          <ChevronRight className="h-5 w-5 text-[#94A3B8]" aria-hidden="true" />
        </Link>

        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-[#0A234F]/5" aria-hidden="true" />
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const visual = visualForCategory(cat.slug) ?? visualForCategory(cat.name);
              return (
                <Link
                  key={cat.id}
                  to={`/category/${marketplaceCategorySlug(cat.name)}`}
                  className="overflow-hidden rounded-2xl border border-[#0A234F]/10 bg-white shadow-sm active:scale-[0.99] transition-transform"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#E8EEF7]">
                    {visual ? (
                      <img
                        src={visual.image}
                        alt={visual.altText}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl font-black text-[#1D57D8]">
                        {cat.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-[13px] font-extrabold leading-4 text-[#0A234F]">{cat.name}</div>
                    {cat.children.length > 0 && (
                      <div className="mt-1 text-[10px] font-medium text-[#64748B]">{cat.children.length} subcategories</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}

export default function MobileCategoriesPage() {
  return isCapacitorContext() ? <LegacyNativeCategories /> : <MobileWebCategories />;
}
