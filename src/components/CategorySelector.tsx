import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

interface CategorySelectorProps {
  selectedCategoryId: string;
  selectedSubcategoryId?: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange?: (subcategoryId: string) => void;
}

/** Shared Tailwind classes for each option row. */
const optionBase =
  'w-full flex items-center justify-between rounded-md text-base text-left transition-colors hover:bg-blue-50 px-3.5 py-2.5';
const optionSelected = 'bg-blue-100 text-blue-800 font-medium';
const optionDefault = 'text-gray-700';

/** Shared Tailwind classes for the scrollable panel. */
const panelClasses =
  'absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto max-h-[300px] p-2';

export default function CategorySelector({
  selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
}: CategorySelectorProps) {
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const subcategoryRef = useRef<HTMLDivElement>(null);

  // Fetch main categories (parentId is null). Order by name to avoid the
  // reserved-word pitfall with the "order" column in PostgREST.
  useEffect(() => {
    const fetchMainCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .is('parentId', null)
          .order('name', { ascending: true });

        if (error) throw error;
        setMainCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
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
          .order('name', { ascending: true });

        if (error) throw error;
        setSubcategories(data || []);
      } catch (err) {
        console.error('Error fetching subcategories:', err);
      }
    };

    fetchSubcategories();
  }, [selectedCategoryId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
      if (subcategoryRef.current && !subcategoryRef.current.contains(e.target as Node)) {
        setSubcategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Escape') setCategoryOpen(false);
    },
    [],
  );

  const handleSubcategoryKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Escape') setSubcategoryOpen(false);
    },
    [],
  );

  const selectedCategory = mainCategories.find((c) => c.id === selectedCategoryId);
  const selectedSubcategory = subcategories.find((c) => c.id === selectedSubcategoryId);

  if (loading) {
    return <div className="text-gray-500 text-sm py-2">Loading categories…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Main Category */}
      <div>
        <label id="category-label" className="block text-sm font-medium text-gray-700 mb-2">
          Main Category *
        </label>
        <div ref={categoryRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={categoryOpen}
            aria-labelledby="category-label"
            onKeyDown={handleCategoryKeyDown}
            onClick={() => setCategoryOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          >
            <span className={selectedCategory ? 'text-gray-900' : 'text-gray-400'}>
              {selectedCategory ? selectedCategory.name : 'Select a category'}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${categoryOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {categoryOpen && (
            <ul role="listbox" aria-labelledby="category-label" className={panelClasses}>
              {mainCategories.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-500">No categories found</li>
              ) : (
                mainCategories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;
                  return (
                    <li key={category.id} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => {
                          onCategoryChange(category.id);
                          if (onSubcategoryChange) onSubcategoryChange('');
                          setCategoryOpen(false);
                        }}
                        className={`${optionBase} ${isSelected ? optionSelected : optionDefault}`}
                      >
                        {category.name}
                        {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Subcategory (if applicable) */}
      {subcategories.length > 0 && (
        <div>
          <label id="subcategory-label" className="block text-sm font-medium text-gray-700 mb-2">
            Subcategory (Optional)
          </label>
          <div ref={subcategoryRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={subcategoryOpen}
              aria-labelledby="subcategory-label"
              onKeyDown={handleSubcategoryKeyDown}
              onClick={() => setSubcategoryOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <span className={selectedSubcategory ? 'text-gray-900' : 'text-gray-400'}>
                {selectedSubcategory ? selectedSubcategory.name : 'None'}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${subcategoryOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {subcategoryOpen && (
              <ul role="listbox" aria-labelledby="subcategory-label" className={panelClasses}>
                {/* "None" option */}
                <li role="option" aria-selected={!selectedSubcategoryId}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSubcategoryChange) onSubcategoryChange('');
                      setSubcategoryOpen(false);
                    }}
                    className={`${optionBase} ${!selectedSubcategoryId ? optionSelected : optionDefault}`}
                  >
                    None
                    {!selectedSubcategoryId && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                </li>

                {subcategories.map((category) => {
                  const isSelected = selectedSubcategoryId === category.id;
                  return (
                    <li key={category.id} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSubcategoryChange) onSubcategoryChange(category.id);
                          setSubcategoryOpen(false);
                        }}
                        className={`${optionBase} ${isSelected ? optionSelected : optionDefault}`}
                      >
                        {category.name}
                        {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
