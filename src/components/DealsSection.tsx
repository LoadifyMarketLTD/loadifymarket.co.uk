import { Link } from "react-router-dom";
import { ArrowRight, Tag, Clock, Percent } from "lucide-react";

const DEALS = [
  {
    id: "deal-1",
    title: "Up to 40% Off Electronics",
    subtitle: "Headphones, keyboards, smart home & more",
    cta: "Shop Electronics",
    href: "/category/electronics",
    img: "/images/categories/electronics.jpg",
    badge: "Limited Time",
    badgeIcon: Clock,
    discount: "40% OFF",
    gradient: "from-[#0F172A]/75 via-[#1e3a5f]/60 to-transparent",
    accentColor: "bg-blue-500",
    textAccent: "text-blue-300",
  },
  {
    id: "deal-2",
    title: "Fashion Flash Sale",
    subtitle: "Dresses, shoes, bags & accessories",
    cta: "Shop Fashion",
    href: "/category/fashion",
    img: "/images/categories/fashion.jpg",
    badge: "Today Only",
    badgeIcon: Tag,
    discount: "30% OFF",
    gradient: "from-[#3b1a4a]/75 via-pink-900/60 to-transparent",
    accentColor: "bg-pink-500",
    textAccent: "text-pink-300",
  },
  {
    id: "deal-3",
    title: "Beauty & Skincare Deals",
    subtitle: "Premium skincare, fragrances & gift sets",
    cta: "Shop Beauty",
    href: "/category/beauty",
    img: "/images/categories/beauty.jpg",
    badge: "New Arrivals",
    badgeIcon: Percent,
    discount: "25% OFF",
    gradient: "from-[#4a1a2a]/75 via-rose-900/60 to-transparent",
    accentColor: "bg-rose-500",
    textAccent: "text-rose-300",
  },
  {
    id: "deal-4",
    title: "Home & Kitchen Essentials",
    subtitle: "Smart lighting, storage, cookware & décor",
    cta: "Shop Home",
    href: "/category/home-kitchen",
    img: "/images/categories/home-kitchen.jpg",
    badge: "Clearance",
    badgeIcon: Tag,
    discount: "35% OFF",
    gradient: "from-[#3b2a0a]/75 via-amber-900/60 to-transparent",
    accentColor: "bg-amber-500",
    textAccent: "text-amber-300",
  },
];

const DealsSection = () => {
  return (
    <section className="bg-white py-10 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">🔥 Hot Deals</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
              Today's Best Offers
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Exclusive discounts from our independent sellers — updated daily
            </p>
          </div>
          <Link
            to="/catalog"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            All Deals <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Deal cards grid: 2 large + 2 medium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEALS.map((deal, idx) => {
            const BadgeIcon = deal.badgeIcon;
            const isLarge = idx < 2;
            return (
              <Link
                key={deal.id}
                to={deal.href}
                className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 sm:col-span-1 lg:col-span-2"
                style={{ minHeight: isLarge ? "280px" : "220px" }}
              >
                {/* Background image */}
                <img
                  src={deal.img}
                  alt={deal.title}
                  width="800"
                  height="280"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.src = "/images/placeholder-product.jpg";
                  }}
                />

                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${deal.gradient}`} />

                {/* Discount badge */}
                <div className={`absolute top-4 right-4 ${deal.accentColor} text-white text-sm font-extrabold px-3 py-1.5 rounded-full shadow-lg`}>
                  {deal.discount}
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${deal.textAccent} mb-2`}>
                    <BadgeIcon className="h-3 w-3" aria-hidden="true" />
                    {deal.badge}
                  </div>
                  <h3 className="text-lg font-extrabold text-white leading-snug mb-1">
                    {deal.title}
                  </h3>
                  <p className="text-sm text-white/80 mb-3 line-clamp-1">{deal.subtitle}</p>
                  <span className="inline-flex items-center gap-1.5 bg-white text-[#0F172A] text-xs font-bold px-4 py-2 rounded-full group-hover:bg-[#2563EB] group-hover:text-white transition-all duration-200 shadow">
                    {deal.cta} <ArrowRight className="h-3.5 w-3.5" />
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
