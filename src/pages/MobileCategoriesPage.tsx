/**
 * MobileCategoriesPage — /categories
 *
 * Full-screen mobile categories list with a sticky header, chevron rows,
 * and MobileBottomNav. Desktop users are not expected to land here but
 * the page is accessible and functional on all screen sizes.
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
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';

interface CategoryRow {
  icon: LucideIcon;
  label: string;
  to: string;
}

const CATEGORY_ROWS: CategoryRow[] = [
  { icon: LayoutGrid,    label: 'All Categories',     to: '/catalog' },
  { icon: Smartphone,    label: 'Phones & Tablets',   to: '/category/electronics?sub=phones' },
  { icon: Laptop,        label: 'Laptops',            to: '/category/electronics?sub=laptops' },
  { icon: Watch,         label: 'Watches',            to: '/category/accessories?sub=watches' },
  { icon: Car,           label: 'Vehicles',           to: '/category/automotive' },
  { icon: Shirt,         label: 'Fashion',            to: '/category/clothing-fashion' },
  { icon: Zap,           label: 'Electronics',        to: '/category/electronics' },
  { icon: Home,          label: 'Home & Living',      to: '/category/home-garden' },
  { icon: Dumbbell,      label: 'Sports & Outdoors',  to: '/category/sports' },
  { icon: MoreHorizontal, label: 'More Categories',   to: '/catalog' },
];

export default function MobileCategoriesPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#07080B' }}
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
          className="p-2 rounded-xl active:bg-white/10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
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
        {CATEGORY_ROWS.map(({ icon: Icon, label, to }) => (
          <Link
            key={to + label}
            to={to}
            className="flex items-center px-4 active:bg-white/[0.03] transition-colors"
            style={{
              height: 56,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              textDecoration: 'none',
            }}
          >
            {/* Gold icon */}
            <Icon
              className="h-[22px] w-[22px] shrink-0"
              style={{ color: '#F2B84B' }}
              aria-hidden="true"
            />

            {/* Label */}
            <span
              className="flex-1 ml-3 text-[16px] font-medium text-white"
            >
              {label}
            </span>

            {/* Chevron */}
            <ChevronRight
              className="h-[18px] w-[18px] shrink-0"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      <MobileBottomNav />
    </div>
  );
}
