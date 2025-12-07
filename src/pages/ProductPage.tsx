import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store';
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
    }
  }, [id, fetchProduct]);

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
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Images */}
            <div>
              {/* Main Image */}
              <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[selectedImage]}
                    alt={product.title}
                    className="w-full h-96 object-contain"
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center">
                    <span className="text-gray-400 text-lg">No Image Available</span>
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`rounded-lg overflow-hidden border-2 ${
                        selectedImage === index ? 'border-navy-800' : 'border-gray-200'
                      }`}
                    >
                      <img src={image} alt={`${product.title} ${index + 1}`} className="w-full h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              {/* Title and Type Badge */}
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold flex-1">{product.title}</h1>
                {product.type !== 'product' && (
                  <span className="bg-gold-500 text-white px-3 py-1 rounded-lg text-sm font-medium ml-4">
                    {product.type.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Rating */}
              {product.rating > 0 && (
                <div className="flex items-center mb-4">
                  <div className="flex text-gold-500 text-xl">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < Math.round(product.rating) ? 'fill-current' : ''}`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600 ml-2">({product.reviewCount} reviews)</span>
                </div>
              )}

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-bold text-navy-800">{formatPrice(product.price)}</span>
                  <span className="text-gray-500">VAT included</span>
                </div>
                {product.priceExVat && (
                  <p className="text-sm text-gray-600 mt-1">
                    Ex VAT: {formatPrice(product.priceExVat)} | VAT ({product.vatRate * 100}%):{' '}
                    {formatPrice(product.price - product.priceExVat)}
                  </p>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-6">
                {product.stockStatus === 'in_stock' ? (
                  <span className="text-green-600 font-medium flex items-center">
                    <span className="h-2 w-2 bg-green-600 rounded-full mr-2"></span>
                    In Stock ({product.stockQuantity} available)
                  </span>
                ) : product.stockStatus === 'low_stock' ? (
                  <span className="text-orange-600 font-medium flex items-center">
                    <span className="h-2 w-2 bg-orange-600 rounded-full mr-2"></span>
                    Low Stock (Only {product.stockQuantity} left)
                  </span>
                ) : (
                  <span className="text-red-600 font-medium flex items-center">
                    <span className="h-2 w-2 bg-red-600 rounded-full mr-2"></span>
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Condition */}
              <div className="mb-6">
                <span className="text-sm text-gray-600">Condition: </span>
                <span className="font-medium capitalize">{product.condition}</span>
              </div>

              {/* Quantity Selector */}
              {product.stockQuantity > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={product.stockQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stockQuantity, parseInt(e.target.value) || 1)))}
                    className="input-field w-24"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stockQuantity === 0}
                  className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>{product.stockQuantity > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
                </button>
                <button className="btn-outline p-3">
                  <Heart className="h-5 w-5" />
                </button>
                <button className="btn-outline p-3">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              {/* Pallet Info */}
              {product.type === 'pallet' && product.palletInfo && (
                <div className="card bg-blue-50 border border-blue-200 mb-6">
                  <h3 className="font-semibold mb-2">Pallet Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Pallet Count:</span> {product.palletInfo.palletCount}</p>
                    <p><span className="font-medium">Items per Pallet:</span> {product.palletInfo.itemsPerPallet}</p>
                    <p><span className="font-medium">Pallet Type:</span> {product.palletInfo.palletType}</p>
                  </div>
                </div>
              )}

              {/* Dimensions */}
              {product.dimensions && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Dimensions</h3>
                  <p className="text-sm text-gray-600">
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
