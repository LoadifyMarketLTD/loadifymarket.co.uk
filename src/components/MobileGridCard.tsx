/**
 * MobileGridCard — compact two-column native marketplace card.
 * Product-first density, restrained metadata and large tap targets.
 */

import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
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
    className="absolute inset-0 flex items-center justify-center bg-[#EEF1F5]"
  >
    <ProductImagePlaceholder theme="light" />
  </div>
);

export default function MobileGridCard({ id, title, price, image, location, priority = false }: MobileGridCardProps) {
  return (
    <Link
      to={`/product/${id}`}
      className="block min-w-0 overflow-hidden rounded-[16px] border border-[#0A234F]/[0.08] bg-white no-underline shadow-[0_6px_20px_rgba(10,35,79,0.06)] active:scale-[0.99]"
      aria-label={`${title}, ${formatPrice(price)}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#EEF1F5]">
        <NativeImg
          src={image ? productThumbnail(image) : undefined}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding={priority ? 'auto' : 'async'}
          className="block h-full w-full object-cover"
          fallback={lightPlaceholder}
        />
        <span
          className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#0A234F] shadow-sm"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          {formatPrice(price)}
        </span>
      </div>

      <div className="px-2.5 pb-2.5 pt-2">
        <p
          className="m-0 text-[12px] font-semibold leading-[1.35] text-[#26354A]"
          style={{
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 32,
          }}
        >
          {title}
        </p>
        {location && (
          <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] font-medium text-[#7A8493]">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
