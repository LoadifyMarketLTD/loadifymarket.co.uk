import { ShieldCheck, CreditCard, BadgeCheck, Tag } from "lucide-react";

const ITEMS = [
  {
    icon: CreditCard,
    label: "Stripe-Secured Payments",
    desc: "Every transaction encrypted end-to-end",
  },
  {
    icon: BadgeCheck,
    label: "Verified UK Sellers",
    desc: "Identity-checked before they can list",
  },
  {
    icon: ShieldCheck,
    label: "UK-Based Marketplace",
    desc: "Registered & operated in the United Kingdom",
  },
  {
    icon: Tag,
    label: "0% Commission Until 2027",
    desc: "No hidden fees — list and sell for free",
  },
];

const TrustStrip = () => (
  <div className="bg-white border-b border-gray-200" aria-label="Platform trust features">
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-200">
        {ITEMS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-4">
            <span className="w-9 h-9 bg-green-50 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-[#15803d]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 leading-tight">{label}</p>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default TrustStrip;
