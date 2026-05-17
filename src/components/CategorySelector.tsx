import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

interface CategorySelectorProps {
  selectedCategoryId: string;
  selectedSubcategoryId?: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange?: (subcategoryId: string) => void;
}

type DbCategory = Category & {
  parentId?: string;
  parent_id?: string;
  level?: number;
  isActive?: boolean;
};

const resolveParentId = (category: DbCategory): string | undefined => category.parentId ?? category.parent_id;

// ── Shared select styling constants ──────────────────────────────────────────
const SELECT_CLASS =
  'w-full h-12 rounded-[14px] border border-white/10 bg-surface text-white text-sm px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';
const SELECT_STYLE: React.CSSProperties = { colorScheme: 'dark' };
const OPTION_PLACEHOLDER_STYLE: React.CSSProperties = { background: 'rgba(23,24,30,1)', color: 'rgba(142,146,154,1)' };
const OPTION_ITEM_STYLE: React.CSSProperties = { background: 'rgba(23,24,30,1)', color: 'rgba(255,255,255,1)' };

export default function CategorySelector({
  selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel2Id, setSelectedLevel2Id] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id,name,slug,parentId,isActive,order')
          .eq('isActive', true)
          .order('level', { ascending: true })
          .order('order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setCategories((data as DbCategory[]) || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const parentIdsWithChildren = useMemo(
    () => new Set(categories.map((category) => resolveParentId(category)).filter(Boolean)),
    [categories],
  );

  const level1Categories = useMemo(
    () => categories.filter((category) => !resolveParentId(category)),
    [categories],
  );

  const level2Categories = useMemo(
    () => categories.filter((category) => resolveParentId(category) === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  const level3Categories = useMemo(
    () => categories.filter((category) => resolveParentId(category) === selectedLevel2Id),
    [categories, selectedLevel2Id],
  );

  useEffect(() => {
    if (!selectedCategoryId || !selectedSubcategoryId) {
      setSelectedLevel2Id('');
      return;
    }

    const selectedNode = categoriesById.get(selectedSubcategoryId);
    if (!selectedNode) {
      setSelectedLevel2Id('');
      return;
    }

    const selectedNodeParentId = resolveParentId(selectedNode);
    if (selectedNodeParentId === selectedCategoryId) {
      setSelectedLevel2Id(selectedNode.id);
      return;
    }

    const level2Node = selectedNodeParentId ? categoriesById.get(selectedNodeParentId) : undefined;
    if (level2Node && resolveParentId(level2Node) === selectedCategoryId) {
      setSelectedLevel2Id(level2Node.id);
      return;
    }

    setSelectedLevel2Id('');
  }, [selectedCategoryId, selectedSubcategoryId, categoriesById]);

  const selectedCategory = categoriesById.get(selectedCategoryId);
  const selectedSubcategory = selectedSubcategoryId ? categoriesById.get(selectedSubcategoryId) : undefined;

  if (loading) {
    return <div className="text-gray-500 text-sm py-2">Loading categories…</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="main-category-select" className="block text-sm font-medium text-slate-300 mb-2">Main Category *</label>
        <select
          id="main-category-select"
          aria-label="Main category"
          value={selectedCategoryId}
          onChange={(e) => {
            setSelectedLevel2Id('');
            onCategoryChange(e.target.value);
            if (onSubcategoryChange) onSubcategoryChange('');
          }}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
        >
          <option value="" style={OPTION_PLACEHOLDER_STYLE}>Select a category</option>
          {level1Categories.map((category) => (
            <option key={category.id} value={category.id} style={OPTION_ITEM_STYLE}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCategoryId && level2Categories.length > 0 && (
        <div>
          <label htmlFor="subcategory-select" className="block text-sm font-medium text-slate-300 mb-2">Subcategory</label>
          <select
            id="subcategory-select"
            aria-label="Subcategory"
            value={selectedLevel2Id}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedLevel2Id(value);
              const hasChildren = parentIdsWithChildren.has(value);
              if (!onSubcategoryChange) return;
              onSubcategoryChange(hasChildren ? '' : value);
            }}
            className={SELECT_CLASS}
            style={SELECT_STYLE}
          >
            <option value="" style={OPTION_PLACEHOLDER_STYLE}>None</option>
            {level2Categories.map((category) => (
              <option key={category.id} value={category.id} style={OPTION_ITEM_STYLE}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedLevel2Id && level3Categories.length > 0 && (
        <div>
          <label htmlFor="nested-subcategory-select" className="block text-sm font-medium text-slate-300 mb-2">Nested Subcategory</label>
          <select
            id="nested-subcategory-select"
            aria-label="Nested subcategory"
            value={selectedSubcategoryId || ''}
            onChange={(e) => {
              if (onSubcategoryChange) onSubcategoryChange(e.target.value);
            }}
            className={SELECT_CLASS}
            style={SELECT_STYLE}
          >
            <option value="" style={OPTION_PLACEHOLDER_STYLE}>Select nested subcategory</option>
            {level3Categories.map((category) => (
              <option key={category.id} value={category.id} style={OPTION_ITEM_STYLE}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedCategory && (
        <nav aria-label="Category breadcrumb" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-1">
            <li>{selectedCategory.name}</li>
            {selectedLevel2Id && (
              <li>
                <span aria-hidden="true">→</span> {categoriesById.get(selectedLevel2Id)?.name ?? ''}
              </li>
            )}
            {selectedSubcategory && (
              <li aria-current="location">
                <span aria-hidden="true">→</span> {selectedSubcategory.name}
              </li>
            )}
          </ol>
        </nav>
      )}
    </div>
  );
}
