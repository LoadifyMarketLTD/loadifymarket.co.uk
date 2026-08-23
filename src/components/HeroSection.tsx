import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Users, Zap } from 'lucide-react';

const HeroSection = () => {
  return (
    <section aria-label="Loadify Market UK marketplace" className="relative overflow-hidden bg-[#F8FAFC] text-[#182235]">
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-10 px-4 pb-16 pt-[150px] sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:pb-20 lg:pt-[170px]">
        <div className="space-y-7">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[#1D57D8]">Loadify Market</p>
            <h1 className="max-w-[620px] text-4xl font-black leading-[1.08] tracking-[-0.035em] text-[#182235] sm:text-5xl lg:text-[3.4rem]">
              The UK Wholesale <span className="text-[#1D57D8]">Marketplace.</span>
            </h1>
          </div>

          <p className="max-w-md text-lg leading-8 text-slate-600">
            A UK-operated marketplace where buyers discover live products and sellers manage listings, orders and eligible payouts in one connected platform.
          </p>

          <ul className="space-y-3">
            {[
              'Live marketplace listings',
              'Dedicated buyer and seller journeys',
              'Stripe-powered checkout',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 font-semibold text-[#182235]">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/catalog"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1D57D8] px-8 py-3 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(29,87,216,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#1748B8]"
            >
              Browse Marketplace <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              to="/register?type=seller"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(5,150,105,0.20)] transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Start Selling <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: ShieldCheck, label: 'Protected marketplace access' },
              { icon: Zap, label: 'Secure payments' },
              { icon: Users, label: 'Buyer & seller accounts' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                <Icon className="h-4 w-4 text-[#1D57D8]" aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden md:flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(29,87,216,0.12)]">
            <img
              src="/hero-marketplace.jpg"
              alt="Loadify Market marketplace overview"
              className="aspect-[16/10] w-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="rounded-xl bg-[#EEF4FF] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#1D57D8]">Marketplace</p>
              <p className="mt-1 text-sm font-extrabold text-[#182235]">Live products</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-emerald-700">Sellers</p>
              <p className="mt-1 text-sm font-extrabold text-[#182235]">Dedicated tools</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-amber-700">Promotion</p>
              <p className="mt-1 text-sm font-extrabold text-[#182235]">0% until 31 Dec 2026</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
