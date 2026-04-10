import { Link } from "react-router-dom";
import CATEGORY_CONFIG from "@/lib/category-config";

const FEATURED_SLUGS = [
  "health-beauty",
  "wholesale-clothing",
  "garden",
  "kitchenware",
  "toys",
  "electrical",
];

const featuredCats = FEATURED_SLUGS
  .map((s) => CATEGORY_CONFIG.find((c) => c.slug === s))
  .filter(Boolean) as typeof CATEGORY_CONFIG[number][];

const HeroSection = () => (
  <section
    className="bg-[#0d2240]"
    aria-label="Loadify Market — UK B2B wholesale marketplace"
  >
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10">

        {/* ── Left: headline + sub-text + CTAs ────────────────────────── */}
        <div className="flex-1">
          <p className="inline-block bg-[#22C55E] text-[#0d2240] text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 mb-3">
            UK Wholesale B2B Marketplace
          </p>
          <h1
            className="text-white font-black uppercase tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}
          >
            Buy &amp; Sell Wholesale Goods<br className="hidden sm:block" />
            <span className="text-[#22C55E]"> from UK Trade Suppliers</span>
          </h1>
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
              Start Selling
            </Link>
          </div>

          {/* Trust tags */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
            {[
              "Trade accounts only",
              "0% commission until Aug 2026",
              "Secure payments via Stripe",
            ].map((t) => (
              <span key={t} className="text-[11px] text-white/45 flex items-center gap-1.5">
                <span className="text-[#22C55E] font-bold">✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right: category quick-access panel (desktop only) ────────── */}
        <aside
          className="hidden lg:block lg:w-[320px] xl:w-[360px] shrink-0"
          aria-label="Quick category access"
        >
          <div className="border border-white/20">
            <div className="bg-white/5 px-4 py-2 border-b border-white/15">
              <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">
                Browse Categories
              </span>
            </div>
            <div className="divide-y divide-white/10">
              {featuredCats.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.slug}
                    to={`/category/${cat.slug}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.08] transition-colors"
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${cat.iconColor}`} aria-hidden="true" />
                    <span className="text-[12px] text-white/80 font-medium flex-1">{cat.label}</span>
                    <span className="text-white/30 text-sm">›</span>
                  </Link>
                );
              })}
            </div>
            <Link
              to="/catalog"
              className="flex items-center justify-between px-4 py-2.5 border-t border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="text-[11px] font-black text-[#22C55E] uppercase tracking-wide">
                View All 17 Categories
              </span>
              <span className="text-[#22C55E] text-sm font-bold">→</span>
            </Link>
          </div>
        </aside>

      </div>
    </div>
  </section>
);

export default HeroSection;
