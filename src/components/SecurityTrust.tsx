import { CreditCard, ShieldCheck, Globe, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TrustItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const items: TrustItem[] = [
  {
    icon: CreditCard,
    title: "Stripe Secured Payments",
    description: "All payments are processed through Stripe with full PCI compliance.",
  },
  {
    icon: ShieldCheck,
    title: "Buyer Protection",
    description: "Your transactions are protected with industry-standard security.",
  },
  {
    icon: Globe,
    title: "UK-Based Marketplace",
    description: "Operated by a registered UK company with verified details.",
  },
  {
    icon: Lock,
    title: "Secure Platform",
    description: "Your data and information are kept safe with modern protection.",
  },
];

export default function SecurityTrust() {
  return (
    <div className="flex-1 bg-white p-6 lg:p-8">
      <h2 className="text-lg font-bold text-gray-900 mb-5">
        Security &amp; Trust You Can Rely On
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex flex-col gap-1.5 bg-white rounded-xl border border-[#0A1930] p-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-green-700" aria-hidden="true" />
              </div>
              <p className="text-xs font-bold text-gray-900 leading-tight">{item.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
