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
    className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#0A234F]/10 bg-white shadow-[0_12px_35px_rgba(10,35,79,0.07)] sm:grid-cols-4"
    aria-label="Platform trust features"
  >
    {ITEMS.map(({ icon: Icon, label, sub }, index) => (
      <div
        key={label}
        className={[
          "group flex min-h-[92px] items-center gap-3 px-4 py-4 transition-colors duration-200 sm:min-h-[104px] sm:px-5",
          "hover:bg-[#F7F9FC]",
          index % 2 === 0 ? "border-r border-[#0A234F]/10" : "",
          index < 2 ? "border-b border-[#0A234F]/10 sm:border-b-0" : "",
          index > 0 ? "sm:border-l sm:border-[#0A234F]/10" : "",
          index === 2 ? "sm:border-l" : "",
        ].join(" ")}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF5DF] text-[#B57500] sm:h-10 sm:w-10">
          <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold leading-tight text-[#0A234F] sm:text-sm">{label}</p>
          <p className="mt-1 text-[10px] font-medium leading-[1.35] text-[#64748B] sm:text-[11px]">{sub}</p>
        </div>
      </div>
    ))}
  </div>
);

export default TrustStrip;
