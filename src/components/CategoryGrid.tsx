import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Shirt, Home, Wrench, Gamepad2, Package } from "lucide-react";

const categories = [
  {
    slug: "electronics",
    label: "Electronics",
    count: "1,300+ items",
    img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&auto=format&fit=crop",
    icon: Cpu,
    accent: "from-blue-900/70 to-blue-700/40",
    tall: true,
  },
  {
    slug: "fashion",
    label: "Fashion",
    count: "900+ items",
    img: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&auto=format&fit=crop",
    icon: Shirt,
    accent: "from-rose-900/70 to-pink-700/40",
    tall: true,
  },
  {
    slug: "home-garden",
    label: "Home & Kitchen",
    count: "1,100+ items",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&auto=format&fit=crop",
    icon: Home,
    accent: "from-amber-900/70 to-amber-600/40",
    tall: false,
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    count: "450+ items",
    img: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=700&auto=format&fit=crop",
    icon: Wrench,
    accent: "from-orange-900/70 to-orange-600/40",
    tall: false,
  },
  {
    slug: "toys",
    label: "Toys & Games",
    count: "320+ items",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&auto=format&fit=crop",
    icon: Gamepad2,
    accent: "from-violet-900/70 to-violet-600/40",
    tall: false,
  },
];

type Category = (typeof categories)[0];

function CategoryCard({ slug, label, count, img, icon: Icon, accent, tall }: Category) {
  return (
    <Link
      to={`/category/${slug}`}
      className={`group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${tall ? "row-span-2" : ""}`}
    >
      {/* Background image */}
      <img
        src={img}
        alt={label}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${accent}`} />

      {/* CATEGORIES badge */}
      <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest text-white/80 bg-black/25 backdrop-blur-sm px-2 py-0.5 rounded-full">
        CATEGORY
      </span>

      {/* Bottom label */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <p className="text-base font-bold text-white leading-tight">{label}</p>
          </div>
          <p className="text-xs text-white/70 pl-9">{count}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
          <ArrowRight className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

const CategoryGrid = () => {
  const tall = categories.filter((c) => c.tall);
  const medium = categories.filter((c) => !c.tall);

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
          </div>
          <Link
            to="/catalog"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-[#2563EB] hover:underline"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 2+3 asymmetric grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4" style={{ gridTemplateRows: "240px 180px" }}>
          {/* Row 1: 2 tall cards each spanning col 1–2 and col 3–5 */}
          {tall.map((cat, i) => (
            <div
              key={cat.slug}
              className={`${i === 0 ? "col-span-2 lg:col-span-2" : "col-span-2 lg:col-span-3"} row-span-1 lg:row-span-2`}
              style={{ minHeight: i === 0 ? undefined : undefined }}
            >
              <Link
                to={`/category/${cat.slug}`}
                className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full h-full flex min-h-[200px] lg:min-h-full"
              >
                <img
                  src={cat.img}
                  alt={cat.label}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${cat.accent}`} />
                <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest text-white/80 bg-black/25 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  CATEGORY
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <cat.icon className="h-4 w-4 text-white" aria-hidden="true" />
                      </div>
                      <p className="text-base font-bold text-white">{cat.label}</p>
                    </div>
                    <p className="text-xs text-white/70 pl-9">{cat.count}</p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                    <ArrowRight className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            </div>
          ))}

          {/* Row 2: 3 medium cards */}
          {medium.map((cat) => (
            <div key={cat.slug} className="col-span-1 lg:col-span-1 row-span-1">
              <Link
                to={`/category/${cat.slug}`}
                className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full h-full flex min-h-[140px]"
              >
                <img
                  src={cat.img}
                  alt={cat.label}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${cat.accent}`} />
                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="w-6 h-6 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <cat.icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                      </div>
                      <p className="text-sm font-bold text-white">{cat.label}</p>
                    </div>
                    <p className="text-[11px] text-white/70 pl-8">{cat.count}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-white/70 group-hover:text-white shrink-0" aria-hidden="true" />
                </div>
              </Link>
            </div>
          ))}

          {/* "More categories" card */}
          <div className="col-span-2 lg:col-span-5 hidden lg:block">
            <Link
              to="/catalog"
              className="flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-[#64748B] hover:text-[#2563EB] hover:border-[#2563EB] hover:bg-blue-50/50 transition-colors"
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              Browse all categories
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
