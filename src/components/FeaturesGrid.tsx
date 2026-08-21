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
    <div className="sm:flex-1 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#0B2F6B] sm:p-6 lg:p-8 sm:flex sm:flex-col">
      <h2 className="text-[17px] sm:text-xl font-semibold text-white mb-3 sm:mb-1">
        Everything you need to{' '}
        <span className="text-[#F5A300]">buy and sell</span>
      </h2>

      <div className="flex flex-col sm:hidden" style={{ gap: '12px', marginTop: '12px' }}>
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="bg-[#0B2F6B]"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                minHeight: '72px',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '16px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(245,163,0,0.10)',
                  border: '1px solid rgba(245,163,0,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon style={{ width: '18px', height: '18px' }} className="text-[#F5A300]" aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }} className="text-white">
                  {feature.title}
                </p>
                <p style={{ fontSize: '12px', lineHeight: 1.4, marginTop: '3px' }} className="text-white/62">
                  {feature.description}
                </p>
              </div>
              <ChevronRight style={{ width: '16px', height: '16px', flexShrink: 0 }} className="text-white/48" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      <div className="hidden sm:grid grid-cols-2 gap-6 flex-1 mt-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              data-parallax
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0A234F] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(29,87,216,0.22)] hover:border-[#F5A300]/40"
            >
              <Icon className="w-7 h-7 text-[#F5A300] shrink-0 icon-pulse" aria-hidden="true" />
              <p className="text-base font-semibold text-white leading-tight">{feature.title}</p>
              <p className="text-sm text-white/62 leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
