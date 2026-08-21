import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CheckCircle2, ShieldCheck, Store, Truck } from 'lucide-react';

const showcase = [
  {
    title: 'Electronics',
    image: '/images/categories/electronics.jpeg',
    to: '/catalog?category=Electronics',
    className: 'col-span-2 h-[220px]',
  },
  {
    title: 'Clothing & Fashion',
    image: '/images/categories/fashion.jpeg',
    to: '/catalog?category=Clothing%20%26%20Fashion',
    className: 'h-[178px]',
  },
  {
    title: 'Home & Garden',
    image: '/images/categories/home-kitchen.jpeg',
    to: '/catalog?category=Home%20%26%20Garden',
    className: 'h-[178px]',
  },
];

const HeroSection = () => (
  <section
    aria-label="Loadify Market UK marketplace"
    className="relative overflow-hidden bg-[#F7F9FC] text-[#0A234F]"
  >
    <div
      className="absolute inset-0 pointer-events-none opacity-65"
      aria-hidden="true"
      style={{
        backgroundImage:
          'linear-gradient(rgba(10,35,79,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(10,35,79,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
      }}
    />
    <div className="absolute -right-20 top-12 h-80 w-80 rounded-full bg-[#1D57D8]/[0.08] blur-3xl" aria-hidden="true" />
    <div className="absolute -left-16 bottom-8 h-64 w-64 rounded-full bg-[#F5A300]/[0.10] blur-3xl" aria-hidden="true" />

    <div className="relative mx-auto grid min-h-[760px] w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-4 pb-16 pt-[164px] sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:px-10 lg:pb-20 lg:pt-[184px]">
      <div className="max-w-[650px]">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-white px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0E3FA9] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#F5A300]" aria-hidden="true" />
          UK marketplace for buyers & sellers
        </div>

        <h1 className="max-w-[650px] text-[3rem] font-black leading-[0.98] tracking-[-0.048em] text-[#0A234F] sm:text-[4rem] lg:text-[4.65rem]">
          Shop the marketplace.
          <span className="block text-[#0E3FA9]">Build your place in it.</span>
        </h1>

        <p className="mt-7 max-w-[600px] text-base font-medium leading-7 text-[#334155] sm:text-lg sm:leading-8">
          Discover products across categories — or bring your catalogue to Loadify and manage listings, marketplace orders and eligible payouts from one seller environment.
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
            Shop Loadify
          </Link>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FFF5DF] px-3.5 py-2 text-xs font-extrabold text-[#8A5A00]">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          0% seller commission until 31 December 2026
        </div>

        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#0A234F]/10 pt-5 text-sm font-semibold text-[#334155]">
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

      <div className="relative mx-auto w-full max-w-[620px] lg:mx-0">
        <div className="absolute -inset-4 rounded-[38px] border border-[#0E3FA9]/10" aria-hidden="true" />
        <div className="relative grid grid-cols-2 gap-3 rounded-[30px] border border-[#0A234F]/10 bg-white p-3 shadow-[0_30px_80px_rgba(10,35,79,0.16)] sm:gap-4 sm:p-4">
          {showcase.map((item, index) => (
            <Link
              key={item.title}
              to={item.to}
              className={`group relative overflow-hidden rounded-[22px] bg-[#0A234F] ${item.className}`}
            >
              <img
                src={item.image}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "low"}
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071B3A]/85 via-[#071B3A]/15 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/70">Explore</p>
                  <p className="mt-1 text-base font-extrabold text-white sm:text-lg">{item.title}</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#0A234F] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}

          <div className="col-span-2 flex flex-col gap-3 rounded-[22px] bg-[#0A234F] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#F5A300]">For merchants</p>
              <p className="mt-1 text-lg font-extrabold">Your catalogue belongs where customers can shop it.</p>
              <p className="mt-1.5 text-xs leading-5 text-white/70">List products, manage marketplace orders and use an eligible Stripe Connect payout path.</p>
            </div>
            <Link
              to="/register?type=seller"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-4 py-2.5 text-xs font-extrabold text-[#0A234F] transition-colors hover:bg-[#E69500]"
            >
              Sell on Loadify
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
