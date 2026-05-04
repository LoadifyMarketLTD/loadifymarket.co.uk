/**
 * MobileCategoryShortcuts — horizontal scroll category row with section header.
 *
 * Shows "Categories" + "See all" header, followed by a scrollable row of
 * circular category tiles with real product photos from the database.
 * Falls back to static placeholder images while loading or if a category
 * has no active products.
 */

import { Link } from 'react-router-dom';
import { useCategoryImages } from '@/hooks/useCategoryImages';

interface Category {
  id: string;
  label: string;
  /** DB category slug used to look up a real product image */
  dbSlug: string;
  /** Static fallback image shown while the DB image loads or if none found */
  fallbackImage: string;
  to: string;
}

const CATEGORIES: Category[] = [
  { id: 'electronics', label: 'Electronics', dbSlug: 'electrical',         fallbackImage: '/images/categories/electronics.jpeg',   to: '/category/electrical' },
  { id: 'fashion',     label: 'Fashion',     dbSlug: 'wholesale-clothing', fallbackImage: '/images/categories/fashion.jpeg',       to: '/category/wholesale-clothing' },
  { id: 'home',        label: 'Home',        dbSlug: 'homeware',           fallbackImage: '/images/categories/home-kitchen.jpeg',  to: '/category/homeware' },
  { id: 'sports',      label: 'Sports',      dbSlug: 'sports-fitness',     fallbackImage: '/images/categories/sports.jpeg',        to: '/category/sports-fitness' },
  { id: 'beauty',      label: 'Beauty',      dbSlug: 'health-beauty',      fallbackImage: '/images/categories/beauty.jpeg',        to: '/category/health-beauty' },
  { id: 'toys',        label: 'Toys',        dbSlug: 'toys',               fallbackImage: '/images/categories/toys-games.jpeg',    to: '/category/toys' },
];

export default function MobileCategoryShortcuts() {
  const categoryImages = useCategoryImages();

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
          {CATEGORIES.map(({ id, label, dbSlug, fallbackImage, to }) => {
            // Use the live product image if available, otherwise fall back to static
            const imageSrc = categoryImages[dbSlug] ?? fallbackImage;

            return (
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
                    src={imageSrc}
                    alt={label}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      // If the DB image fails, fall back to the static placeholder
                      if (img.src !== fallbackImage) {
                        img.src = fallbackImage;
                      }
                    }}
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
            );
          })}
          {/* Trailing spacer */}
          <div style={{ minWidth: 'var(--mob-side, 16px)', flexShrink: 0 }} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
