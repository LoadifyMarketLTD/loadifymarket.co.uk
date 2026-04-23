import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section
      className="relative overflow-hidden bg-white"
      style={{ minHeight: "clamp(480px, 55vw, 680px)" }}
      aria-label="Loadify Market — UK Online Marketplace"
    >
      {/* ── Full-bleed background image (right ~60 %) ─────────────────── */}
      <img
        src="/hero-marketplace.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-right"
        loading="eager"
        fetchPriority="high"
      />

      {/* Fade-out gradient so text on the left stays readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, #ffffff 38%, rgba(255,255,255,0.85) 52%, transparent 70%)",
        }}
      />

      {/* ── Content layer ─────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-16">
        {/* ── Left: headline + sub-text + CTAs ─────────────────────────── */}
        <div className="max-w-[500px]">
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
      </div>
    </section>
  );
};

export default HeroSection;
