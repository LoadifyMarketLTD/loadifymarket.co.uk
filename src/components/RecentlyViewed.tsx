import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { Product } from '../types';
import { Link } from 'react-router-dom';
import { Package, Clock } from 'lucide-react';

interface RecentlyViewedProps {
  currentProductId?: string;
  maxProducts?: number;
}

export default function RecentlyViewed({ currentProductId, maxProducts = 8 }: RecentlyViewedProps) {
  const { user } = useAuthStore();
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentlyViewed = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        // Fetch for authenticated user
        const { data: viewedData, error: viewedError } = await supabase
          .from('recently_viewed')
          .select('productId')
          .eq('userId', user.id)
          .order('viewedAt', { ascending: false })
          .limit(maxProducts + 1); // +1 to account for current product

        if (viewedError) throw viewedError;

        if (viewedData && viewedData.length > 0) {
          const productIds = viewedData
            .map(v => v.productId)
            .filter(id => id !== currentProductId);

          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds.slice(0, maxProducts))
            .eq('isApproved', true)
            .eq('isActive', true);

          if (productsError) throw productsError;

          // Sort products by the order they were viewed
          const sortedProducts = productIds
            .slice(0, maxProducts)
            .map(id => products?.find(p => p.id === id))
            .filter((p): p is Product => p !== undefined);

          setRecentProducts(sortedProducts);
        }
      } else {
        // For guest users, use localStorage
        const sessionId = getOrCreateSessionId();
        const { data: viewedData, error: viewedError } = await supabase
          .from('recently_viewed')
          .select('productId')
          .eq('sessionId', sessionId)
          .order('viewedAt', { ascending: false })
          .limit(maxProducts + 1);

        if (viewedError) throw viewedError;

        if (viewedData && viewedData.length > 0) {
          const productIds = viewedData
            .map(v => v.productId)
            .filter(id => id !== currentProductId);

          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds.slice(0, maxProducts))
            .eq('isApproved', true)
            .eq('isActive', true);

          if (productsError) throw productsError;

          const sortedProducts = productIds
            .slice(0, maxProducts)
            .map(id => products?.find(p => p.id === id))
            .filter((p): p is Product => p !== undefined);

          setRecentProducts(sortedProducts);
        }
      }
    } catch (error) {
      console.error('Error fetching recently viewed products:', error);
      setRecentProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentProductId, maxProducts]);

  useEffect(() => {
    fetchRecentlyViewed();
  }, [fetchRecentlyViewed]);

  const getOrCreateSessionId = (): string => {
    try {
      let sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('sessionId', sessionId);
      }
      return sessionId;
    } catch {
      // Private/incognito mode — return a transient ID without persisting it.
      return `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  };

  if (loading) {
    return (
      <div className="my-12">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-6 h-6 text-navy-800" />
          <h2 className="text-2xl font-bold">Recently Viewed</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {[...Array(maxProducts)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg mb-2"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentProducts.length === 0) {
    return null;
  }

  return (
    <div className="my-12">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-6 h-6 text-navy-800" />
        <h2 className="text-2xl font-bold">Recently Viewed</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {recentProducts.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="group"
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-300" />
                </div>
              )}
              {product.condition !== 'new' && (
                <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-medium">
                  {product.condition === 'used' ? 'Used' : 'Refurbished'}
                </div>
              )}
            </div>
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-navy-800 transition-colors">
              {product.title}
            </h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
