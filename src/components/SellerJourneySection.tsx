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
    title: "Browse & Discover",
    desc: "Sign up & verify your email",
  },
  {
    id: "step-2",
    Icon: UserCheck,
    iconBg: "rgba(34,197,94,0.20)",
    iconColor: "#22C55E",
    title: "Create Profile",
    desc: "Set up your seller details",
  },
  {
    id: "step-3",
    Icon: TrendingUp,
    iconBg: "rgba(251,191,36,0.20)",
    iconColor: "#FBBF24",
    title: "Sell & Grow Your Business",
    desc: "Link your Stripe account",
  },
];

const SellerJourneySection = () => (
  <section
    id="how-to-sell"
    className="relative overflow-hidden py-12 px-4 sm:px-6"
    style={{
      background: "linear-gradient(135deg, #060e1f 0%, #0a1628 60%, #06101e 100%)",
    }}
  >
    {/* Subtle dot texture */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />

    {/* Top separator line */}
    <div
      className="absolute top-0 left-0 right-0 h-px"
      style={{ background: "rgba(255,255,255,0.07)" }}
    />

    <div className="relative max-w-7xl mx-auto">
      {/* Centered header */}
      <div className="text-center mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          For Sellers
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-white">
          How Selling on Loadify Market Works
        </h2>
        <p className="mt-2 text-sm text-white/50">
          A simple step-by-step guide to start selling.
        </p>
      </div>

      {/* 3 horizontal step cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-200 hover:border-white/15"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
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
              <p className="text-xs text-white/50 mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Prominent centered CTA */}
      <div className="flex justify-center">
        <Link to="/signup?type=seller">
          <button className="inline-flex items-center gap-2 h-12 px-10 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-sm rounded-full shadow-lg shadow-[#22C55E]/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[#22C55E]/40">
            Start Selling Today <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </div>
  </section>
);

export default SellerJourneySection;
