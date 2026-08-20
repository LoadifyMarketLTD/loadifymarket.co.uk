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
    description: "Modern authentication and platform security controls protect marketplace access and account activity.",
  },
  {
    icon: Building2,
    title: "UK-Operated Marketplace",
    description: "Loadify Market is operated in the UK by XDrive Logistics Ltd.",
  },
  {
    icon: PackageCheck,
    title: "Order Visibility",
    description: "Buyers can follow order progress and access their marketplace order history from Loadify.",
  },
];

export default function SecurityTrust() {
  return (
    <div className="flex-1 rounded-2xl border border-white/5 bg-elevated p-6 lg:p-8 flex flex-col">
      <p className="text-[10px] font-black text-primary uppercase tracking-[0.18em] mb-1.5">
        Trust by design
      </p>
      <h2 className="text-xl font-semibold text-white mb-4">
        A marketplace experience built around clear, secure transactions
      </h2>
      <div className="grid grid-cols-2 gap-6 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              data-parallax
              className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-elevated p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(212,175,55,0.15)] hover:border-primary/40"
            >
              <Icon className="w-7 h-7 text-primary shrink-0 icon-pulse" aria-hidden="true" />
              <p className="text-base font-semibold text-white leading-tight">{item.title}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
