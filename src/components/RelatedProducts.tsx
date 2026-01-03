import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

interface RelatedProductsProps {
  currentProduct: Product;
  maxProducts?: number;
}

export default function RelatedProducts({ currentProduct, maxProducts = 6 }: RelatedProductsProps) {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatedProducts();
  }, [currentProduct.id]);

  const fetchRelatedProducts = async () => {
    setLoading(true);
    try {
      // Get products from same category, excluding current product
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('isApproved', true)
        .eq('status', 'active')
        .eq('categoryId', currentProduct.categoryId)
        .neq('id', currentProduct.id)
        .limit(maxProducts);

      if (error) throw error;

      // If we have subcategory, prioritize those
      if (currentProduct.subcategoryId && data) {
        const subcategoryMatches = data.filter(p => p.subcategoryId === currentProduct.subcategoryId);
        const otherMatches = data.filter(p => p.subcategoryId !== currentProduct.subcategoryId);
        setRelatedProducts([...subcategoryMatches, ...otherMatches].slice(0, maxProducts));
      } else {
        setRelatedProducts(data || []);
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
      setRelatedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-bold mb-6">You might also like</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg mb-2"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-6">You might also like</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {relatedProducts.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="group"
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-300" />
                </div>
              )}
              {product.condition !== 'new' && (
                <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-medium">
                  {product.condition === 'used' ? 'Used' : 'Refurbished'}
                </div>
              )}
            </div>
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-navy-800 transition-colors">
              {product.title}
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-bold text-navy-800">
                £{product.price.toFixed(2)}
              </span>
              {product.priceExVat && (
                <span className="text-xs text-gray-500">
                  (£{product.priceExVat.toFixed(2)} ex VAT)
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
