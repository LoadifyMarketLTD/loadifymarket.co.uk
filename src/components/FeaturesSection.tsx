import { Search, ShieldCheck, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Search,
    iconBg: "bg-purple-50",
    iconColor: "text-[#7C3AED]",
    accentTop: "bg-[#7C3AED]",
    tag: "For Buyers",
    tagColor: "text-[#7C3AED] bg-purple-50",
    title: "Browse & Discover",
    description:
      "Explore thousands of products across 9 categories — all from independent UK sellers in one place.",
    bullets: [
      "500+ live listings updated daily",
      "Smart search with category filters",
      "Seller profiles & ratings",
    ],
    cta: { label: "Browse Marketplace", to: "/catalog" },
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
  },
  {
    icon: ShieldCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    accentTop: "bg-emerald-500",
    tag: "Trust & Safety",
    tagColor: "text-emerald-700 bg-emerald-50",
    title: "Safe & Secure",
    description:
      "Sellers are verified before listing. All payments go through Stripe with transparent fees.",
    bullets: [
      "Stripe-powered secure checkout",
      "Transparent fees on every order",
      "Real-time messaging with sellers",
    ],
    cta: { label: "How It Works", to: "/catalog" },
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
  },
  {
    icon: BarChart3,
    iconBg: "bg-green-50",
    iconColor: "text-[#22C55E]",
    accentTop: "bg-[#22C55E]",
    tag: "For Sellers",
    tagColor: "text-emerald-700 bg-green-50",
    title: "Sell & Grow",
    description:
      "List for free, reach UK buyers, and manage everything from a powerful seller dashboard.",
    bullets: [
      "Free to list — 7% commission on sales",
      "Full seller dashboard & analytics",
      "Fast Stripe payouts",
    ],
    cta: { label: "Start Selling", to: "/signup" },
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="bg-white py-12 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto">

        {/* Section header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">
            Platform Features
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
            Why Choose Loadify Market
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            A complete UK marketplace built for modern buyers and sellers.
          </p>
        </div>

        {/* 3 premium feature cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Coloured top accent bar */}
              <div className={`h-1 w-full ${f.accentTop}`} />

              {/* Image */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={f.img}
                  alt={f.title}
                  width="600"
                  height="160"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full ${f.tagColor}`}>
                  {f.tag}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${f.iconBg}`}>
                    <f.icon className={`h-4 w-4 ${f.iconColor}`} aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-display font-bold text-[#0F172A]">{f.title}</h3>
                </div>
                <p className="text-sm text-[#64748B] leading-relaxed">{f.description}</p>

                <ul className="space-y-1.5 mt-auto">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-[#334155]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E] shrink-0" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>

                <Link
                  to={f.cta.to}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED] hover:text-[#5B21B6] transition-colors group/link"
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
