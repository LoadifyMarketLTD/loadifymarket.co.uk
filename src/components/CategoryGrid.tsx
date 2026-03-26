import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Shirt, Home, Wrench, Gamepad2, Sparkles, Heart, Car } from "lucide-react";
import electronicsImg from "@/assets/categories/electronics.webp";
import fashionImg from "@/assets/categories/clothing.webp";
import homeImg from "@/assets/categories/home.webp";
import toolsImg from "@/assets/categories/tools.webp";
import toysImg from "@/assets/categories/toys.webp";
import healthImg from "@/assets/categories/health-beauty.webp";
import automotiveImg from "@/assets/categories/automotive.webp";

/**
 * 8 categories in a 2+3+3 grid (desktop: 6-col, mobile: 2-col).
 *
 * Desktop layout:
 *   Row 1 (tall ~260px):  [Electronics: 3 cols] [Fashion: 3 cols]
 *   Row 2 (short ~190px): [Home: 2 cols] [Beauty: 2 cols] [Tools: 2 cols]
 *   Row 3 (short ~190px): [Toys: 2 cols] [Health: 2 cols] [Automotive: 2 cols]
 */

const categories = [
  // ── Row 1 (tall, wide) ─────────────────────────────────────────────
  {
    slug: "electronics",
    label: "Electronics",
    count: "1,300+",
    img: electronicsImg,
    icon: Cpu,
    overlay: "from-[#0F172A]/75 via-[#1e3a5f]/50 to-transparent",
    colSpan: "lg:col-span-3",
    tall: true,
  },
  {
    slug: "fashion",
    label: "Fashion",
    count: "900+",
    img: fashionImg,
    icon: Shirt,
    overlay: "from-[#3b1a4a]/75 via-pink-900/50 to-transparent",
    colSpan: "lg:col-span-3",
    tall: true,
  },
  // ── Row 2 (medium) ────────────────────────────────────────────────
  {
    slug: "home-kitchen",
    label: "Home & Kitchen",
    count: "1,100+",
    img: homeImg,
    icon: Home,
    overlay: "from-[#3b2a0a]/75 via-amber-900/50 to-transparent",
    colSpan: "lg:col-span-2",
    tall: false,
  },
  {
    slug: "beauty",
    label: "Beauty",
    count: "640+",
    img: "/images/categories/beauty.webp",
    icon: Sparkles,
    overlay: "from-[#4a1a2a]/75 via-rose-900/50 to-transparent",
    colSpan: "lg:col-span-2",
    tall: false,
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    count: "450+",
    img: toolsImg,
    icon: Wrench,
    overlay: "from-[#3b1a00]/75 via-orange-900/50 to-transparent",
    colSpan: "lg:col-span-2",
    tall: false,
  },
  // ── Row 3 (medium) ────────────────────────────────────────────────
  {
    slug: "toys-games",
    label: "Toys & Games",
    count: "320+",
    img: toysImg,
    icon: Gamepad2,
    overlay: "from-[#1a0a4a]/75 via-violet-900/50 to-transparent",
    colSpan: "lg:col-span-2",
    tall: false,
  },
  {
    slug: "health-wellness",
    label: "Health & Wellness",
    count: "380+",
    img: healthImg,
    icon: Heart,
    overlay: "from-[#0a3a2a]/75 via-teal-900/50 to-transparent",
    colSpan: "lg:col-span-2",
    tall: false,
  },
  {
    slug: "automotive",
    label: "Automotive",
    count: "290+",
    img: automotiveImg,
    icon: Car,
    overlay: "from-[#1a2a3a]/75 via-slate-900/50 to-transparent",
    colSpan: "lg:col-span-2",
    tall: false,
  },
];

type Cat = (typeof categories)[0];

function CatCard({ slug, label, count, img, icon: Icon, overlay, tall }: Cat) {
  return (
    <Link
      to={`/category/${slug}`}
      className={`group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex ${
        tall ? "min-h-[200px] lg:min-h-[260px]" : "min-h-[150px] lg:min-h-[190px]"
      }`}
    >
      {/* Image */}
      <img
        src={img}
        alt={label}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {/* Gradient overlay (bottom-heavy so label is readable) */}
      <div className={`absolute inset-0 bg-gradient-to-t ${overlay}`} />

      {/* Content */}
      <div className="relative mt-auto w-full p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
              <p className={`font-bold text-white ${tall ? "text-base" : "text-sm"}`}>{label}</p>
            </div>
            <p className="text-xs text-white/70 ml-9">{count} items</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/35 transition-colors">
            <ArrowRight className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
        </div>
      </div>
    </Link>
  );
}

const CategoryGrid = () => {
  const row1 = categories.filter((c) => c.tall);
  const row23 = categories.filter((c) => !c.tall);

  return (
    <section className="bg-[#F5F7FB] py-12 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">Explore</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
              Shop by Category
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Browse thousands of products across 8 major categories
            </p>
          </div>
          <Link
            to="/catalog"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            All Categories <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Row 1: 2 large featured cards */}
        <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
          {row1.map((cat) => (
            <div key={cat.slug}>
              <CatCard {...cat} />
            </div>
          ))}
        </div>

        {/* Rows 2 & 3: 3 + 3 medium cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
          {row23.map((cat) => (
            <div key={cat.slug}>
              <CatCard {...cat} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default CategoryGrid;
