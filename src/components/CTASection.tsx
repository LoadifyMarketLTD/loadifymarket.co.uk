import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Seller CTA — full-width dark navy section.
 * Left: "Start selling in three simple steps" + numbered bullets + gold CTA.
 * Right: product composition hero image.
 * Matches reference design exactly.
 */

const STEPS = [
  {
    num: 1,
    title: "Create your account",
    desc: "Sign up and complete your seller profile",
  },
  {
    num: 2,
    title: "List your products",
    desc: "Add images, price and details",
  },
  {
    num: 3,
    title: "Get paid",
    desc: "Receive payments securely via Stripe",
  },
];

const CTASection = () => (
  <section
    id="start-selling"
    className="relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0e1e3a] to-[#091220]"
  >
    {/* Subtle dot texture */}
    <div
      className="absolute inset-0 opacity-[0.04] pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />

    <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

        {/* ── LEFT: Text block ─────────────────────────────────────── */}
        <div className="flex-1 max-w-[520px]">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-tight mb-3">
            Start selling in three simple steps
          </h2>
          <p className="text-gray-300 text-base mb-8">
            Join thousands of UK businesses and individuals selling on Loadify Market.
          </p>

          {/* Numbered steps */}
          <div className="flex flex-col gap-4 mb-10">
            {STEPS.map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-[#22C55E] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow">
                  {step.num}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{step.title}</p>
                  <p className="text-xs text-gray-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Green CTA */}
          <Link to="/signup?type=seller">
            <button className="inline-flex items-center gap-2 h-12 px-8 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-sm rounded-full shadow-lg transition-all hover:-translate-y-0.5">
              Start Selling Today <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* ── RIGHT: Product composition image ─────────────────────── */}
        <div className="flex-1 flex items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-[480px]">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-green-500/10 rounded-3xl blur-3xl" />
            <img
                src="/hero-marketplace.png"
                alt="Products available on Loadify Market"
                width="960"
                height="720"
                loading="lazy"
                className="relative w-full object-contain drop-shadow-2xl"
              />
          </div>
        </div>

      </div>
    </div>
  </section>
);

export default CTASection;
