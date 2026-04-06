import { ArrowRight, UserPlus, ClipboardList, CreditCard, ShieldCheck, Rocket } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * SellerJourneySection — transparent breakdown of the real seller activation
 * flow as implemented in the platform:
 *
 *   Register → Complete Profile → Connect Stripe → Admin Review → Go Live
 *
 * Each step maps to a real system feature so the homepage is never
 * disconnected from what the platform actually does.
 */

const STEPS = [
  {
    icon: UserPlus,
    iconBg: "bg-green-50",
    iconColor: "text-[#22C55E]",
    num: "01",
    title: "Create Your Seller Account",
    desc: "Register with your email and choose the Seller account type. No upfront fees.",
    badge: "Free to register",
    badgeColor: "bg-green-50 text-[#16A34A]",
  },
  {
    icon: ClipboardList,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    num: "02",
    title: "Complete Your Seller Profile",
    desc: "Add your store name, business details, contact information and postcode so buyers can find you.",
    badge: "Required before listing",
    badgeColor: "bg-amber-50 text-amber-700",
  },
  {
    icon: CreditCard,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    num: "03",
    title: "Connect Your Stripe Account",
    desc: "Link a Stripe Express account to receive payments directly. Stripe handles all card processing securely.",
    badge: "Powered by Stripe",
    badgeColor: "bg-violet-50 text-violet-700",
  },
  {
    icon: ShieldCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    num: "04",
    title: "Admin Review & Activation",
    desc: "Our team reviews your application. Once approved, your seller account is activated and you can list immediately.",
    badge: "Typically within 24 hrs",
    badgeColor: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: Rocket,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    num: "05",
    title: "List Products & Start Selling",
    desc: "Upload products with images, pricing and stock. Orders are paid via Stripe — you get fast payouts to your bank.",
    badge: "7% commission on sales",
    badgeColor: "bg-rose-50 text-rose-700",
  },
];

const SellerJourneySection = () => (
  <section className="bg-white py-16 border-y border-gray-100" id="how-to-sell">
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6">

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-3">
          For Sellers
        </span>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0F172A] mb-3">
          How Selling on Loadify Market Works
        </h2>
        <p className="text-sm text-[#64748B]">
          A transparent, step-by-step breakdown of the real seller activation process —
          from registration to your first payout.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="relative flex flex-col items-start p-5 rounded-2xl border border-gray-100 bg-[#F8F9FB] hover:shadow-md transition-shadow duration-200"
            >
              {/* Step number */}
              <span className="text-[10px] font-bold text-[#94A3B8] mb-3 tracking-widest">
                STEP {step.num}
              </span>

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${step.iconBg}`}>
                <Icon className={`h-5 w-5 ${step.iconColor}`} aria-hidden="true" />
              </div>

              {/* Title */}
              <p className="text-sm font-bold text-[#0F172A] mb-2 leading-snug">{step.title}</p>

              {/* Description */}
              <p className="text-xs text-[#64748B] leading-relaxed mb-4 flex-1">{step.desc}</p>

              {/* Badge */}
              <span className={`inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full ${step.badgeColor}`}>
                {step.badge}
              </span>

              {/* Arrow connector (all except last on large screens) */}
              {idx < STEPS.length - 1 && (
                <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center">
                  <ArrowRight className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden="true" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA row */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/signup?type=seller">
          <button className="inline-flex items-center gap-2 h-12 px-8 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-sm rounded-full shadow-md transition-all hover:-translate-y-0.5">
            Start Your Seller Journey <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
        <Link to="/seller-guidelines" className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">
          Read Seller Guidelines →
        </Link>
      </div>

      {/* Footnote */}
      <p className="text-center text-[11px] text-[#94A3B8] mt-6">
        Loadify Market does not hold or sell inventory. All products are listed, managed, and fulfilled by independent registered sellers.
      </p>
    </div>
  </section>
);

export default SellerJourneySection;
