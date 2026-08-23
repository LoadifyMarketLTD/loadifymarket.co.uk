import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { Flame, Clock } from 'lucide-react';
import ProductCard from './ProductCard';

interface TrendingProductsProps {
  maxProducts?: number;
  days?: number;
  mode?: 'trending' | 'newest';
  skip?: number;
  onDataLoaded?: (count: number) => void;
  excludeIds?: string[];
}

export default function TrendingProducts({ maxProducts = 8, days = 7, mode = 'trending', skip = 0, onDataLoaded, excludeIds = [] }: TrendingProductsProps) {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrendingProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'newest') {
        // Newest listings — order by creation date descending, with offset for deduplication
        const baseQuery = supabase
          .from('products')
          .select(`
            *,
            seller:seller_profiles(
              businessName,
              isApproved,
              rating,
              marketplaceRole,
              paymentBehaviour,
              userId
            ),
            store:seller_stores(
              storeSlug
            )
          `)
          .eq('isApproved', true)
          .eq('isActive', true)
          .order('createdAt', { ascending: false });

        const filteredQuery = excludeIds.length > 0
          ? baseQuery.not('id', 'in', `(${excludeIds.join(',')})`)
          : baseQuery;

        const { data, error } = await filteredQuery.range(skip, skip + maxProducts - 1);

        if (error) throw error;

        // Fallback: if skip returns nothing, fetch from start (small dataset)
        if (!data || data.length === 0) {
          const fallbackQuery = supabase
            .from('products')
            .select(`
              *,
              seller:seller_profiles(
                businessName,
                isApproved,
                rating,
                marketplaceRole,
                paymentBehaviour,
                userId
              ),
              store:seller_stores(
                storeSlug
              )
            `)
            .eq('isApproved', true)
            .eq('isActive', true)
            .order('createdAt', { ascending: false })
            .limit(maxProducts);
          const { data: fallbackData, error: fallbackErr } = excludeIds.length > 0
            ? await fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`)
            : await fallbackQuery;
          if (fallbackErr) throw fallbackErr;
          setTrendingProducts(transformProducts(fallbackData || []));
        } else {
          setTrendingProducts(transformProducts(data));
        }
        return;
      }

      // Trending: Calculate trending score based on recent activity
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const trendQuery = supabase
        .from('products')
        .select(`
          *,
          seller:seller_profiles(
            businessName,
            isApproved,
            rating,
            marketplaceRole,
            paymentBehaviour,
            userId
          ),
          store:seller_stores(
            storeSlug
          )
        `)
        .eq('isApproved', true)
        .eq('isActive', true)
        .gte('lastViewedAt', cutoffDate.toISOString())
        .order('addToCartCount', { ascending: false })
        .order('views', { ascending: false })
        .limit(maxProducts * 3); // Get more to filter, sort and exclude

      const { data, error } = excludeIds.length > 0
        ? await trendQuery.not('id', 'in', `(${excludeIds.join(',')})`)
        : await trendQuery;

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

        setTrendingProducts(transformProducts(sorted));
      } else {
        // Fallback to most viewed products if no recent activity
        const fallbackTrendQuery = supabase
          .from('products')
          .select(`
            *,
            seller:seller_profiles(
              businessName,
              isApproved,
              rating,
              marketplaceRole,
              paymentBehaviour,
              userId
            ),
            store:seller_stores(
              storeSlug
            )
          `)
          .eq('isApproved', true)
          .eq('isActive', true)
          .order('views', { ascending: false })
          .limit(maxProducts);

        const { data: fallbackData, error: fallbackError } = excludeIds.length > 0
          ? await fallbackTrendQuery.not('id', 'in', `(${excludeIds.join(',')})`)
          : await fallbackTrendQuery;

        if (fallbackError) throw fallbackError;
        setTrendingProducts(transformProducts(fallbackData || []));
      }
    } catch (error) {
      console.error('Error fetching trending products:', error);
      setTrendingProducts([]);
    } finally {
      setLoading(false);
    }
  }, [days, maxProducts, mode, skip, excludeIds]);

  useEffect(() => {
    fetchTrendingProducts();
  }, [fetchTrendingProducts]);

  // Notify parent when loading is done
  useEffect(() => {
    if (!loading) {
      onDataLoaded?.(trendingProducts.length);
    }
  }, [loading, trendingProducts.length, onDataLoaded]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
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

  if (trendingProducts.length === 1) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-xs">
          <div className="relative">
            {mode === 'trending' && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-orange-600/90 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
                <Flame className="w-3 h-3" />
                #1
              </div>
            )}
            {mode === 'newest' && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-emerald-600/90 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
                <Clock className="w-3 h-3" />
                New
              </div>
            )}
            <ProductCard product={trendingProducts[0]} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
      {trendingProducts.map((product, index) => (
        <div key={product.id} className="relative">
          {/* Mode badge overlay */}
          {mode === 'trending' && index < 3 && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-orange-600/90 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
              <Flame className="w-3 h-3" />
              #{index + 1}
            </div>
          )}
          {mode === 'newest' && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-emerald-600/90 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
              <Clock className="w-3 h-3" />
              New
            </div>
          )}
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

// Transform Supabase joined data to include storeSlug in seller object
function transformProducts(data: (Product & { store?: { storeSlug?: string } | null })[]) {
  return data.map((product) => ({
    ...product,
    seller: product.seller ? {
      ...product.seller,
      storeSlug: product.store?.storeSlug,
    } : undefined,
  }));
}
