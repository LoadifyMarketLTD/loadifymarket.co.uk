import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store';
import type { Product } from '../types';
import { Link } from 'react-router-dom';
import { Package, Plus, ShoppingCart, Check } from 'lucide-react';

interface FrequentlyBoughtTogetherProps {
  productId: string;
  currentProduct: Product;
}

interface ProductBundle {
  product: Product;
  frequency: number;
}

export default function FrequentlyBoughtTogether({ productId, currentProduct }: FrequentlyBoughtTogetherProps) {
  const [bundleProducts, setBundleProducts] = useState<ProductBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set([productId]));
  const { addItem } = useCartStore();

  const fetchFrequentlyBoughtTogether = useCallback(async () => {
    setLoading(true);
    try {
      // Check if order_items table exists by trying to query it
      let orderIds: string[] = [];
      
      // Try to use order_items table first
      const { error: orderError } = await supabase
        .from('order_items')
        .select('orderId')
        .eq('productId', productId)
        .limit(1);

      if (orderError) {
        // Fallback to orders table if order_items doesn't exist
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id')
          .eq('productId', productId);

        if (ordersError) throw ordersError;
        orderIds = orders?.map(o => o.id) || [];
      } else {
        // Use order_items table
        const { data: allItems, error: allError } = await supabase
          .from('order_items')
          .select('orderId')
          .eq('productId', productId);

        if (allError) throw allError;
        orderIds = [...new Set(allItems?.map(item => item.orderId) || [])];
      }

      if (orderIds.length === 0) {
        setLoading(false);
        return;
      }

      // Find other products in those orders
      let otherProductIds: string[] = [];
      
      if (!orderError) {
        // Use order_items table
        const { data: otherItems, error: otherError } = await supabase
          .from('order_items')
          .select('productId')
          .in('orderId', orderIds)
          .neq('productId', productId);

        if (otherError) throw otherError;
        otherProductIds = otherItems?.map(item => item.productId) || [];
      } else {
        // Fallback to orders table - get products from same buyers
        const { data: buyerOrders, error: buyerError } = await supabase
          .from('orders')
          .select('buyerId')
          .in('id', orderIds);

        if (buyerError) throw buyerError;
        
        const buyerIds = [...new Set(buyerOrders?.map(o => o.buyerId) || [])];
        
        const { data: otherOrders, error: otherOrdersError } = await supabase
          .from('orders')
          .select('productId')
          .in('buyerId', buyerIds)
          .neq('productId', productId);

        if (otherOrdersError) throw otherOrdersError;
        otherProductIds = otherOrders?.map(o => o.productId) || [];
      }

      if (otherProductIds.length === 0) {
        setLoading(false);
        return;
      }

      // Count frequency of each product
      const productFrequency: { [key: string]: number } = {};
      otherProductIds.forEach(id => {
        productFrequency[id] = (productFrequency[id] || 0) + 1;
      });

      // Get top 3 most frequently bought together products
      const topProductIds = Object.entries(productFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([id]) => id);

      if (topProductIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch product details
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', topProductIds)
        .eq('isApproved', true)
        .eq('isActive', true);

      if (productsError) throw productsError;

      if (products) {
        const bundles = products.map(product => ({
          product,
          frequency: productFrequency[product.id]
        }));
        setBundleProducts(bundles);
      }
    } catch (error) {
      console.error('Error fetching frequently bought together:', error);
      setBundleProducts([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchFrequentlyBoughtTogether();
  }, [fetchFrequentlyBoughtTogether]);

  const toggleProductSelection = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      // Don't allow deselecting the current product
      if (id !== productId) {
        newSelected.delete(id);
      }
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const calculateTotalPrice = () => {
    let total = 0;
    if (selectedProducts.has(productId)) {
      total += currentProduct.price;
    }
    bundleProducts.forEach(({ product }) => {
      if (selectedProducts.has(product.id)) {
        total += product.price;
      }
    });
    return total;
  };

  const handleAddAllToCart = () => {
    // Add current product if selected
    if (selectedProducts.has(productId)) {
      addItem({
        productId: currentProduct.id,
        quantity: 1,
        price: currentProduct.price,
      });
    }

    // Add bundle products
    bundleProducts.forEach(({ product }) => {
      if (selectedProducts.has(product.id)) {
        addItem({
          productId: product.id,
          quantity: 1,
          price: product.price,
        });
      }
    });

    alert(`Added ${selectedProducts.size} item(s) to cart!`);
  };

  if (loading) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-bold mb-6">Frequently Bought Together</h2>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-48 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (bundleProducts.length === 0) {
    return null;
  }

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-6">Frequently Bought Together</h2>
      
      <div className="card-glass">
        <div className="space-y-6">
          {/* Product List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Product */}
            <div className="relative">
              <div
                className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                  selectedProducts.has(productId)
                    ? 'border-gold bg-gold/5'
                    : 'border-white/20 hover:border-white/40'
                }`}
                onClick={() => toggleProductSelection(productId)}
              >
                {selectedProducts.has(productId) && (
                  <div className="absolute -top-2 -right-2 bg-gold rounded-full p-1">
                    <Check className="w-4 h-4 text-navy-900" />
                  </div>
                )}
                
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
                  {currentProduct.images && currentProduct.images.length > 0 ? (
                    <img
                      src={currentProduct.images[0]}
                      alt={currentProduct.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>
                
                <h3 className="font-medium text-sm line-clamp-2 mb-2 text-white">
                  This item
                </h3>
                <p className="font-bold text-gold">
                  £{currentProduct.price.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Bundle Products */}
            {bundleProducts.map(({ product }) => (
              <div key={product.id} className="relative">
                <div
                  className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                    selectedProducts.has(product.id)
                      ? 'border-gold bg-gold/5'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  onClick={() => toggleProductSelection(product.id)}
                >
                  {selectedProducts.has(product.id) && (
                    <div className="absolute -top-2 -right-2 bg-gold rounded-full p-1">
                      <Check className="w-4 h-4 text-navy-900" />
                    </div>
                  )}
                  
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                  
                  <Link
                    to={`/product/${product.id}`}
                    className="font-medium text-sm line-clamp-2 mb-2 text-white hover:text-gold transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {product.title}
                  </Link>
                  <p className="font-bold text-gold">
                    £{product.price.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Plus Icons */}
          <div className="flex items-center justify-center gap-4 -mt-3">
            {bundleProducts.map((_, index) => (
              <Plus key={index} className="w-5 h-5 text-white/40" />
            ))}
          </div>

          {/* Total and Add to Cart */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            <div>
              <p className="text-sm text-white/60 mb-1">
                Total for {selectedProducts.size} item{selectedProducts.size !== 1 ? 's' : ''}
              </p>
              <p className="text-3xl font-bold text-gold">
                £{calculateTotalPrice().toFixed(2)}
              </p>
            </div>
            <button
              onClick={handleAddAllToCart}
              disabled={selectedProducts.size === 0}
              className="btn-primary flex items-center gap-2 px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" />
              Add {selectedProducts.size} to Cart
            </button>
          </div>

          <p className="text-xs text-white/40 text-center">
            Click on items to select or deselect them
          </p>
        </div>
      </div>
    </div>
  );
}
