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

// ── Base product select — categories only, no seller embed ────────────────────
const PRODUCT_SELECT = `
  *,
  store:seller_stores(storeSlug)
`;

/** Fetch seller info for a list of seller IDs from seller_profiles (public read via RLS USING TRUE) */
async function fetchSellerMap(sellerIds: string[]): Promise<Map<string, {
  businessName?: string;
  isApproved?: boolean;
  rating?: number;
  marketplaceRole?: string;
  paymentBehaviour?: string;
  userId?: string;
}>> {
  if (sellerIds.length === 0) return new Map();
  const { data } = await supabase
    .from('seller_profiles')
    .select('userId, businessName, isApproved, rating, marketplaceRole, paymentBehaviour')
    .in('userId', sellerIds);
  const map = new Map<string, typeof data extends Array<infer T> ? T : never>();
  (data ?? []).forEach((row) => { if (row.userId) map.set(row.userId, row as never); });
  return map as ReturnType<typeof fetchSellerMap> extends Promise<infer M> ? M : never;
}

/** Merge separately-fetched seller data + store slug into product rows */
function mergeSellerData(
  data: (Product & { store?: { storeSlug?: string } | null })[],
  sellerMap: Map<string, Record<string, unknown>>,
): Product[] {
  return data.map((product) => {
    const sellerInfo = sellerMap.get(product.sellerId) ?? {};
    return {
      ...product,
      seller: {
        ...sellerInfo,
        storeSlug: product.store?.storeSlug,
      } as Product['seller'],
    };
  });
}

export default function TrendingProducts({ maxProducts = 8, days = 7, mode = 'trending', skip = 0, onDataLoaded, excludeIds = [] }: TrendingProductsProps) {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrendingProducts = useCallback(async () => {
    setLoading(true);
    try {
      let rawProducts: (Product & { store?: { storeSlug?: string } | null })[] = [];

      if (mode === 'newest') {
        // Newest listings — order by creation date descending, with offset for deduplication
        const baseQuery = supabase
          .from('products')
          .select(PRODUCT_SELECT)
          .eq('isApproved', true)
          .eq('isActive', true)
          .order('createdAt', { ascending: false });

        const filteredQuery = excludeIds.length > 0
          ? baseQuery.not('id', 'in', `(${excludeIds.join(',')})`)
          : baseQuery;

        const { data, error } = await filteredQuery.range(skip, skip + maxProducts - 1);

        if (error) throw error;

        if (!data || data.length === 0) {
          // Fallback: if skip returns nothing, fetch from start (small dataset)
          const fallbackQuery = supabase
            .from('products')
            .select(PRODUCT_SELECT)
            .eq('isApproved', true)
            .eq('isActive', true)
            .order('createdAt', { ascending: false })
            .limit(maxProducts);
          const { data: fallbackData, error: fallbackErr } = excludeIds.length > 0
            ? await fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`)
            : await fallbackQuery;
          if (fallbackErr) throw fallbackErr;
          rawProducts = (fallbackData || []) as typeof rawProducts;
        } else {
          rawProducts = data as typeof rawProducts;
        }
      } else {
        // Trending: Calculate trending score based on recent activity
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const trendQuery = supabase
          .from('products')
          .select(PRODUCT_SELECT)
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
          // Calculate trending score for each product and take top N
          const withScore = (data as typeof rawProducts).map(p => ({
            ...p,
            _score:
              ((p as Product).views || 0) * 0.3 +
              ((p as unknown as { addToCartCount?: number }).addToCartCount || 0) * 0.5 +
              ((p as Product).reviewCount || 0) * 0.2,
          }));
          rawProducts = withScore
            .sort((a, b) => b._score - a._score)
            .slice(0, maxProducts) as typeof rawProducts;
        } else {
          // Fallback to most viewed products if no recent activity
          const fallbackTrendQuery = supabase
            .from('products')
            .select(PRODUCT_SELECT)
            .eq('isApproved', true)
            .eq('isActive', true)
            .order('views', { ascending: false })
            .limit(maxProducts);

          const { data: fallbackData, error: fallbackError } = excludeIds.length > 0
            ? await fallbackTrendQuery.not('id', 'in', `(${excludeIds.join(',')})`)
            : await fallbackTrendQuery;

          if (fallbackError) throw fallbackError;
          rawProducts = (fallbackData || []) as typeof rawProducts;
        }
      }

      // Fetch seller public info separately (avoids PostgREST embedded join on view)
      const sellerIds = [...new Set(rawProducts.map((p) => p.sellerId).filter(Boolean))];
      const sellerMap = await fetchSellerMap(sellerIds);

      setTrendingProducts(mergeSellerData(rawProducts, sellerMap));
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
            <div className="bg-gray-200 aspect-[4/3] rounded mb-2"></div>
            <div className="bg-gray-200 h-3 rounded mb-1"></div>
            <div className="bg-gray-200 h-3 rounded w-2/3"></div>
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
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-orange-600/90 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
                <Flame className="w-3 h-3" />
                #1
              </div>
            )}
            {mode === 'newest' && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-emerald-600/90 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
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
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-orange-600/90 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
              <Flame className="w-3 h-3" />
              #{index + 1}
            </div>
          )}
          {mode === 'newest' && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-emerald-600/90 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
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

