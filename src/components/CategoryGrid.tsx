import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Shop by Category — dark navy section with 3 top category cards + 4 featured product cards below.
 * Matches the dark theme of the surrounding sections.
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
];

const FEATURED_PRODUCTS = [
  {
    id: "fp-1",
    title: "Wireless Earbuds Pro",
    img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80",
    href: "/category/electronics",
  },
  {
    id: "fp-2",
    title: "Heavy-Duty Toolbox Set",
    img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80",
    href: "/category/tools-diy",
  },
  {
    id: "fp-3",
    title: "Summer Dress Collection",
    img: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=800&q=80",
    href: "/category/fashion",
  },
  {
    id: "fp-4",
    title: "Luxury Skincare Bundle",
    img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    href: "/category/beauty",
  },
];

const CategoryGrid = () => (
  <section
    className="relative overflow-hidden py-12 px-4 sm:px-6 min-h-[85vh] flex flex-col justify-center"
    style={{
      background: "linear-gradient(135deg, #0a1628 0%, #0e1e3a 60%, #091220 100%)",
    }}
  >
    {/* Subtle dot texture */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />

    <div className="relative max-w-[1280px] mx-auto">

      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Browse Sections
        </span>
        <h2 className="mt-1.5 text-2xl sm:text-3xl font-display font-bold text-white">
          Shop by Category
        </h2>
        <p className="mt-1 text-sm text-white/50">Explore top categories.</p>
      </div>

      {/* 3 top category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            to={`/category/${cat.slug}`}
            className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.05] hover:-translate-y-0.5 transition-all duration-300"
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
            {/* Darker gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/90 via-[#0a1628]/35 to-transparent" />
            {/* Hover ring */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/0 group-hover:ring-[#22C55E]/30 rounded-2xl transition-all duration-300" />
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

      {/* 4 featured product cards — image top, price + name below */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {FEATURED_PRODUCTS.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className="group block rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
              <img
                src={item.img}
                alt={item.title}
                width="800"
                height="600"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/0 group-hover:ring-[#22C55E]/20 transition-all duration-300" />
            </div>
            <div className="px-3 py-2.5">
              <p className="text-xs font-semibold text-white/80 leading-snug line-clamp-1">{item.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Centred CTA */}
      <div className="flex justify-center">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 h-11 px-7 bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-bold rounded-full shadow transition-all duration-200 hover:-translate-y-0.5"
        >
          Browse All Categories <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  </section>
);

export default CategoryGrid;

