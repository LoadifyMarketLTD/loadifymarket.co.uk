/**
 * MobileCategoryShortcuts
 *
 * Mobile-only horizontal-scroll category row for the APK home screen.
 * Active category is tracked in local state (initialised to 'all').
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  Smartphone,
  Laptop,
  Watch,
  Car,
  MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
}

const CATEGORIES: Category[] = [
  { id: 'all',      label: 'All',      icon: LayoutGrid,    to: '/catalog' },
  { id: 'phones',   label: 'Phones',   icon: Smartphone,    to: '/category/electronics?sub=phones' },
  { id: 'laptops',  label: 'Laptops',  icon: Laptop,        to: '/category/electronics?sub=laptops' },
  { id: 'watches',  label: 'Watches',  icon: Watch,         to: '/category/accessories?sub=watches' },
  { id: 'vehicles', label: 'Vehicles', icon: Car,           to: '/category/automotive' },
  { id: 'more',     label: 'More',     icon: MoreHorizontal, to: '/catalog' },
];

export default function MobileCategoryShortcuts() {
  const [active, setActive] = useState('all');

  return (
    <section
      aria-label="Shop by category"
      className="overflow-x-auto scrollbar-hide flex gap-5 px-4 py-3"
    >
      {CATEGORIES.map(({ id, label, icon: Icon, to }) => {
        const isActive = active === id;

        return (
          <Link
            key={id}
            to={to}
            onClick={() => setActive(id)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
            style={{ minWidth: 56 }}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Icon wrapper — circle only when active */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: isActive ? '#1E1A0E' : 'transparent',
                border: isActive ? '2px solid #F2B84B' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon
                style={{
                  width: 24,
                  height: 24,
                  color: '#F2B84B',
                }}
                aria-hidden="true"
              />
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FFFFFF' : '#FFFFFF',
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </section>
  );
}

