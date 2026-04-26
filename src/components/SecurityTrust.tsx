import { CreditCard, Database, ShieldCheck, Lock, Zap, Building2, Receipt } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TrustItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const items: TrustItem[] = [
  {
    icon: CreditCard,
    title: "Stripe Connect",
    description:
      "All payments processed through Stripe Connect with full PCI compliance and identity verification.",
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
    icon: Lock,
    title: "JWT Authentication",
    description:
      "Secure JSON Web Token authentication with short-lived tokens and automatic refresh.",
  },
  {
    icon: Zap,
    title: "Rate Limiting",
    description:
      "API rate limiting protects against abuse, bots, and brute-force attacks.",
  },
  {
    icon: Database,
    title: "Supabase Security",
    description:
      "Enterprise-grade Supabase infrastructure with encrypted storage and audit logging.",
  },
  {
    icon: Building2,
    title: "Registered UK Company",
    description:
      "Operated by Loadify Market LTD, a registered company in England & Wales.",
  },
  {
    icon: Receipt,
    title: "VAT Compliant",
    description:
      "Fully VAT-compliant billing including B2B reverse-charge and VAT verification.",
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto px-4">
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
