import {
  FileText,
  MessageSquare,
  Truck,
  Banknote,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: FileText,
    title: "Request for Quote",
    description: "Get custom pricing for bulk orders.",
  },
  {
    icon: MessageSquare,
    title: "Built-In Messaging",
    description: "Communicate directly with buyers before purchase.",
  },
  {
    icon: Truck,
    title: "Order Tracking",
    description: "Track your order from dispatch to delivery.",
  },
  {
    icon: Banknote,
    title: "Stripe Connect Payouts",
    description: "Get paid fast and secure via Stripe Connect Express.",
  },
];

export default function FeaturesGrid() {
  return (
    <div className="flex-1 rounded-2xl border border-white/5 bg-[linear-gradient(145deg,#0F172A,#020617)] p-4 sm:p-6 lg:p-8 flex flex-col">

      {/* Section heading */}
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">
        Powerful <span className="text-[#FBBF24]">Features</span> Built for <span className="text-[#FBBF24]">You</span>
      </h2>

      {/* ── Mobile: card list ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:hidden mt-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex items-center gap-4 py-3 px-3 rounded-xl border border-white/[0.06] bg-[linear-gradient(145deg,#0F172A,#020617)]"
            >
              {/* Icon box */}
              <div className="w-10 h-10 rounded-xl bg-[#0B1220] border border-white/[0.07] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[#FBBF24]" aria-hidden="true" />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white leading-tight">{feature.title}</p>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{feature.description}</p>
              </div>
              {/* Chevron */}
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      {/* ── Desktop: 2×2 grid ─────────────────────────────────────────── */}
      <div className="hidden sm:grid grid-cols-2 gap-6 flex-1 mt-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              data-parallax
              className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[linear-gradient(145deg,#0F172A,#020617)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(251,191,36,0.15)] hover:border-yellow-400/25"
            >
              <Icon
                className="w-7 h-7 text-[#FBBF24] shrink-0 icon-pulse"
                aria-hidden="true"
              />
              <p className="text-base font-semibold text-white leading-tight">{feature.title}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
