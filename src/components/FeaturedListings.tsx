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
    desc: "Explore products from independent UK sellers across multiple categories.",
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
    className="relative overflow-hidden px-4 sm:px-6 py-16 lg:py-20"
    style={{ background: "linear-gradient(to bottom, #0F2A4A, #0A1930, #081426)" }}
  >
    {/* Ambient glow */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: "radial-gradient(circle at 30% 60%, rgba(0,255,150,0.07), transparent 40%)" }}
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
          Curated Selection
        </span>
        <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-white">
          Featured Listings
        </h2>
        <p className="mt-2 text-sm text-white/70">Products from UK sellers you'll love</p>
      </div>

      {/* 3 wide image-overlay cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {CARDS.map((card) => (
          <Link
            key={card.id}
            to={card.href}
            className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(0,255,150,0.15)]"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-base font-extrabold text-white leading-snug mb-1">
                {card.title}
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Centered CTA */}
      <div className="mt-10 flex justify-center">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-400 to-green-500 text-black font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,255,150,0.4)]"
        >
          View All Listings <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </section>
);

export default FeaturedListings;
