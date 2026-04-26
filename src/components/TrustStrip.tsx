import { ShieldCheck, Flag, BadgeCheck, Percent } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    label: "Secure Payments",
    sub: "Powered by Stripe",
  },
  {
    icon: Flag,
    label: "UK Marketplace",
    sub: "Registered UK company",
  },
  {
    icon: BadgeCheck,
    label: "Seller Verification",
    sub: "Identity-checked via Stripe",
  },
  {
    icon: Percent,
    label: "0% Commission",
    sub: "Until 31 December 2026",
  },
];

const TrustStrip = () => (
  <div className="bg-gray-50 border-y border-gray-200" aria-label="Platform trust features">
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-200">
        {ITEMS.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3 px-4 lg:px-6 py-5">
            <span className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-green-700" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight whitespace-nowrap">{label}</p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default TrustStrip;
