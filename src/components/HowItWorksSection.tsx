import { Monitor, ShoppingCart, Lock, BadgeCheck, Package, Star, ChevronRight } from "lucide-react";

/**
 * How It Works — compact 6-step horizontal buyer purchase flow.
 * Light premium background for visual contrast after dark sections.
 */

const STEPS = [
  {
    num: 1,
    icon: Monitor,
    title: "Browse Products",
    desc: "Explore UK sellers",
  },
  {
    num: 2,
    icon: ShoppingCart,
    title: "Add to Cart",
    desc: "Select & review order",
  },
  {
    num: 3,
    icon: Lock,
    title: "Secure Checkout",
    desc: "Pay safely via Stripe",
  },
  {
    num: 4,
    icon: BadgeCheck,
    title: "Order Confirmed",
    desc: "Instant confirmation",
  },
  {
    num: 5,
    icon: Package,
    title: "Shipped by Seller",
    desc: "Track your delivery",
  },
  {
    num: 6,
    icon: Star,
    title: "Review & Rate",
    desc: "Share your experience",
  },
];

const HowItWorksSection = () => (
  <section className="bg-[#F8F9FC] py-10 px-4 sm:px-6 min-h-[80vh] flex flex-col justify-center">
    <div className="max-w-[1280px] mx-auto">

      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">
          For Buyers
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
          How It Works
        </h2>
        <p className="mt-1.5 text-sm text-[#64748B]">Simple steps from browsing to delivery.</p>
      </div>

      {/* Steps row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-stretch justify-between gap-3 sm:gap-0">
        {STEPS.map((step, idx) => (
          <div key={step.num} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0 flex-1">

            {/* Step cell */}
            <div className="flex flex-col items-center text-center flex-1">
              {/* Green number badge */}
              <span className="w-7 h-7 rounded-full bg-[#22C55E] text-white text-xs font-bold flex items-center justify-center shadow mb-2.5">
                {step.num}
              </span>

              {/* Icon box */}
              <div className="w-11 h-11 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-2.5">
                <step.icon className="h-5 w-5 text-[#334155]" aria-hidden="true" />
              </div>

              {/* Text */}
              <p className="text-xs font-bold text-[#0F172A] mb-0.5 leading-tight">{step.title}</p>
              <p className="text-[10px] text-[#94A3B8] leading-snug max-w-[88px]">{step.desc}</p>
            </div>

            {/* Chevron connector (not after last) */}
            {idx < STEPS.length - 1 && (
              <ChevronRight
                className="hidden sm:block h-4 w-4 text-[#CBD5E1] shrink-0 sm:mt-[-20px]"
                aria-hidden="true"
              />
            )}

          </div>
        ))}
      </div>

    </div>
  </section>
);

export default HowItWorksSection;
