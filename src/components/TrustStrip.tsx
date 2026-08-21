import { Building2, Percent, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TrustItem {
  icon: LucideIcon;
  label: string;
  sub: string;
}

const ITEMS: TrustItem[] = [
  { icon: ShieldCheck, label: "Secure checkout", sub: "Payments powered by Stripe" },
  { icon: Truck, label: "Order visibility", sub: "Track progress through delivery" },
  { icon: Building2, label: "UK operated", sub: "Run by XDrive Logistics Ltd" },
  { icon: Percent, label: "0% seller commission", sub: "Until 31 Dec 2026" },
];

const TrustStrip = () => (
  <div
    className="relative grid grid-cols-2 overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-[#0A234F] text-white shadow-[0_18px_55px_rgba(10,35,79,0.16)] sm:grid-cols-4"
    aria-label="Platform trust features"
  >
    <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#1D57D8]/25 blur-3xl" aria-hidden="true" />
    {ITEMS.map(({ icon: Icon, label, sub }, index) => (
      <div
        key={label}
        className={[
          "group relative flex min-h-[92px] items-center gap-3 px-4 py-4 transition-colors duration-200 sm:min-h-[104px] sm:px-5",
          "hover:bg-white/[0.055]",
          index % 2 === 0 ? "border-r border-white/10" : "",
          index < 2 ? "border-b border-white/10 sm:border-b-0" : "",
          index > 0 ? "sm:border-l sm:border-white/10" : "",
          index === 2 ? "sm:border-l" : "",
        ].join(" ")}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-[#F5A300] sm:h-10 sm:w-10">
          <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold leading-tight text-white sm:text-sm">{label}</p>
          <p className="mt-1 text-[10px] font-medium leading-[1.35] text-white/65 sm:text-[11px]">{sub}</p>
        </div>
      </div>
    ))}
  </div>
);

export default TrustStrip;
