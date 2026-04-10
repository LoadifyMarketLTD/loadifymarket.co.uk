import { Search, CreditCard, Package, ChevronRight } from "lucide-react";

/**
 * How It Works — compact 3-step buyer purchase flow.
 * Kept intentionally short to avoid repeating detail already in PlatformFeatures.
 */

const STEPS = [
  {
    num: 1,
    icon: Search,
    title: "Browse & Discover",
    desc: "Find products from UK sellers",
  },
  {
    num: 2,
    icon: CreditCard,
    title: "Secure Checkout",
    desc: "Pay safely via Stripe",
  },
  {
    num: 3,
    icon: Package,
    title: "Delivered to You",
    desc: "Seller ships, you track",
  },
];

const HowItWorksSection = () => (
  <section
    className="relative overflow-hidden px-4 sm:px-6 py-10 sm:py-16 lg:py-20"
    style={{ background: "linear-gradient(to bottom, #0A1930, #0F2A4A, #081426)" }}
  >
    {/* Ambient glow */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: "radial-gradient(circle at 50% 70%, rgba(0,255,150,0.06), transparent 50%)" }}
    />
    {/* Dot texture */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />

    <div className="relative max-w-[1280px] mx-auto w-full">

      {/* Header */}
      <div className="text-center mb-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          For Buyers
        </span>
        <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-white">
          How It Works
        </h2>
        <p className="mt-2 text-sm text-white/70">Simple steps from browsing to delivery.</p>
      </div>

      {/* Steps row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-stretch justify-between gap-3 sm:gap-0">
        {STEPS.map((step, idx) => (
          <div key={step.num} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0 flex-1">

            {/* Step cell */}
            <div className="flex flex-col items-center text-center flex-1">
              {/* Green number badge */}
              <span className="w-7 h-7 rounded-full bg-[#22C55E] text-white text-xs font-bold flex items-center justify-center shadow mb-2.5">
                {step.num}
              </span>

              {/* Icon box */}
              <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center justify-center mb-2.5">
                <step.icon className="h-5 w-5 text-white/80" aria-hidden="true" />
              </div>

              {/* Text */}
              <p className="text-xs font-bold text-white mb-0.5 leading-tight">{step.title}</p>
              <p className="text-[10px] text-white/50 leading-snug max-w-[88px]">{step.desc}</p>
            </div>

            {/* Chevron connector (not after last) */}
            {idx < STEPS.length - 1 && (
              <ChevronRight
                className="hidden sm:block h-4 w-4 text-white/20 shrink-0 sm:mt-[-20px]"
                aria-hidden="true"
              />
            )}

          </div>
        ))}
      </div>

    </div>
  </section>
);

export default HowItWorksSection;
