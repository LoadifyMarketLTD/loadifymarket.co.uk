import { Building2, Percent, ShieldCheck, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TrustItem {
  icon: LucideIcon;
  label: string;
}

const ITEMS: TrustItem[] = [
  { icon: Percent, label: "0% commission for founding sellers" },
  { icon: ShieldCheck, label: "Verified seller status" },
  { icon: CreditCard, label: "Stripe-powered checkout" },
  { icon: Building2, label: "UK-operated marketplace" },
];

const TrustStrip = () => (
  <div
    className="grid grid-cols-1 overflow-hidden rounded-xl border border-[#0A234F]/10 bg-[#F1EFEA]/80 px-3 text-[#5A6578] sm:grid-cols-2 lg:grid-cols-4"
    aria-label="Platform trust features"
  >
    {ITEMS.map(({ icon: Icon, label }, index) => (
      <div
        key={label}
        className={[
          "flex min-h-[58px] items-center justify-center gap-2.5 px-4 py-3 text-center",
          index > 0 ? "border-t border-[#0A234F]/8 sm:border-t-0 sm:border-l" : "",
          index === 2 ? "sm:border-l-0 lg:border-l" : "",
        ].join(" ")}
      >
        <Icon className="h-4 w-4 shrink-0 text-[#5A6578]" strokeWidth={1.5} aria-hidden="true" />
        <span className="text-[12px] font-medium leading-5 text-[#4F5968]">{label}</span>
      </div>
    ))}
  </div>
);

export default TrustStrip;
