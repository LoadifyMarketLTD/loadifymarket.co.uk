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
    title: "Discover Products",
    description: "Browse categories, search the marketplace and choose the product that fits your needs.",
  },
  {
    icon: ShieldCheck,
    title: "Checkout Securely",
    description: "Complete your purchase through Loadify with Stripe-powered payment processing.",
  },
  {
    icon: Truck,
    title: "Track Your Order",
    description: "Follow order progress from your buyer account through dispatch and delivery.",
  },
];

const sellerSteps: Step[] = [
  {
    icon: UserPlus,
    title: "Create Your Seller Account",
    description: "Register and complete the required seller setup before trading on the marketplace.",
  },
  {
    icon: Tag,
    title: "Build Your Catalogue",
    description: "Add products, pricing and stock, then manage your marketplace listings from one place.",
  },
  {
    icon: CreditCard,
    title: "Sell & Get Paid",
    description: "Manage orders and receive eligible seller payouts through Stripe Connect.",
  },
];

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div
      data-parallax
      className="rounded-2xl border border-white/5 bg-elevated p-5 lg:p-6 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(212,175,55,0.15)] hover:border-primary/40"
    >
      <Icon className="w-7 h-7 text-primary shrink-0 icon-pulse" aria-hidden="true" />
      <p className="text-base font-semibold text-white leading-tight">{step.title}</p>
      <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>
    </div>
  );
}

function StepsPanel({ id, eyebrow, title, steps }: { id: string; eyebrow: string; title: string; steps: Step[] }) {
  return (
    <section id={id} className="w-full rounded-2xl border border-white/5 bg-elevated p-6 lg:p-8">
      <p className="text-[10px] font-black text-primary uppercase tracking-[0.18em] mb-1.5">{eyebrow}</p>
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        {steps.map((step) => (
          <StepCard key={step.title} step={step} />
        ))}
      </div>
    </section>
  );
}

const HowItWorksSection = () => (
  <div className="w-full max-w-[1280px] mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8" aria-label="How Loadify Market works">
    <StepsPanel id="how-it-works-buyers" eyebrow="For buyers" title="From discovery to delivery" steps={buyerSteps} />
    <StepsPanel id="how-it-works-sellers" eyebrow="For sellers" title="From listing to payout" steps={sellerSteps} />
  </div>
);

export default HowItWorksSection;
