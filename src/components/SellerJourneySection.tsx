import { ArrowRight, UserPlus, ClipboardList, CreditCard, ShieldCheck, Rocket } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * SellerJourneySection — dark navy premium section.
 * Transparent 5-step seller activation flow: Register → Profile → Stripe → Review → Live.
 * Compact desktop-fit horizontal layout.
 */

const STEPS = [
  {
    icon: UserPlus,
    iconColor: "text-[#22C55E]",
    num: "01",
    title: "Create Seller Account",
    desc: "Register with your email. No upfront fees.",
    badge: "Free to register",
    badgeBg: "rgba(34,197,94,0.12)",
    badgeColor: "#22C55E",
  },
  {
    icon: ClipboardList,
    iconColor: "text-amber-400",
    num: "02",
    title: "Complete Your Profile",
    desc: "Add store name, business details & postcode.",
    badge: "Required before listing",
    badgeBg: "rgba(251,191,36,0.12)",
    badgeColor: "#FBBF24",
  },
  {
    icon: CreditCard,
    iconColor: "text-violet-400",
    num: "03",
    title: "Connect Stripe",
    desc: "Link Stripe Express for secure card payments.",
    badge: "Powered by Stripe",
    badgeBg: "rgba(167,139,250,0.12)",
    badgeColor: "#A78BFA",
  },
  {
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
    num: "04",
    title: "Admin Review",
    desc: "Our team reviews & activates your account.",
    badge: "Within 24 hrs",
    badgeBg: "rgba(52,211,153,0.12)",
    badgeColor: "#34D399",
  },
  {
    icon: Rocket,
    iconColor: "text-rose-400",
    num: "05",
    title: "List & Start Selling",
    desc: "Upload products & receive Stripe payouts.",
    badge: "7% commission",
    badgeBg: "rgba(251,113,133,0.12)",
    badgeColor: "#FB7185",
  },
];

const SellerJourneySection = () => (
  <section
    className="relative overflow-hidden pt-0 pb-10 px-4 sm:px-6 min-h-[70vh] flex flex-col justify-center"
    id="how-to-sell"
    style={{
      background: "linear-gradient(135deg, #0a1628 0%, #0d1d36 60%, #091220 100%)",
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

    <div className="relative max-w-[1280px] mx-auto">

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
          For Sellers
        </span>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
          How Selling on Loadify Market Works
        </h2>
        <p className="text-sm text-white/50">
          A transparent, step-by-step breakdown of the real seller activation process.
        </p>
      </div>

      {/* Steps — compact 5-column horizontal */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="relative flex flex-col p-4 rounded-2xl border transition-all duration-200 hover:border-white/15"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              {/* Step number */}
              <span className="text-[9px] font-bold tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.30)" }}>
                STEP {step.num}
              </span>

              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <Icon className={`h-4.5 w-4.5 ${step.iconColor}`} aria-hidden="true" />
              </div>

              {/* Title */}
              <p className="text-sm font-bold text-white mb-1.5 leading-snug">{step.title}</p>

              {/* Description */}
              <p className="text-xs text-white/50 leading-relaxed mb-3 flex-1">{step.desc}</p>

              {/* Badge */}
              <span
                className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: step.badgeBg, color: step.badgeColor }}
              >
                {step.badge}
              </span>

              {/* Arrow connector (desktop only) */}
              {idx < STEPS.length - 1 && (
                <div
                  className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                >
                  <ArrowRight className="h-3 w-3 text-white/40" aria-hidden="true" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA row */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/signup?type=seller">
          <button className="inline-flex items-center gap-2 h-11 px-7 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-sm rounded-full shadow-md transition-all hover:-translate-y-0.5">
            Start Your Seller Journey <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
        <Link to="/seller-guidelines" className="text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
          Read Seller Guidelines →
        </Link>
      </div>

      {/* Footnote */}
      <p className="text-center text-[11px] mt-5" style={{ color: "rgba(255,255,255,0.25)" }}>
        Loadify Market does not hold or sell inventory. All products are listed, managed, and fulfilled by independent registered sellers.
      </p>
    </div>
  </section>
);

export default SellerJourneySection;
