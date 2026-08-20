import { CreditCard, ShieldCheck, Building2, PackageCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TrustItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const items: TrustItem[] = [
  {
    icon: CreditCard,
    title: "Stripe-Powered Payments",
    description: "Checkout payments are processed through Stripe using the platform's secure payment flow.",
  },
  {
    icon: ShieldCheck,
    title: "Account & Platform Safeguards",
    description: "Modern authentication and platform controls protect access and account activity.",
  },
  {
    icon: Building2,
    title: "UK-Operated Marketplace",
    description: "Loadify Market is operated in the UK by XDrive Logistics Ltd.",
  },
  {
    icon: PackageCheck,
    title: "Order Visibility",
    description: "Buyers can follow order progress and access marketplace order history from Loadify.",
  },
];

export default function SecurityTrust() {
  return (
    <section className="w-full max-w-[1280px] mx-auto rounded-2xl border border-white/5 bg-elevated p-6 lg:p-8" aria-label="Trust and platform safeguards">
      <p className="text-[10px] font-black text-primary uppercase tracking-[0.18em] mb-1.5">
        Trust by design
      </p>
      <h2 className="text-xl sm:text-2xl font-semibold text-white mb-5 max-w-3xl">
        Clear transactions, secure payment processing and visible order progress
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              data-parallax
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-surface p-5 lg:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(212,175,55,0.15)] hover:border-primary/40"
            >
              <div className="h-11 w-11 rounded-xl border border-primary/20 bg-primary/[0.08] flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary icon-pulse" aria-hidden="true" />
              </div>
              <p className="text-base font-semibold text-white leading-tight">{item.title}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
