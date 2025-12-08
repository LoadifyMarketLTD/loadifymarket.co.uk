import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

interface CategorySelectorProps {
  selectedCategoryId: string;
  selectedSubcategoryId?: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange?: (subcategoryId: string) => void;
}

export default function CategorySelector({
  selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
}: CategorySelectorProps) {
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch main categories (parentId is null)
  useEffect(() => {
    const fetchMainCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .is('parentId', null)
          .order('order', { ascending: true });

        if (error) throw error;
        setMainCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMainCategories();
  }, []);

  // Fetch subcategories when main category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!selectedCategoryId) {
        setSubcategories([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('parentId', selectedCategoryId)
          .order('order', { ascending: true });

        if (error) throw error;
        setSubcategories(data || []);
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      }
    };

    fetchSubcategories();
  }, [selectedCategoryId]);

  if (loading) {
    return <div className="text-gray-600">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Main Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Main Category *
        </label>
        <select
          id="category"
          value={selectedCategoryId}
          onChange={(e) => {
            onCategoryChange(e.target.value);
            // Reset subcategory when main category changes
            if (onSubcategoryChange) {
              onSubcategoryChange('');
            }
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-800 focus:border-transparent"
          required
        >
          <option value="">Select a category</option>
          {mainCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategory (if applicable) */}
      {subcategories.length > 0 && (
        <div>
          <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-2">
            Subcategory (Optional)
          </label>
          <select
            id="subcategory"
            value={selectedSubcategoryId || ''}
            onChange={(e) => onSubcategoryChange && onSubcategoryChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-800 focus:border-transparent"
          >
            <option value="">None</option>
            {subcategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
