import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";

/**
 * Shop by Category — DB-driven taxonomy tile grid.
 * Top-level categories from the DB, 3 cols mobile → 4 tablet → 5 desktop.
 * Flat, bordered tiles: no rounded cards, no gradients, no glow effects.
 */
const CategoryGrid = () => {
  const { categories, loading } = useCategories();

  return (
    <section
    className="bg-[#0A0E1A] border-b border-white/10"
      aria-labelledby="cats-heading"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-7">

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              id="cats-heading"
              className="text-[13px] font-black text-white uppercase tracking-widest"
            >
              Shop by Category
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {loading ? "Loading…" : `${categories.length} marketplace categories`}
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-[11px] font-bold text-[#0d2240] uppercase tracking-wide hover:underline"
          >
            Browse All →
          </Link>
        </div>

        {/* Tile grid — gap-px creates hairline borders between tiles */}
        {!loading && categories.length === 0 && (
          <p className="text-[11px] text-slate-400 text-center py-4">
            No categories available.
          </p>
        )}
        {!loading && categories.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-px bg-white/5">
            {categories.map((cat) => {
              const sub =
                cat.children.slice(0, 2).map((c) => c.name).join(" • ") +
                (cat.children.length > 2 ? " • ..." : "");
              return (
                <Link
                  key={cat.slug}
                  to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                  className="flex flex-col items-start gap-1.5 px-3 py-4 bg-[#121A2B] hover:bg-[#182235] transition-colors group"
                >
                  <span className="text-[11px] font-bold text-white leading-tight line-clamp-2 w-full">
                    {cat.name}
                  </span>
                  {sub && (
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide leading-none line-clamp-1 w-full">
                      {sub}
                    </span>
                  )}
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
