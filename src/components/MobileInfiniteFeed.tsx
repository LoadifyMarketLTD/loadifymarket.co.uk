/**
 * MobileInfiniteFeed — 2-column product grid with infinite scroll.
 *
 * Pixel-perfect card design matching the reference image:
 *   - Dark card (#1A1A1F), rounded-2xl, drop shadow
 *   - Image fills top (square), with:
 *       • heart icon overlay (top-right)
 *       • location distance pill overlay (bottom-left)
 *   - Below image: title (white), price (white bold)
 *   - Bottom row: seller initial avatar + seller name + ★ rating
 * - IntersectionObserver infinite scroll, no sections/titles
 */

import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart, Star } from 'lucide-react';

import { useMobileInfiniteFeed } from '@/hooks/useMobileInfiniteFeed';
import { formatPrice } from '@/lib/formatPrice';
import type { Product } from '@/components/catalog/ProductCard';

// ── Deterministic avatar colour from seller name ───────────────────────────────

const AVATAR_COLOURS = [
  '#C8860A', '#2563EB', '#7C3AED', '#059669', '#DC2626',
  '#0891B2', '#9333EA', '#D97706', '#16A34A', '#EA580C',
];
function avatarColour(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

// ── Individual product card ────────────────────────────────────────────────────

function ProductGridCard({ product }: { product: Product }) {
  const initials = product.seller
    ? product.seller.trim().slice(0, 1).toUpperCase()
    : '?';
  const bgColour = avatarColour(product.seller ?? '');

  return (
    <Link
      to={`/product/${product.id}`}
      className="block active:scale-95 transition-transform"
      style={{
        backgroundColor: '#1A1A1F',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        textDecoration: 'none',
      }}
      aria-label={product.title}
    >
      {/* ── Product image with overlays ───────────────────────────────── */}
      <div style={{ position: 'relative', aspectRatio: '1 / 1', backgroundColor: '#0D0D12', overflow: 'hidden' }}>
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />

        {/* Heart icon — top right */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heart style={{ width: '14px', height: '14px', color: '#FFFFFF' }} strokeWidth={1.8} />
        </div>

        {/* Location pill — bottom left */}
        {product.location && (
          <div
            aria-label={`Location: ${product.location}`}
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              backgroundColor: 'rgba(0,0,0,0.60)',
              borderRadius: '8px',
              padding: '3px 7px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <MapPin style={{ width: '9px', height: '9px', color: '#FFFFFF', flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: '#FFFFFF', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {product.location}
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 10px 10px 10px' }}>

        {/* Title */}
        <p
          className="line-clamp-2"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#FFFFFF',
            lineHeight: 1.35,
            marginBottom: '4px',
          }}
        >
          {product.title}
        </p>

        {/* Price — white, bold */}
        <p
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1,
            marginBottom: '8px',
          }}
        >
          {formatPrice(product.price)}
        </p>

        {/* Seller row: avatar + name + star + rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Initial avatar */}
          <div
            aria-hidden="true"
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: bgColour,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#FFFFFF' }}>{initials}</span>
          </div>

          {/* Seller name */}
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.55)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {product.seller}
          </span>

          {/* Star + rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            <Star style={{ width: '11px', height: '11px', color: '#F5B942', fill: '#F5B942' }} aria-hidden="true" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
              {product.rating > 0 ? product.rating.toFixed(1) : '—'}
            </span>
          </div>
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
      style={{ backgroundColor: '#1A1A1F', aspectRatio: '3/4' }}
      aria-hidden="true"
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MobileInfiniteFeed() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileInfiniteFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (loading) {
    return (
      <div style={{ padding: '12px 16px 0' }}>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div
        style={{
          margin: '12px 16px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '40px 0',
          backgroundColor: '#1A1A1F',
          borderRadius: '16px',
        }}
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
    <div style={{ padding: '12px 16px 0' }}>
      <div className="grid grid-cols-2 gap-3">
        {products.map((p: Product) => (
          <ProductGridCard key={p.id} product={p} />
        ))}
        {loadingMore && Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      <div ref={sentinelRef} aria-hidden="true" style={{ height: '1px', marginTop: '48px' }} />

      {!hasMore && products.length > 0 && (
        <p
          style={{
            textAlign: 'center',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.22)',
            paddingBottom: '16px',
          }}
        >
          You've seen all listings
        </p>
      )}
    </div>
  );
}
