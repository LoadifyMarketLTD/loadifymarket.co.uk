import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { visualForCategory } from "@/data/marketplaceVisuals";

/**
 * Shop by Category — DB-driven taxonomy with canonical editorial imagery.
 * Images are navigation aids only; live inventory still comes exclusively from seller listings.
 */
const CategoryGrid = () => {
  const { categories, loading } = useCategories();

  return (
    <section className="bg-background border-b border-white/10" aria-labelledby="cats-heading">
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 id="cats-heading" className="text-[13px] font-black text-white uppercase tracking-widest">
              Shop by Category
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              {loading ? "Loading…" : `${categories.length} marketplace categories`}
            </p>
          </div>
          <Link to="/catalog" className="text-[11px] font-bold text-secondary uppercase tracking-wide hover:underline">
            Browse All →
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[4/3] rounded-xl bg-white/5 animate-pulse" aria-hidden="true" />
            ))}
          </div>
        )}

        {!loading && categories.length === 0 && (
          <p className="text-[11px] text-slate-400 text-center py-6">No categories available.</p>
        )}

        {!loading && categories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const visual = visualForCategory(cat.slug) ?? visualForCategory(cat.name);
              return (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-surface hover:border-primary/40 transition-all"
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
                      <div className="h-full w-full flex items-center justify-center text-primary text-2xl font-black">
                        {cat.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-3">
                    <span className="block text-[12px] font-bold text-white leading-tight">{cat.name}</span>
                    {cat.children.length > 0 && (
                      <span className="mt-1 block text-[9px] uppercase tracking-wide text-slate-400">
                        {cat.children.length} subcategories
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryGrid;