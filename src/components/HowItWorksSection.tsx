import { Search, ShieldCheck, Truck, UserPlus, Tag, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const buyerSteps: Step[] = [
  {
    icon: Search,
    title: "Browse & Discover",
    description: "Find products from verified UK sellers across all categories.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Checkout",
    description: "Pay safely via Stripe Checkout with full encryption and buyer protection.",
  },
  {
    icon: Truck,
    title: "Delivered to You",
    description: "Track your order from your buyer dashboard until it arrives.",
  },
];

const sellerSteps: Step[] = [
  {
    icon: UserPlus,
    title: "Create Your Account",
    description: "Register in minutes — no fees, no card required, no monthly charges.",
  },
  {
    icon: Tag,
    title: "List Products or Services",
    description: "Upload photos, set pricing, manage stock, and publish listings instantly.",
  },
  {
    icon: CreditCard,
    title: "Get Paid via Stripe",
    description: "Receive fast payouts directly to your bank through Stripe Connect Express.",
  },
];

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="rounded-2xl border border-white/5 bg-[linear-gradient(145deg,#0F172A,#020617)] p-6 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(251,191,36,0.15)] hover:border-yellow-400/25">
      <Icon
        className="w-7 h-7 text-[#FBBF24] shrink-0"
        style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.4))' }}
        aria-hidden="true"
      />
      <p className="text-base font-semibold text-white leading-tight">{step.title}</p>
      <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
    </div>
  );
}

function StepsPanel({ id, title, steps }: { id: string; title: string; steps: Step[] }) {
  return (
    <div id={id} className="w-full rounded-2xl border border-white/5 bg-[linear-gradient(145deg,#0F172A,#020617)] p-6 lg:p-8">
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      <div className="grid grid-cols-3 gap-6">
        {steps.map((step) => (
          <StepCard key={step.title} step={step} />
        ))}
      </div>
    </div>
  );
}

const HowItWorksSection = () => (
  <div className="grid grid-cols-2 gap-8" aria-label="How it works">
    <StepsPanel id="how-it-works-buyers" title="How It Works for Buyers" steps={buyerSteps} />
    <StepsPanel id="how-it-works-sellers" title="How It Works for Sellers" steps={sellerSteps} />
  </div>
);

export default HowItWorksSection;
