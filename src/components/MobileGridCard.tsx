/**
 * MobileGridCard — minimal 2-column grid card for the mobile home feed.
 * Shows: image (square) + title + price + optional location. No badges/ratings.
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
    }}
  >
    <ProductImagePlaceholder theme="light" />
  </div>
);

export default function MobileGridCard({ id, title, price, image, location, priority = false }: MobileGridCardProps) {
  return (
    <Link
      to={`/product/${id}`}
      className="block rounded-2xl border border-[#0A234F]/10 bg-white p-2.5 shadow-[0_12px_28px_rgba(10,35,79,0.14)]"
      style={{ textDecoration: 'none' }}
      aria-label={title}
    >
      <div
        className="bg-[#F2F4F7]"
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 12,
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

      <div style={{ paddingTop: 8, paddingBottom: 4 }}>
        <p
          className="text-[#0A234F]/90"
          style={{
            fontSize: 'clamp(12px, 3.2vw, 13px)',
            fontWeight: 500,
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
          className="text-[#1D57D8]"
          style={{
            fontSize: 'clamp(13px, 3.8vw, 15px)',
            fontWeight: 700,
            margin: '4px 0 0',
          }}
        >
          {formatPrice(price)}
        </p>
        {location && (
          <p
            className="text-[#0A234F]/52"
            style={{
              fontSize: 11,
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
