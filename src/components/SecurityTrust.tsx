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
    <div className="flex-1 rounded-2xl border border-white/5 bg-[linear-gradient(145deg,#0F172A,#020617)] p-6 lg:p-8 flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-4">
        Security &amp; Trust You Can Rely On
      </h2>
      <div className="grid grid-cols-2 gap-6 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[linear-gradient(145deg,#0F172A,#020617)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(251,191,36,0.15)] hover:border-yellow-400/25"
            >
              <Icon
                className="w-7 h-7 text-[#FBBF24] shrink-0"
                style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.4))' }}
                aria-hidden="true"
              />
              <p className="text-base font-semibold text-white leading-tight">{item.title}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
