import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store';
import { useWishlist } from '../lib/useWishlist';
import type { Product } from '../types';
import { ShoppingCart, Heart, Share2, Star } from 'lucide-react';

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

    // Show success message (you can add a toast notification here)
    alert('Product added to cart!');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading product...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/catalog')} className="btn-primary">
            Browse Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-smoke min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Cinematic Product Container */}
        <div className="bg-white rounded-cinematic-lg shadow-cinematic overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Product Images - Cinematic */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-8">
              {/* Main Image */}
              <div className="mb-6 rounded-cinematic-md overflow-hidden bg-white shadow-cinematic-lg">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[selectedImage]}
                    alt={product.title}
                    className="w-full h-96 object-contain"
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                    <span className="text-gray-500 text-lg font-medium">No Image Available</span>
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`rounded-cinematic-sm overflow-hidden border-2 transition-all duration-300 ${
                        selectedImage === index ? 'border-gold-400 shadow-cinematic-glow scale-105' : 'border-gray-300 hover:border-gold-400'
                      }`}
                    >
                      <img src={image} alt={`${product.title} ${index + 1}`} className="w-full h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info - Cinematic */}
            <div className="p-8 lg:p-12">
              {/* Title and Type Badge */}
              <div className="flex items-start justify-between mb-6">
                <h1 className="text-3xl lg:text-4xl font-display font-bold text-jet flex-1">{product.title}</h1>
                {product.type !== 'product' && (
                  <span className="bg-gold-400 text-jet px-4 py-2 rounded-cinematic-sm text-sm font-bold uppercase tracking-wide ml-4 shadow-cinematic">
                    {product.type}
                  </span>
                )}
              </div>

              {/* Rating */}
              {product.rating > 0 && (
                <div className="flex items-center mb-6">
                  <div className="flex text-gold-400 text-xl">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-6 w-6 ${i < Math.round(product.rating) ? 'fill-current' : ''}`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600 ml-3 font-medium">({product.reviewCount} reviews)</span>
                </div>
              )}

              {/* Price - Cinematic Gold */}
              <div className="mb-8">
                <div className="flex items-baseline space-x-3">
                  <span className="text-5xl font-display font-bold text-gold-400">{formatPrice(product.price)}</span>
                  <span className="text-gray-500 text-sm">VAT included</span>
                </div>
                {product.priceExVat && (
                  <p className="text-sm text-gray-600 mt-2">
                    Ex VAT: {formatPrice(product.priceExVat)} | VAT ({product.vatRate * 100}%):{' '}
                    {formatPrice(product.price - product.priceExVat)}
                  </p>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-8">
                {product.stockStatus === 'in_stock' ? (
                  <span className="text-green-600 font-semibold flex items-center text-lg">
                    <span className="h-3 w-3 bg-green-600 rounded-full mr-3 animate-pulse"></span>
                    In Stock ({product.stockQuantity} available)
                  </span>
                ) : product.stockStatus === 'low_stock' ? (
                  <span className="text-orange-600 font-semibold flex items-center text-lg">
                    <span className="h-3 w-3 bg-orange-600 rounded-full mr-3 animate-pulse"></span>
                    Low Stock (Only {product.stockQuantity} left)
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold flex items-center text-lg">
                    <span className="h-3 w-3 bg-red-600 rounded-full mr-3"></span>
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Condition */}
              <div className="mb-8 p-4 bg-smoke rounded-cinematic-md">
                <span className="text-sm text-gray-600 font-medium">Condition: </span>
                <span className="font-bold capitalize text-jet">{product.condition}</span>
              </div>

              {/* Quantity Selector - Cinematic */}
              {product.stockQuantity > 0 && (
                <div className="mb-8">
                  <label className="block text-sm font-bold mb-3 text-jet uppercase tracking-wide">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={product.stockQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stockQuantity, parseInt(e.target.value) || 1)))}
                    className="input-field w-32 text-lg font-semibold"
                  />
                </div>
              )}

              {/* Action Buttons - Cinematic */}
              <div className="flex gap-4 mb-8">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stockQuantity === 0}
                  className="btn-secondary flex-1 flex items-center justify-center space-x-3 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-6 w-6" />
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
                  className={`btn-outline p-4 transition-all duration-300 ${
                    isInWishlist ? 'bg-red-50 border-red-400 hover:bg-red-100' : 'hover:border-gold-400'
                  }`}
                  title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart className={`h-6 w-6 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
                <button className="btn-outline p-4 hover:border-gold-400 transition-all duration-300">
                  <Share2 className="h-6 w-6" />
                </button>
              </div>

              {/* Pallet Info - Glass Card */}
              {product.type === 'pallet' && product.palletInfo && (
                <div className="card-glass border border-white/30 mb-8">
                  <h3 className="font-display font-bold mb-4 text-lg text-jet">Pallet Information</h3>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between"><span className="font-semibold text-gray-700">Pallet Count:</span> <span className="font-bold text-jet">{product.palletInfo.palletCount}</span></p>
                    <p className="flex justify-between"><span className="font-semibold text-gray-700">Items per Pallet:</span> <span className="font-bold text-jet">{product.palletInfo.itemsPerPallet}</span></p>
                    <p className="flex justify-between"><span className="font-semibold text-gray-700">Pallet Type:</span> <span className="font-bold text-jet">{product.palletInfo.palletType}</span></p>
                  </div>
                </div>
              )}

              {/* Dimensions */}
              {product.dimensions && (
                <div className="mb-8 p-4 bg-smoke rounded-cinematic-md">
                  <h3 className="font-bold mb-3 text-jet">Dimensions</h3>
                  <p className="text-sm text-gray-700 font-medium">
                    {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm
                    {product.weight && ` | Weight: ${product.weight} kg`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-8 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Description</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
            </div>
          </div>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mt-8 border-t pt-8">
              <h2 className="text-2xl font-bold mb-4">Specifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex border-b pb-2">
                    <span className="font-medium w-1/2">{key}:</span>
                    <span className="text-gray-700 w-1/2">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section Placeholder */}
          <div className="mt-8 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
            {product.reviewCount === 0 ? (
              <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
            ) : (
              <p className="text-gray-600">Reviews will be displayed here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
