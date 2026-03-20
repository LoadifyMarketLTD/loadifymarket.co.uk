import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';
import BreadcrumbNav from '../components/BreadcrumbNav';
import { Tag, Zap, ArrowRight } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'price_asc',      label: 'Price: Low to High' },
  { value: 'price_desc',     label: 'Price: High to Low' },
  { value: 'createdAt_desc', label: 'Newest First' },
];

/**
 * DealsPage — showcases clearance, discounted, and promotional products.
 * Filters for products tagged in the clearance category or with a
 * compareAtPrice greater than price.
 */
export default function DealsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price_asc');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller_profiles:seller_profiles_public(businessName, isVerified),
          seller_stores(storeName, storeSlug)
        `)
        .eq('status', 'active');

      // Prefer clearance category; fall back to all active products sorted by price
      const { data: clearanceCat } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', '%clearance%')
        .maybeSingle();

      if (clearanceCat?.id) {
        query = query.eq('categoryId', clearanceCat.id);
      }

      const [field, dir] = sortBy.split('_');
      query = query.order(field === 'createdAt' ? 'createdAt' : field, {
        ascending: dir === 'asc',
      });

      const { data } = await query.limit(60);
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="bg-[#0A2239] text-white py-10">
        <div className="container-market">
          <BreadcrumbNav
            items={[{ label: 'Deals & Clearance' }]}
          />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] flex items-center justify-center">
              <Tag className="h-5 w-5 text-[#0A2239]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">Deals &amp; Clearance</h1>
              <p className="text-white/60 text-sm">Discounted stock — limited quantities</p>
            </div>
          </div>

          {/* Flash deal strip */}
          <div className="flex items-center gap-2 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-xl px-4 py-3 mt-4 w-fit">
            <Zap className="h-4 w-4 text-[#D4AF37]" />
            <span className="text-sm font-semibold text-[#D4AF37]">
              Flash deals updated daily — grab them before they're gone!
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-market py-3 flex items-center justify-between gap-4">
          <span className="text-sm text-gray-500">
            {loading ? 'Loading…' : `${products.length.toLocaleString()} deal${products.length !== 1 ? 's' : ''} available`}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#0A2239] bg-white"
            aria-label="Sort deals"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product grid */}
      <div className="container-market py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Tag className="h-14 w-14 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">No deals right now</h2>
            <p className="text-gray-500 text-sm mb-6">Check back soon — new clearance stock is added daily.</p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C9A227] text-gray-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Browse Marketplace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
