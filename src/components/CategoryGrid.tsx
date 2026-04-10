import { Link } from "react-router-dom";
import CATEGORY_CONFIG from "@/lib/category-config";

/**
 * Shop by Category — B2B flat tile grid.
 * All 17 wholesale categories, 3 cols mobile → 4 tablet → 6 desktop.
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
        <h2
          id="cats-heading"
          className="text-[13px] font-black text-gray-900 uppercase tracking-widest"
        >
          Shop by Category
        </h2>
        <Link
          to="/catalog"
          className="text-[11px] font-bold text-[#0d2240] uppercase tracking-wide hover:underline"
        >
          Browse All →
        </Link>
      </div>

      {/* Tile grid — gap-px creates hairline borders between tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-px bg-gray-200">
        {CATEGORY_CONFIG.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className="flex flex-col items-center gap-2 px-2 py-4 bg-white hover:bg-[#f0f3f7] transition-colors text-center"
            >
              <Icon className={`h-5 w-5 ${cat.iconColor}`} aria-hidden="true" />
              <span className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>

    </div>
  </section>
);

export default CategoryGrid;
