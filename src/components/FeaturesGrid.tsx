import {
  Search,
  CreditCard,
  Truck,
  Store,
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
    icon: Search,
    title: "Discover Across Categories",
    description: "Search and browse products from one marketplace experience.",
  },
  {
    icon: CreditCard,
    title: "Secure Checkout",
    description: "Pay through Stripe without leaving the Loadify purchase flow.",
  },
  {
    icon: Truck,
    title: "Order Tracking",
    description: "Follow order progress from dispatch through delivery.",
  },
  {
    icon: Store,
    title: "Built for Sellers",
    description: "List products, manage orders and receive payouts through Stripe Connect.",
  },
];

export default function FeaturesGrid() {
  return (
    <section className="w-full max-w-[1280px] mx-auto rounded-2xl border border-white/5 bg-elevated p-6 lg:p-8" aria-label="Marketplace benefits">
      <div className="mb-4">
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.18em] mb-1.5">
          One marketplace experience
        </p>
        <h2 className="text-xl sm:text-2xl font-semibold text-white">
          Built for confident buying and{' '}
          <span className="text-primary">serious selling</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              data-parallax
              className="group flex items-center sm:items-start gap-4 sm:flex-col rounded-2xl border border-white/[0.07] bg-surface p-5 lg:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(212,175,55,0.15)] hover:border-primary/40"
            >
              <div className="h-11 w-11 rounded-xl border border-primary/20 bg-primary/[0.08] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary icon-pulse" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-white leading-tight">{feature.title}</p>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1.5">{feature.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/50 sm:hidden shrink-0" aria-hidden="true" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
