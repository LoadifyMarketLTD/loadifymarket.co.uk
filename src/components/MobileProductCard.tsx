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
          background: '#EFEFEF',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* ── Image area ── */}
        <div
          style={{
            aspectRatio: '1 / 1',
            overflow: 'hidden',
            background: '#E0E0E0',
          }}
        >
          {image ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
        </div>

        {/* ── Info area ── */}
        <div style={{ padding: '10px 12px 12px' }}>
          {/* Title */}
          <p
            className="line-clamp-2"
            style={{
              fontSize: 'clamp(11px, 3vw, 13px)',
              fontWeight: 600,
              color: '#111111',
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
              color: '#111111',
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
                style={{ width: 11, height: 11, color: '#F2B84B', fill: '#F2B84B' }}
                aria-hidden="true"
              />
              <span style={{ fontSize: 'clamp(10px, 2.8vw, 11px)', color: '#555555', fontWeight: 500 }}>
                {rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
