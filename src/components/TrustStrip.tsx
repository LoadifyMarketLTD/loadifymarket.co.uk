import { ShieldCheck, Users, CreditCard, Package } from "lucide-react";

const ITEMS = [
  {
    icon: Users,
    label: "Trade & Wholesale Only",
    desc: "Registered business accounts",
  },
  {
    icon: ShieldCheck,
    label: "Verified UK Sellers",
    desc: "Identity-verified suppliers",
  },
  {
    icon: CreditCard,
    label: "Secure via Stripe",
    desc: "Encrypted payment processing",
  },
  {
    icon: Package,
    label: "UK Delivery Support",
    desc: "Seller-fulfilled with tracking",
  },
];

const TrustStrip = () => (
  <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/70" aria-label="Platform trust features">
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-200">
        {ITEMS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3.5">
            <Icon className="h-5 w-5 text-[#0d2240] shrink-0" aria-hidden="true" />
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
