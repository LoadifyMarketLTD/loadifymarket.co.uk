import { ShoppingCart, Heart, Share2, Package, Truck, Shield, Zap, Tag } from 'lucide-react';
import { formatPrice } from '../../lib/formatPrice';
import type { Product } from '../../types';

interface ProductInfoProps {
  product: Product;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  isInWishlist: boolean;
  wishlistLoading?: boolean;
  addingToCart?: boolean;
  isBulkProduct?: boolean;
  onRequestQuote?: () => void;
}

/**
 * ProductInfo — the right-hand column on the product detail page, showing
 * price, quantity picker, add-to-cart / request-quote CTA, and trust badges.
 */
export default function ProductInfo({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  wishlistLoading = false,
  addingToCart = false,
  isBulkProduct = false,
  onRequestQuote,
}: ProductInfoProps) {
  const maxQty = Math.max(1, product.stock ?? 999);
  const inStock = (product.stock ?? 1) > 0;

  const handleShare = async () => {
    try {
      await navigator.share({ title: product.name, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="space-y-5">
      {/* Category tag */}
      {product.categoryId && (
        <div className="flex items-center gap-1.5 text-xs text-[#0A2239] font-semibold">
          <Tag className="h-3.5 w-3.5" />
          <span>Product</span>
        </div>
      )}

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-snug">
        {product.name}
      </h1>

      {/* Price */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-3xl font-extrabold text-[#0A2239]">
          {formatPrice(product.price)}
        </span>
        {typeof product.compareAtPrice === 'number' && product.compareAtPrice > product.price && (
          <>
            <span className="text-lg text-gray-400 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
            <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Save {formatPrice(product.compareAtPrice - product.price)}
            </span>
          </>
        )}
      </div>

      {/* Stock status */}
      <div>
        {inStock ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            In Stock
            {typeof product.stock === 'number' && product.stock <= 10 && (
              <span className="text-orange-600 ml-1">— only {product.stock} left</span>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Out of Stock
          </span>
        )}
      </div>

      {/* Short description */}
      {product.description && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
          {product.description}
        </p>
      )}

      {/* Quantity + CTA */}
      {!isBulkProduct ? (
        <div className="space-y-3">
          {/* Quantity picker */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700" htmlFor="product-qty">
              Qty:
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                id="product-qty"
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={(e) =>
                  onQuantityChange(Math.min(maxQty, Math.max(1, Number(e.target.value))))
                }
                className="w-12 text-center text-sm font-semibold border-x border-gray-300 py-2 focus:outline-none"
              />
              <button
                onClick={() => onQuantityChange(Math.min(maxQty, quantity + 1))}
                disabled={quantity >= maxQty}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to cart */}
          <div className="flex gap-2">
            <button
              onClick={onAddToCart}
              disabled={!inStock || addingToCart}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#C9A227] disabled:opacity-60 text-gray-900 font-extrabold px-6 py-3.5 rounded-xl text-sm transition-colors shadow-md"
            >
              <ShoppingCart className="h-4 w-4" />
              {addingToCart ? 'Adding…' : 'Add to Cart'}
            </button>

            {/* Wishlist */}
            <button
              onClick={onToggleWishlist}
              disabled={wishlistLoading}
              aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`p-3.5 rounded-xl border transition-colors ${
                isInWishlist
                  ? 'bg-red-50 border-red-200 text-red-500'
                  : 'border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-400'
              }`}
            >
              <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-red-400' : ''}`} />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              aria-label="Share product"
              className="p-3.5 rounded-xl border border-gray-300 text-gray-500 hover:border-gray-400 transition-colors"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Bulk / logistics CTA */
        <div className="space-y-3">
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
            This is a bulk / pallet listing. Contact the seller or request a logistics quote to proceed.
          </p>
          <button
            onClick={onRequestQuote}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#0A2239] hover:bg-[#0d2d47] text-white font-extrabold px-6 py-3.5 rounded-xl text-sm transition-colors shadow-md"
          >
            <Zap className="h-4 w-4" />
            Request Logistics Quote
          </button>
        </div>
      )}

      {/* Trust badges */}
      <div className="border-t border-gray-200 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Shield, text: 'Buyer Protection' },
          { icon: Truck,  text: 'UK Delivery' },
          { icon: Package, text: 'Easy Returns' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 text-xs text-gray-500">
            <Icon className="h-4 w-4 text-[#0A2239] flex-shrink-0" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
