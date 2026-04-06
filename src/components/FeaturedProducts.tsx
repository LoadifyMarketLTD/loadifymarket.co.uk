import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Browse the Marketplace — dark navy premium cinematic section.
 * 3 curated category showcase cards on desktop, single column mobile.
 * Connects visually from the Hero dark background.
 */
const SHOWCASE = [
  {
    id: "sc-electronics",
    title: "Electronics & Tech",
    subtitle: "Phones, laptops, audio & smart home",
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?fm=webp&fit=crop&w=800&q=80",
    href: "/category/electronics",
  },
  {
    id: "sc-fashion",
    title: "Fashion & Apparel",
    subtitle: "Clothing, footwear, bags & accessories",
    img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?fm=webp&fit=crop&w=800&q=80",
    href: "/category/fashion",
  },
  {
    id: "sc-home",
    title: "Home & Kitchen",
    subtitle: "Décor, cookware, storage & more",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?fm=webp&fit=crop&w=800&q=80",
    href: "/category/home-kitchen",
  },
];

const FeaturedProducts = () => {
  return (
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
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Marketplace Preview
            </span>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-display font-bold text-white">
              Browse the Marketplace
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Products listed by independent UK sellers across all categories
            </p>
          </div>
          <Link
            to="/catalog"
            className="hidden sm:inline-flex items-center gap-2 h-10 px-5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-bold rounded-full shadow transition-all duration-200 hover:-translate-y-0.5"
          >
            View Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 3 cinematic showcase cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {SHOWCASE.map((cat) => (
            <Link
              key={cat.id}
              to={cat.href}
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
              style={{ minHeight: "300px" }}
            >
              <img
                src={cat.img}
                alt={cat.title}
                width="800"
                height="600"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/92 via-[#0a1628]/30 to-transparent" />
              {/* Hover ring glow */}
              <div className="absolute inset-0 ring-1 ring-inset ring-white/0 group-hover:ring-[#22C55E]/30 rounded-2xl transition-all duration-300" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-lg font-extrabold text-white leading-snug mb-1">
                  {cat.title}
                </h3>
                <p className="text-sm text-white/65 mb-4 line-clamp-1">{cat.subtitle}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#22C55E]/20 border border-[#22C55E]/40 group-hover:bg-[#22C55E] group-hover:border-[#22C55E] px-4 py-2 rounded-full transition-all duration-200">
                  Browse <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 h-11 px-6 bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-bold rounded-full shadow transition-all"
          >
            View Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
