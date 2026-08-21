import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CreditCard,
  PackageSearch,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';

const flowSteps = [
  { label: 'Discover', icon: PackageSearch },
  { label: 'Checkout', icon: CreditCard },
  { label: 'Track', icon: Truck },
];

const HeroSection = () => (
  <section
    aria-label="Loadify Market UK marketplace"
    className="relative overflow-hidden bg-[#F7F9FC] text-[#0A234F]"
  >
    <div
      className="absolute inset-0 pointer-events-none opacity-70"
      aria-hidden="true"
      style={{
        backgroundImage:
          'linear-gradient(rgba(10,35,79,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(10,35,79,0.045) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        maskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
      }}
    />
    <div
      className="absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-[#1D57D8]/[0.08] blur-3xl pointer-events-none"
      aria-hidden="true"
    />
    <div
      className="absolute bottom-8 left-[4%] h-52 w-52 rounded-full bg-[#F5A300]/[0.10] blur-3xl pointer-events-none"
      aria-hidden="true"
    />

    <div className="relative mx-auto grid min-h-[760px] w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-4 pb-16 pt-[164px] sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-10 lg:pb-20 lg:pt-[184px]">
      <div className="max-w-[680px]">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-white px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0E3FA9] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#F5A300]" aria-hidden="true" />
          UK marketplace · built for serious commerce
        </div>

        <h1 className="max-w-[680px] text-[3rem] font-black leading-[0.98] tracking-[-0.045em] text-[#0A234F] sm:text-[4rem] lg:text-[4.8rem]">
          A marketplace with an
          <span className="block text-[#0E3FA9]">operating system behind it.</span>
        </h1>

        <p className="mt-7 max-w-[620px] text-base font-medium leading-7 text-[#334155] sm:text-lg sm:leading-8">
          Shop across categories or build your catalogue on a platform designed around secure checkout,
          seller operations and visible order journeys — all inside Loadify.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            to="/register?type=seller"
            data-magnetic
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F] shadow-[0_12px_30px_rgba(245,163,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E69500] hover:shadow-[0_16px_34px_rgba(245,163,0,0.30)]"
          >
            Start selling on Loadify
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/catalog"
            data-magnetic
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#0A234F]/20 bg-white px-6 py-3 text-sm font-bold text-[#0A234F] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0E3FA9]/40 hover:text-[#0E3FA9]"
          >
            Shop the marketplace
          </Link>
        </div>

        <p className="mt-4 text-sm font-semibold text-[#475569]">
          0% seller commission until 31 December 2026.
        </p>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#0A234F]/10 pt-5 text-sm font-semibold text-[#334155]">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0E3FA9]" aria-hidden="true" />
            Stripe-powered checkout
          </span>
          <span className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#0E3FA9]" aria-hidden="true" />
            Order tracking
          </span>
          <span className="inline-flex items-center gap-2">
            <Store className="h-4 w-4 text-[#0E3FA9]" aria-hidden="true" />
            UK operated
          </span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[590px] lg:mx-0">
        <div className="absolute -inset-4 rounded-[38px] border border-[#0E3FA9]/10" aria-hidden="true" />
        <div className="relative overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-white shadow-[0_30px_80px_rgba(10,35,79,0.16)]">
          <div className="flex items-center justify-between border-b border-[#0A234F]/10 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0E3FA9]">Loadify commerce flow</p>
              <p className="mt-1 text-sm font-extrabold text-[#0A234F]">One marketplace journey</p>
            </div>
            <span className="rounded-full bg-[#0A234F] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
              Live platform
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <div className="rounded-2xl bg-[#0A234F] p-5 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F5A300]">Buyer experience</p>
                  <p className="mt-1 text-lg font-bold">Discover → checkout → track</p>
                </div>
                <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-white/10 sm:flex">
                  <PackageSearch className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />
                </div>
              </div>

              <div className="relative mt-6 grid grid-cols-3 gap-2">
                <div className="absolute left-[16%] right-[16%] top-5 h-px bg-white/20" aria-hidden="true" />
                {flowSteps.map(({ label, icon: Icon }) => (
                  <div key={label} className="relative z-10 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#0A234F]">
                      <Icon className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-[11px] font-bold text-white/90">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="border-l-4 border-[#F5A300] bg-[#FFF9ED] px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9A6500]">Seller operations</p>
                <p className="mt-1.5 text-sm font-extrabold text-[#0A234F]">Catalogue · orders · payouts</p>
                <p className="mt-2 text-xs leading-5 text-[#475569]">
                  A serious selling environment, not just a listing form.
                </p>
              </div>
              <div className="border-l-4 border-[#1D57D8] bg-[#F2F6FF] px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0E3FA9]">Commerce control</p>
                <p className="mt-1.5 text-sm font-extrabold text-[#0A234F]">One connected marketplace</p>
                <p className="mt-2 text-xs leading-5 text-[#475569]">
                  Shopping, seller tools and order visibility stay inside Loadify.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-dashed border-[#0E3FA9]/25 bg-[#F7F9FC] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0E3FA9]">Loadify Intelligence</p>
                  <span className="rounded-full border border-[#0E3FA9]/20 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#0E3FA9]">
                    In development
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-[#475569]">
                  Governed intelligence for opportunity, trust and protection — not yet connected live to Loadify Market.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#0A234F]/65">
                <span>Observe</span><span>→</span><span>Protect</span><span>→</span><span>Learn</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
