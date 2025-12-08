import { Link } from 'react-router-dom';
import { Heart, Package, Truck, Sparkles, ArrowRight } from 'lucide-react';
import { useWishlist } from '../lib/useWishlist';
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

  // Get stock status badge
  const getStockBadge = () => {
    switch (product.stockStatus) {
      case 'in_stock':
        return { label: 'In Stock', className: 'badge-stock' };
      case 'low_stock':
        return { label: 'Low Stock', className: 'badge-low-stock' };
      default:
        return { label: 'Out of Stock', className: 'badge-out-stock' };
    }
  };

  const stockBadge = getStockBadge();

  return (
    <div className="card-product group">
      {/* Image Container */}
      <div className="relative aspect-square bg-gradient-to-br from-graphite to-jet overflow-hidden">
        {/* Product Image */}
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <TypeIcon className="w-24 h-24 text-white/20 group-hover:scale-110 transition-transform duration-500" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-overlay opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-gold hover:text-jet transition-all duration-300 shadow-lg"
          title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`h-5 w-5 ${isInWishlist ? 'fill-gold text-gold' : ''}`}
          />
        </button>

        {/* Type Badge */}
        {product.type !== 'product' && (
          <div className={`absolute top-4 left-4 ${typeInfo.className} flex items-center gap-1`}>
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

      {/* Product Info */}
      <Link to={`/product/${product.id}`} className="block p-5">
        {/* Title */}
        <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 group-hover:text-gold transition-colors duration-300">
          {product.title}
        </h3>

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-3">
          <p className="price-tag">{formatPrice(product.price)}</p>
          <span className={stockBadge.className}>
            {stockBadge.label}
          </span>
        </div>

        {/* Meta Info */}
        <div className="flex items-center text-sm text-white/40">
          <span className="capitalize">{product.condition}</span>
          <span className="mx-2">•</span>
          <span>{product.stockQuantity} available</span>
        </div>
      </Link>
    </div>
  );
}
