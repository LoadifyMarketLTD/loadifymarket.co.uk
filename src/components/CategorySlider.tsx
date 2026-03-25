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
    img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=120&auto=format&fit=crop&q=80",
  },
  {
    slug: "fashion",
    label: "Fashion",
    icon: Shirt,
    color: "bg-pink-50 text-pink-600",
    border: "border-pink-100",
    img: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=120&auto=format&fit=crop&q=80",
  },
  {
    slug: "home-kitchen",
    label: "Home & Kitchen",
    icon: Home,
    color: "bg-amber-50 text-amber-600",
    border: "border-amber-100",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=120&auto=format&fit=crop&q=80",
  },
  {
    slug: "beauty",
    label: "Beauty",
    icon: Sparkles,
    color: "bg-rose-50 text-rose-600",
    border: "border-rose-100",
    img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=120&auto=format&fit=crop&q=80",
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    icon: Wrench,
    color: "bg-orange-50 text-orange-600",
    border: "border-orange-100",
    img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=120&auto=format&fit=crop&q=80",
  },
  {
    slug: "toys-games",
    label: "Toys & Games",
    icon: Gamepad2,
    color: "bg-violet-50 text-violet-600",
    border: "border-violet-100",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&auto=format&fit=crop&q=80",
  },
  {
    slug: "health-wellness",
    label: "Health & Wellness",
    icon: Heart,
    color: "bg-teal-50 text-teal-600",
    border: "border-teal-100",
    img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=120&auto=format&fit=crop&q=80",
  },
  {
    slug: "automotive",
    label: "Automotive",
    icon: Car,
    color: "bg-slate-50 text-slate-600",
    border: "border-slate-200",
    img: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=120&auto=format&fit=crop&q=80",
  },
  {
    slug: "office-supplies",
    label: "Office Supplies",
    icon: Briefcase,
    color: "bg-indigo-50 text-indigo-600",
    border: "border-indigo-100",
    img: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=120&auto=format&fit=crop&q=80",
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
            loading="lazy"
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
