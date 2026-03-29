import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Users, LayoutGrid, X } from "lucide-react";

/* Badge shown while offer is active (July 1 2026 BST) */
const BADGE_ACTIVE = Date.now() < new Date("2026-06-30T23:00:00Z").getTime();

const trustBullets = [
  { icon: ShieldCheck, text: "Secure payments via Stripe" },
  { icon: Users,       text: "Independent sellers across the UK" },
  { icon: LayoutGrid,  text: "Multi-category marketplace" },
];

const HeroSection = () => {
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  return (
    <>
      <section className="bg-white py-12 sm:py-16" aria-label="Hero">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* ── LEFT: Text block ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-6">
              {BADGE_ACTIVE && (
                <span className="inline-flex items-center gap-2 w-fit bg-amber-50 text-amber-800 text-sm font-semibold px-4 py-2 rounded-full border border-amber-200">
                  🎉 0% Fees Until July 1
                </span>
              )}

              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-display font-extrabold text-[#0F172A] leading-[1.1] tracking-tight">
                  Buy &amp; Sell Products Across the UK
                </h1>
                <p className="mt-4 text-lg text-[#475569] leading-relaxed max-w-lg">
                  Browse products across multiple categories — from everyday retail to wholesale, clearance, pallets and job lots.
                </p>
                <p className="mt-2 text-sm text-[#64748B]">
                  Businesses and individuals can sell on Loadify Market.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/catalog">
                  <button className="h-12 px-7 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-xl shadow-md transition-colors">
                    Browse Marketplace
                  </button>
                </Link>
                <button
                  onClick={() => setRoleModalOpen(true)}
                  className="h-12 px-7 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
                >
                  Start Selling
                </button>
              </div>

              {/* Trust bullets */}
              <ul className="flex flex-col gap-2.5">
                {trustBullets.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5 text-sm text-[#475569]">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <Icon className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── RIGHT: Hero visual ───────────────────────────────────────── */}
            <div className="hidden lg:block">
              <picture>
                <source srcSet="/hero.webp" type="image/webp" />
                <img
                  src="/hero.jpeg"
                  alt="Loadify Market — browse products from independent UK sellers"
                  className="w-full h-[460px] object-cover rounded-2xl shadow-xl"
                  fetchPriority="high"
                  loading="eager"
                  width="640"
                  height="460"
                />
              </picture>
            </div>

          </div>
        </div>
      </section>

      {/* ── Role selection modal ──────────────────────────────────────────── */}
      {roleModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setRoleModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              onClick={() => setRoleModalOpen(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-[#0A2239] mb-1 text-center">
              Join Loadify Market
            </h2>
            <p className="text-sm text-gray-500 mb-6 text-center">
              How would you like to get started?
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/signup" onClick={() => setRoleModalOpen(false)}>
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#15803d] hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-all">
                  <span className="text-2xl">🛒</span>
                  <div>
                    <p className="font-semibold text-[#0A2239]">I'm a Buyer</p>
                    <p className="text-xs text-gray-500">Browse and buy products</p>
                  </div>
                </div>
              </Link>
              <Link to="/signup?type=seller" onClick={() => setRoleModalOpen(false)}>
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#15803d] hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-all">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <p className="font-semibold text-[#0A2239]">I'm a Seller</p>
                    <p className="text-xs text-gray-500">List and sell your products</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeroSection;
