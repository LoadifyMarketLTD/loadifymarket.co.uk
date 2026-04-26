import {
  FileText,
  MessageSquare,
  Truck,
  RotateCcw,
  ShieldCheck,
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
    description:
      "Buyers can request custom pricing for bulk orders or special requirements.",
  },
  {
    icon: MessageSquare,
    title: "Built‑In Messaging",
    description:
      "Communicate directly with buyers to clarify details before they purchase.",
  },
  {
    icon: Truck,
    title: "Order Tracking",
    description:
      "Buyers and sellers can track order progress from dispatch to delivery.",
  },
  {
    icon: RotateCcw,
    title: "Returns Management",
    description:
      "Handle return requests smoothly with a structured workflow.",
  },
  {
    icon: ShieldCheck,
    title: "Dispute Resolution",
    description:
      "A clear process for resolving issues between buyers and sellers.",
  },
  {
    icon: Banknote,
    title: "Stripe Connect Payouts",
    description:
      "Fast, secure payouts directly to your bank via Stripe Connect Express.",
  },
];

export default function FeaturesGrid() {
  return (
    <section className="py-20 bg-white">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
        Powerful Features Built for UK Sellers
      </h2>
      <p className="text-lg text-gray-600 text-center mb-16">
        Everything you need to sell, manage orders, and get paid — all in one place.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto px-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm flex flex-col gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-green-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-base text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
