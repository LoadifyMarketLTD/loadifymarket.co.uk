import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Browse the Marketplace — dark navy premium section.
 * 3 featured product cards, centered header, centered CTA below.
 * No prices displayed — demo visuals only.
 */
const SHOWCASE = [
  {
    id: "sc-headphones",
    category: "Electronics",
    title: "Wireless Headphones",
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?fm=webp&fit=crop&w=800&q=80",
    href: "/category/electronics",
  },
  {
    id: "sc-laptop",
    category: "Electronics",
    title: "15.6\" Laptop Computer",
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?fm=webp&fit=crop&w=800&q=80",
    href: "/category/electronics",
  },
  {
    id: "sc-watch",
    category: "Electronics",
    title: "Digital Smartwatch",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?fm=webp&fit=crop&w=800&q=80",
    href: "/category/electronics",
  },
];

const FeaturedProducts = () => {
  return (
    <section
      className="relative overflow-hidden min-h-[80vh] flex items-center px-4 sm:px-6 py-16"
      style={{ background: "linear-gradient(to bottom, #0A1930, #0F2A4A, #081426)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 30% 20%, rgba(0,255,150,0.08), transparent 40%)" }}
      />
      {/* Dot texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative w-full max-w-7xl mx-auto">
        {/* Centered header */}
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Marketplace Preview
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-white">
            Browse the Marketplace
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Products listed by independent UK sellers across all categories.
          </p>
        </div>

        {/* 3 product cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {SHOWCASE.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(0,255,150,0.15)]"
              style={{ minHeight: "280px" }}
            >
              <img
                src={item.img}
                alt={item.title}
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  {item.category}
                </p>
                <h3 className="text-base font-extrabold text-white leading-snug">
                  {item.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Centered CTA below cards */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-400 to-green-500 text-black font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,255,150,0.4)]"
          >
            View Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;

