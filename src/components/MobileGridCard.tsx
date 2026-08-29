/**
 * MobileGridCard — premium light 2-column grid card for the mobile home feed.
 * Shows: image + title + price + optional location. No badges/ratings.
 */

import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/formatPrice';
import { productThumbnail } from '@/lib/imageOptimization';
import NativeImg from '@/components/NativeImg';
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

const lightPlaceholder = (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F1EFEA',
    }}
  >
    <ProductImagePlaceholder theme="light" />
  </div>
);

export default function MobileGridCard({ id, title, price, image, location, priority = false }: MobileGridCardProps) {
  return (
    <Link
      to={`/product/${id}`}
      className="block overflow-hidden rounded-[12px] border border-[#0A234F]/[0.08] bg-white shadow-[0_5px_16px_rgba(15,23,42,0.035)]"
      style={{ textDecoration: 'none' }}
      aria-label={title}
    >
      <div
        className="bg-[#F1EFEA]"
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <NativeImg
          src={image ? productThumbnail(image) : undefined}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding={priority ? 'auto' : 'async'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          fallback={lightPlaceholder}
        />
      </div>

      <div style={{ padding: '10px 11px 11px' }}>
        <p
          className="text-[#24364F]"
          style={{
            fontSize: 'clamp(12px, 3.2vw, 13px)',
            fontWeight: 500,
            margin: 0,
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: '2.8em',
          }}
        >
          {title}
        </p>
        <p
          className="text-[#0A234F]"
          style={{
            fontSize: 'clamp(14px, 3.8vw, 16px)',
            fontWeight: 700,
            margin: '8px 0 0',
            paddingTop: 8,
            borderTop: '1px solid rgba(10,35,79,0.07)',
          }}
        >
          {formatPrice(price)}
        </p>
        {location && (
          <p
            className="text-[#7A8492]"
            style={{
              fontSize: 10.5,
              margin: '4px 0 0',
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
