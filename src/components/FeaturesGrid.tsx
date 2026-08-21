import { ArrowRight, Boxes, ClipboardList, CreditCard, Search, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";

const sellerCapabilities = [
  {
    number: "01",
    icon: Boxes,
    title: "Build a catalogue that belongs in a real marketplace",
    description: "Create and manage product listings from your seller environment instead of treating Loadify like a one-page advert board.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Operate orders from one seller workflow",
    description: "Keep marketplace activity visible as orders move through the platform, with seller tools designed around day-to-day commerce.",
  },
  {
    number: "03",
    icon: CreditCard,
    title: "Use a structured payout path",
    description: "Eligible seller payouts run through Stripe Connect rather than an improvised manual payment process.",
  },
];

export default function FeaturesGrid() {
  return (
    <section
      className="w-full overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-white shadow-[0_18px_55px_rgba(10,35,79,0.08)]"
      aria-label="Why sell on Loadify Market"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="relative overflow-hidden bg-[#0A234F] px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div
            className="absolute inset-0 opacity-20"
            aria-hidden="true"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '38px 38px',
            }}
          />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">For serious sellers</p>
            <h2 className="mt-3 max-w-[480px] text-3xl font-black leading-[1.02] tracking-[-0.035em] sm:text-4xl">
              More than somewhere to list. Somewhere to operate.
            </h2>
            <p className="mt-5 max-w-[470px] text-sm font-medium leading-6 text-white/72 sm:text-base sm:leading-7">
              Loadify is being built as a professional marketplace environment: catalogue, orders and seller payment infrastructure connected to the same customer experience.
            </p>

            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#F5A300]/30 bg-[#F5A300]/10 px-3 py-2 text-[11px] font-extrabold text-[#FFD77A]">
              0% seller commission until 31 December 2026
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                to="/register?type=seller"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-5 py-3 text-sm font-extrabold text-[#0A234F] transition-all hover:-translate-y-0.5 hover:bg-[#E69500]"
              >
                Start your seller account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/catalog"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                See the marketplace
              </Link>
            </div>

            <div className="mt-10 border-t border-white/12 pt-6">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Why the seller proposition is credible</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { icon: Search, label: "Discovery" },
                  { icon: ShieldCheck, label: "Checkout" },
                  { icon: Truck, label: "Tracking" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="border-l border-white/15 pl-3 first:border-l-0 first:pl-0">
                    <Icon className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />
                    <p className="mt-2 text-[10px] font-bold text-white/75">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="max-w-[670px]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0E3FA9]">Seller operating layer</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.025em] text-[#0A234F] sm:text-3xl">
              The value is in the workflow, not the sales pitch.
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#64748B] sm:text-base">
              Each capability below maps to an actual seller or payment path in the platform. No invented growth numbers, fake merchant logos or synthetic proof.
            </p>
          </div>

          <div className="mt-8 divide-y divide-[#0A234F]/10 border-y border-[#0A234F]/10">
            {sellerCapabilities.map(({ number, icon: Icon, title, description }) => (
              <div key={number} className="grid grid-cols-[44px_1fr] gap-4 py-5 sm:grid-cols-[56px_1fr] sm:gap-5 sm:py-6">
                <div>
                  <p className="text-[10px] font-black tracking-[0.16em] text-[#0E3FA9]/60">{number}</p>
                  <div className="mt-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF5DF] text-[#B57500] sm:h-10 sm:w-10">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="text-base font-extrabold leading-5 text-[#0A234F] sm:text-lg">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#64748B]">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#F2F6FF] px-4 py-4 text-[#0A234F]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0E3FA9]" aria-hidden="true" />
            <p className="text-xs font-semibold leading-5 sm:text-sm">
              Seller opportunity only matters when buyers trust the marketplace. Loadify keeps buyer commerce and seller operations inside the same product story.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
