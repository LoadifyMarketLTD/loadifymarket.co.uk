import { Link } from 'react-router-dom';
import { Search, ShieldCheck, Truck, UserPlus, Tag, CreditCard, ArrowRight } from "lucide-react";
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
    <div className="flex flex-col gap-3 flex-1 min-w-0">
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

function StepsPanel({
  id,
  title,
  steps,
  cta,
}: {
  id: string;
  title: string;
  steps: Step[];
  cta?: { label: string; to: string };
}) {
  return (
    <div id={id} className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-6 lg:p-8 flex flex-col">
      <h2 className="text-lg font-bold text-gray-900 mb-6">{title}</h2>

      {/* Steps row — arrows as siblings between cards */}
      <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-0 flex-1">
        {steps.map((step, idx) => (
          <>
            <StepCard key={step.number} step={step} />
            {idx < steps.length - 1 && (
              <div key={`arrow-${idx}`} className="hidden sm:flex items-center shrink-0 px-2">
                <ArrowRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </div>
            )}
          </>
        ))}
      </div>

      {/* Optional section CTA */}
      {cta && (
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <Link
            to={cta.to}
            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            {cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

const HowItWorksSection = () => (
  <section className="py-10 lg:py-14 bg-[#0A1930]" aria-label="How it works">
    <div className="w-full px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <StepsPanel
          id="how-it-works-buyers"
          title="How It Works for Buyers"
          steps={buyerSteps}
        />
        <StepsPanel
          id="how-it-works-sellers"
          title="How It Works for Sellers"
          steps={sellerSteps}
          cta={{ label: "Start Selling — It's Free", to: "/register?type=seller" }}
        />
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
