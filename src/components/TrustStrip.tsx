import { ShieldCheck, CreditCard, Zap, BadgeCheck } from "lucide-react";

const benefits = [
  {
    icon: ShieldCheck,
    color: "text-emerald-600 bg-emerald-50",
    title: "Active Seller Accounts",
    description: "Sellers complete profile and Stripe setup before listing.",
  },
  {
    icon: CreditCard,
    color: "text-[#2563EB] bg-blue-50",
    title: "Secure Payments",
    description: "Stripe-powered checkout for every transaction.",
  },
  {
    icon: Zap,
    color: "text-amber-600 bg-amber-50",
    title: "Fast Deals",
    description: "Discover, message and buy in minutes.",
  },
  {
    icon: BadgeCheck,
    color: "text-violet-600 bg-violet-50",
    title: "UK Coverage",
    description: "Nationwide network of UK suppliers.",
  },
];

const TrustStrip = () => (
  <section className="bg-white py-8 border-b border-gray-100">
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${b.color}`}>
              <b.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">{b.title}</p>
              <p className="text-xs text-[#64748B] mt-0.5 leading-snug">{b.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustStrip;
