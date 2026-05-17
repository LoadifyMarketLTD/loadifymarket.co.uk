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
    title: "Buyer/Seller Messaging",
    description: "Communicate directly with buyers before purchase.",
  },
  {
    icon: Truck,
    title: "Order Tracking",
    description: "Track your order from dispatch to delivery.",
  },
  {
    icon: Banknote,
    title: "Stripe Payouts",
    description: "Get paid fast and secure via Stripe Connect Express.",
  },
];

export default function FeaturesGrid() {
  return (
    <div className="sm:flex-1 sm:rounded-2xl sm:border sm:border-white/5 sm:bg-elevated sm:p-6 lg:p-8 sm:flex sm:flex-col">

      {/* Section heading */}
      <h2
        className="text-[17px] sm:text-xl font-semibold text-white mb-3 sm:mb-1"
      >
        Everything you need to{' '}
        <span className="text-primary sm:text-primary">buy and sell</span>
      </h2>

      {/* ── Mobile: spec-exact card list ────────────────────────────── */}
      <div className="flex flex-col sm:hidden" style={{ gap: '12px', marginTop: '12px' }}>
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                minHeight: '72px',
                
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '16px',
              }}
            >
              {/* Icon box */}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon style={{ width: '18px', height: '18px' }} className="text-primary" aria-hidden="true" />
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,1)', lineHeight: 1.2 }}>
                  {feature.title}
                </p>
                <p style={{ fontSize: '12px', lineHeight: 1.4, marginTop: '3px' }} className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
              {/* Chevron */}
              <ChevronRight style={{ width: '16px', height: '16px', flexShrink: 0 }} className="text-muted-foreground" aria-hidden="true" />
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
              className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-elevated p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(212,175,55,0.15)] hover:border-primary/40"
            >
              <Icon
                className="w-7 h-7 text-primary shrink-0 icon-pulse"
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
