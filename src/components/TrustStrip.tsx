import { ShieldCheck, Truck, Building2, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TrustItem {
  icon: LucideIcon;
  label: string;
  sub: string;
}

const ITEMS: TrustItem[] = [
  { icon: ShieldCheck, label: "Secure Checkout", sub: "Payments powered by Stripe" },
  { icon: Truck, label: "Order Tracking", sub: "Follow orders through delivery" },
  { icon: Building2, label: "UK Operated", sub: "Run by XDrive Logistics Ltd" },
  { icon: Percent, label: "0% Seller Commission", sub: "Until 31 Dec 2026" },
];

const TrustStrip = () => (
  <div
    className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6"
    aria-label="Platform trust features"
  >
    {ITEMS.map(({ icon: Icon, label, sub }) => (
      <div
        key={label}
        className={[
          "flex items-center gap-2.5 sm:gap-3",
          "rounded-2xl",
          "bg-surface sm:bg-elevated",
          "border border-white/[0.07] sm:border-white/5",
          "p-[14px] sm:px-5 sm:py-4",
          "transition-all duration-300",
          "sm:hover:-translate-y-1 sm:hover:shadow-[0_0_25px_rgba(212,175,55,0.15)] sm:hover:border-primary/40",
        ].join(" ")}
      >
        <span className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 overflow-hidden">
          <Icon
            className="h-[18px] w-[18px] sm:h-6 sm:w-6 text-primary"
            style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.4))' }}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold text-white leading-tight">{label}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground sm:text-slate-400 leading-tight mt-0.5">{sub}</p>
        </div>
      </div>
    ))}
  </div>
);

export default TrustStrip;
