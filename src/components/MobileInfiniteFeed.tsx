/**
 * MobileInfiniteFeed — 2-column product grid with infinite scroll.
 *
 * Light card design matching the reference screenshot:
 *   - Off-white card (#EFEFEF), rounded-2xl
 *   - Image fills top (square)
 *   - Below image: dark title, dark bold price, gold ★ + grey rating
 *   - Bottom row: seller initial avatar + seller name
 * - IntersectionObserver infinite scroll, no sections/titles
 */

import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

import { useMobileInfiniteFeed } from '@/hooks/useMobileInfiniteFeed';
import { formatPrice } from '@/lib/formatPrice';
import type { Product } from '@/components/catalog/ProductCard';
import NativeImg from '@/components/NativeImg';
import ProductImagePlaceholder from '@/components/ProductImagePlaceholder';

// ── Individual product card ────────────────────────────────────────────────────

function ProductGridCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="block active:scale-95 transition-transform"
      style={{
        backgroundColor: '#EFEFEF',
        borderRadius: '16px',
        overflow: 'hidden',
        textDecoration: 'none',
      }}
      aria-label={product.title}
    >
      {/* ── Product image ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: '1 / 1', backgroundColor: '#E0E0E0' }}
      >
        <NativeImg
          src={product.image}
          alt={product.title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          fallback={<ProductImagePlaceholder theme="light" />}
        />
      </div>

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 10px 10px 10px' }}>

        {/* Title */}
        <p
          className="line-clamp-2"
          style={{
            fontSize: 'clamp(11px, 3vw, 13px)',
            fontWeight: 600,
            color: '#111111',
            lineHeight: 1.35,
            marginBottom: '4px',
          }}
        >
          {product.title}
        </p>

        {/* Price */}
        <p
          style={{
            fontSize: 'clamp(13px, 3.8vw, 15px)',
            fontWeight: 700,
            color: '#111111',
            lineHeight: 1,
            marginBottom: product.rating > 0 ? '6px' : '0',
          }}
        >
          {formatPrice(product.price)}
        </p>

        {/* Star + rating */}
        {product.rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Star style={{ width: '11px', height: '11px', color: '#D4AF37', fill: '#D4AF37' }} aria-hidden="true" />
            <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', fontWeight: 500, color: '#555555' }}>
              {product.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Skeleton placeholder ───────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl animate-pulse"
      style={{ backgroundColor: '#E0E0E0', aspectRatio: '3/4' }}
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
      <div style={{ padding: '12px var(--mob-side, 16px) 0' }}>
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
          margin: '12px var(--mob-side, 16px) 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '40px 0',
          backgroundColor: '#1A1A1F',
          borderRadius: '16px',
        }}
      >
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>No products listed yet</p>
        <Link
          to="/catalog"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#D4AF37',
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
    <div
      style={{
        padding: '12px var(--mob-side, 16px) 0',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px) + 16px)',
      }}
    >
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
            color: 'rgba(255,255,255,0.55)',
            paddingBottom: '16px',
          }}
        >
          You've seen all listings
        </p>
      )}
    </div>
  );
}
