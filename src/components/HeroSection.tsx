import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section
      className="relative overflow-hidden bg-white flex"
      style={{ height: "clamp(460px, 58vh, 620px)" }}
      aria-label="Loadify Market — UK Online Marketplace"
    >
      {/* ── LEFT PANEL: text content ───────────────────────────────────── */}
      {/*   Width ~42 %; padding-left tracks the page max-width gutters    */}
      <div
        className="relative z-10 bg-white flex items-center shrink-0"
        style={{ width: "42%" }}
      >
        <div
          className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8"
          style={{ maxWidth: "560px", marginLeft: "auto" }}
        >
          <p className="inline-block bg-[#22C55E] text-[#0d2240] text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded mb-4">
            UK Online Marketplace
          </p>
          <h1
            className="font-black uppercase tracking-tight leading-[1.0]"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)" }}
          >
            <span className="text-gray-900">Buy &amp; Sell Anything</span>
            <br />
            <span className="text-[#22C55E]">Across the UK</span>
          </h1>

          {/* Commission badge */}
          <div className="inline-block bg-gray-900 text-white text-[11px] font-semibold px-4 py-2 mt-4">
            0% Commission for all sellers until 31 December 2026
          </div>

          <p className="text-gray-600 text-sm mt-3 leading-relaxed">
            A modern marketplace connecting buyers and sellers across the UK —
            no listing fees, fast Stripe payouts.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <Link
              to="/catalog"
              className="px-7 py-2.5 bg-[#22C55E] text-white text-sm font-black uppercase tracking-wide hover:bg-[#16a34a] transition-colors text-center"
            >
              Browse Marketplace
            </Link>
            <Link
              to="/register?type=seller"
              className="px-7 py-2.5 border-2 border-gray-900 text-gray-900 text-sm font-black uppercase tracking-wide hover:bg-gray-900 hover:text-white transition-colors text-center"
            >
              Start Selling Now
            </Link>
          </div>

          {/* Trust bullets */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              "Reach real UK buyers",
              "Multiple categories",
              "No listing fees",
              "Fast Stripe payouts",
            ].map((t) => (
              <span key={t} className="text-[12px] text-gray-700 flex items-center gap-1.5">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#22C55E] text-white font-bold text-[9px] shrink-0">✔</span>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: hero image, zero constraints ──────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <img
          src="/hero-marketplace.jpg"
          alt="Products available on Loadify Market"
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
          fetchPriority="high"
        />
      </div>
    </section>
  );
};

export default HeroSection;
