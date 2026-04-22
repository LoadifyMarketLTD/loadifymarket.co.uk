import { Link } from "react-router-dom";
import { GLOBAL_CATEGORY_TREE } from "@/data/globalCategoryTree";

/** Static listing counts shown per category (indicative until DB query added). */
/**
 * Shop by Category — global taxonomy tile grid.
 * 10 top-level categories, 3 cols mobile → 4 tablet → 5 desktop.
 * Flat, bordered tiles: no rounded cards, no gradients, no glow effects.
 */
const CategoryGrid = () => (
  <section
    className="bg-[#f4f5f7] border-b border-gray-200"
    aria-labelledby="cats-heading"
  >
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-7">

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            id="cats-heading"
            className="text-[13px] font-black text-gray-900 uppercase tracking-widest"
          >
            Shop by Category
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            10 global marketplace categories
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
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-px bg-gray-200">
        {GLOBAL_CATEGORY_TREE.map((cat) => {
          const children = cat.children ?? [];
          const sub =
            children.slice(0, 2).map((c) => c.name).join(" • ") +
            (children.length > 2 ? " • ..." : "");
          return (
            <Link
              key={cat.slug}
              to={`/catalog?category=${encodeURIComponent(cat.name)}`}
              className="flex flex-col items-start gap-1.5 px-3 py-4 bg-white hover:bg-[#f0f3f7] transition-colors group"
            >
              <span className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2 w-full">
                {cat.name}
              </span>
              {sub && (
                <span className="text-[9px] text-gray-400 uppercase tracking-wide leading-none line-clamp-1 w-full">
                  {sub}
                </span>
              )}
            </Link>
          );
        })}
      </div>

    </div>
  </section>
);

export default CategoryGrid;
