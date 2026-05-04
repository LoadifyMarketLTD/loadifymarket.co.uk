/**
 * MobileCategoryShortcuts — horizontal scroll category row with section header.
 *
 * Premium white-circle design: each category is a 68px white circle with a
 * centered product image (object-fit: contain, 65% of the circle) and a
 * text label below.
 *
 * Image priority order:
 *  1. Real product image fetched from the database (useCategoryImages hook)
 *  2. Static PNG from /categories/ directory (user-provided product cutouts)
 *  3. Unsplash product-photo URL as reliable network fallback
 */

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCategoryImages } from '@/hooks/useCategoryImages';

interface Category {
  id: string;
  label: string;
  /** DB category slug used to look up a real product image */
  dbSlug: string;
  /**
   * Path to a user-provided product-cutout PNG (place in /public/categories/).
   * Used when the DB has no products for this category.
   */
  staticImage: string;
  /**
   * Reliable Unsplash product-photo URL — last-resort fallback if both the DB
   * image and the local PNG are unavailable.
   */
  unsplashFallback: string;
  to: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'electronics',
    label: 'Electronics',
    dbSlug: 'electrical',
    staticImage: '/categories/electronics.png',
    unsplashFallback: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80',
    to: '/category/electrical',
  },
  {
    id: 'fashion',
    label: 'Fashion',
    dbSlug: 'wholesale-clothing',
    staticImage: '/categories/fashion.png',
    unsplashFallback: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80',
    to: '/category/wholesale-clothing',
  },
  {
    id: 'home',
    label: 'Home',
    dbSlug: 'homeware',
    staticImage: '/categories/home.png',
    unsplashFallback: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80',
    to: '/category/homeware',
  },
  {
    id: 'collectibles',
    label: 'Collectibles',
    // The platform's closest DB category slug is 'toys' (covers figures, models,
    // board games etc.).  Update this if a dedicated 'collectibles' category is
    // added to the database.
    dbSlug: 'toys',
    staticImage: '/categories/collectibles.png',
    unsplashFallback: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=300&q=80',
    to: '/category/toys',
  },
  {
    id: 'sports',
    label: 'Sports',
    dbSlug: 'sports-fitness',
    staticImage: '/categories/sports.png',
    unsplashFallback: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=300&q=80',
    to: '/category/sports-fitness',
  },
  {
    id: 'beauty',
    label: 'Beauty',
    dbSlug: 'health-beauty',
    staticImage: '/categories/beauty.png',
    unsplashFallback: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=300&q=80',
    to: '/category/health-beauty',
  },
];

/** Builds a three-level onError handler: DB image → static PNG → Unsplash */
function makeErrorHandler(staticImage: string, unsplashFallback: string) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Already at last resort — stop to avoid an infinite loop
    if (img.src === unsplashFallback) {
      img.onerror = null;
      return;
    }
    // If the static PNG also fails, go to Unsplash
    if (img.src.endsWith(staticImage) || img.src.includes('/categories/')) {
      img.onerror = null;
      img.src = unsplashFallback;
      return;
    }
    // DB image failed — try static PNG first
    img.src = staticImage;
  };
}

export default function MobileCategoryShortcuts() {
  const dbImages = useCategoryImages();
  // Track whether we've resolved each category's DB image to avoid re-rendering flicker
  const resolvedRef = useRef<Record<string, string>>({});

  return (
    <section aria-label="Browse by category" style={{ paddingTop: 20 }}>
      {/* ── Section header ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between"
        style={{ paddingInline: 'var(--mob-side, 16px)', marginBottom: 14 }}
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

      {/* ── Scrollable row ─────────────────────────────────────────── */}
      <div
        className="overflow-x-auto scrollbar-hide"
        style={{
          paddingLeft: 'var(--mob-side, 16px)',
          scrollPaddingInlineStart: 'var(--mob-side, 16px)',
          scrollPaddingInlineEnd: 'var(--mob-side, 16px)',
        }}
      >
        <div style={{ display: 'flex', gap: 16, width: 'max-content' }}>
          {CATEGORIES.map(({ id, label, dbSlug, staticImage, unsplashFallback, to }) => {
            // DB image takes priority; fall back to static PNG path
            const resolved = resolvedRef.current;
            if (dbImages[dbSlug] && !resolved[id]) resolved[id] = dbImages[dbSlug];
            const imageSrc = resolved[id] ?? dbImages[dbSlug] ?? staticImage;

            return (
              <Link
                key={id}
                to={to}
                className="flex flex-col items-center active:scale-95 transition-transform"
                style={{
                  gap: 8,
                  textDecoration: 'none',
                  // Minimum 48px touch target height satisfied by 68px circle + 8px gap + label
                }}
                aria-label={`Browse ${label}`}
              >
                {/* ── White circle ───────────────────────────────── */}
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={imageSrc}
                    alt={label}
                    loading="lazy"
                    style={{
                      width: '65%',
                      height: '65%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                    onError={makeErrorHandler(staticImage, unsplashFallback)}
                  />
                </div>

                {/* ── Label ──────────────────────────────────────── */}
                <span
                  style={{
                    fontSize: 'clamp(11px, 2.9vw, 13px)',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.80)',
                    lineHeight: 1,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
          {/* Trailing spacer so last card clears the container edge */}
          <div style={{ minWidth: 'var(--mob-side, 16px)', flexShrink: 0 }} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
