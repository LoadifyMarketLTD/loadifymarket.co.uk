import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryConfig } from "@/lib/category-config";

export default function CategoriesOverview() {
  const { categories, loading } = useCategories();

  return (
    <section className="py-20 bg-white" aria-labelledby="categories-heading">
      <div className="max-w-6xl mx-auto px-4">

        <div className="text-center mb-12">
          <h2 id="categories-heading" className="text-3xl font-bold text-gray-900 mb-4">
            Browse All Categories
          </h2>
          <p className="text-lg text-gray-600">
            Discover products and services across every major UK marketplace category.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-gray-100 animate-pulse"
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
              const iconColor = config?.iconColor ?? "text-green-700";
              const accentBg = config?.accentBg ?? "bg-green-50";
              return (
                <Link
                  key={cat.slug}
                  to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border border-gray-100 bg-white hover:border-green-300 hover:shadow-md transition-all group text-center"
                >
                  {Icon ? (
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center ${accentBg}`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                      <span className="text-green-700 font-bold text-sm" aria-hidden="true">
                        {cat.name.charAt(0)}
                      </span>
                    </span>
                  )}
                  <span className="text-sm font-semibold text-gray-800 leading-tight group-hover:text-green-700 transition-colors">
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
            className="inline-flex items-center gap-2 text-green-700 font-semibold hover:underline"
          >
            Browse All Listings →
          </Link>
        </div>

      </div>
    </section>
  );
}
