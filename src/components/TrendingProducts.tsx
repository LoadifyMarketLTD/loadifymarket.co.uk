import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, Flame } from 'lucide-react';

interface TrendingProductsProps {
  maxProducts?: number;
  days?: number;
}

export default function TrendingProducts({ maxProducts = 8, days = 7 }: TrendingProductsProps) {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingProducts();
  }, [days, maxProducts]);

  const fetchTrendingProducts = async () => {
    setLoading(true);
    try {
      // Calculate trending score based on recent activity
      // Score = (views * 0.3) + (addToCartCount * 0.5) + (reviewCount * 0.2)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('isApproved', true)
        .eq('isActive', true)
        .gte('lastViewedAt', cutoffDate.toISOString())
        .order('addToCartCount', { ascending: false })
        .order('views', { ascending: false })
        .limit(maxProducts * 2); // Get more to filter and sort

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculate trending score for each product
        const productsWithScore = data.map(product => ({
          ...product,
          trendingScore: 
            (product.views || 0) * 0.3 +
            (product.addToCartCount || 0) * 0.5 +
            (product.reviewCount || 0) * 0.2
        }));

        // Sort by trending score and take top products
        const sorted = productsWithScore
          .sort((a, b) => b.trendingScore - a.trendingScore)
          .slice(0, maxProducts);

        setTrendingProducts(sorted);
      } else {
        // Fallback to most viewed products if no recent activity
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select('*')
          .eq('isApproved', true)
          .eq('isActive', true)
          .order('views', { ascending: false })
          .limit(maxProducts);

        if (fallbackError) throw fallbackError;
        setTrendingProducts(fallbackData || []);
      }
    } catch (error) {
      console.error('Error fetching trending products:', error);
      setTrendingProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="my-12">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-6 h-6 text-orange-700" />
          <h2 className="text-2xl font-bold">Trending Now</h2>
          <Flame className="w-5 h-5 text-orange-700" />
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

  if (trendingProducts.length === 0) {
    return null;
  }

  return (
    <div className="my-12">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-orange-700" />
        <h2 className="text-2xl font-bold">Trending Now</h2>
        <Flame className="w-5 h-5 text-orange-700 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {trendingProducts.map((product, index) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="group relative"
          >
            {/* Trending Badge */}
            {index < 3 && (
              <div className="absolute -top-2 -left-2 z-10 bg-orange-700 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                #{index + 1}
              </div>
            )}
            
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
              
              {/* Trending Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-orange-700/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              
              {product.condition !== 'new' && (
                <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-medium">
                  {product.condition === 'used' ? 'Used' : 'Refurbished'}
                </div>
              )}
            </div>
            
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-navy-800 transition-colors">
              {product.title}
            </h3>
            
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-bold text-navy-800">
                £{product.price.toFixed(2)}
              </span>
              {product.priceExVat && (
                <span className="text-xs text-gray-500">
                  ex VAT
                </span>
              )}
            </div>
            
            {/* Trending indicator */}
            <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
              <TrendingUp className="w-3 h-3" />
              <span>{product.views || 0} views</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
