import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  PoundSterling,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';

const HeroSection = () => {
  return (
    <section aria-label="Loadify Market UK marketplace" className="relative overflow-hidden bg-[#F7F9FC] text-[#0A234F]">
      <div
        className="absolute inset-0 pointer-events-none opacity-65"
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(rgba(10,35,79,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(10,35,79,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
        }}
      />
      <div className="absolute -right-20 top-12 h-80 w-80 rounded-full bg-[#1D57D8]/[0.08] blur-3xl" aria-hidden="true" />
      <div className="absolute -left-16 bottom-8 h-64 w-64 rounded-full bg-[#F5A300]/[0.10] blur-3xl" aria-hidden="true" />

      <div className="relative grid min-h-[760px] w-full grid-cols-1 items-center gap-8 px-6 pb-16 pt-[164px] lg:grid-cols-[0.92fr_1.08fr] lg:pb-20 lg:pt-[184px]">
        <div className="max-w-[650px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-white px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#1D57D8] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#F5A300]" aria-hidden="true" />
            Built for UK sellers, brands &amp; wholesalers
          </div>

          <h1 className="max-w-[660px] text-[3rem] font-black leading-[0.98] tracking-[-0.048em] text-[#0A234F] sm:text-[4rem] lg:text-[4.5rem]">
            Your products deserve more than a listing.
            <span className="block text-[#1D57D8]">Build your next sales channel.</span>
          </h1>

          <p className="mt-7 max-w-[610px] text-base font-medium leading-7 text-[#334155] sm:text-lg sm:leading-8">
            Bring your catalogue to a UK-operated marketplace built for serious sellers. Put products in front of marketplace shoppers, manage orders and follow eligible payouts from one connected seller environment.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/register?type=seller" data-magnetic className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F] shadow-[0_12px_30px_rgba(245,163,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E69500]">
              Start selling — 0% commission
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/seller-guidelines" data-magnetic className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#0A234F]/20 bg-white px-6 py-3 text-sm font-bold text-[#0A234F] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1D57D8]/40 hover:text-[#1D57D8]">
              See seller benefits
            </Link>
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FFF5DF] px-3.5 py-2 text-xs font-extrabold text-[#8A5A00]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Founding seller offer · 0% commission until 31 December 2026
          </div>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#0A234F]/10 pt-5 text-sm font-semibold text-[#334155]">
            <span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-[#1D57D8]" aria-hidden="true" />Build your catalogue</span>
            <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-[#1D57D8]" aria-hidden="true" />Manage marketplace orders</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#1D57D8]" aria-hidden="true" />Eligible payouts via Stripe Connect</span>
          </div>
        </div>

        <div className="relative w-full">
          <div className="absolute -inset-4 rounded-[40px] border border-[#0A234F]/10" aria-hidden="true" />
          <div className="relative min-h-[560px] overflow-hidden rounded-[32px] border border-[#0A234F]/10 bg-[#E8EBEF] shadow-[0_32px_90px_rgba(10,35,79,0.20)] sm:min-h-[610px]">
            <img
              src="/hero-marketplace.jpg"
              alt="Loadify Market marketplace seller campaign"
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#071A3A]/85 via-[#071A3A]/12 to-transparent" aria-hidden="true" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/20 to-transparent" aria-hidden="true" />

            <div className="absolute left-5 top-5 rounded-full border border-white/35 bg-white/90 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-[#0A234F] shadow-lg backdrop-blur-md sm:left-6 sm:top-6">
              Sell more with Loadify Market
            </div>

            <div className="absolute right-5 top-5 flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full border border-[#D7A62B]/70 bg-[#071A3A]/92 text-center text-white shadow-[0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-md sm:right-6 sm:top-6">
              <span className="text-[38px] font-black leading-none text-[#F5A300]">0%</span>
              <span className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.10em]">commission</span>
              <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/70">until end 2026</span>
            </div>

            <div className="absolute inset-x-5 bottom-5 sm:inset-x-6 sm:bottom-6">
              <div className="mb-4 max-w-[520px] text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F5A300]">Built for serious sellers</p>
                <p className="mt-1 text-2xl font-black leading-tight sm:text-3xl">A marketplace presence that looks as serious as your business.</p>
                <p className="mt-2 max-w-[470px] text-sm font-medium leading-6 text-white/76">List products, reach UK buyers and manage your marketplace activity from one connected seller environment.</p>
              </div>

              <div className="grid grid-cols-1 overflow-hidden rounded-[18px] border border-white/15 bg-[#071A3A]/88 text-white shadow-xl backdrop-blur-md sm:grid-cols-3">
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r">
                  <Store className="h-5 w-5 shrink-0 text-[#F5A300]" aria-hidden="true" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.10em]">List for free</p>
                    <p className="mt-0.5 text-[10px] text-white/60">Build your catalogue</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r">
                  <PoundSterling className="h-5 w-5 shrink-0 text-[#F5A300]" aria-hidden="true" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.10em]">0% commission</p>
                    <p className="mt-0.5 text-[10px] text-white/60">Founding seller offer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-[#F5A300]" aria-hidden="true" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.10em]">Secure marketplace</p>
                    <p className="mt-0.5 text-[10px] text-white/60">Stripe-powered checkout</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
