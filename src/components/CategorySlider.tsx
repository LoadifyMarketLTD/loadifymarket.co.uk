import { Link } from "react-router-dom";
import { useState } from "react";
import { Cpu, Shirt, Home, Wrench, Gamepad2, Sparkles, Heart, Car, Briefcase, ArrowRight } from "lucide-react";

const CATEGORIES = [
  {
    slug: "electronics",
    label: "Electronics",
    icon: Cpu,
    color: "bg-purple-50 text-purple-600",
    border: "border-purple-100",
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "fashion",
    label: "Fashion",
    icon: Shirt,
    color: "bg-pink-50 text-pink-600",
    border: "border-pink-100",
    img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "home-kitchen",
    label: "Home & Kitchen",
    icon: Home,
    color: "bg-amber-50 text-amber-600",
    border: "border-amber-100",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "beauty",
    label: "Beauty",
    icon: Sparkles,
    color: "bg-rose-50 text-rose-600",
    border: "border-rose-100",
    img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    icon: Wrench,
    color: "bg-orange-50 text-orange-600",
    border: "border-orange-100",
    img: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "toys-games",
    label: "Toys & Games",
    icon: Gamepad2,
    color: "bg-violet-50 text-violet-600",
    border: "border-violet-100",
    img: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "health-wellness",
    label: "Health & Wellness",
    icon: Heart,
    color: "bg-teal-50 text-teal-600",
    border: "border-teal-100",
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "automotive",
    label: "Automotive",
    icon: Car,
    color: "bg-slate-50 text-slate-600",
    border: "border-slate-200",
    img: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "office-supplies",
    label: "Office Supplies",
    icon: Briefcase,
    color: "bg-indigo-50 text-indigo-600",
    border: "border-indigo-100",
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  },
];

type Category = (typeof CATEGORIES)[0];

function CategoryTile({ slug, label, icon: Icon, color, img }: Category) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link
      to={`/category/${slug}`}
      className="flex flex-col items-center gap-2 shrink-0 group"
    >
      <div
        className="w-14 h-14 rounded-2xl overflow-hidden group-hover:shadow-[0_0_0_2px_rgba(34,197,94,0.4)] group-hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        {imgFailed ? (
          <div className={`w-full h-full flex items-center justify-center ${color}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
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
      <span className="text-[11px] font-semibold text-white/70 group-hover:text-[#22C55E] text-center leading-tight max-w-[72px] transition-colors">
        {label}
      </span>
    </Link>
  );
}

const CategorySlider = () => {
  return (
    <section
      className="border-b py-10 px-4 sm:px-6"
      style={{
        background: "linear-gradient(180deg, #0a1628 0%, #0d1d36 100%)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-[1280px] mx-auto">

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white/80">Shop by Category</h2>
          <Link
            to="/catalog"
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            All Categories <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Horizontally scrollable strip */}
        <div
          className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide"
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
