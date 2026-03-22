import { ShieldCheck, CreditCard, Zap, MapPin } from "lucide-react";

const benefits = [
  {
    icon: ShieldCheck,
    color: "text-emerald-600 bg-emerald-50",
    title: "Verified Sellers",
    description: "Every seller is vetted and approved before listing.",
  },
  {
    icon: CreditCard,
    color: "text-blue-600 bg-blue-50",
    title: "Secure Payments",
    description: "Stripe-powered checkout with full buyer protection.",
  },
  {
    icon: Zap,
    color: "text-amber-600 bg-amber-50",
    title: "Fast Deals",
    description: "List, discover and close deals in minutes.",
  },
  {
    icon: MapPin,
    color: "text-violet-600 bg-violet-50",
    title: "UK Coverage",
    description: "Nationwide network of buyers and sellers.",
  },
];

const TrustStrip = () => (
  <section className="bg-white py-8 border-b border-gray-100">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${b.color}`}>
              <b.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{b.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{b.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustStrip;
