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

// B2C product types (excludes bulk/pallet/wholesale/logistics)
const B2C_TYPES = ['product', 'retail', 'handmade', 'clearance'];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedCondition, setSelectedCondition] = useState<string>('');
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
        .eq('isApproved', true)
        .in('type', B2C_TYPES);

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
    <div className="min-h-screen bg-jet">
      {/* Page Header */}
      <div className="bg-graphite/30 border-b border-white/10 py-10">
        <div className="container-cinematic">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="h-7 w-7 text-gold" />
            <h1 className="text-3xl font-bold text-white">Shop Products</h1>
          </div>
          <p className="text-white/60">Browse electronics, fashion, home goods, tools, vehicles &amp; more</p>
        </div>
      </div>

      {/* Category Quick-Nav */}
      <div className="bg-jet border-b border-white/10 py-4">
        <div className="container-cinematic">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleCategoryClick('')}
              className={`flex items-center gap-2 px-4 py-2 rounded-premium-sm text-sm font-medium transition-all duration-200 ${
                !selectedCategory
                  ? 'bg-gold text-jet'
                  : 'bg-graphite text-white/70 hover:bg-graphite/80 hover:text-white'
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
                      : 'bg-graphite text-white/70 hover:bg-graphite/80 hover:text-white'
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
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
              <label className="block text-white/70 text-sm mb-2">Condition</label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full bg-graphite text-white border border-white/10 rounded-premium-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
              >
                <option value="">All Conditions</option>
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Max Price: £{priceRange[1].toLocaleString()}</label>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-glass aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <p className="text-white/50 text-sm mb-4">{products.length} products found</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <ShoppingBag className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
            <p className="text-white/50 mb-6">Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="btn-primary">
              Clear Filters
            </button>
          </div>
        )}

        {/* B2B upsell banner */}
        <div className="mt-16 card-glass p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Looking for bulk stock or pallet deals?</h3>
            <p className="text-white/60">Browse our B2B marketplace for wholesale lots, liquidation stock and pallet deals.</p>
          </div>
          <Link to="/bulk" className="btn-primary flex items-center gap-2 whitespace-nowrap">
            Shop Bulk &amp; Pallets
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
