import { SlidersHorizontal, Search, X } from 'lucide-react';

interface CatalogHeaderProps {
  title: string;
  subtitle?: string;
  totalCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Newest First' },
  { value: 'price_asc',      label: 'Price: Low to High' },
  { value: 'price_desc',     label: 'Price: High to Low' },
  { value: 'name_asc',       label: 'Name: A–Z' },
];

/**
 * CatalogHeader — top area of the catalog/shop page showing the page title,
 * live search input, result count, filter toggle, and sort dropdown.
 */
export default function CatalogHeader({
  title,
  subtitle,
  totalCount,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  showFilters,
  onToggleFilters,
  sortBy,
  onSortChange,
}: CatalogHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container-market py-6">
        {/* Title row */}
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>

        {/* Controls row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <form
            className="relative flex-1"
            onSubmit={(e) => { e.preventDefault(); onSearchSubmit(); }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="w-full h-10 pl-9 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#0A2239] focus:ring-1 focus:ring-[#0A2239] bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Result count + sort + filter toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-gray-500 whitespace-nowrap hidden sm:inline">
              {totalCount.toLocaleString()} result{totalCount !== 1 ? 's' : ''}
            </span>

            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-10 pl-3 pr-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#0A2239] focus:ring-1 focus:ring-[#0A2239] bg-white"
              aria-label="Sort results"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={onToggleFilters}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-colors ${
                showFilters
                  ? 'bg-[#0A2239] border-[#0A2239] text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-[#0A2239] hover:text-[#0A2239]'
              }`}
              aria-pressed={showFilters}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>

        {/* Mobile result count */}
        <p className="mt-2 text-xs text-gray-400 sm:hidden">
          {totalCount.toLocaleString()} result{totalCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
