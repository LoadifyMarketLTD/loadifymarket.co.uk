import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Featured Listings — dark navy section.
 * 3 wide image-overlay feature cards: Browse & Discover, Safe & Secure, Sell & Grow.
 * Matches approved mockup exactly.
 */

const CARDS = [
  {
    id: "fl-browse",
    title: "Browse & Discover",
    desc: "Explore thousands of products from independent UK sellers across 9 categories.",
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    href: "/catalog",
  },
  {
    id: "fl-secure",
    title: "Safe & Secure",
    desc: "Every seller is verified before listing. All payments processed securely via Stripe.",
    img: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=800&q=80",
    href: "/catalog",
  },
  {
    id: "fl-sell",
    title: "Sell & Grow Your Business",
    desc: "List for free, reach real UK buyers, and manage everything from your seller dashboard.",
    img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
    href: "/signup",
  },
];

const FeaturedListings = () => (
  <section
    className="relative overflow-hidden py-12 px-4 sm:px-6"
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

    <div className="relative max-w-7xl mx-auto">
      {/* Centered header */}
      <div className="text-center mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Curated Selection
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-white">
          Featured Listings
        </h2>
        <p className="mt-2 text-sm text-white/50">Products from UK sellers you'll love</p>
      </div>

      {/* 3 wide image-overlay cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {CARDS.map((card) => (
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/95 via-[#0a1628]/50 to-[#0a1628]/10" />
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

export default FeaturedListings;
