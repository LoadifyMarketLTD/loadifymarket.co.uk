import { Monitor, ShoppingCart, Lock, BadgeCheck, Package, Star, ChevronRight } from "lucide-react";

/**
 * How It Works — single horizontal 6-step flow.
 * Matches reference: gold numbered circles, step icons, chevron arrows,
 * light grey background, centred title + subtitle.
 */

const STEPS = [
  {
    num: 1,
    icon: Monitor,
    title: "Browse Products",
    desc: "Explore a marketplace of UK sellers",
  },
  {
    num: 2,
    icon: ShoppingCart,
    title: "Add to Cart",
    desc: "Select items and review your order",
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
    desc: "Receive instant order confirmation",
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
  <section className="bg-[#F8F9FB] py-14 px-4 sm:px-6">
    <div className="max-w-[1280px] mx-auto">

      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0F172A] mb-2">
          How It Works
        </h2>
        <p className="text-sm text-[#64748B]">Simple steps from browsing to delivery.</p>
      </div>

      {/* Steps row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        {STEPS.map((step, idx) => (
          <div key={step.num} className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-0 flex-1">

            {/* Step cell */}
            <div className="flex flex-col items-center text-center flex-1">
              {/* Green number badge */}
              <span className="w-8 h-8 rounded-full bg-[#22C55E] text-white text-xs font-bold flex items-center justify-center shadow mb-3">
                {step.num}
              </span>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-3">
                <step.icon className="h-6 w-6 text-[#334155]" aria-hidden="true" />
              </div>

              {/* Text */}
              <p className="text-xs font-bold text-[#0F172A] mb-1 leading-tight">{step.title}</p>
              <p className="text-[10px] text-[#94A3B8] leading-snug max-w-[90px]">{step.desc}</p>
            </div>

            {/* Chevron connector (not after last) */}
            {idx < STEPS.length - 1 && (
              <ChevronRight
                className="hidden sm:block h-5 w-5 text-[#CBD5E1] shrink-0 sm:mt-[-28px]"
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
