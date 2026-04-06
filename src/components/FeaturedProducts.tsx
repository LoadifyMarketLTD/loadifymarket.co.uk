import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Browse the Marketplace — dark navy premium cinematic section.
 * 3 featured product cards with prices on desktop, single column mobile.
 * Connects visually from the Hero dark background.
 */
const SHOWCASE = [
  {
    id: "sc-headphones",
    category: "Electronics",
    title: "Wireless Headphones",
    price: "£99.00",
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?fm=webp&fit=crop&w=800&q=80",
    href: "/category/electronics",
  },
  {
    id: "sc-laptop",
    category: "Electronics",
    title: "15.6\" Laptop Computer",
    price: "£799.00",
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?fm=webp&fit=crop&w=800&q=80",
    href: "/category/electronics",
  },
  {
    id: "sc-watch",
    category: "Electronics",
    title: "Digital Smartwatch",
    price: "£149.00",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?fm=webp&fit=crop&w=800&q=80",
    href: "/category/electronics",
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

        {/* 3 product showcase cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {SHOWCASE.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
              style={{ minHeight: "300px" }}
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/92 via-[#0a1628]/30 to-transparent" />
              {/* Hover ring glow */}
              <div className="absolute inset-0 ring-1 ring-inset ring-white/0 group-hover:ring-[#22C55E]/30 rounded-2xl transition-all duration-300" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  {item.category}
                </p>
                <h3 className="text-base font-extrabold text-white leading-snug mb-1">
                  {item.title}
                </h3>
                <p className="text-sm font-bold text-white/90">{item.price}</p>
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
