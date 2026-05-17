/**
 * MobileCategoriesPage — /categories
 *
 * Full-screen mobile categories list with a sticky header, chevron rows,
 * and MobileBottomNav. Desktop users are not expected to land here but
 * the page is accessible and functional on all screen sizes.
 *
 * Categories are loaded from the database via the useCategories hook so
 * new categories added by admins are reflected immediately without a
 * code change.
 */

import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
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
  ChevronRight,
  Tag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useCategories } from '@/hooks/useCategories';

// Map category slugs → icons for recognised categories; unknown slugs use Tag.
const SLUG_ICON_MAP: Record<string, LucideIcon> = {
  electronics:          Zap,
  'phones-tablets':     Smartphone,
  'laptops-computers':  Laptop,
  'smart-tech':         Cpu,
  gaming:               Gamepad2,
  'watches-jewellery':  Watch,
  accessories:          Watch,
  automotive:           Car,
  'clothing-fashion':   Shirt,
  fashion:              Shirt,
  'home-garden':        Home,
  'home-living':        Home,
  sports:               Dumbbell,
  'sports-outdoors':    Dumbbell,
  garden:               Leaf,
  'health-beauty':      Leaf,
  toys:                 Baby,
  baby:                 Baby,
  books:                BookOpen,
  'bags-luggage':       ShoppingBag,
};

function categoryIcon(slug: string): LucideIcon {
  return SLUG_ICON_MAP[slug] ?? Tag;
}

export default function MobileCategoriesPage() {
  const navigate = useNavigate();
  const { categories, loading } = useCategories();

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
    >
      {/* ── Sticky header ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 sticky top-0 z-10"
        style={{
          background: 'rgba(7,8,11,0.97)',
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

        <h1 className="flex-1 text-center text-white font-bold text-lg pr-9">
          Categories
        </h1>
      </div>

      {/* ── Category rows ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* "All Categories" is always the first row */}
        <Link
          to="/catalog"
          className="flex items-center px-4 active:bg-white/[0.03] transition-colors"
          style={{
            height: 56,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            textDecoration: 'none',
          }}
        >
          <LayoutGrid
            className="h-[22px] w-[22px] shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="flex-1 ml-3 text-[16px] font-medium text-white">
            All Categories
          </span>
          <ChevronRight
            className="h-[18px] w-[18px] shrink-0 text-foreground/30"
            aria-hidden="true"
          />
        </Link>

        {/* Loading skeleton */}
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center px-4 gap-3 animate-pulse"
              style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="h-[22px] w-[22px] rounded bg-white/10 shrink-0" />
              <div className="flex-1 h-4 rounded bg-white/10" />
            </div>
          ))}

        {/* DB-driven category rows */}
        {!loading &&
          categories.map((cat) => {
            const Icon = categoryIcon(cat.slug);
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="flex items-center px-4 active:bg-white/[0.03] transition-colors"
                style={{
                  height: 56,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  textDecoration: 'none',
                }}
              >
                <Icon
                  className="h-[22px] w-[22px] shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="flex-1 ml-3 text-[16px] font-medium text-white">
                  {cat.name}
                </span>
                <ChevronRight
                  className="h-[18px] w-[18px] shrink-0 text-foreground/30"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>

      <MobileBottomNav />
    </div>
  );
}
