/**
 * MobileCategoryShortcuts
 *
 * Mobile-only horizontal scroll category row — matches the reference mockup.
 * No section title, no "View all" link.
 * Categories: All (selected/gold), Phones, Laptops, Watches, Vehicles, More
 */

import { Link } from 'react-router-dom';
import { LayoutGrid, Smartphone, Laptop, Watch, Car, MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Shortcut {
  label: string;
  icon: LucideIcon;
  to: string;
  active?: boolean;
}

const SHORTCUTS: Shortcut[] = [
  { label: 'All',      icon: LayoutGrid,     to: '/catalog',              active: true },
  { label: 'Phones',   icon: Smartphone,     to: '/category/electronics'              },
  { label: 'Laptops',  icon: Laptop,         to: '/catalog?q=laptop'                  },
  { label: 'Watches',  icon: Watch,          to: '/catalog?q=watch'                   },
  { label: 'Vehicles', icon: Car,            to: '/category/automotive'               },
  { label: 'More',     icon: MoreHorizontal, to: '/catalog'                           },
];

export default function MobileCategoryShortcuts() {
  return (
    <div
      className="overflow-x-auto scrollbar-none px-4 py-3"
      aria-label="Browse by category"
    >
      <div className="flex gap-5" style={{ width: 'max-content' }}>
        {SHORTCUTS.map(({ label, icon: Icon, to, active }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            aria-label={`Browse ${label}`}
          >
            {/* Circle icon */}
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                backgroundColor: active ? 'rgba(245,185,66,0.14)' : 'rgba(255,255,255,0.05)',
                border: active
                  ? '1.5px solid rgba(245,185,66,0.50)'
                  : '1px solid rgba(255,255,255,0.09)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                style={{
                  width: '24px',
                  height: '24px',
                  color: active ? '#F5B942' : '#A0A0A0',
                }}
                aria-hidden="true"
              />
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: '12px',
                fontWeight: active ? 600 : 400,
                color: active ? '#F5B942' : 'rgba(255,255,255,0.65)',
              }}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
