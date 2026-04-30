/**
 * MobileCategoryShortcuts — horizontal scroll category row.
 *
 * Reference: "All" is the ONLY item with a gold circle background.
 * All other items are plain icon + label (no circle).
 * Active (All) = gold icon + gold label.
 * Inactive = gold-outline icon + white label.
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
  { label: 'All',      icon: LayoutGrid,     to: '/catalog',               active: true },
  { label: 'Phones',   icon: Smartphone,     to: '/category/electronics'               },
  { label: 'Laptops',  icon: Laptop,         to: '/catalog?q=laptop'                   },
  { label: 'Watches',  icon: Watch,          to: '/catalog?q=watch'                    },
  { label: 'Vehicles', icon: Car,            to: '/category/automotive'                },
  { label: 'More',     icon: MoreHorizontal, to: '/catalog'                            },
];

export default function MobileCategoryShortcuts() {
  return (
    <div
      className="overflow-x-auto scrollbar-none py-3"
      style={{ paddingLeft: '16px', paddingRight: '16px' }}
      aria-label="Browse by category"
    >
      <div style={{ display: 'flex', gap: '24px', width: 'max-content' }}>
        {SHORTCUTS.map(({ label, icon: Icon, to, active }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center active:scale-95 transition-transform"
            style={{ gap: '6px', textDecoration: 'none' }}
            aria-label={`Browse ${label}`}
          >
            {active ? (
              /* "All" — gold circle with icon inside */
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
                fontWeight: active ? 700 : 400,
                color: active ? '#F5B942' : 'rgba(255,255,255,0.75)',
                lineHeight: 1,
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
