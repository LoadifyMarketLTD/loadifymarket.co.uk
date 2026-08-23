import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useCartStore } from '../store';
import type { Product } from '../types';

export default function WishlistPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch wishlist
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlists')
        .select('productIds')
        .eq('userId', user.id)
        .single();

      if (wishlistError && wishlistError.code !== 'PGRST116') {
        throw wishlistError;
      }

      const productIds = wishlistData?.productIds || [];

      if (productIds.length === 0) {
        setWishlistItems([]);
        setLoading(false);
        return;
      }

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)
        .eq('isActive', true);

      if (productsError) throw productsError;

      setWishlistItems(productsData || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      navigate('/login?redirect=/wishlist');
    }
  }, [user, fetchWishlist, navigate]);

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;

    try {
      const { data: wishlistData } = await supabase
        .from('wishlists')
        .select('productIds')
        .eq('userId', user.id)
        .single();

      const currentProductIds = wishlistData?.productIds || [];
      const updatedProductIds = currentProductIds.filter((id: string) => id !== productId);

      const { error } = await supabase
        .from('wishlists')
        .upsert({
          userId: user.id,
          productIds: updatedProductIds,
        });

      if (error) throw error;

      fetchWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      alert('Failed to remove item from wishlist');
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      quantity: 1,
      price: product.price,
      title: product.title,
      sellerId: product.sellerId,
    });
    alert('Added to cart!');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-navy-800" />
            <h1 className="text-3xl font-bold">My Wishlist</h1>
          </div>
          <p className="text-gray-600">{wishlistItems.length} items</p>
        </div>

        {loading ? (
          <div className="card">
            <p className="text-center py-8 text-gray-600">Loading wishlist...</p>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="card text-center py-12">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Your wishlist is empty</h3>
            <p className="text-gray-600 mb-6">
              Start adding products to your wishlist to save them for later!
            </p>
            <Link to="/catalog" className="btn-primary inline-block">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((product) => (
              <div key={product.id} className="card hover:shadow-lg transition-shadow">
                {/* Product Image */}
                <Link to={`/product/${product.id}`}>
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
                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        removeFromWishlist(product.id);
                      }}
                      className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-red-50 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </Link>

                {/* Product Info */}
                <Link to={`/product/${product.id}`}>
                  <h3 className="font-bold text-lg mb-2 hover:text-navy-800 transition-colors line-clamp-2">
                    {product.title}
                  </h3>
                </Link>

                <div className="flex items-center justify-between mb-3">
                  <p className="text-2xl font-bold text-navy-800">{formatPrice(product.price)}</p>
                  {product.stockStatus === 'in_stock' ? (
                    <span className="text-sm text-green-600 font-medium">In Stock</span>
                  ) : (
                    <span className="text-sm text-red-600 font-medium">Out of Stock</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stockStatus !== 'in_stock'}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <Link
                    to={`/product/${product.id}`}
                    className="w-full btn-outline flex items-center justify-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
