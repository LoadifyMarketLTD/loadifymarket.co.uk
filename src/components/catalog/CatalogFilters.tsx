import { X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface CatalogFiltersProps {
  show: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  onReset: () => void;
}

/**
 * CatalogFilters — collapsible filter panel displayed alongside the product
 * grid.  On mobile it slides in as an overlay; on desktop it sits in a
 * left-hand sidebar column.
 */
export default function CatalogFilters({
  show,
  onClose,
  categories,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  minPrice = 0,
  maxPrice = 10000,
  inStockOnly,
  onInStockChange,
  onReset,
}: CatalogFiltersProps) {
  if (!show) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Filter panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl overflow-y-auto p-5
          flex flex-col gap-6
          lg:static lg:inset-auto lg:z-auto lg:shadow-none lg:rounded-xl
          lg:border lg:border-gray-200 lg:h-fit
        `}
        aria-label="Product filters"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
            Filters
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 lg:hidden"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Category ──────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Category
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => onCategoryChange('')}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    !selectedCategory
                      ? 'bg-[#0A2239] text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Categories
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => onCategoryChange(cat.id)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-[#0A2239] text-white font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Price Range ───────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            Price Range
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="filter-price-min" className="text-xs text-gray-500 mb-1 block">Min (£)</label>
                <input
                  id="filter-price-min"
                  type="number"
                  min={minPrice}
                  max={priceRange[1]}
                  value={priceRange[0]}
                  onChange={(e) =>
                    onPriceRangeChange([Math.max(minPrice, Number(e.target.value)), priceRange[1]])
                  }
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#0A2239]"
                />
              </div>
              <span className="text-gray-400 text-sm mt-5">–</span>
              <div className="flex-1">
                <label htmlFor="filter-price-max" className="text-xs text-gray-500 mb-1 block">Max (£)</label>
                <input
                  id="filter-price-max"
                  type="number"
                  min={priceRange[0]}
                  max={maxPrice}
                  value={priceRange[1]}
                  onChange={(e) =>
                    onPriceRangeChange([priceRange[0], Math.min(maxPrice, Number(e.target.value))])
                  }
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#0A2239]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Availability ──────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            Availability
          </h3>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => onInStockChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#0A2239] focus:ring-[#0A2239] cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">
              In Stock Only
            </span>
          </label>
        </div>

        {/* ── Reset ─────────────────────────────────────────────────── */}
        <button
          onClick={onReset}
          className="w-full text-sm text-gray-500 hover:text-[#0A2239] underline text-left transition-colors"
        >
          Reset all filters
        </button>
      </aside>
    </>
  );
}
