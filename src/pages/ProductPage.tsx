import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store';
import { useWishlist } from '../lib/useWishlist';
import type { Product } from '../types';
import {
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Package,
  Truck,
  Sparkles,
  ChevronLeft,
  Shield,
  Zap,
  User,
  MessageCircle,
} from 'lucide-react';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addItem } = useCartStore();
  const { isInWishlist, loading: wishlistLoading, checkWishlist, toggleWishlist } = useWishlist();

  const fetchProduct = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);

      // Increment view count
      await supabase
        .from('products')
        .update({ views: (data.views || 0) + 1 })
        .eq('id', id);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProduct();
      checkWishlist(id);
    }
  }, [id, fetchProduct, checkWishlist]);

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      productId: product.id,
      quantity,
      price: product.price,
    });

    // Could add a toast notification here
    alert('Product added to cart!');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  // Get type icon
  const getTypeIcon = () => {
    if (!product) return Package;
    switch (product.type) {
      case 'logistics':
        return Truck;
      case 'pallet':
        return Package;
      case 'handmade':
        return Sparkles;
      default:
        return Package;
    }
  };

  const TypeIcon = getTypeIcon();

  if (loading) {
    return (
      <div className="bg-jet min-h-screen pt-24">
        <div className="container-cinematic py-12">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60">Loading product...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-jet min-h-screen pt-24">
        <div className="container-cinematic py-12">
          <div className="card-glass text-center py-16">
            <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Product Not Found</h2>
            <p className="text-white/60 mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <button onClick={() => navigate('/catalog')} className="btn-primary">
              Browse Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-jet min-h-screen pt-24">
      {/* Breadcrumb */}
      <div className="bg-graphite/30">
        <div className="container-cinematic py-4">
          <button
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-gold transition-colors flex items-center gap-2 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Catalog
          </button>
        </div>
      </div>

      <div className="container-cinematic py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            {/* Main Image */}
            <div className="relative aspect-square rounded-premium-lg overflow-hidden bg-graphite mb-4">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <TypeIcon className="w-32 h-32 text-white/20" />
                </div>
              )}

              {/* Type Badge */}
              {product.type !== 'product' && (
                <div className="absolute top-4 left-4 badge-premium flex items-center gap-1">
                  <TypeIcon className="w-3 h-3" />
                  <span>{product.type.toUpperCase()}</span>
                </div>
              )}

              {/* Warm glow for handmade */}
              {product.type === 'handmade' && (
                <div className="absolute inset-0 bg-gradient-to-t from-gold/10 via-transparent to-transparent pointer-events-none" />
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`rounded-premium-sm overflow-hidden border-2 transition-all duration-300 ${
                      selectedImage === index
                        ? 'border-gold shadow-cinematic-gold'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Title */}
            <h1 className="heading-section text-white mb-4">{product.title}</h1>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center mb-6">
                <div className="flex text-gold">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.round(product.rating) ? 'fill-current' : ''}`}
                    />
                  ))}
                </div>
                <span className="text-white/60 ml-3">({product.reviewCount} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="mb-8">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-gold">{formatPrice(product.price)}</span>
                <span className="text-white/40">VAT included</span>
              </div>
              {product.priceExVat && (
                <p className="text-sm text-white/40 mt-2">
                  Ex VAT: {formatPrice(product.priceExVat)} | VAT ({product.vatRate * 100}%):{' '}
                  {formatPrice(product.price - product.priceExVat)}
                </p>
              )}
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {product.stockStatus === 'in_stock' ? (
                <span className="badge-stock flex items-center gap-2 w-fit">
                  <span className="h-2 w-2 bg-emerald-400 rounded-full"></span>
                  In Stock ({product.stockQuantity} available)
                </span>
              ) : product.stockStatus === 'low_stock' ? (
                <span className="badge-low-stock flex items-center gap-2 w-fit">
                  <span className="h-2 w-2 bg-amber-400 rounded-full"></span>
                  Low Stock (Only {product.stockQuantity} left)
                </span>
              ) : (
                <span className="badge-out-stock flex items-center gap-2 w-fit">
                  <span className="h-2 w-2 bg-red-400 rounded-full"></span>
                  Out of Stock
                </span>
              )}
            </div>

            {/* Condition */}
            <div className="mb-6">
              <span className="text-white/40">Condition: </span>
              <span className="font-medium text-white capitalize">{product.condition}</span>
            </div>

            {/* Quantity Selector */}
            {product.stockQuantity > 0 && (
              <div className="mb-8">
                <label className="block text-sm font-medium text-white/60 mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="btn-glass w-12 h-12 flex items-center justify-center text-xl"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={product.stockQuantity}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Math.min(product.stockQuantity, parseInt(e.target.value) || 1))
                      )
                    }
                    className="input-field w-20 text-center"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                    className="btn-glass w-12 h-12 flex items-center justify-center text-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={product.stockQuantity === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>{product.stockQuantity > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
              </button>
              <button
                onClick={async () => {
                  if (product) {
                    const added = await toggleWishlist(product.id);
                    if (added !== null) {
                      alert(added ? 'Added to wishlist!' : 'Removed from wishlist!');
                    }
                  }
                }}
                disabled={wishlistLoading}
                className={`btn-glass p-4 transition-all ${
                  isInWishlist ? 'border-gold/50 bg-gold/10' : ''
                }`}
                title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-6 w-6 ${isInWishlist ? 'fill-gold text-gold' : ''}`} />
              </button>
              <button className="btn-glass p-4">
                <Share2 className="h-6 w-6" />
              </button>
            </div>

            {/* Seller Info Panel */}
            <div className="card-glass mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-white">Verified Seller</p>
                  <p className="text-sm text-white/40">Member since 2024</p>
                </div>
              </div>
              <Link
                to="/contact"
                className="btn-glass w-full py-3 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Contact Seller
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card-glass text-center py-4">
                <Shield className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xs text-white/60">Buyer Protection</p>
              </div>
              <div className="card-glass text-center py-4">
                <Zap className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xs text-white/60">Fast Delivery</p>
              </div>
              <div className="card-glass text-center py-4">
                <Truck className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xs text-white/60">Secure Shipping</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pallet Info */}
        {product.type === 'pallet' && product.palletInfo && (
          <div className="mt-12">
            <div className="card-glass glass-gold">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-6 h-6 text-gold" />
                Pallet Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-white/40 text-sm">Pallet Count</p>
                  <p className="text-2xl font-bold text-white">{product.palletInfo.palletCount}</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Items per Pallet</p>
                  <p className="text-2xl font-bold text-white">{product.palletInfo.itemsPerPallet}</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Pallet Type</p>
                  <p className="text-2xl font-bold text-white capitalize">
                    {product.palletInfo.palletType}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-12">
          <div className="card-glass">
            <h2 className="text-2xl font-bold text-white mb-6">Description</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-white/70 whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        </div>

        {/* Dimensions */}
        {product.dimensions && (
          <div className="mt-8">
            <div className="card-glass">
              <h3 className="text-xl font-bold text-white mb-4">Dimensions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-white/40 text-sm">Length</p>
                  <p className="text-lg font-bold text-white">{product.dimensions.length} cm</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Width</p>
                  <p className="text-lg font-bold text-white">{product.dimensions.width} cm</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Height</p>
                  <p className="text-lg font-bold text-white">{product.dimensions.height} cm</p>
                </div>
                {product.weight && (
                  <div>
                    <p className="text-white/40 text-sm">Weight</p>
                    <p className="text-lg font-bold text-white">{product.weight} kg</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-8">
            <div className="card-glass">
              <h2 className="text-2xl font-bold text-white mb-6">Specifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex border-b border-white/10 pb-3">
                    <span className="text-white/40 w-1/2">{key}</span>
                    <span className="text-white w-1/2">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="card-glass">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Customer Reviews</h2>
              {product.reviewCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex text-gold">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < Math.round(product.rating) ? 'fill-current' : ''}`}
                      />
                    ))}
                  </div>
                  <span className="text-white/60">({product.reviewCount})</span>
                </div>
              )}
            </div>
            {product.reviewCount === 0 ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No reviews yet. Be the first to review this product!</p>
              </div>
            ) : (
              <p className="text-white/60">Reviews will be displayed here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
