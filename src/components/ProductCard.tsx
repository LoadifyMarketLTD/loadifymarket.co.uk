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
    <div className="card hover:shadow-lg transition-shadow relative">
      {/* Wishlist Button */}
      <button
        onClick={handleWishlistClick}
        className="absolute top-4 right-4 z-10 bg-white p-2 rounded-full shadow-md hover:bg-red-50 transition-colors"
        title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={`h-5 w-5 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
        />
      </button>

      <Link to={`/product/${product.id}`}>
        {/* Product Image */}
        <div className="relative h-48 bg-gray-200 rounded-lg mb-4 overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
          {product.type !== 'product' && (
            <span className="absolute top-2 left-2 bg-navy-800 text-white px-2 py-1 rounded text-xs font-medium">
              {product.type.toUpperCase()}
            </span>
          )}
        </div>

        {/* Product Info */}
        <h3 className="font-bold text-lg mb-2 line-clamp-2 hover:text-navy-800 transition-colors">
          {product.title}
        </h3>

        <div className="flex items-center justify-between mb-2">
          <p className="text-2xl font-bold text-navy-800">{formatPrice(product.price)}</p>
          <span
            className={`text-xs px-2 py-1 rounded ${
              product.stockStatus === 'in_stock'
                ? 'bg-green-100 text-green-800'
                : product.stockStatus === 'low_stock'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {product.stockStatus === 'in_stock'
              ? 'In Stock'
              : product.stockStatus === 'low_stock'
              ? 'Low Stock'
              : 'Out of Stock'}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <span className="capitalize">{product.condition}</span>
          <span className="mx-2">•</span>
          <span>{product.stockQuantity} available</span>
        </div>
      </Link>
    </div>
  );
}
