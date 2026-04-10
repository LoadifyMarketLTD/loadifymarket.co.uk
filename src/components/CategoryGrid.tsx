import { Link } from "react-router-dom";
import CATEGORY_CONFIG from "@/lib/category-config";

/** Static listing counts shown per category (indicative until DB query added). */
const CAT_COUNTS: Record<string, string> = {
  "large-letter-items":   "Stationery & post",
  "garden":               "Tools & outdoor",
  "diy":                  "Trade & hardware",
  "cleaning":             "Janitorial supplies",
  "party-gift":           "Events & wrap",
  "wholesale-pound-lines":"Impulse & value",
  "toys":                 "Packs & bundles",
  "leisure-hobbies":      "Sports & crafts",
  "baby-supplies":        "Newborn & nursery",
  "kitchenware":          "Utensils & storage",
  "health-beauty":        "Wellness & care",
  "homeware":             "Décor & textiles",
  "electrical":           "Lighting & gadgets",
  "pet-supplies":         "Food & accessories",
  "stationery":           "Office & school",
  "seasonal":             "Gifts & festive",
  "wholesale-clothing":   "Adult & kids",
};

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
        <div>
          <h2
            id="cats-heading"
            className="text-[13px] font-black text-gray-900 uppercase tracking-widest"
          >
            Shop by Category
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            17 wholesale trade categories
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
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-px bg-gray-200">
        {CATEGORY_CONFIG.map((cat) => {
          const Icon = cat.icon;
          const sub = CAT_COUNTS[cat.slug];
          return (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className="flex flex-col items-start gap-1.5 px-3 py-4 bg-white hover:bg-[#f0f3f7] transition-colors group"
            >
              <div className="flex items-center gap-2 w-full">
                <span className="flex items-center justify-center w-8 h-8 bg-[#f4f5f7] group-hover:bg-white transition-colors shrink-0">
                  <Icon className={`h-4 w-4 ${cat.iconColor}`} aria-hidden="true" />
                </span>
              </div>
              <span className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2 w-full">
                {cat.label}
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
