import { ArrowRight, Boxes, ClipboardList, CreditCard, Search, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";

const sellerCapabilities = [
  {
    number: "01",
    icon: Boxes,
    title: "Bring your catalogue",
    description: "Create and manage product listings from your seller environment and put them in front of marketplace shoppers.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Run marketplace orders",
    description: "Keep day-to-day order activity visible from the same seller workflow instead of piecing commerce together manually.",
  },
  {
    number: "03",
    icon: CreditCard,
    title: "Follow a structured payout path",
    description: "Where eligible, seller payouts follow the platform’s Stripe Connect flow.",
  },
];

export default function FeaturesGrid() {
  return (
    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch" aria-label="Why sell on Loadify Market">
      <section className="relative overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-[#0A234F] text-white shadow-[0_22px_60px_rgba(10,35,79,0.17)]" aria-label="Seller proposition">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#1D57D8]/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[#F5A300]" aria-hidden="true" />
        <div className="absolute inset-0 opacity-16" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />

        <div className="relative px-6 py-7 sm:px-8 sm:py-8 lg:px-9 lg:py-9">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Built for serious sellers</p>
          <h2 className="mt-3 max-w-[500px] text-3xl font-black leading-[1.02] tracking-[-0.035em] sm:text-4xl">
            Your products deserve more than a listing.
          </h2>
          <p className="mt-4 max-w-[480px] text-sm font-medium leading-6 text-white/80 sm:text-base sm:leading-7">
            Bring your catalogue to Loadify and keep listings, marketplace orders and eligible payouts connected to the same place buyers shop.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#F5A300]/30 bg-[#F5A300]/10 px-3 py-2 text-[11px] font-extrabold text-[#FFD77A]">
            0% seller commission until 31 December 2026
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link to="/register?type=seller" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-5 py-2.5 text-sm font-extrabold text-[#0A234F] transition-all hover:-translate-y-0.5 hover:bg-[#E69500]">
              Start selling
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/catalog" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10">
              See what is live now
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/12 pt-4">
            {[
              { icon: Search, label: "Discovery" },
              { icon: ShieldCheck, label: "Checkout" },
              { icon: Truck, label: "Tracking" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="border-l border-white/15 pl-3 first:border-l-0 first:pl-0">
                <Icon className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />
                <p className="mt-1.5 text-[10px] font-bold text-white/80">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-[#0A234F] text-white shadow-[0_22px_60px_rgba(10,35,79,0.17)]" aria-label="Seller operations">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#1D57D8]/25 blur-3xl" aria-hidden="true" />
        <div className="relative px-6 py-7 sm:px-8 sm:py-8 lg:px-9 lg:py-9">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">From product to payout</p>
          <h3 className="mt-2 max-w-[620px] text-2xl font-black tracking-[-0.025em] text-white sm:text-3xl">
            Bring the products. Keep the operation together.
          </h3>

          <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
            {sellerCapabilities.map(({ number, icon: Icon, title, description }) => (
              <div key={number} className="grid grid-cols-[40px_1fr] gap-3 py-4 sm:grid-cols-[48px_1fr] sm:gap-4 sm:py-5">
                <div>
                  <p className="text-[9px] font-black tracking-[0.16em] text-white/45">{number}</p>
                  <div className="mt-1.5 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-[#F5A300] sm:h-9 sm:w-9">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-extrabold leading-5 text-white sm:text-base">{title}</p>
                  <p className="mt-1.5 text-[12px] leading-5 text-white/68 sm:text-sm sm:leading-6">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
