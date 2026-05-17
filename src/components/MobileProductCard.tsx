/**
 * MobileProductCard
 *
 * Light-card product card for horizontal-scroll sections on the mobile APK
 * home screen. Matches the reference screenshot design: off-white card,
 * dark title + price, gold star rating. Wraps content in a Link to /product/:id.
 */

import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import { productThumbnail } from '@/lib/imageOptimization';

interface MobileProductCardProps {
  id: string;
  title: string;
  price: number;
  distance?: string;
  sellerName?: string;
  sellerAvatar?: string;
  rating?: number;
  image?: string;
  onFavorite?: () => void;
}

export default function MobileProductCard({
  id,
  title,
  price,
  rating,
  image,
}: MobileProductCardProps) {
  return (
    <Link
      to={`/product/${id}`}
      className="flex-shrink-0 snap-start active:scale-95 transition-transform"
      style={{ width: 'clamp(148px, 42vw, 180px)', display: 'block', textDecoration: 'none' }}
      aria-label={title}
    >
      <div
        style={{
          width: '100%',
          background: 'rgba(239,239,239,1)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* ── Image area ── */}
        <div
          style={{
            aspectRatio: '1 / 1',
            overflow: 'hidden',
            background: 'rgba(224,224,224,1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {image ? (
            <img
              src={productThumbnail(image)}
              alt={title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const placeholder = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
          ) : null}
          {/* Fallback placeholder — shown when no image prop or image fails to load */}
          <div
            aria-hidden="true"
            style={{
              display: image ? 'none' : 'flex',
              position: 'absolute',
              inset: 0,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(232,224,208,1)',
              gap: '4px',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="rgba(200,169,106,1)" opacity="0.25" />
              <path d="M3 16l5-5 4 4 3-3 6 6" stroke="rgba(200,169,106,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="rgba(200,169,106,1)" opacity="0.6" />
            </svg>
            <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.03em' }} className="text-muted-foreground">No Image</span>
          </div>
        </div>

        {/* ── Info area ── */}
        <div style={{ padding: '10px 12px 12px' }}>
          {/* Title */}
          <p
            className="line-clamp-2"
            style={{
              fontSize: 'clamp(11px, 3vw, 13px)',
              fontWeight: 600,
              color: 'rgba(17,17,17,1)',
              margin: 0,
              lineHeight: 1.35,
            }}
          >
            {title}
          </p>

          {/* Price */}
          <p
            style={{
              fontSize: 'clamp(13px, 3.8vw, 15px)',
              fontWeight: 700,
              color: 'rgba(17,17,17,1)',
              margin: '5px 0 0',
            }}
          >
            {formatPrice(price)}
          </p>

          {/* Rating */}
          {rating != null && rating > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                marginTop: 5,
              }}
            >
              <Star
                style={{ width: 11, height: 11 }}
                className="text-primary fill-primary"
                aria-hidden="true"
              />
              <span style={{ fontSize: 'clamp(10px, 2.8vw, 11px)', fontWeight: 500 }} className="text-muted-foreground">
                {rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
