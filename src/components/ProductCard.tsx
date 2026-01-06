import { Link } from 'react-router-dom';
import { Heart, Package, Truck, Sparkles, ArrowRight } from 'lucide-react';
import { useWishlist } from '../lib/useWishlist';
import VerificationBadge from './VerificationBadge';
import RoleBadge from './RoleBadge';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product.id);
  };

  // Get type icon and badge styling
  const getTypeInfo = () => {
    switch (product.type) {
      case 'logistics':
        return { icon: Truck, label: 'Logistics', className: 'badge-gold' };
      case 'pallet':
        return { icon: Package, label: 'Pallet', className: 'badge-gold' };
      case 'handmade':
        return { icon: Sparkles, label: 'Handmade', className: 'badge-premium' };
      default:
        return { icon: Package, label: 'Product', className: 'badge-gold' };
    }
  };

  const typeInfo = getTypeInfo();
  const TypeIcon = typeInfo.icon;

  return (
    <div className="card-product group">
      {/* Image Container - Compact 3:2 aspect ratio for denser layout */}
      <div className="relative aspect-[3/2] bg-gradient-to-br from-graphite to-jet overflow-hidden">
        {/* Product Image */}
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <TypeIcon className="w-20 h-20 text-white/20 group-hover:scale-110 transition-transform duration-500" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-overlay opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

        {/* Wishlist Button - Compact */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-gold hover:text-jet transition-all duration-300 shadow-lg"
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`h-4 w-4 ${isInWishlist ? 'fill-gold text-gold' : ''}`}
            aria-hidden="true"
          />
        </button>

        {/* Type Badge - Compact */}
        {product.type !== 'product' && (
          <div className={`absolute top-2 left-2 ${typeInfo.className} flex items-center gap-1 text-xs px-2 py-1`}>
            <TypeIcon className="w-3 h-3" />
            <span>{typeInfo.label}</span>
          </div>
        )}

        {/* Quick View on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
          <Link
            to={`/product/${product.id}`}
            className="btn-glass py-3 px-6 flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500"
          >
            View Item
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Warm glow for handmade items */}
        {product.type === 'handmade' && (
          <div className="absolute inset-0 bg-gradient-to-t from-gold/20 via-transparent to-transparent pointer-events-none" />
        )}
      </div>

      {/* Product Info - Very compact */}
      <Link to={`/product/${product.id}`} className="block p-2.5">
        {/* Seller Info - Compact */}
        {product.seller && (
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              {product.seller.storeSlug ? (
                <Link
                  to={`/seller/${product.seller.storeSlug}`}
                  className="text-xs text-white/40 hover:text-gold transition-colors truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {product.seller.businessName || 'Seller'}
                </Link>
              ) : (
                <span className="text-xs text-white/40 truncate">
                  {product.seller.businessName || 'Seller'}
                </span>
              )}
              {product.seller.marketplaceRole && (
                <RoleBadge role={product.seller.marketplaceRole} size="sm" />
              )}
            </div>
            {product.seller.isApproved !== undefined && (
              <VerificationBadge isVerified={product.seller.isApproved} size="sm" showLabel={false} />
            )}
          </div>
        )}
        
        {/* Title - Compact, max 2 lines */}
        <h3 className="font-bold text-sm text-white mb-1.5 line-clamp-2 group-hover:text-gold transition-colors duration-300 leading-tight min-h-[2.5rem]">
          {product.title}
        </h3>

        {/* Price - Compact */}
        <p className="text-lg font-bold text-gold mb-1.5">{formatPrice(product.price)}</p>

        {/* Meta Info - Very compact */}
        <div className="flex items-center justify-between text-xs text-white/40">
          <span className="capitalize truncate">{product.condition}</span>
          <span className="flex-shrink-0">{product.stockQuantity} available</span>
        </div>
      </Link>
    </div>
  );
}
