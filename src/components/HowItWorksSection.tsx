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

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="h-[220px] w-full rounded-xl border border-slate-300 bg-white/80 p-5 shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
          {step.number}
        </div>
        <Icon className="w-5 h-5 text-gray-400 shrink-0" aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-gray-900 leading-tight">{step.title}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
    </div>
  );
}

function StepsPanel({ id, title, steps }: { id: string; title: string; steps: Step[] }) {
  return (
    <div id={id} className="w-full rounded-2xl border border-slate-200 bg-white/90 p-6 lg:p-8 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-6">{title}</h2>
      <div className="grid grid-cols-3 gap-5">
        {steps.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}
      </div>
    </div>
  );
}

const HowItWorksSection = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8" aria-label="How it works">
    <StepsPanel id="how-it-works-buyers" title="How It Works for Buyers" steps={buyerSteps} />
    <StepsPanel id="how-it-works-sellers" title="How It Works for Sellers" steps={sellerSteps} />
  </div>
);

export default HowItWorksSection;
