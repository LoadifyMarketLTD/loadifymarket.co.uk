import { Link } from 'react-router-dom';
import { Heart, Package, Truck, Sparkles, Eye, MapPin, Star, CheckCircle2, Tag } from 'lucide-react';
import { useWishlist } from '../lib/useWishlist';
import { getCategoryFallbackImage } from '../lib/categoryImages';
import { formatPrice } from '../lib/formatPrice';
import VerificationBadge from './VerificationBadge';
import RoleBadge from './RoleBadge';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product.id);
  };

  const getTypeInfo = () => {
    switch (product.type) {
      case 'logistics': return { icon: Truck, label: 'Logistics', color: 'bg-slate-600' };
      case 'pallet':    return { icon: Package, label: 'Pallet Deal', color: 'bg-[#1E3A5F]' };
      case 'lot':       return { icon: Package, label: 'Bulk Lot', color: 'bg-[#1E3A5F]' };
      case 'wholesale': return { icon: Package, label: 'Wholesale', color: 'bg-[#1E3A5F]' };
      case 'clearance': return { icon: Tag, label: 'Clearance', color: 'bg-red-600' };
      case 'handmade':  return { icon: Sparkles, label: 'Handmade', color: 'bg-fuchsia-600' };
      case 'retail':    return { icon: Package, label: 'Single Item', color: 'bg-emerald-600' };
      case 'product':   return { icon: Package, label: 'Single Item', color: 'bg-emerald-600' };
      default:          return { icon: Package, label: 'Product', color: 'bg-gray-500' };
    }
  };

  const typeInfo = getTypeInfo();
  const TypeIcon = typeInfo.icon;
  const discount = (product as unknown as { discount?: number }).discount;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 group flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={
            product.images && product.images.length > 0
              ? product.images[0]
              : getCategoryFallbackImage(product)
          }
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
        />

        {/* Wishlist button */}
        <button
          type="button"
          onClick={handleWishlistClick}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-sm transition-all"
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`h-3.5 w-3.5 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
          />
        </button>

        {/* Type badge — always shown for non-ambiguous types */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className={`inline-flex items-center gap-1 ${typeInfo.color} text-white text-[10px] font-semibold px-2 py-0.5 rounded`}>
            <TypeIcon className="w-3 h-3" />
            {typeInfo.label}
          </span>
        </div>

        {/* Discount badge */}
        {typeof discount === 'number' && discount > 0 && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 bg-[#C2410C] text-white text-[10px] font-bold px-2 py-0.5 rounded">
              <Tag className="w-2.5 h-2.5" />
              -{discount}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        {/* Seller name */}
        {product.seller && (
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 min-w-0">
              {product.seller.storeSlug ? (
                <Link
                  to={`/seller/${product.seller.storeSlug}`}
                  className="text-xs text-gray-400 hover:text-[#1E3A5F] transition-colors truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {product.seller.businessName || 'Marketplace Seller'}
                </Link>
              ) : (
                <span className="text-xs text-gray-400 truncate">
                  {product.seller.businessName || 'Marketplace Seller'}
                </span>
              )}
              {product.seller.location && (
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5 flex-shrink-0">
                  <MapPin className="w-2.5 h-2.5" />
                  {product.seller.location}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {product.seller.marketplaceRole && (
                <RoleBadge role={product.seller.marketplaceRole} size="sm" />
              )}
              {product.seller.isApproved !== undefined && (
                <VerificationBadge isVerified={product.seller.isApproved} size="sm" showLabel={false} />
              )}
            </div>
          </div>
        )}

        {/* Trust indicators */}
        {product.seller && (product.seller.isApproved || (typeof product.seller.rating === 'number' && product.seller.rating > 0)) && (
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            {typeof product.seller.rating === 'number' && product.seller.rating > 0 && (
              <span className="flex items-center gap-0.5 text-yellow-500">
                <Star className="w-3 h-3" />
                {product.seller.rating.toFixed(1)}
              </span>
            )}
            {product.seller.isApproved && (
              <span className="flex items-center gap-0.5 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 leading-tight min-h-[2.5rem]">
          {product.title}
        </h3>

        {/* Short description */}
        {product.description && (
          <p className="text-xs text-gray-600 line-clamp-1 mb-2 leading-snug">
            {product.description}
          </p>
        )}

        {/* Price */}
        <p className="text-lg font-bold text-[#1E3A5F] mb-2">{formatPrice(product.price)}</p>

        {/* Stock / condition */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2.5">
          <span className="capitalize">{product.condition}</span>
          <div className="flex items-center gap-2">
            {product.views > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                {product.views}
              </span>
            )}
            <span>{product.stockQuantity} in stock</span>
          </div>
        </div>

        {/* CTA button */}
        <div className="mt-auto">
          <Link
            to={`/product/${product.id}`}
            className="block w-full text-center bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold text-sm py-2 rounded transition-colors"
            aria-label={`View details for ${product.title}`}
          >
            View Product
          </Link>
        </div>
      </div>
    </div>
  );
}
