import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag, UserCheck, TrendingUp } from "lucide-react";

/**
 * How Selling on Loadify Market Works — full dark section.
 * 3 horizontal step cards (icon + title + desc) + prominent "Start Selling Today" CTA.
 * Matches approved mockup exactly.
 */

const STEPS = [
  {
    id: "step-1",
    Icon: ShoppingBag,
    iconBg: "rgba(99,102,241,0.20)",
    iconColor: "#818CF8",
    title: "Create Your Seller Account",
    desc: "Sign up and get started on the platform in minutes.",
  },
  {
    id: "step-2",
    Icon: UserCheck,
    iconBg: "rgba(34,197,94,0.20)",
    iconColor: "#22C55E",
    title: "Set Up Your Store",
    desc: "Add your business details and prepare your seller profile.",
  },
  {
    id: "step-3",
    Icon: TrendingUp,
    iconBg: "rgba(251,191,36,0.20)",
    iconColor: "#FBBF24",
    title: "Connect Stripe & Go Live",
    desc: "Link your Stripe account securely to receive payouts.",
  },
];

const SellerJourneySection = () => (
  <section
    id="how-to-sell"
    className="relative overflow-hidden px-4 sm:px-6 py-12 lg:py-16"
    style={{ background: "linear-gradient(to bottom, #0F2A4A, #081426, #0A1930)" }}
  >
    {/* Ambient glow */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,255,150,0.07), transparent 50%)" }}
    />
    {/* Dot texture */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />

    {/* Top separator line */}
    <div
      className="absolute top-0 left-0 right-0 h-px"
      style={{ background: "rgba(255,255,255,0.07)" }}
    />

    <div className="relative w-full max-w-7xl mx-auto">
      {/* Centered header */}
      <div className="text-center mb-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          For Sellers
        </span>
        <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-white">
          How Selling on Loadify Market Works
        </h2>
        <p className="mt-2 text-sm text-white/70">
          A simple step-by-step guide to start selling.
        </p>
      </div>

      {/* 3 horizontal step cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className="flex items-center gap-4 rounded-2xl px-5 py-5 bg-white border border-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,255,150,0.1)]"
          >
            {/* Icon badge */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: step.iconBg }}
            >
              <step.Icon className="h-5 w-5" style={{ color: step.iconColor }} aria-hidden="true" />
            </div>
            {/* Text */}
            <div>
              <p className="text-sm font-bold text-white leading-snug">{step.title}</p>
              <p className="text-xs text-white/60 mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Prominent centered CTA */}
      <div className="flex justify-center">
        <Link to="/signup?type=seller">
          <button className="inline-flex items-center gap-2 px-10 py-3.5 bg-gradient-to-r from-green-400 to-green-500 text-black font-bold text-sm rounded-full shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,255,150,0.4)]">
            Start Selling Today <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </div>
  </section>
);

export default SellerJourneySection;
