import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';
import { Grid, List, Search, X, Package, Truck, Sparkles, ArrowRight, Filter } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function CatalogPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('type') || '');
  const [selectedListingType, setSelectedListingType] = useState<string>(searchParams.get('listingType') || '');
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .is('parentId', null)
          .order('order', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('isActive', true)
        .eq('isApproved', true);

      // Apply search query
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply category filter
      if (selectedCategory) {
        query = query.eq('categoryId', selectedCategory);
      }

      // Apply other filters
      if (selectedCondition) {
        query = query.eq('condition', selectedCondition);
      }
      if (selectedType) {
        query = query.eq('type', selectedType);
      }
      // Apply listing type filter
      if (selectedListingType) {
        query = query.eq('listingType', selectedListingType);
      }
      query = query.gte('price', priceRange[0]).lte('price', priceRange[1]);

      // Apply sorting
      const [field, direction] = sortBy.split('_');
      query = query.order(field, { ascending: direction === 'asc' });

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [sortBy, selectedCondition, selectedType, selectedListingType, priceRange, searchQuery, selectedCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Get page title based on type filter
  const getPageTitle = () => {
    switch (selectedType) {
      case 'logistics':
        return 'Logistics Loads';
      case 'pallet':
        return 'Pallets & Wholesale';
      case 'handmade':
        return 'Handmade & Artisan';
      default:
        return 'Product Catalog';
    }
  };

  // Get type icon
  const getTypeIcon = () => {
    switch (selectedType) {
      case 'logistics':
        return Truck;
      case 'pallet':
        return Package;
      case 'handmade':
        return Sparkles;
      default:
        return Package;
    }
  };

  const TypeIcon = getTypeIcon();

  return (
    <div className="bg-jet min-h-screen pt-24">
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-graphite/50 to-jet py-12">
        <div className="container-cinematic">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-premium-sm bg-gold/20">
              <TypeIcon className="w-8 h-8 text-gold" />
            </div>
            <div>
              <h1 className="heading-section text-white">{getPageTitle()}</h1>
              <p className="text-white/60 mt-1">
                {products.length} {products.length === 1 ? 'item' : 'items'} available
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mt-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, pallets, lots..."
              className="input-search w-full pl-12 pr-12"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-gold transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Quick Type Filters */}
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => setSelectedType('')}
              className={`px-4 py-2 rounded-premium-sm font-medium transition-all duration-300 ${
                !selectedType
                  ? 'bg-gold text-jet'
                  : 'bg-graphite text-white hover:bg-graphite/80'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setSelectedType('logistics')}
              className={`px-4 py-2 rounded-premium-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                selectedType === 'logistics'
                  ? 'bg-gold text-jet'
                  : 'bg-graphite text-white hover:bg-graphite/80'
              }`}
            >
              <Truck className="w-4 h-4" />
              Logistics
            </button>
            <button
              onClick={() => setSelectedType('pallet')}
              className={`px-4 py-2 rounded-premium-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                selectedType === 'pallet'
                  ? 'bg-gold text-jet'
                  : 'bg-graphite text-white hover:bg-graphite/80'
              }`}
            >
              <Package className="w-4 h-4" />
              Pallets
            </button>
            <button
              onClick={() => setSelectedType('handmade')}
              className={`px-4 py-2 rounded-premium-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                selectedType === 'handmade'
                  ? 'bg-gold text-jet'
                  : 'bg-graphite text-white hover:bg-graphite/80'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Handmade
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container-cinematic py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-glass flex items-center gap-2 ${showFilters ? 'border-gold/50' : ''}`}
            >
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field py-2 px-4 bg-graphite border-white/10"
            >
              <option value="createdAt_desc">Newest First</option>
              <option value="createdAt_asc">Oldest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Highest Rated</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex bg-graphite rounded-premium-sm overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-gold text-jet'
                  : 'text-white/60 hover:text-white'
              }`}
              aria-label="Grid view"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 transition-colors ${
                viewMode === 'list'
                  ? 'bg-gold text-jet'
                  : 'text-white/60 hover:text-white'
              }`}
              aria-label="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-72 flex-shrink-0">
              <div className="card-glass sticky top-28">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Filters</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-white/40 hover:text-white transition-colors lg:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Category */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/60 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Condition */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/60 mb-2">Condition</label>
                  <select
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Conditions</option>
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </div>

                {/* Listing Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/60 mb-2">Marketplace</label>
                  <select
                    value={selectedListingType}
                    onChange={(e) => setSelectedListingType(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Listings</option>
                    <option value="pallet">Pallet & Wholesale</option>
                    <option value="retail">Retail (Piece-by-Piece)</option>
                    <option value="handmade">Handmade & Artisan</option>
                    <option value="logistics">Logistics Jobs</option>
                  </select>
                </div>

                {/* Divider */}
                <div className="divider-fade my-6" />

                {/* Clear Filters */}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                    setSelectedType('');
                    setSelectedListingType('');
                    setSelectedCondition('');
                    setPriceRange([0, 10000]);
                    setSortBy('createdAt_desc');
                  }}
                  className="w-full btn-outline py-3 text-sm"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* Products Grid/List */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/60">Loading products...</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="card-glass text-center py-16">
                <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
                <p className="text-white/60 mb-6">Try adjusting your filters or search criteria.</p>
                <button
                  onClick={() => {
                    setSelectedType('');
                    setSelectedCondition('');
                    setSelectedListingType('');
                    setSearchQuery('');
                    setPriceRange([0, 10000]);
                  }}
                  className="btn-primary"
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="card-glass flex gap-6 hover:scale-[1.01] transition-all duration-300 group"
                  >
                    {/* Product Image */}
                    <div className="w-48 h-48 flex-shrink-0 rounded-premium-sm overflow-hidden bg-graphite">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 py-2">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg text-white group-hover:text-gold transition-colors">
                            {product.title}
                          </h3>
                          {product.type !== 'product' && (
                            <span className="badge-gold mt-2 inline-block">
                              {product.type.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="price-tag">
                            {new Intl.NumberFormat('en-GB', {
                              style: 'currency',
                              currency: 'GBP',
                            }).format(product.price)}
                          </p>
                          <p className="text-xs text-white/40">VAT included</p>
                        </div>
                      </div>

                      <p className="text-white/60 text-sm mb-4 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-white/40">
                          <span className="capitalize">{product.condition}</span>
                          <span>•</span>
                          <span>{product.stockQuantity} available</span>
                          {product.rating > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-gold">
                                {'★'.repeat(Math.round(product.rating))} ({product.reviewCount})
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-gold font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
