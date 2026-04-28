/**
 * MobileCategoryShortcuts
 *
 * Mobile-only (hidden md:block is applied in the parent).
 * 8 static category shortcuts in a 4-column icon grid.
 * Links use /category/:slug for DB-backed categories and /catalog for generic ones.
 */

import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Truck,
  Wrench,
  Home,
  Smartphone,
  Shirt,
  HeartPulse,
  Car,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Shortcut {
  label: string;
  icon: LucideIcon;
  to: string;
  iconClass: string;
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Products',    icon: ShoppingBag, to: '/catalog',                  iconClass: 'text-[#FBBF24]'  },
  { label: 'Transport',   icon: Truck,       to: '/catalog?q=transport',       iconClass: 'text-sky-400'    },
  { label: 'Services',    icon: Wrench,      to: '/catalog?q=services',        iconClass: 'text-violet-400' },
  { label: 'Home',        icon: Home,        to: '/category/home-garden',      iconClass: 'text-green-400'  },
  { label: 'Electronics', icon: Smartphone,  to: '/category/electronics',      iconClass: 'text-cyan-400'   },
  { label: 'Fashion',     icon: Shirt,       to: '/category/clothing-fashion', iconClass: 'text-blue-400'   },
  { label: 'Health',      icon: HeartPulse,  to: '/category/health-beauty',    iconClass: 'text-rose-400'   },
  { label: 'Automotive',  icon: Car,         to: '/category/automotive',       iconClass: 'text-slate-300'  },
];

export default function MobileCategoryShortcuts() {
  return (
    <section aria-label="Shop by category" className="px-4 pt-5 pb-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-bold text-white tracking-tight">
          Shop by Category
        </h2>
        <Link
          to="/catalog"
          className="text-[11px] font-semibold text-[#FBBF24] hover:text-[#D8AE57] transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {SHORTCUTS.map(({ label, icon: Icon, to, iconClass }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-1.5 rounded-[14px] border border-white/[0.06] bg-[#111827] px-1.5 py-3.5 active:scale-95 active:bg-white/[0.08] transition-transform"
            aria-label={label}
          >
            <Icon className={`h-5 w-5 ${iconClass} shrink-0`} aria-hidden="true" />
            <span className="text-[10px] font-semibold text-white/80 leading-none text-center">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
