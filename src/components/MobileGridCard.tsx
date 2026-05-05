/**
 * MobileGridCard — minimal 2-column grid card for the mobile home feed.
 * Shows: image (square) + title + price + optional location. No badges/ratings.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/formatPrice';
import { productThumbnail } from '@/lib/imageOptimization';
import ProductImagePlaceholder from '@/components/ProductImagePlaceholder';

interface MobileGridCardProps {
  id: string;
  title: string;
  price: number;
  image?: string;
  location?: string;
  /** Set to true for above-the-fold cards to avoid lazy-loading the LCP image. */
  priority?: boolean;
}

export default function MobileGridCard({ id, title, price, image, location, priority = false }: MobileGridCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link
      to={`/product/${id}`}
      style={{ display: 'block', textDecoration: 'none' }}
      aria-label={title}
    >
      {/* Image */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.05)',
          position: 'relative',
        }}
      >
        {image && !imgFailed ? (
          <img
            src={productThumbnail(image)}
            alt={title}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ProductImagePlaceholder theme="dark" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ paddingTop: 8, paddingBottom: 4 }}>
        <p
          style={{
            fontSize: 'clamp(12px, 3.2vw, 13px)',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.90)',
            margin: 0,
            lineHeight: 1.35,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: 'clamp(13px, 3.8vw, 15px)',
            fontWeight: 700,
            color: '#FFFFFF',
            margin: '4px 0 0',
          }}
        >
          {formatPrice(price)}
        </p>
        {location && (
          <p
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.50)',
              margin: '3px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {location}
          </p>
        )}
      </div>
    </Link>
  );
}
