/**
 * MobileCategoryShortcuts — horizontal scroll category row.
 *
 * Reference: "All" is the ONLY item with a gold circle background.
 * All other items are plain icon + label (no circle).
 * Active (All or selected) = gold circle + gold label.
 * Inactive = gold-outline icon + white label.
 * Active category is tracked in local state (initialised to 'all').
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Smartphone, Laptop, Watch, Car, MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
}

const CATEGORIES: Category[] = [
  { id: 'all',      label: 'All',      icon: LayoutGrid,     to: '/catalog' },
  { id: 'phones',   label: 'Phones',   icon: Smartphone,     to: '/category/electronics' },
  { id: 'laptops',  label: 'Laptops',  icon: Laptop,         to: '/catalog?q=laptop' },
  { id: 'watches',  label: 'Watches',  icon: Watch,          to: '/catalog?q=watch' },
  { id: 'vehicles', label: 'Vehicles', icon: Car,            to: '/category/automotive' },
  { id: 'more',     label: 'More',     icon: MoreHorizontal, to: '/catalog' },
];

export default function MobileCategoryShortcuts() {
  const [active, setActive] = useState('all');

  return (
    <div
      className="overflow-x-auto scrollbar-hide py-3"
      style={{ paddingLeft: '16px', paddingRight: '16px' }}
      aria-label="Browse by category"
    >
      <div style={{ display: 'flex', gap: '24px', width: 'max-content' }}>
        {CATEGORIES.map(({ id, label, icon: Icon, to }) => {
          const isActive = active === id;

          return (
            <Link
              key={id}
              to={to}
              onClick={() => setActive(id)}
              className="flex flex-col items-center active:scale-95 transition-transform"
              style={{ gap: '6px', textDecoration: 'none' }}
              aria-label={`Browse ${label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive ? (
                /* Active item — gold circle with icon inside */
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(200,134,10,0.14)',
                    border: '1.5px solid rgba(245,185,66,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    style={{ width: '26px', height: '26px', color: '#F5B942' }}
                    aria-hidden="true"
                  />
                </div>
              ) : (
                /* Inactive items — bare icon, no circle */
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    style={{ width: '28px', height: '28px', color: 'rgba(245,185,66,0.75)' }}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
              )}

              {/* Label */}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#F5B942' : 'rgba(255,255,255,0.75)',
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
