import { Link } from "react-router-dom";

const BULLETS: [string, string][] = [
  ["Reach real UK buyers", "Sell across multiple categories"],
  ["No listing fees", "Fast payouts with Stripe"],
];

const HeroSection = () => (
  <section className="bg-white" aria-label="Loadify Market — UK Online Marketplace">
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
      <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10">

        {/* ── Left: text content ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* 1. Label badge */}
          <p className="inline-block bg-[#15803d] text-white text-[11px] font-black uppercase tracking-[0.18em] px-3 py-1 mb-4">
            UK Online Marketplace
          </p>

          {/* 2. H1 */}
          <h1
            className="font-black uppercase leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}
          >
            <span className="text-gray-900 block">Buy &amp; Sell Anything</span>
            <span className="text-[#22C55E] block">Across the UK</span>
          </h1>

          {/* 3. Commission badge */}
          <p className="inline-block bg-[#0d2240] text-white text-[12px] font-bold tracking-wide px-4 py-2 mt-4">
            0% Commission for all sellers until 31 December 2026
          </p>

          {/* 4. Descriptive paragraph */}
          <p className="text-gray-600 text-sm font-medium mt-4 leading-[1.7] max-w-[480px]">
            A modern online marketplace connecting buyers and sellers across the UK.
            Individuals and businesses can buy and sell products across multiple categories
            with no listing fees.
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
              className="px-8 py-3 border-2 border-gray-900 text-gray-900 text-sm font-bold uppercase tracking-wide hover:bg-gray-900 hover:text-white transition-colors text-center"
            >
              Start Selling Now
            </Link>
          </div>

          {/* 5. Bullets — 2 columns */}
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5">
            {BULLETS.flat().map((t) => (
              <span key={t} className="text-[13px] text-gray-700 font-medium flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#22C55E] text-white font-bold text-[10px] shrink-0">
                  ✓
                </span>
                {t}
              </span>
            ))}
          </div>

          {/* Trust tags */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
            {["0% Commission Until 31 December 2026", "Secure payments via Stripe"].map((t) => (
              <span key={t} className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <span className="text-[#22C55E] font-bold">✓</span> {t}
              </span>
            ))}
          </div>

        </div>

        {/* ── Right: product image ────────────────────────────────────── */}
        <div className="w-full lg:w-[55%] shrink-0">
          <img
            src="/hero-marketplace.jpg"
            alt="Products available on Loadify Market"
            className="w-full h-auto object-contain"
            width={700}
            height={500}
            loading="eager"
          />
        </div>

      </div>
    </div>
  </section>
);

export default HeroSection;
