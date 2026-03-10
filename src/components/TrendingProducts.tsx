import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, Flame, Clock } from 'lucide-react';

interface TrendingProductsProps {
  maxProducts?: number;
  days?: number;
  mode?: 'trending' | 'newest';
  skip?: number;
}

export default function TrendingProducts({ maxProducts = 8, days = 7, mode = 'trending', skip = 0 }: TrendingProductsProps) {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrendingProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'newest') {
        // Newest listings — order by creation date descending, with offset for deduplication
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('isApproved', true)
          .eq('isActive', true)
          .order('created_at', { ascending: false })
          .range(skip, skip + maxProducts - 1);

        if (error) throw error;

        // Fallback: if skip returns nothing, fetch from start (small dataset)
        if (!data || data.length === 0) {
          const { data: fallbackData, error: fallbackErr } = await supabase
            .from('products')
            .select('*')
            .eq('isApproved', true)
            .eq('isActive', true)
            .order('created_at', { ascending: false })
            .limit(maxProducts);
          if (fallbackErr) throw fallbackErr;
          setTrendingProducts(fallbackData || []);
        } else {
          setTrendingProducts(data);
        }
        return;
      }

      // Trending: Calculate trending score based on recent activity
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
  }, [days, maxProducts, mode, skip]);

  useEffect(() => {
    fetchTrendingProducts();
  }, [fetchTrendingProducts]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(maxProducts)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-graphite aspect-[4/3] rounded-premium-sm mb-2"></div>
            <div className="bg-graphite h-4 rounded mb-1"></div>
            <div className="bg-graphite h-4 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (trendingProducts.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {trendingProducts.map((product, index) => (
        <Link
          key={product.id}
          to={`/product/${product.id}`}
          className="group relative card-product block"
        >
          {/* Mode badge */}
          {mode === 'trending' && index < 3 && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-orange-600/90 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
              <Flame className="w-3 h-3" />
              #{index + 1}
            </div>
          )}
          {mode === 'newest' && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-emerald-600/90 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
              <Clock className="w-3 h-3" />
              New
            </div>
          )}

          <div className="relative aspect-[4/3] overflow-hidden bg-graphite">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-12 h-12 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-jet/70 via-transparent to-transparent" />
            {product.condition !== 'new' && (
              <div className="absolute top-2 right-2 bg-graphite/90 text-white/80 px-2 py-0.5 rounded text-xs font-medium">
                {product.condition === 'used' ? 'Used' : 'Refurb'}
              </div>
            )}
          </div>

          <div className="p-3">
            <h3 className="font-semibold text-white text-sm line-clamp-2 leading-snug mb-2">
              {product.title}
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-gold">£{product.price.toFixed(2)}</span>
              {product.priceExVat && (
                <span className="text-xs text-white/40">ex VAT</span>
              )}
            </div>
            {mode === 'trending' && (product.views || 0) > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-orange-400">
                <TrendingUp className="w-3 h-3" />
                <span>{product.views} views</span>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
