import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Why Choose Loadify Market — dark navy section.
 * Same visual weight as Featured Listings: 3 wide image-overlay cards.
 * Matches approved mockup.
 */

const WHY_CARDS = [
  {
    id: "wc-browse",
    title: "Browse & Discover",
    desc: "500+ live listings updated daily across 9 categories. Smart search with filters.",
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    href: "/catalog",
  },
  {
    id: "wc-secure",
    title: "Safe & Secure",
    desc: "Stripe-powered checkout. Transparent 7% commission. Sellers verified by our team.",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    href: "/catalog",
  },
  {
    id: "wc-sell",
    title: "Sell & Grow Your Business",
    desc: "Free to list. Full seller dashboard with analytics, orders, and fast Stripe payouts.",
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    href: "/signup",
  },
];

const FeaturesSection = () => (
  <section
    id="features"
    className="relative overflow-hidden py-12 px-4 sm:px-6"
    style={{
      background: "linear-gradient(135deg, #091220 0%, #0d1d36 60%, #0a1628 100%)",
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

    <div className="relative max-w-7xl mx-auto">
      {/* Centered header */}
      <div className="text-center mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Platform Features
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-white">
          Why Choose Loadify Market
        </h2>
        <p className="mt-2 text-sm text-white/50">
          A complete UK marketplace for modern buyers and sellers.
        </p>
      </div>

      {/* 3 wide image-overlay cards — same card size as Featured Listings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {WHY_CARDS.map((card) => (
          <Link
            key={card.id}
            to={card.href}
            className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
            style={{ minHeight: "260px" }}
          >
            <img
              src={card.img}
              alt={card.title}
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#091220]/95 via-[#091220]/50 to-[#091220]/10" />
            {/* Hover ring */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/0 group-hover:ring-[#22C55E]/30 rounded-2xl transition-all duration-300" />
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-base font-extrabold text-white leading-snug mb-1">
                {card.title}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Centered CTA */}
      <div className="mt-8 flex justify-center">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 h-11 px-8 bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-bold rounded-full shadow transition-all duration-200 hover:-translate-y-0.5"
        >
          View All Listings <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </section>
);

export default FeaturesSection;
