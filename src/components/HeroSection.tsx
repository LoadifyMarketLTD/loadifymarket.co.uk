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
      {/* 1. Green label badge — larger font, heavier weight, more padding */}
      <p className="inline-block bg-[#22C55E] text-[#0d2240] text-[11px] font-black uppercase tracking-[0.18em] px-3 py-1 mb-4">
        UK Wholesale B2B Marketplace
      </p>

      {/* 2. H1 — text-shadow for legibility over any background area */}
      <h1
        className="text-white font-black uppercase tracking-tight leading-[1.05]"
        style={{
          fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
          textShadow: "0 2px 8px rgba(0,0,0,0.55)",
        }}
      >
        Sell Wholesale Products<br className="hidden sm:block" />
        <span
          className="text-[#4ade80]"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}
        >
          {" "}Across the UK
        </span>
      </h1>

      {/* 3. 0% Commission badge — bolder, larger font, stronger border */}
      <p className="inline-block border border-white/50 text-white text-[12px] font-bold tracking-wide px-4 py-1.5 mt-4">
        0% Commission Available Until 31 December 2026
      </p>

      {/* 4. Descriptive paragraph — brighter, heavier, better line-height, subtle shadow */}
      <p
        className="text-white/90 text-sm font-medium mt-3 leading-[1.7] max-w-[500px]"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
      >
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
          className="px-8 py-2.5 border-2 border-white/60 text-white text-sm font-bold uppercase tracking-wide hover:border-white hover:bg-white/[0.08] transition-colors text-center"
        >
          Start Selling Now
        </Link>
      </div>

      {/* 5. Seller trust bullets — brighter text, more visible icons, better spacing */}
      <div className="mt-5 flex flex-col gap-2.5">
        {[
          "Reach UK wholesale buyers",
          "No listing fees",
          "Fast payouts with Stripe",
        ].map((t) => (
          <span key={t} className="text-[13px] text-white/95 font-medium flex items-center gap-2.5" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#22C55E]/40 text-[#4ade80] font-bold text-[10px] shrink-0">✔</span>
            {t}
          </span>
        ))}
      </div>

      {/* Trust tags — brighter text */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
        {[
          "Trade accounts only",
          "0% Commission Until 31 December 2026",
          "Secure payments via Stripe",
        ].map((t) => (
          <span key={t} className="text-[11px] text-white/70 flex items-center gap-1.5">
            <span className="text-[#4ade80] font-bold">✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;
