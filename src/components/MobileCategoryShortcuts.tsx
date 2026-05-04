/**
 * MobileCategoryShortcuts — horizontal scroll category row with section header.
 *
 * Shows "Categories" + "See all" header, followed by a scrollable row of
 * circular category tiles (real category photos inside dark circles).
 */

import { Link } from 'react-router-dom';

interface Category {
  id: string;
  label: string;
  image: string;
  to: string;
}

const CATEGORIES: Category[] = [
  { id: 'electronics', label: 'Electronics', image: '/images/categories/electronics.jpeg',   to: '/category/electrical' },
  { id: 'fashion',     label: 'Fashion',     image: '/images/categories/fashion.jpeg',       to: '/category/wholesale-clothing' },
  { id: 'home',        label: 'Home',        image: '/images/categories/home-kitchen.jpeg',  to: '/category/homeware' },
  { id: 'sports',      label: 'Sports',      image: '/images/categories/sports.jpeg',        to: '/catalog?q=sports' },
  { id: 'beauty',      label: 'Beauty',      image: '/images/categories/beauty.jpeg',        to: '/category/health-beauty' },
  { id: 'toys',        label: 'Toys',        image: '/images/categories/toys-games.jpeg',    to: '/category/toys' },
];

export default function MobileCategoryShortcuts() {
  return (
    <section aria-label="Browse by category" style={{ paddingTop: 20 }}>
      {/* Section header */}
      <div
        className="flex items-center justify-between"
        style={{ paddingInline: 'var(--mob-side, 16px)', marginBottom: 12 }}
      >
        <span style={{ fontSize: 'clamp(15px, 4.2vw, 17px)', fontWeight: 700, color: '#FFFFFF' }}>
          Categories
        </span>
        <Link
          to="/categories"
          className="text-[13px] font-semibold"
          style={{ color: '#F2B84B', textDecoration: 'none' }}
        >
          See all
        </Link>
      </div>

      {/* Scrollable row */}
      <div
        className="overflow-x-auto scrollbar-hide"
        style={{
          paddingLeft: 'var(--mob-side, 16px)',
          scrollPaddingInlineStart: 'var(--mob-side, 16px)',
          scrollPaddingInlineEnd: 'var(--mob-side, 16px)',
        }}
      >
        <div style={{ display: 'flex', gap: 14, width: 'max-content' }}>
          {CATEGORIES.map(({ id, label, image, to }) => (
            <Link
              key={id}
              to={to}
              className="flex flex-col items-center active:scale-95 transition-transform"
              style={{ gap: 7, textDecoration: 'none' }}
              aria-label={`Browse ${label}`}
            >
              {/* Circular image tile */}
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: '#1C1C28',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <img
                  src={image}
                  alt={label}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 'clamp(10px, 2.8vw, 12px)',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </Link>
          ))}
          {/* Trailing spacer */}
          <div style={{ minWidth: 'var(--mob-side, 16px)', flexShrink: 0 }} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
