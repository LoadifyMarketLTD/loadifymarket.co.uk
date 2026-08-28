import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, LayoutGrid, Smartphone, Laptop, Watch, Car, Shirt, Zap, Home,
  Dumbbell, Leaf, ShoppingBag, Cpu, Gamepad2, Baby, BookOpen, ChevronRight, Tag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { marketplaceCategorySlug } from '@/data/marketplaceTaxonomy';
import AppBottomNav from '@/mobile-web-clone/AppBottomNav';

const SLUG_ICON_MAP: Record<string, LucideIcon> = {
  electronics: Zap,
  electrical: Zap,
  'phones-tablets': Smartphone,
  'laptops-computers': Laptop,
  'smart-tech': Cpu,
  gaming: Gamepad2,
  entertainment: Gamepad2,
  'watches-jewellery': Watch,
  accessories: Watch,
  automotive: Car,
  vehicles: Car,
  'clothing-fashion': Shirt,
  fashion: Shirt,
  'home-garden': Home,
  'home-living': Home,
  homeware: Home,
  sports: Dumbbell,
  'sports-fitness': Dumbbell,
  garden: Leaf,
  'health-beauty': Leaf,
  toys: Baby,
  kids: Baby,
  books: BookOpen,
  'bags-luggage': ShoppingBag,
};

function categoryIcon(slug: string): LucideIcon {
  return SLUG_ICON_MAP[slug] ?? Tag;
}

/** Browser-only clone of the installed app Search/Categories screen. */
export default function MobileWebCategoriesPage() {
  const navigate = useNavigate();
  const { categories, loading } = useCategories();

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#07080B', color: '#FFFFFF' }}>
      <div
        style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 16,
          position: 'sticky', top: 0, zIndex: 10, background: 'rgba(7,8,11,0.97)', backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 'calc(1rem + env(safe-area-inset-top,0px))', paddingBottom: '1rem',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{ width: 40, height: 40, borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft style={{ width: 20, height: 20, color: '#FFFFFF' }} aria-hidden="true" />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: 18, paddingRight: 36, margin: 0 }}>Categories</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(80px + env(safe-area-inset-bottom,0px))' }}>
        <Link
          to="/catalog"
          style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}
        >
          <LayoutGrid style={{ width: 22, height: 22, color: '#F2B84B', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ flex: 1, marginLeft: 12, fontSize: 16, fontWeight: 500, color: '#FFFFFF' }}>All Categories</span>
          <ChevronRight style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.30)', flexShrink: 0 }} aria-hidden="true" />
        </Link>

        {loading && Array.from({ length: 8 }).map((_, index) => (
          <div key={index} style={{ height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="animate-pulse" style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.10)' }} />
            <div className="animate-pulse" style={{ height: 16, flex: 1, borderRadius: 4, background: 'rgba(255,255,255,0.10)' }} />
          </div>
        ))}

        {!loading && categories.map((category) => {
          const Icon = categoryIcon(category.slug);
          return (
            <Link
              key={category.id}
              to={`/category/${marketplaceCategorySlug(category.name)}`}
              style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}
            >
              <Icon style={{ width: 22, height: 22, color: '#F2B84B', flexShrink: 0 }} aria-hidden="true" />
              <span style={{ flex: 1, marginLeft: 12, fontSize: 16, fontWeight: 500, color: '#FFFFFF' }}>{category.name}</span>
              <ChevronRight style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.30)', flexShrink: 0 }} aria-hidden="true" />
            </Link>
          );
        })}
      </div>

      <AppBottomNav />
    </div>
  );
}
