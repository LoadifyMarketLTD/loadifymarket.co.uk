import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryConfig } from "@/lib/category-config";

export default function CategoriesOverview() {
  const { categories, loading } = useCategories();

  return (
    <section className="py-20 bg-background" aria-labelledby="categories-heading">
      <div className="max-w-6xl mx-auto px-4">

        <div className="text-center mb-12">
          <h2 id="categories-heading" className="text-3xl font-bold text-white mb-4">
            Browse All Categories
          </h2>
          <p className="text-lg text-slate-400">
            Discover products and services across every major UK marketplace category.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-white/5 animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {!loading && categories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => {
              const config = getCategoryConfig(cat.slug);
              const Icon = config?.icon;
              return (
                <Link
                  key={cat.slug}
                  to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-white/5 bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_22px_rgba(212,175,55,0.15)] hover:border-primary/40 group text-center"
                >
                  {Icon ? (
                    <Icon
                      className="w-7 h-7 text-primary shrink-0"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.35))' }}
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="text-primary font-bold text-lg"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.35))' }}
                      aria-hidden="true"
                    >
                      {cat.name.charAt(0)}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-slate-300 leading-tight group-hover:text-white transition-colors">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Browse All Listings →
          </Link>
        </div>

      </div>
    </section>
  );
}
