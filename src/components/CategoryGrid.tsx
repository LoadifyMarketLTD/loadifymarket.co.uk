import { Link } from "react-router-dom";
import { Package } from "lucide-react";

/**
 * Shop by Category — 2 rows × 3 equal cards.
 * Matches reference: clean white cards, image fills top, category name centred below.
 * Categories: Electronics · Fashion · Home & Garden · Beauty & Health · Automotive · Deals
 */

const CATEGORIES = [
  {
    slug: "electronics",
    label: "Electronics",
    img: "/images/products/laptop.webp",
    deals: false,
  },
  {
    slug: "fashion",
    label: "Fashion",
    img: "/images/categories/fashion.webp",
    deals: false,
  },
  {
    slug: "home-kitchen",
    label: "Home & Garden",
    img: "/images/categories/home-kitchen.webp",
    deals: false,
  },
  {
    slug: "beauty",
    label: "Beauty & Health",
    img: "/images/categories/beauty.webp",
    deals: false,
  },
  {
    slug: "automotive",
    label: "Automotive",
    img: "/images/categories/automotive.webp",
    deals: false,
  },
  {
    slug: "deals",
    label: "Deals",
    img: null,
    deals: true,
  },
];

const CategoryGrid = () => (
  <section className="bg-white py-12 px-4 sm:px-6">
    <div className="max-w-[1280px] mx-auto">

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
          Shop by Category
        </h2>
      </div>

      {/* 2 × 3 equal grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            to={`/category/${cat.slug}`}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            {/* Image area */}
            <div className="overflow-hidden aspect-[4/3] bg-gray-50">
              {cat.deals ? (
                /* Deals: gold gradient tile with package icon */
                <div className="w-full h-full bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center relative">
                  <div className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  <Package className="h-14 w-14 text-amber-800/70 drop-shadow" aria-hidden="true" />
                </div>
              ) : (
                <img
                  src={cat.img!}
                  alt={cat.label}
                  width="400"
                  height="300"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    if (el.src.endsWith(".webp")) {
                      el.src = el.src.replace(".webp", ".jpg");
                    }
                  }}
                />
              )}
            </div>

            {/* Label */}
            <div className="py-3 px-2 text-center">
              <p className="text-sm font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                {cat.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  </section>
);

export default CategoryGrid;

