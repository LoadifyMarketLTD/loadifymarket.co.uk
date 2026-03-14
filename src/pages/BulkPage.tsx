import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';
import { Search, X, Filter, Package, ShoppingBag, ArrowRight, MapPin, Weight } from 'lucide-react';
import ProductCard from '../components/ProductCard';

const BULK_CATEGORIES = [
  { label: 'All Bulk', slug: '' },
  { label: 'Pallet Deals', slug: 'pallet' },
  { label: 'Liquidation Stock', slug: 'liquidation' },
  { label: 'Wholesale Bundles', slug: 'wholesale' },
  { label: 'Warehouse Clearance', slug: 'clearance' },
  { label: 'Electronics Lots', slug: 'electronics-lots' },
  { label: 'Fashion Lots', slug: 'fashion-lots' },
];

// B2B product types
const B2B_TYPES = ['pallet', 'lot', 'wholesale', 'clearance'];

// Map quick-nav category slugs to product type values in the DB
const SLUG_TO_TYPE: Record<string, string> = {
  pallet: 'pallet',
  liquidation: 'lot',
  wholesale: 'wholesale',
  clearance: 'clearance',
};

export default function BulkPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || searchParams.get('search') || '');
  // selectedBulkType: filters products by the `type` field using quick-nav buttons or the `type` URL param
  const [selectedBulkType, setSelectedBulkType] = useState(searchParams.get('type') || '');
  // selectedCategory: filters products by `categoryId` using the DB-backed dropdown
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .is('parentId', null)
          .order('order', { ascending: true });
        setCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:seller_profiles!inner(
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
        .eq('isActive', true)
        .eq('isApproved', true);

      // Apply type filter: if a specific bulk type is selected (via quick-nav or URL `type` param)
      // resolve the slug to the correct DB type value; otherwise show all B2B types.
      if (selectedBulkType) {
        const dbType = SLUG_TO_TYPE[selectedBulkType] ?? selectedBulkType;
        query = query.eq('type', dbType);
      } else {
        query = query.in('type', B2B_TYPES);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply DB-category filter (from the dropdown, uses real UUIDs)
      if (selectedCategory) {
        query = query.eq('categoryId', selectedCategory);
      }

      query = query
        .gte('price', priceRange[0])
        .lte('price', priceRange[1]);

      const [sortField, sortOrder] = sortBy.split('_');
      query = query.order(sortField || 'createdAt', { ascending: sortOrder === 'asc' });

      const { data, error } = await query.limit(48);
      if (error) throw error;

      const mapped = (data || []).map((p: Record<string, unknown>) => ({
        ...p,
        seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
        store: Array.isArray(p.store) ? p.store[0] : p.store,
      }));
      setProducts(mapped as unknown as Product[]);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedBulkType, selectedCategory, priceRange, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleBulkCategoryClick = (slug: string) => {
    setSelectedBulkType(slug);
    if (slug) {
      setSearchParams({ type: slug });
    } else {
      setSearchParams({});
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBulkType('');
    setSelectedCategory('');
    setPriceRange([0, 100000]);
    setSortBy('createdAt_desc');
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || selectedBulkType || selectedCategory || sortBy !== 'createdAt_desc';

  return (
    <div className="min-h-screen bg-jet">
      {/* Page Header */}
      <div className="bg-graphite/30 border-b border-white/10 py-10">
        <div className="container-cinematic">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-7 w-7 text-gold" />
            <h1 className="text-3xl font-bold text-white">Bulk &amp; Pallets</h1>
          </div>
          <p className="text-white/60">Wholesale pallet lots, liquidation stock and warehouse clearance deals</p>
        </div>
      </div>

      {/* What's included info bar */}
      <div className="bg-jet border-b border-white/10 py-4">
        <div className="container-cinematic">
          <div className="flex flex-wrap gap-6 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gold" />
              Pallet Lots
            </div>
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-gold" />
              Liquidation Stock
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-gold" />
              Wholesale Bundles
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gold" />
              Warehouse Clearance
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Category Quick-Nav */}
      <div className="bg-graphite/20 border-b border-white/10 py-4">
        <div className="container-cinematic">
          <div className="flex flex-wrap gap-3">
            {BULK_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleBulkCategoryClick(cat.slug)}
                className={`px-4 py-2 rounded-premium-sm text-sm font-medium transition-all duration-200 ${
                  selectedBulkType === cat.slug
                    ? 'bg-gold text-jet'
                    : 'bg-graphite text-white/70 hover:bg-graphite/80 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-cinematic py-8">
        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="Search bulk lots, pallets, wholesale stock..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search w-full pl-12"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-graphite text-white border border-white/10 rounded-premium-sm px-4 py-2 text-sm focus:outline-none focus:border-gold"
            >
              <option value="createdAt_desc">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Top Rated</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-glass flex items-center gap-2 ${showFilters ? 'bg-gold/20' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-glass text-sm flex items-center gap-1">
                <X className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="card-glass p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-white/70 text-sm mb-2">Max Price: £{priceRange[1].toLocaleString()}</label>
              <input
                type="range"
                min={0}
                max={100000}
                step={500}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="w-full accent-gold"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-graphite text-white border border-white/10 rounded-premium-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-glass h-64 animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <p className="text-white/50 text-sm mb-4">{products.length} bulk lots found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <Package className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No bulk listings found</h3>
            <p className="text-white/50 mb-6">Check back soon for new pallet deals and bulk stock</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={clearFilters} className="btn-primary">
                Clear Filters
              </button>
              <Link to="/register?type=seller" className="btn-secondary">
                List Your Stock
              </Link>
            </div>
          </div>
        )}

        {/* Bulk Listing details */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card-glass p-8">
            <h3 className="text-xl font-bold text-white mb-4">What you get with bulk listings</h3>
            <ul className="space-y-3 text-white/60 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-gold mt-0.5">✓</span>
                <span>Full pallet count, weight &amp; dimensions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold mt-0.5">✓</span>
                <span>Warehouse pickup or delivery options</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold mt-0.5">✓</span>
                <span>Request a quote or contact seller directly</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold mt-0.5">✓</span>
                <span>Verified seller ratings &amp; reviews</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold mt-0.5">✓</span>
                <span>Buyer protection on every purchase</span>
              </li>
            </ul>
          </div>
          <div className="card-glass p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Got bulk stock to sell?</h3>
              <p className="text-white/60 text-sm mb-6">
                Register as a seller and list your pallet lots, liquidation stock or wholesale bundles.
                Reach thousands of verified UK buyers.
              </p>
            </div>
            <Link to="/register?type=seller" className="btn-primary flex items-center gap-2 w-fit">
              Start Selling Bulk Stock
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
