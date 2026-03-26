import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CATEGORIES = [
  {
    id: "cat-electronics",
    title: "Electronics & Tech",
    subtitle: "Phones, laptops, accessories & smart home",
    cta: "Browse Electronics",
    href: "/category/electronics",
    img: "/images/categories/electronics.webp",
    gradient: "from-[#0F172A]/70 via-[#1e3a5f]/50 to-transparent",
    accentColor: "bg-blue-600",
  },
  {
    id: "cat-fashion",
    title: "Fashion & Apparel",
    subtitle: "Clothing, shoes, bags & accessories",
    cta: "Browse Fashion",
    href: "/category/fashion",
    img: "/images/categories/fashion.webp",
    gradient: "from-[#3b1a4a]/70 via-pink-900/50 to-transparent",
    accentColor: "bg-pink-600",
  },
  {
    id: "cat-beauty",
    title: "Beauty & Skincare",
    subtitle: "Skincare, fragrances & wellness products",
    cta: "Browse Beauty",
    href: "/category/beauty",
    img: "/images/categories/beauty.webp",
    gradient: "from-[#4a1a2a]/70 via-rose-900/50 to-transparent",
    accentColor: "bg-rose-600",
  },
  {
    id: "cat-home",
    title: "Home & Kitchen",
    subtitle: "Lighting, storage, cookware & décor",
    cta: "Browse Home",
    href: "/category/home-kitchen",
    img: "/images/categories/home-kitchen.webp",
    gradient: "from-[#3b2a0a]/70 via-amber-900/50 to-transparent",
    accentColor: "bg-amber-600",
  },
];

const DealsSection = () => {
  return (
    <section className="bg-white py-10 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">Shop by Category</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
              Browse the Marketplace
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Explore wholesale stock, bulk lots and listings from independent UK sellers
            </p>
          </div>
          <Link
            to="/catalog"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Category cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, idx) => {
            const isLarge = idx < 2;
            return (
              <Link
                key={cat.id}
                to={cat.href}
                className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 sm:col-span-1 lg:col-span-2"
                style={{ minHeight: isLarge ? "280px" : "220px" }}
              >
                {/* Background image */}
                <img
                  src={cat.img}
                  alt={cat.title}
                  width="800"
                  height="280"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    if (el.src.endsWith(".webp")) {
                      el.src = el.src.replace(".webp", ".jpg");
                    } else {
                      el.src = "/images/placeholder-product.jpg";
                    }
                  }}
                />

                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient}`} />

                {/* Category badge */}
                <div className={`absolute top-4 right-4 ${cat.accentColor} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow`}>
                  Explore
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-lg font-extrabold text-white leading-snug mb-1">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-white/80 mb-3 line-clamp-1">{cat.subtitle}</p>
                  <span className="inline-flex items-center gap-1.5 bg-white text-[#0F172A] text-xs font-bold px-4 py-2 rounded-full group-hover:bg-[#2563EB] group-hover:text-white transition-all duration-200 shadow">
                    {cat.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default DealsSection;

