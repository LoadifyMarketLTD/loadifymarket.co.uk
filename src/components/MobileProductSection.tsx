/**
 * MobileProductSection
 *
 * Mobile-only product display for the home screen (hidden md:block wrapper in parent).
 * Renders two product rows using data from useMobileProducts:
 *
 *   1. "Trending"     — horizontal snap-scroll of compact cards (ordered by views)
 *   2. "New listings" — 2-column grid of compact cards (ordered by createdAt)
 *
 * Uses real Supabase products. Shows an empty state if no products exist.
 * Product images fall back gracefully on error.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useMobileProducts } from '@/hooks/useMobileProducts';
import { formatPrice } from '@/lib/formatPrice';
import type { Product } from '@/components/catalog/ProductCard';

// ── Compact product card (horizontal scroll) ──────────────────────────────────

function MobileProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="flex-shrink-0 w-[148px] snap-start rounded-2xl overflow-hidden active:scale-95 transition-transform"
      style={{ backgroundColor: '#EFEFEF', textDecoration: 'none' }}
      aria-label={product.title}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: '#E0E0E0' }}>
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            const el = e.currentTarget;
            el.style.display = 'none';
          }}
        />
        {product.condition === 'New' && (
          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-emerald-500/90 text-white px-1.5 py-0.5 rounded-full">
            NEW
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-[11px] font-semibold leading-snug line-clamp-2" style={{ color: '#111111' }}>
          {product.title}
        </p>
        <p className="text-[13px] font-bold leading-none" style={{ color: '#111111' }}>
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}

// ── Compact product card (2-column grid) ──────────────────────────────────────

function MobileListingCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="rounded-2xl overflow-hidden active:scale-95 transition-transform"
      style={{ backgroundColor: '#EFEFEF', textDecoration: 'none' }}
      aria-label={product.title}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: '#E0E0E0' }}>
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            const el = e.currentTarget;
            el.style.display = 'none';
          }}
        />
        {product.condition === 'New' && (
          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-emerald-500/90 text-white px-1.5 py-0.5 rounded-full">
            NEW
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-[11px] font-semibold leading-snug line-clamp-2" style={{ color: '#111111' }}>
          {product.title}
        </p>
        <p className="text-sm font-bold leading-none" style={{ color: '#111111' }}>
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}

// ── Section header row ────────────────────────────────────────────────────────

function SectionHeader({ title, viewAllTo }: { title: string; viewAllTo: string }) {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <h2 className="text-[15px] font-bold text-white tracking-tight">{title}</h2>
      <Link
        to={viewAllTo}
        className="flex items-center gap-1 text-[11px] font-semibold text-[#FBBF24] hover:text-[#D8AE57] transition-colors"
      >
        View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  );
}

// ── Skeleton placeholders (shown while loading) ───────────────────────────────

function SkeletonCard({ wide }: { wide?: boolean }) {
  return (
    <div
      className={`flex-shrink-0 rounded-2xl bg-white/[0.04] animate-pulse ${wide ? 'w-full' : 'w-[148px] snap-start'}`}
      style={{ aspectRatio: wide ? '4/3' : '1/1.5' }}
    />
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mx-4 my-2 flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border border-white/[0.06] bg-[#111827]">
      <p className="text-sm text-white/75">No products available yet</p>
      <Link
        to="/catalog"
        className="text-xs font-semibold text-[#FBBF24] border border-[#FBBF24]/30 px-4 py-2 rounded-lg hover:bg-[#FBBF24]/10 transition-colors"
      >
        Browse Marketplace
      </Link>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MobileProductSection() {
  const { trending, latest, loading } = useMobileProducts();

  return (
    <div className="pb-2">
      {/* ── Trending ── */}
      <section aria-label="Trending products" className="pt-5">
        <SectionHeader title="Trending" viewAllTo="/catalog?filter=best-sellers" />

        {loading ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-none px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : trending.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory px-4 pb-1">
            {trending.map((p: Product) => (
              <MobileProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── New listings ── */}
      <section aria-label="Latest listings" className="pt-5">
        <SectionHeader title="New listings" viewAllTo="/catalog?filter=latest" />

        {loading ? (
          <div className="grid grid-cols-2 gap-3 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} wide />
            ))}
          </div>
        ) : latest.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4">
            {latest.map((p: Product) => (
              <MobileListingCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
