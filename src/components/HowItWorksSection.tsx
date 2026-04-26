import { Search, ShieldCheck, Truck, UserPlus, Tag, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const buyerSteps: Step[] = [
  {
    number: 1,
    icon: Search,
    title: "Browse & Discover",
    description: "Find products from verified UK sellers across all categories.",
  },
  {
    number: 2,
    icon: ShieldCheck,
    title: "Secure Checkout",
    description: "Pay safely via Stripe Checkout with full encryption and buyer protection.",
  },
  {
    number: 3,
    icon: Truck,
    title: "Delivered to You",
    description: "Track your order from your buyer dashboard until it arrives.",
  },
];

const sellerSteps: Step[] = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create Your Account",
    description: "Register in minutes — no fees, no card required, no monthly charges.",
  },
  {
    number: 2,
    icon: Tag,
    title: "List Products or Services",
    description: "Upload photos, set pricing, manage stock, and publish listings instantly.",
  },
  {
    number: 3,
    icon: CreditCard,
    title: "Get Paid via Stripe",
    description: "Receive fast payouts directly to your bank through Stripe Connect Express.",
  },
];

function StepsPanel({ title, steps, id }: { title: string; steps: Step[]; id: string }) {
  return (
    <div id={id} className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-6 lg:p-8">
      <h2 className="text-lg font-bold text-gray-900 mb-6">{title}</h2>
      <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-0">
        {steps.map((step, idx) => (
          <div key={step.number} className="flex items-start sm:flex-col gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {step.number}
                </div>
                <step.icon className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight mb-1">{step.title}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
            </div>
            {idx < steps.length - 1 && (
              <div className="hidden sm:flex items-start pt-2.5 text-gray-300 text-base font-light shrink-0 mx-1 self-start">
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const HowItWorksSection = () => (
  <section className="py-10 lg:py-14 bg-white" aria-label="How it works">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <StepsPanel id="how-it-works-buyers" title="How It Works for Buyers" steps={buyerSteps} />
        <StepsPanel id="how-it-works-sellers" title="How It Works for Sellers" steps={sellerSteps} />
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
