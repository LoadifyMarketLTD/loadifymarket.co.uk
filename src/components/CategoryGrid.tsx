import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import CATEGORY_CONFIG from "@/lib/category-config";

/**
 * Shop by Category — dark navy section.
 * 6 featured category cards using the same source of truth as the navigation drawer.
 */

// Pick 6 featured-looking wholesale categories for the homepage grid
const GRID_SLUGS = [
  "health-beauty",
  "wholesale-clothing",
  "garden",
  "kitchenware",
  "toys",
  "party-gift",
];

const GRID_CATEGORIES = GRID_SLUGS
  .map((slug) => CATEGORY_CONFIG.find((c) => c.slug === slug))
  .filter(Boolean) as typeof CATEGORY_CONFIG[number][];

const CategoryGrid = () => (
  <section
    className="relative overflow-hidden px-4 sm:px-6 py-4 sm:py-16 lg:py-20"
    style={{ background: "linear-gradient(to bottom, #081426, #0A1930, #0F2A4A)" }}
  >
    {/* Ambient glow */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: "radial-gradient(circle at 70% 30%, rgba(0,255,150,0.06), transparent 40%)" }}
    />
    {/* Dot texture */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />

    <div className="relative w-full max-w-[1280px] mx-auto">

      {/* Section header */}
      <div className="hidden sm:block text-center mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Browse Sections
        </span>
        <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-white">
          Shop by Category
        </h2>
        <p className="mt-2 text-sm text-white/70">Explore our wholesale categories.</p>
      </div>

      {/* 6 category cards — 2 cols on mobile, 3 on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {GRID_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(0,255,150,0.15)]"
              style={{ aspectRatio: "4/3" }}
            >
              <img
                src={cat.image}
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              {/* Icon badge */}
              <div className="absolute top-3 left-3">
                <div className="w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <Icon className={`h-4 w-4 ${cat.iconColor}`} aria-hidden="true" />
                </div>
              </div>
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                <p className="text-sm font-extrabold text-white leading-tight drop-shadow-sm">{cat.label}</p>
                <span className="w-7 h-7 rounded-full bg-white/20 border border-white/30 group-hover:bg-[#22C55E] group-hover:border-[#22C55E] flex items-center justify-center transition-all duration-300 shrink-0">
                  <ArrowRight className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Centered CTA */}
      <div className="flex justify-center">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-green-400 to-green-500 text-black text-sm sm:text-base font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,255,150,0.4)]"
        >
          Browse All Categories <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  </section>
);

export default CategoryGrid;
