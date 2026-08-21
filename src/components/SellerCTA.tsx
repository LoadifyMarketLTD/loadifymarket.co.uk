import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const sellerProof = ["Build your catalogue", "Manage marketplace orders", "Eligible payouts through Stripe Connect"];

export default function SellerCTA() {
  return (
    <section className="bg-[#F7F9FC] px-4 pb-10 pt-4 sm:px-6 sm:pb-14 lg:px-10" aria-label="Sell on Loadify Market">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[30px] bg-[#0A234F] px-6 py-8 text-white shadow-[0_28px_70px_rgba(10,35,79,0.20)] sm:px-8 sm:py-10 lg:px-11 lg:py-12">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#F5A300]" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#1D57D8]/25 blur-3xl" aria-hidden="true" />

        <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-[820px]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">For sellers</p>
            <h2 className="mt-3 text-3xl font-black leading-[1.02] tracking-[-0.035em] sm:text-4xl lg:text-[2.8rem]">
              Put your catalogue where buyers can discover it.
            </h2>
            <p className="mt-4 max-w-[760px] text-sm font-medium leading-6 text-white/70 sm:text-base sm:leading-7">
              List products, manage marketplace orders and use an eligible Stripe Connect payout path from one seller environment — while customers shop through Loadify.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {sellerProof.map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs font-semibold leading-5 text-white/80">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-[240px] rounded-2xl border border-white/12 bg-white/[0.06] p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65">Seller launch offer</p>
            <p className="mt-2 text-2xl font-black text-[#F5A300]">0% commission</p>
            <p className="mt-1 text-xs font-semibold text-white/70">Until 31 December 2026</p>
            <Link
              to="/register?type=seller"
              data-magnetic
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-5 py-3 text-sm font-extrabold text-[#0A234F] transition-all hover:-translate-y-0.5 hover:bg-[#E69500]"
            >
              Start selling
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/catalog"
              className="mt-3 inline-flex w-full items-center justify-center text-xs font-bold text-white/70 transition-colors hover:text-white"
            >
              Explore the marketplace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
