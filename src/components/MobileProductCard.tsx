/**
 * MobileProductCard
 *
 * Dark premium 168px-wide product card for horizontal-scroll sections on the
 * mobile APK home screen. Wraps content in a Link to /product/:id.
 */

import { Link } from 'react-router-dom';
import { Heart, MapPin, Star } from 'lucide-react';
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
  distance,
  sellerName,
  rating,
  image,
  onFavorite,
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
          background: '#111216',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* ── Image area — uses aspect-ratio so height scales with card width ── */}
        <div
          style={{
            aspectRatio: '16 / 11',
            position: 'relative',
            overflow: 'hidden',
            background: '#1C1C24',
          }}
        >
          {image ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}

          {/* Heart / favourite button — 36×36 touch target, 16px visual icon */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite?.();
            }}
            aria-label="Save to wishlist"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 36,
              height: 36,
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Heart
              style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.7)' }}
              aria-hidden="true"
            />
          </button>

          {/* Distance badge */}
          {distance && (
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                background: 'rgba(0,0,0,0.6)',
                borderRadius: 9999,
                padding: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MapPin
                style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.8)' }}
                aria-hidden="true"
              />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
                {distance}
              </span>
            </div>
          )}
        </div>

        {/* ── Info area ── */}
        <div style={{ padding: '10px 12px 12px' }}>
          {/* Title */}
          <p
            style={{
              fontSize: 'clamp(11px, 3vw, 13px)',
              fontWeight: 600,
              color: '#FFFFFF',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </p>

          {/* Price */}
          <p
            style={{
              fontSize: 'clamp(14px, 4vw, 17px)',
              fontWeight: 700,
              color: '#F2B84B',
              margin: '4px 0 0',
            }}
          >
            {formatPrice(price)}
          </p>

          {/* Bottom row: seller + rating */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
            }}
          >
            {/* Seller name */}
            {sellerName && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  overflow: 'hidden',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {/* Avatar placeholder circle */}
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 'clamp(9px, 2.5vw, 11px)',
                    color: '#A6A6A6',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sellerName}
                </span>
              </div>
            )}

            {/* Rating */}
            {rating != null && rating > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexShrink: 0,
                }}
              >
                <Star
                  style={{
                    width: 12,
                    height: 12,
                    color: '#F2B84B',
                    fill: '#F2B84B',
                  }}
                  aria-hidden="true"
                />
                <span style={{ fontSize: 'clamp(10px, 2.8vw, 12px)', color: '#A6A6A6' }}>
                  {rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
