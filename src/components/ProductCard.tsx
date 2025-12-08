import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
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
    const added = await toggleWishlist(product.id);
    if (added !== null) {
      // Could show a toast notification here
    }
  };

  return (
    <div className="card-cinematic group relative">
      {/* Wishlist Button */}
      <button
        onClick={handleWishlistClick}
        className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-cinematic hover:bg-white hover:shadow-cinematic-glow transition-all duration-300"
        title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={`h-5 w-5 transition-colors ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
        />
      </button>

      <Link to={`/product/${product.id}`} className="block">
        {/* Product Image - Cinematic with overlay */}
        <div className="relative h-64 bg-gray-200 rounded-t-cinematic-lg overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <>
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {/* Bottom overlay gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-32 overlay-gradient-dark"></div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 text-gray-500">
              No image
            </div>
          )}
          
          {/* Type badge */}
          {product.type !== 'product' && (
            <span className="absolute top-3 left-3 bg-jet/80 backdrop-blur-sm text-gold-400 px-3 py-1.5 rounded-cinematic-sm text-xs font-bold uppercase tracking-wide">
              {product.type}
            </span>
          )}

          {/* Stock status badge */}
          <span
            className={`absolute top-3 right-3 px-3 py-1.5 rounded-cinematic-sm text-xs font-semibold backdrop-blur-sm ${
              product.stockStatus === 'in_stock'
                ? 'bg-green-500/90 text-white'
                : product.stockStatus === 'low_stock'
                ? 'bg-yellow-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
          >
            {product.stockStatus === 'in_stock'
              ? 'In Stock'
              : product.stockStatus === 'low_stock'
              ? 'Low Stock'
              : 'Out of Stock'}
          </span>
        </div>

        {/* Product Info - In bottom overlay */}
        <div className="p-6 bg-white">
          <h3 className="font-display font-bold text-xl mb-3 line-clamp-2 text-jet group-hover:text-gold-400 transition-colors">
            {product.title}
          </h3>

          <div className="flex items-center justify-between mb-3">
            <p className="text-3xl font-display font-bold text-gold-400">{formatPrice(product.price)}</p>
          </div>

          <div className="flex items-center text-sm text-gray-600 mb-4">
            <span className="capitalize">{product.condition}</span>
            <span className="mx-2 text-gold-400">•</span>
            <span>{product.stockQuantity} available</span>
          </div>

          {/* View Item Button - Glassmorphism */}
          <div className="inline-flex items-center text-sm font-semibold text-gold-400 group-hover:text-jet group-hover:bg-gold-400 px-4 py-2 rounded-cinematic-sm border border-gold-400 transition-all duration-300">
            View Item
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}
