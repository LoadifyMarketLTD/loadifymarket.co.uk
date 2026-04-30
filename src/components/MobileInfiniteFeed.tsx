/**
 * MobileInfiniteFeed — 2-column product grid with infinite scroll.
 *
 * - No section titles, no "See all" links, no grouping
 * - IntersectionObserver sentinel at bottom triggers loadMore()
 * - Skeleton placeholders during initial load and paginating
 */

import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck } from 'lucide-react';

import { useMobileInfiniteFeed } from '@/hooks/useMobileInfiniteFeed';
import { formatPrice } from '@/lib/formatPrice';
import type { Product } from '@/components/catalog/ProductCard';

// ── Individual product card ────────────────────────────────────────────────────

function ProductGridCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="block rounded-2xl overflow-hidden active:scale-95 transition-transform"
      style={{
        backgroundColor: '#12121A',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      aria-label={product.title}
    >
      {/* Square product image */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '1 / 1', backgroundColor: '#0D0D12' }}
      >
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {product.condition === 'New' && (
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              fontSize: '9px',
              fontWeight: 700,
              background: 'rgba(16,185,129,0.9)',
              color: '#fff',
              padding: '2px 7px',
              borderRadius: '99px',
            }}
          >
            NEW
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '10px' }}>
        <p
          className="line-clamp-2"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#FFFFFF',
            lineHeight: 1.35,
            marginBottom: '4px',
          }}
        >
          {product.title}
        </p>

        <p
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#F5B942',
            lineHeight: 1,
            marginBottom: '6px',
          }}
        >
          {formatPrice(product.price)}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {product.location && (
            <>
              <MapPin
                style={{ width: '10px', height: '10px', color: 'rgba(255,255,255,0.30)', flexShrink: 0 }}
                aria-hidden="true"
              />
              <span
                style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.30)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {product.location}
              </span>
            </>
          )}
          {product.sellerVerified && (
            <BadgeCheck
              style={{ width: '12px', height: '12px', color: '#F5B942', flexShrink: 0, marginLeft: 'auto' }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton placeholder ───────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl animate-pulse"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)', aspectRatio: '3/4' }}
      aria-hidden="true"
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MobileInfiniteFeed() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileInfiniteFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Wire up IntersectionObserver to the bottom sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (loading) {
    return (
      <div className="px-4 pt-3 grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div
        className="mx-4 mt-3 flex flex-col items-center gap-3 py-10 rounded-2xl"
        style={{ border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#12121A' }}
      >
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)' }}>No products listed yet</p>
        <Link
          to="/catalog"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#F5B942',
            border: '1px solid rgba(245,185,66,0.3)',
            padding: '7px 18px',
            borderRadius: '10px',
            textDecoration: 'none',
          }}
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3">
      <div className="grid grid-cols-2 gap-3">
        {products.map((p: Product) => (
          <ProductGridCard key={p.id} product={p} />
        ))}

        {/* Skeleton rows while loading more */}
        {loadingMore &&
          Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      {/* IntersectionObserver sentinel */}
      <div ref={sentinelRef} aria-hidden="true" style={{ height: '1px', marginTop: '48px' }} />

      {!hasMore && products.length > 0 && (
        <p
          style={{
            textAlign: 'center',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.25)',
            paddingBottom: '12px',
          }}
        >
          You've seen all listings
        </p>
      )}
    </div>
  );
}
