import { ShieldCheck, CreditCard, Store, Lock } from "lucide-react";

const benefits = [
  {
    icon: CreditCard,
    iconBg: "rgba(124,58,237,0.20)",
    iconColor: "#A78BFA",
    title: "Secure Payments via Stripe",
    description: "Every transaction is processed securely through Stripe.",
  },
  {
    icon: Store,
    iconBg: "rgba(34,197,94,0.20)",
    iconColor: "#4ADE80",
    title: "Independent UK Sellers",
    description: "All products are listed and fulfilled by independent sellers.",
  },
  {
    icon: ShieldCheck,
    iconBg: "rgba(251,191,36,0.20)",
    iconColor: "#FCD34D",
    title: "Multi-Category Marketplace",
    description: "Electronics, fashion, home & garden, toys, sports and more.",
  },
  {
    icon: Lock,
    iconBg: "rgba(99,102,241,0.20)",
    iconColor: "#818CF8",
    title: "Simple & Safe Transactions",
    description: "Browse, buy and sell with confidence on a trusted platform.",
  },
];

const TrustStrip = () => (
  <section
    className="relative overflow-hidden py-4 sm:py-10 px-4 sm:px-6"
    style={{ background: "linear-gradient(to bottom, #0A1930, #0F2A4A)" }}
  >
    <div className="max-w-[1280px] mx-auto">
      {/* Mobile: compact icon + short title only (no description, no tall cards) */}
      <div className="grid grid-cols-2 sm:hidden gap-3">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10"
          >
            <div
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: b.iconBg }}
            >
              <b.icon className="h-3.5 w-3.5" style={{ color: b.iconColor }} />
            </div>
            <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{b.title}</p>
          </div>
        ))}
      </div>
      {/* sm+: full cards with description (original layout) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,255,150,0.1)] hover:border-white/20"
          >
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: b.iconBg }}
            >
              <b.icon className="h-5 w-5" style={{ color: b.iconColor }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{b.title}</p>
              <p className="text-xs text-white/60 mt-0.5 leading-snug">{b.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustStrip;
