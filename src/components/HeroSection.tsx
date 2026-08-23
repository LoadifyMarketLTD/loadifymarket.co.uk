import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, ShoppingBag, Store, Truck } from 'lucide-react';
import { useMobileGrid } from '@/hooks/useMobileGrid';

const HeroSection = () => {
  const { products, loading } = useMobileGrid();
  const leadProduct = products[0];
  const secondaryProducts = products.slice(1, 3);

  return (
    <section aria-label="Loadify Market UK marketplace" className="relative overflow-hidden bg-white text-[#0A234F]">
      <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-[#1D57D8]/[0.08] blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#F5A300]/[0.10] blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-[700px] w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-4 pb-16 pt-[154px] sm:px-6 lg:grid-cols-[0.96fr_1.04fr] lg:gap-16 lg:px-10 lg:pb-20 lg:pt-[174px]">
        <div className="max-w-[620px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-[#F7F9FC] px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#1D57D8]">
            <span className="h-2 w-2 rounded-full bg-[#F5A300]" aria-hidden="true" />
            UK marketplace for buyers & sellers
          </div>

          <h1 className="text-[3rem] font-black leading-[1.02] tracking-[-0.045em] text-[#0A234F] sm:text-[4rem] lg:text-[4.35rem]">
            The UK marketplace for
            <span className="block text-[#1D57D8]">products worth discovering.</span>
          </h1>

          <p className="mt-6 max-w-[570px] text-base font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Buy from current marketplace listings or build your seller presence on one connected Loadify Market platform.
          </p>

          <ul className="mt-7 space-y-3 text-sm font-bold text-[#0A234F] sm:text-base">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              Live marketplace listings
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              Dedicated buyer and seller journeys
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              Stripe-powered checkout
            </li>
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/catalog" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1D57D8] px-6 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(29,87,216,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1747B8]">
              Browse marketplace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/register?type=seller" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-6 py-3 text-sm font-black text-[#0A234F] shadow-[0_12px_28px_rgba(245,163,0,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E69500]">
              Start selling
              <Store className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-[#1D57D8]" aria-hidden="true" /> Secure checkout
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 shadow-sm">
              <Truck className="h-4 w-4 text-[#1D57D8]" aria-hidden="true" /> Order tracking
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 shadow-sm">
              <ShoppingBag className="h-4 w-4 text-[#1D57D8]" aria-hidden="true" /> UK operated
            </span>
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FFF5DF] px-3.5 py-2 text-xs font-extrabold text-[#8A5A00]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            0% seller commission until 31 December 2026
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px] lg:mx-0">
          <div className="absolute -inset-4 rounded-[34px] border border-[#1D57D8]/10" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[28px] border border-[#0A234F]/10 bg-[#F8FAFD] p-4 shadow-[0_30px_80px_rgba(10,35,79,0.14)]">
            <div className="mb-4 flex items-center justify-between gap-4 px-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D57D8]">Live on Loadify</p>
                <p className="mt-1 text-sm font-black text-[#0A234F]">Current marketplace products</p>
              </div>
              <Link to="/catalog" className="shrink-0 text-xs font-black text-[#1D57D8] hover:text-[#0A234F]">View all</Link>
            </div>

            {loading ? (
              <div className="aspect-[16/10] animate-pulse rounded-[22px] bg-slate-200" />
            ) : leadProduct ? (
              <>
                <Link to={`/product/${leadProduct.id}`} className="group relative block overflow-hidden rounded-[22px] bg-white">
                  <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={leadProduct.image}
                      alt={leadProduct.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#1D57D8]">{leadProduct.category}</p>
                      <p className="mt-1 line-clamp-2 text-base font-black leading-6 text-[#0A234F]">{leadProduct.title}</p>
                    </div>
                    <p className="shrink-0 text-xl font-black text-[#0A234F]">£{leadProduct.price.toFixed(2)}</p>
                  </div>
                </Link>

                {secondaryProducts.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {secondaryProducts.map((product) => (
                      <Link key={product.id} to={`/product/${product.id}`} className="group flex min-h-[112px] items-center gap-3 rounded-[18px] border border-[#0A234F]/8 bg-white p-3 transition-all hover:border-[#1D57D8]/25 hover:shadow-sm">
                        <img src={product.image} alt="" className="h-20 w-20 shrink-0 rounded-[14px] object-cover" loading="lazy" decoding="async" />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-extrabold leading-4 text-[#0A234F]">{product.title}</p>
                          <p className="mt-2 text-sm font-black text-[#1D57D8]">£{product.price.toFixed(2)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center rounded-[22px] bg-[#0A234F] px-8 text-center text-white">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F5A300]">Loadify Market</p>
                  <p className="mt-3 text-2xl font-black">Your marketplace starts with the next great listing.</p>
                  <Link to="/register?type=seller" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F5A300] px-4 py-2.5 text-sm font-black text-[#0A234F]">
                    Start selling <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
