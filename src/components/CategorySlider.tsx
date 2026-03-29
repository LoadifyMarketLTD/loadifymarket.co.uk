import { Link } from "react-router-dom";
import { useState } from "react";
import { Cpu, Shirt, Home, Wrench, Gamepad2, Sparkles, Heart, Car, Briefcase, ArrowRight } from "lucide-react";

const CATEGORIES = [
  {
    slug: "electronics",
    label: "Electronics",
    icon: Cpu,
    color: "bg-blue-50 text-blue-600",
    border: "border-blue-100",
    img: "/images/categories/electronics.jpeg",
  },
  {
    slug: "fashion",
    label: "Fashion",
    icon: Shirt,
    color: "bg-pink-50 text-pink-600",
    border: "border-pink-100",
    img: "/images/categories/fashion.jpeg",
  },
  {
    slug: "home-kitchen",
    label: "Home & Kitchen",
    icon: Home,
    color: "bg-amber-50 text-amber-600",
    border: "border-amber-100",
    img: "/images/categories/home-kitchen.jpeg",
  },
  {
    slug: "beauty",
    label: "Beauty",
    icon: Sparkles,
    color: "bg-rose-50 text-rose-600",
    border: "border-rose-100",
    img: "/images/categories/beauty.jpeg",
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    icon: Wrench,
    color: "bg-orange-50 text-orange-600",
    border: "border-orange-100",
    img: "/images/categories/tools-diy.jpeg",
  },
  {
    slug: "toys-games",
    label: "Toys & Games",
    icon: Gamepad2,
    color: "bg-violet-50 text-violet-600",
    border: "border-violet-100",
    img: "/images/categories/toys-games.jpeg",
  },
  {
    slug: "health-wellness",
    label: "Health & Wellness",
    icon: Heart,
    color: "bg-teal-50 text-teal-600",
    border: "border-teal-100",
    img: "/images/categories/health-wellness.jpeg",
  },
  {
    slug: "automotive",
    label: "Automotive",
    icon: Car,
    color: "bg-slate-50 text-slate-600",
    border: "border-slate-200",
    img: "/images/categories/automotive.jpeg",
  },
  {
    slug: "office-supplies",
    label: "Office Supplies",
    icon: Briefcase,
    color: "bg-indigo-50 text-indigo-600",
    border: "border-indigo-100",
    img: "/images/categories/office-supplies.jpeg",
  },
];

type Category = (typeof CATEGORIES)[0];

function CategoryTile({ slug, label, icon: Icon, color, border, img }: Category) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link
      to={`/category/${slug}`}
      className="flex flex-col items-center gap-2 shrink-0 group"
    >
      <div
        className={`w-16 h-16 rounded-2xl border ${border} overflow-hidden shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200 bg-white flex items-center justify-center`}
      >
        {imgFailed ? (
          <div className={`w-full h-full flex items-center justify-center ${color}`}>
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
        ) : (
          <img
            src={img}
            alt={label}
            width="64"
            height="64"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <span className="text-[11px] font-semibold text-[#334155] text-center leading-tight max-w-[72px] group-hover:text-[#2563EB] transition-colors">
        {label}
      </span>
    </Link>
  );
}

const CategorySlider = () => {
  return (
    <section className="bg-white border-b border-slate-100 py-5 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#0F172A]">Shop by Category</h2>
          <Link
            to="/catalog"
            className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            All Categories <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Horizontally scrollable strip */}
        <div
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          role="list"
          aria-label="Browse product categories"
        >
          {CATEGORIES.map((cat) => (
            <div key={cat.slug} role="listitem">
              <CategoryTile {...cat} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default CategorySlider;
