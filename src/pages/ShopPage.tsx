import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';
import { Search, X, Filter, Cpu, Shirt, Home, Wrench, Car, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';

const B2C_CATEGORIES = [
  { icon: Cpu, label: 'Electronics', slug: 'electronics' },
  { icon: Shirt, label: 'Fashion', slug: 'fashion' },
  { icon: Home, label: 'Home & Garden', slug: 'home-garden' },
  { icon: Wrench, label: 'Tools', slug: 'tools' },
  { icon: Car, label: 'Vehicles', slug: 'vehicles' },
  { icon: Sparkles, label: 'Handmade', slug: 'handmade' },
];

// UUID v4 pattern for detecting already-resolved IDs
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Product types that are NOT consumer-facing (logistics jobs have their own dedicated section)
const NON_SHOP_TYPES = ['logistics'];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || searchParams.get('search') || '');
  // Start with an empty category — resolved from URL param after categories load
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');

  // Reactive URL category param — re-resolved whenever navigation changes the URL
  const catParam = searchParams.get('category');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .is('parentId', null)
          .order('name', { ascending: true });
        setCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Resolve category URL param (slug or UUID) to a UUID whenever the param or
  // categories list changes. This keeps the filter in sync when the user navigates
  // between category links without unmounting the component.
  useEffect(() => {
    if (!catParam) {
      setSelectedCategory('');
      return;
    }
    if (UUID_PATTERN.test(catParam)) {
      setSelectedCategory(catParam);
      return;
    }
    // Slug resolution — wait until categories have loaded
    if (categories.length === 0) return;
    const match = categories.find((c) => c.slug === catParam);
    setSelectedCategory(match?.id ?? '');
  }, [catParam, categories]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:seller_profiles_public!left(
            businessName,
            isApproved,
            rating,
            marketplaceRole,
            paymentBehaviour,
            userId
          ),
          store:seller_stores!left(
            storeSlug
          )
        `)
        .eq('isActive', true)
        .eq('isApproved', true)
        .not('type', 'in', `(${NON_SHOP_TYPES.join(',')})`);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (selectedCategory) {
        query = query.eq('categoryId', selectedCategory);
      }

      if (selectedCondition) {
        query = query.eq('condition', selectedCondition);
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
  }, [searchQuery, selectedCategory, selectedCondition, priceRange, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCategoryClick = (slug: string) => {
    const cat = categories.find((c) => c.slug === slug);
    if (cat) {
      setSelectedCategory(cat.id);
      setSearchParams({ category: slug });
    } else {
      setSelectedCategory('');
      setSearchParams({});
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedCondition('');
    setPriceRange([0, 10000]);
    setSortBy('createdAt_desc');
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedCondition || sortBy !== 'createdAt_desc';

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Page Header */}
      <div className="bg-white/30 border-b border-gray-200 py-10">
        <div className="container-cinematic">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="h-7 w-7 text-gold" />
            <h1 className="text-3xl font-bold text-gray-900">Shop Products</h1>
          </div>
          <p className="text-gray-500">Browse electronics, fashion, home goods, tools, vehicles &amp; more</p>
        </div>
      </div>

      {/* Category Quick-Nav */}
      <div className="bg-[#F8F9FA] border-b border-gray-200 py-4">
        <div className="container-cinematic">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleCategoryClick('')}
              className={`flex items-center gap-2 px-4 py-2 rounded-premium-sm text-sm font-medium transition-all duration-200 ${
                !selectedCategory
                  ? 'bg-gold text-jet'
                  : 'bg-white text-gray-600 hover:bg-white/80 hover:text-[#1E3A5F]'
              }`}
            >
              All Categories
            </button>
            {B2C_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.slug}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-premium-sm text-sm font-medium transition-all duration-200 ${
                    selectedCategory && categories.find((c) => c.id === selectedCategory)?.slug === cat.slug
                      ? 'bg-gold text-jet'
                      : 'bg-white text-gray-600 hover:bg-white/80 hover:text-[#1E3A5F]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container-cinematic py-8">
        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search w-full pl-12"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1E3A5F]"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white text-gray-900 border border-gray-200 rounded-premium-sm px-4 py-2 text-sm focus:outline-none focus:border-gold"
            >
              <option value="createdAt_desc">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Top Rated</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-glass flex items-center gap-2 ${showFilters ? 'bg-[#1E3A5F]/10 border-[#1E3A5F]/30 text-[#1E3A5F]' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-glass text-sm flex items-center gap-1 text-gray-600">
                <X className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-gray-600 text-sm mb-2">Condition</label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-200 rounded-premium-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
              >
                <option value="">All Conditions</option>
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-2">Max Price: £{priceRange[1].toLocaleString()}</label>
              <input
                type="range"
                min={0}
                max={10000}
                step={50}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="w-full accent-gold"
              />
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-200 rounded-premium-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <p className="text-gray-400 text-sm mb-4">{products.length} products found</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="btn-primary">
              Clear Filters
            </button>
          </div>
        )}

        {/* B2B upsell banner */}
        <div className="mt-16 card-glass p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Looking for bulk stock or pallet deals?</h3>
            <p className="text-gray-500">Browse our B2B marketplace for wholesale lots, liquidation stock and pallet deals.</p>
          </div>
          <Link to="/category/wholesale" className="btn-primary flex items-center gap-2 whitespace-nowrap">
            Shop Bulk &amp; Pallets
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
