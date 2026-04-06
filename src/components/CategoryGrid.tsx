import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Shop by Category — 3×2 premium grid with full-bleed image overlays.
 * Light premium background between the dark sections.
 */

const CATEGORIES = [
  {
    slug: "electronics",
    label: "Electronics",
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "fashion",
    label: "Fashion",
    img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "home-kitchen",
    label: "Home & Garden",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "beauty",
    label: "Beauty & Health",
    img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "automotive",
    label: "Automotive",
    img: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    img: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80",
  },
];

const CategoryGrid = () => (
  <section className="bg-[#F8F9FC] py-10 px-4 sm:px-6">
    <div className="max-w-[1280px] mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">
            Browse Sections
          </span>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
            Shop by Category
          </h2>
        </div>
        <Link
          to="/catalog"
          className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED] hover:text-[#5B21B6] transition-colors"
        >
          All Categories <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* 3×2 premium image-overlay grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            to={`/category/${cat.slug}`}
            className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            style={{ aspectRatio: "4/3" }}
          >
            <img
              src={cat.img}
              alt={cat.label}
              width="800"
              height="600"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 via-[#0F172A]/15 to-transparent" />
            {/* Hover ring */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/0 group-hover:ring-white/20 rounded-2xl transition-all duration-300" />
            {/* Label */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
              <p className="text-sm font-bold text-white leading-tight">{cat.label}</p>
              <span className="w-7 h-7 rounded-full bg-white/10 border border-white/20 group-hover:bg-[#22C55E] group-hover:border-[#22C55E] flex items-center justify-center transition-all duration-200 shrink-0">
                <ArrowRight className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>

    </div>
  </section>
);

export default CategoryGrid;

