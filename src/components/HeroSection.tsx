import { Link } from "react-router-dom";

const HeroSection = () => (
  <section
    className="relative min-h-[70vh] flex items-center"
    style={{
      backgroundImage: "url(/hero-marketplace.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
    aria-label="Loadify Market — UK B2B wholesale marketplace"
  >
    {/* Dark overlay for text readability */}
    <div className="absolute inset-0 bg-black/35" aria-hidden="true" />

    {/* Content — positioned above the overlay */}
    <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 lg:py-16">
      <p className="inline-block bg-[#22C55E] text-[#0d2240] text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 mb-3">
        UK Wholesale B2B Marketplace
      </p>
      <h1
        className="text-white font-black uppercase tracking-tight leading-[1.05]"
        style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}
      >
        Sell Wholesale Products<br className="hidden sm:block" />
        <span className="text-[#22C55E]"> Across the UK</span>
      </h1>
      <p className="inline-block border border-white/25 text-white/80 text-[11px] font-semibold tracking-wide px-3 py-1 mt-3">
        0% Commission Available Until 31 December 2026
      </p>
      <p className="text-white/65 text-sm mt-3 leading-relaxed max-w-[500px]">
        A structured trade marketplace connecting wholesale buyers with verified UK
        suppliers across 17 product categories. Trade and business accounts only.
      </p>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link
          to="/catalog"
          className="px-8 py-2.5 bg-[#22C55E] text-[#0d2240] text-sm font-black uppercase tracking-wide hover:bg-[#16a34a] transition-colors text-center"
        >
          Browse Marketplace
        </Link>
        <Link
          to="/register?type=seller"
          className="px-8 py-2.5 border-2 border-white/35 text-white text-sm font-bold uppercase tracking-wide hover:border-white hover:bg-white/[0.08] transition-colors text-center"
        >
          Start Selling Now
        </Link>
      </div>

      {/* Seller trust bullets */}
      <div className="mt-4 flex flex-col gap-2">
        {[
          "Reach UK wholesale buyers",
          "No listing fees",
          "Fast payouts with Stripe",
        ].map((t) => (
          <span key={t} className="text-[12px] text-white/70 flex items-center gap-2">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#22C55E]/20 text-[#22C55E] font-bold text-[10px] shrink-0">✔</span>
            {t}
          </span>
        ))}
      </div>

      {/* Trust tags */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
        {[
          "Trade accounts only",
          "0% Commission Until 31 December 2026",
          "Secure payments via Stripe",
        ].map((t) => (
          <span key={t} className="text-[11px] text-white/45 flex items-center gap-1.5">
            <span className="text-[#22C55E] font-bold">✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;
