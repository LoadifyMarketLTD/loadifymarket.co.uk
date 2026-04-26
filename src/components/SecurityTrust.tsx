import { CreditCard, Database, ShieldCheck, BadgeCheck } from "lucide-react";
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
    description:
      "All payments are processed through Stripe with full PCI compliance and encryption.",
  },
  {
    icon: Database,
    title: "Row‑Level Security (RLS)",
    description:
      "Your data is protected with strict row‑level access rules enforced at the database level.",
  },
  {
    icon: ShieldCheck,
    title: "Content Security Policy (CSP)",
    description:
      "A hardened CSP prevents malicious scripts and protects against common web attacks.",
  },
  {
    icon: BadgeCheck,
    title: "UK Business Compliance",
    description:
      "Operated by a registered UK company with transparent policies and verified seller onboarding.",
  },
];

export default function SecurityTrust() {
  return (
    <section className="py-20 bg-gray-50">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
        Security &amp; Trust You Can Rely On
      </h2>
      <p className="text-lg text-gray-600 text-center mb-16">
        Loadify Market is built with enterprise‑grade security, UK compliance, and modern protection standards.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto px-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm flex flex-col gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-green-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="text-base text-gray-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
