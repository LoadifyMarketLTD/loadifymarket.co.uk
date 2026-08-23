import { Link } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import CategoryVisualCard from './CategoryVisualCard';

interface CategoryBrowseSectionProps {
  compact?: boolean;
}

export default function CategoryBrowseSection({ compact = false }: CategoryBrowseSectionProps) {
  const { categories, loading } = useCategories();

  if (loading) {
    return (
      <section aria-label="Browse categories" className="bg-[#F7F9FC] py-10">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section aria-label="Browse categories" className="bg-[#F7F9FC] py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#1D57D8]">Browse the marketplace</p>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-[#0A234F] md:text-3xl">Shop by category</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Explore the full marketplace structure even while new sellers are still adding stock. Category imagery is navigational and does not represent live listings.
            </p>
          </div>
          <Link to="/catalog" className="hidden shrink-0 text-sm font-bold text-[#1D57D8] hover:underline sm:inline">Browse all products</Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <CategoryVisualCard
              key={category.id}
              name={category.name}
              slug={category.slug}
              compact={compact}
            />
          ))}
        </div>

        <div className="mt-8 space-y-7">
          {categories.map((category) => (
            category.children.length > 0 ? (
              <div key={`${category.id}-children`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-[#0A234F]">{category.name}</h3>
                  <Link to={`/category/${category.slug}`} className="text-xs font-bold text-[#1D57D8] hover:underline">View category</Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {category.children.map((child) => (
                    <CategoryVisualCard
                      key={child.id}
                      name={child.name}
                      slug={child.slug}
                      parentSlug={category.slug}
                      compact
                    />
                  ))}
                </div>
              </div>
            ) : null
          ))}
        </div>
      </div>
    </section>
  );
}
