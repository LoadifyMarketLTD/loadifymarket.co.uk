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
    <div className="flex-1 rounded-2xl border border-slate-200 bg-white/90 shadow-sm p-6 lg:p-8 flex flex-col">
      <h2 className="text-lg font-bold text-gray-900 mb-6">
        Powerful Features Built for UK Sellers
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:gap-5 flex-1">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="min-h-[150px] flex flex-col gap-2 rounded-xl border border-slate-300 bg-white/80 p-5 shadow-sm">
              <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-green-700" aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{feature.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
