import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { visualForCategory } from "@/data/marketplaceVisuals";

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
            Explore the marketplace through clear, representative category imagery. Live inventory appears only from approved seller listings.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="aspect-[4/3] rounded-2xl bg-white/5 animate-pulse" aria-hidden="true" />
            ))}
          </div>
        )}

        {!loading && categories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const visual = visualForCategory(cat.slug) ?? visualForCategory(cat.name);
              return (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="group overflow-hidden rounded-2xl border border-white/5 bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_22px_rgba(212,175,55,0.15)] hover:border-primary/40"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-white/5">
                    {visual ? (
                      <img
                        src={visual.image}
                        alt={visual.altText}
                        loading="lazy"
                        onError={(event) => {
                          if (event.currentTarget.dataset.fallbackApplied === "true") return;
                          event.currentTarget.dataset.fallbackApplied = "true";
                          event.currentTarget.src = "/hero-marketplace.jpg";
                        }}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-primary text-3xl font-black">
                        {cat.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    <span className="text-sm font-semibold text-slate-300 leading-tight group-hover:text-white transition-colors">
                      {cat.name}
                    </span>
                    {cat.children.length > 0 && (
                      <span className="mt-1 block text-[10px] uppercase tracking-wide text-slate-500">
                        {cat.children.length} subcategories
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="text-center mt-10">
          <Link to="/catalog" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
            Browse All Listings →
          </Link>
        </div>
      </div>
    </section>
  );
}