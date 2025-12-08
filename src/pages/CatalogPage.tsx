import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';
import { Grid, List, SlidersHorizontal, Search, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function CatalogPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
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

  return (
    <div className="bg-smoke min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Search - Cinematic */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-jet">Product Catalog</h1>
          
          {/* Search Bar - Cinematic */}
          <div className="relative max-w-3xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, pallets, handmade items..."
              className="w-full pl-14 pr-12 py-4 border-2 border-gray-300 rounded-cinematic-md focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition-all duration-300 shadow-cinematic text-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold-400 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar - Cinematic */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-gray-600 font-medium text-lg">
            <span className="text-jet font-bold">{products.length}</span> {products.length === 1 ? 'product' : 'products'} found
          </div>
          <div className="flex items-center space-x-4">
            {/* View Toggle - Cinematic */}
            <div className="flex bg-white rounded-cinematic-md border-2 border-gray-200 shadow-cinematic overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 ${viewMode === 'grid' ? 'bg-jet text-gold-400' : 'text-gray-600 hover:bg-gray-50'} transition-all duration-300`}
                aria-label="Grid view"
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 ${viewMode === 'list' ? 'bg-jet text-gold-400' : 'text-gray-600 hover:bg-gray-50'} transition-all duration-300`}
                aria-label="List view"
              >
                <List className="h-5 w-5" />
              </button>
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar - Cinematic */}
          {showFilters && (
            <div className="w-72 flex-shrink-0">
              <div className="card-glass sticky top-24 border border-white/30">
                <h2 className="text-xl font-display font-bold mb-6 text-jet">Filters</h2>
                
                {/* Category */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Category</label>
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

                {/* Product Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Product Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Types</option>
                    <option value="product">Regular Product</option>
                    <option value="pallet">Pallet</option>
                    <option value="lot">Lot</option>
                    <option value="clearance">Clearance</option>
                    <option value="retail">Retail</option>
                    <option value="handmade">Handmade</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="logistics">Logistics</option>
                  </select>
                </div>

                {/* Listing Type - New filter for marketplace diversity */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Marketplace</label>
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

                {/* Condition */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Condition</label>
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

                {/* Sort */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-field"
                  >
                    <option value="createdAt_desc">Newest First</option>
                    <option value="createdAt_asc">Oldest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating_desc">Highest Rated</option>
                  </select>
                </div>

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
                  className="w-full text-sm text-navy-800 hover:underline"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* Products Grid/List - Cinematic */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500 font-medium">Loading products...</div>
              </div>
            ) : products.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-gray-600 mb-6 text-lg">No products found matching your criteria.</p>
                <button
                  onClick={() => {
                    setSelectedType('');
                    setSelectedCondition('');
                    setPriceRange([0, 10000]);
                  }}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-6'}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
