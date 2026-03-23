import { Search, ShieldCheck, BarChart3, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Search,
    iconBg: "bg-blue-50",
    iconColor: "text-[#2563EB]",
    accent: "border-t-[#2563EB]",
    tag: "For Buyers",
    tagColor: "text-[#2563EB] bg-blue-50",
    title: "Browse & Discover",
    description:
      "Explore thousands of products across 16 categories — electronics, fashion, beauty, home goods, tools and more — all from verified UK sellers in one place.",
    bullets: [
      "500+ live listings updated daily",
      "Smart search with category filters",
      "Verified seller profiles & ratings",
    ],
    cta: { label: "Browse Marketplace", to: "/catalog" },
    img: "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=600&auto=format&fit=crop",
  },
  {
    icon: ShieldCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    accent: "border-t-emerald-500",
    tag: "Trust & Safety",
    tagColor: "text-emerald-700 bg-emerald-50",
    title: "Safe & Secure Transactions",
    description:
      "Every seller is vetted before they list. All payments are processed via Stripe with full buyer protection, transparent fees and instant order tracking.",
    bullets: [
      "Stripe-powered secure checkout",
      "Buyer protection on every order",
      "Real-time messaging with sellers",
    ],
    cta: { label: "How It Works", to: "/catalog" },
    img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop",
  },
  {
    icon: BarChart3,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    accent: "border-t-violet-500",
    tag: "For Sellers",
    tagColor: "text-violet-700 bg-violet-50",
    title: "Sell & Grow Your Business",
    description:
      "List your products for free, reach real UK buyers and manage everything from a powerful seller dashboard — orders, analytics, payouts and more.",
    bullets: [
      "Free to list, low transaction fees",
      "Full seller dashboard & analytics",
      "Fast Stripe payouts",
    ],
    cta: { label: "Start Selling", to: "/signup" },
    img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">

        {/* Section header */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Platform Features
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
            Why Choose Loadify Market
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            A complete UK marketplace built for modern buyers and sellers — fast, trusted and beautifully simple.
          </p>
        </div>

        {/* 3 large feature cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className={`group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col border-t-4 ${f.accent}`}
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden">
                <img
                  src={f.img}
                  alt={f.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-1 gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.iconBg}`}>
                    <f.icon className={`h-5 w-5 ${f.iconColor}`} aria-hidden="true" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${f.tagColor}`}>
                    {f.tag}
                  </span>
                </div>

                <h3 className="text-lg font-display font-bold text-[#0F172A]">{f.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{f.description}</p>

                <ul className="space-y-2 mt-auto">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-[#334155]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>

                <Link
                  to={f.cta.to}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors group/link"
                >
                  {f.cta.label}
                  <ArrowRight className="h-4 w-4 group-hover/link:translate-x-0.5 transition-transform" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
