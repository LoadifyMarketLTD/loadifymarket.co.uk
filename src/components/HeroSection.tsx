import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section
      className="bg-white"
      aria-label="Loadify Market — UK Online Marketplace"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10">

          {/* ── Left: headline + sub-text + CTAs ────────────────────────── */}
          <div className="flex-1 max-w-[520px]">
            <p className="inline-block bg-[#22C55E] text-[#0d2240] text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded mb-4">
              UK Online Marketplace
            </p>
            <h1
              className="font-black uppercase tracking-tight leading-[1.0]"
              style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}
            >
              <span className="text-gray-900">Buy &amp; Sell Anything</span>
              <br />
              <span className="text-[#22C55E]">Across the UK</span>
            </h1>

            {/* Commission badge — black solid */}
            <div className="inline-block bg-gray-900 text-white text-[12px] font-semibold px-4 py-2 mt-4">
              0% Commission for all sellers until 31 December 2026
            </div>

            <p className="text-gray-600 text-sm mt-4 leading-relaxed">
              A modern online marketplace connecting buyers and sellers across the UK.
              Individuals and businesses can buy and sell products across multiple
              categories with no listing fees.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link
                to="/catalog"
                className="px-8 py-3 bg-[#22C55E] text-white text-sm font-black uppercase tracking-wide hover:bg-[#16a34a] transition-colors text-center"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/register?type=seller"
                className="px-8 py-3 border-2 border-gray-900 text-gray-900 text-sm font-black uppercase tracking-wide hover:bg-gray-900 hover:text-white transition-colors text-center"
              >
                Start Selling Now
              </Link>
            </div>

            {/* Trust bullets — 2-column grid */}
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {[
                "Reach real UK buyers",
                "Sell across multiple categories",
                "No listing fees",
                "Fast payouts with Stripe",
              ].map((t) => (
                <span key={t} className="text-[13px] text-gray-700 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#22C55E] text-white font-bold text-[10px] shrink-0">✔</span>
                  {t}
                </span>
              ))}
            </div>

            {/* Trust tags */}
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              {[
                "0% Commission Until 31 December 2026",
                "Secure payments via Stripe",
              ].map((t) => (
                <span key={t} className="text-[12px] text-gray-500 flex items-center gap-1.5">
                  <span className="text-[#22C55E] font-bold">✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: hero product image ─────────────────────────────── */}
          <div className="hidden lg:flex lg:flex-1 items-center justify-end shrink-0">
            <img
              src="/hero-marketplace.jpg"
              alt="Products available on Loadify Market — electronics, clothing, accessories and more"
              className="w-full max-w-[640px] h-auto object-contain"
              loading="eager"
              fetchPriority="high"
            />
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
