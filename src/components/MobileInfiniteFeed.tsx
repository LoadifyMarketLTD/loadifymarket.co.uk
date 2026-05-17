/**
 * MobileInfiniteFeed — 2-column product grid with infinite scroll.
 *
 * Mobile card design for the dark design system:
 *   - Surface card, rounded-2xl
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
      className="block active:scale-95 transition-transform bg-surface rounded-2xl overflow-hidden no-underline"
      aria-label={product.title}
    >
      {/* ── Product image ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-center overflow-hidden bg-border/40 aspect-square">
        <NativeImg
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover block"
          fallback={<ProductImagePlaceholder theme="light" />}
        />
      </div>

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div className="p-2.5">

        {/* Title */}
        <p className="line-clamp-2 text-foreground leading-[1.35] text-[clamp(11px,3vw,13px)] font-semibold mb-1">
          {product.title}
        </p>

        {/* Price */}
        <p className={`text-foreground leading-none text-[clamp(13px,3.8vw,15px)] font-bold ${product.rating > 0 ? 'mb-1.5' : 'mb-0'}`}>
          {formatPrice(product.price)}
        </p>

        {/* Star + rating */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-[11px] h-[11px] text-primary fill-primary" aria-hidden="true" />
            <span className="text-muted-foreground text-[clamp(9px,2.5vw,11px)] font-medium">
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
      className="rounded-2xl animate-pulse bg-border/40"
      style={{ aspectRatio: '3 / 4' }}
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
      <div className="px-[var(--mob-side,16px)] pt-3">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="mx-[var(--mob-side,16px)] mt-3 flex flex-col items-center gap-3 py-10 bg-surface rounded-2xl">
        <p className="text-sm text-white/75">No products listed yet</p>
        <Link
          to="/catalog"
          className="text-xs font-semibold border border-primary/30 px-[18px] py-[7px] rounded-[10px] no-underline text-primary hover:bg-primary/10 transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[var(--mob-side,16px)] pt-3 pb-[calc(var(--mob-nav-h,68px)+env(safe-area-inset-bottom,0px)+16px)]">
      <div className="grid grid-cols-2 gap-3">
        {products.map((p: Product) => (
          <ProductGridCard key={p.id} product={p} />
        ))}
        {loadingMore && Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      <div ref={sentinelRef} aria-hidden="true" className="h-px mt-12" />

      {!hasMore && products.length > 0 && (
        <p className="text-center text-[11px] text-white/55 pb-4">
          You've seen all listings
        </p>
      )}
    </div>
  );
}
