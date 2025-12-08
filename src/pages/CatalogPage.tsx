import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';
import { Grid, List, SlidersHorizontal, Search, X } from 'lucide-react';

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Search */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Product Catalog</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-800 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-gray-600">
            {products.length} {products.length === 1 ? 'product' : 'products'} found
          </div>
          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            <div className="flex bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-navy-800 text-white' : 'text-gray-600'} rounded-l-lg transition-colors`}
                aria-label="Grid view"
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-navy-800 text-white' : 'text-gray-600'} rounded-r-lg transition-colors`}
                aria-label="List view"
              >
                <List className="h-5 w-5" />
              </button>
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-outline flex items-center space-x-2"
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0">
              <div className="card sticky top-4">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>
                
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

          {/* Products Grid/List */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading products...</div>
              </div>
            ) : products.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-600 mb-4">No products found matching your criteria.</p>
                <button
                  onClick={() => {
                    setSelectedType('');
                    setSelectedCondition('');
                    setPriceRange([0, 10000]);
                  }}
                  className="btn-primary"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className={`card hover:shadow-lg transition-shadow ${viewMode === 'list' ? 'flex gap-4' : ''}`}
                  >
                    {/* Product Image */}
                    <div className={viewMode === 'list' ? 'w-48 flex-shrink-0' : 'w-full'}>
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className={`w-full ${viewMode === 'grid' ? 'h-48' : 'h-full'} object-cover rounded-lg`}
                        />
                      ) : (
                        <div className={`w-full ${viewMode === 'grid' ? 'h-48' : 'h-full'} bg-gray-200 rounded-lg flex items-center justify-center`}>
                          <span className="text-gray-400">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="mt-4 flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg line-clamp-2">{product.title}</h3>
                        {product.type !== 'product' && (
                          <span className="bg-gold-500 text-white text-xs px-2 py-1 rounded ml-2 flex-shrink-0">
                            {product.type.toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <p className="text-2xl font-bold text-navy-800">{formatPrice(product.price)}</p>
                          <p className="text-xs text-gray-500">VAT included</p>
                        </div>
                        
                        {product.stockStatus === 'in_stock' ? (
                          <span className="text-green-600 text-sm font-medium">In Stock</span>
                        ) : product.stockStatus === 'low_stock' ? (
                          <span className="text-orange-600 text-sm font-medium">Low Stock</span>
                        ) : (
                          <span className="text-red-600 text-sm font-medium">Out of Stock</span>
                        )}
                      </div>

                      {product.rating > 0 && (
                        <div className="flex items-center mt-2">
                          <div className="flex text-gold-500">
                            {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
                          </div>
                          <span className="text-sm text-gray-600 ml-2">({product.reviewCount})</span>
                        </div>
                      )}
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
