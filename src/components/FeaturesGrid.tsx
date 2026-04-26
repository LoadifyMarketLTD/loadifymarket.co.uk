import {
  FileText,
  MessageSquare,
  Truck,
  Banknote,
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
    title: "Request for Quotes (RFQ)",
    description: "Get custom pricing requests from buyers for bulk orders.",
  },
  {
    icon: MessageSquare,
    title: "Built-In Messaging",
    description: "Communicate directly with buyers before purchase.",
  },
  {
    icon: Truck,
    title: "Order Tracking",
    description: "Track order progress from dispatch to delivery.",
  },
  {
    icon: Banknote,
    title: "Stripe Connect Payouts",
    description: "Get paid fast and secure via Stripe Connect Express.",
  },
];

export default function FeaturesGrid() {
  return (
    <div className="flex-1 rounded-2xl border border-white/5 bg-[linear-gradient(145deg,#0F172A,#020617)] p-6 lg:p-8 flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-4">
        Powerful Features Built for UK Sellers
      </h2>
      <div className="grid grid-cols-2 gap-6 flex-1">
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
