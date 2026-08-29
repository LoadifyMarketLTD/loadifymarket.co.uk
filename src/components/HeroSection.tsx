import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Store, Truck } from 'lucide-react';
import { useMobileGrid } from '@/hooks/useMobileGrid';

const HERO_PRODUCT_PREFERENCES = [
  'elegant gift set',
  '3d decor',
  'handmade decorative book art',
];

const normalizeProductTitle = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const HeroSection = () => {
  const { products, loading } = useMobileGrid();

  const liveProducts = (() => {
    const selected: typeof products = [];
    const selectedIds = new Set<string>();

    for (const preference of HERO_PRODUCT_PREFERENCES) {
      const match = products.find((product) =>
        normalizeProductTitle(product.title).includes(preference),
      );

      if (match && !selectedIds.has(match.id)) {
        selected.push(match);
        selectedIds.add(match.id);
      }
    }

    for (const product of products) {
      if (selected.length >= 3) break;
      if (!selectedIds.has(product.id)) {
        selected.push(product);
        selectedIds.add(product.id);
      }
    }

    return selected.slice(0, 3);
  })();

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

      <div className="relative grid min-h-[760px] w-full grid-cols-1 items-center gap-6 px-6 pb-16 pt-[164px] lg:grid-cols-[0.92fr_1.08fr] lg:pb-20 lg:pt-[184px]">
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
          <div className="absolute -inset-4 rounded-[38px] border border-[#1D57D8]/10" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-white p-3 shadow-[0_30px_80px_rgba(10,35,79,0.16)] sm:p-4">
            <div className="mb-3 flex items-center justify-between px-1 sm:mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#1D57D8]">Your storefront on Loadify</p>
                <p className="mt-1 text-sm font-extrabold text-[#0A234F]">See how seller listings appear to shoppers</p>
              </div>
              <Link to="/catalog" className="text-xs font-extrabold text-[#1D57D8] hover:text-[#0A234F]">View marketplace</Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-[1.12fr_0.88fr] gap-3">
                <div className="h-[390px] animate-pulse rounded-[22px] bg-slate-200" />
                <div className="grid gap-3"><div className="h-[188px] animate-pulse rounded-[22px] bg-slate-200" /><div className="h-[188px] animate-pulse rounded-[22px] bg-slate-200" /></div>
              </div>
            ) : liveProducts.length > 0 ? (
              <div className="grid grid-cols-[1.12fr_0.88fr] gap-3">
                {liveProducts[0] && (
                  <Link to={`/product/${liveProducts[0].id}`} className="group relative flex h-[390px] flex-col overflow-hidden rounded-[22px] bg-[#F1F4F8]">
                    <img src={liveProducts[0].image} alt={liveProducts[0].title} className="min-h-0 flex-1 object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="eager" fetchPriority="high" decoding="async" />
                    <div className="bg-white p-4">
                      <p className="line-clamp-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#1D57D8]">{liveProducts[0].category}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-[#0A234F]">{liveProducts[0].title}</p>
                      <p className="mt-2 text-lg font-black text-[#0A234F]">£{liveProducts[0].price.toFixed(2)}</p>
                    </div>
                  </Link>
                )}
                <div className="grid gap-3">
                  {liveProducts.slice(1, 3).map((product) => (
                    <Link key={product.id} to={`/product/${product.id}`} className="group relative flex h-[188px] overflow-hidden rounded-[22px] bg-[#F1F4F8]">
                      <img src={product.image} alt={product.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" decoding="async" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A234F]/88 via-[#0A234F]/10 to-transparent" aria-hidden="true" />
                      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                        <p className="line-clamp-1 text-[8px] font-black uppercase tracking-[0.13em] text-white/75">{product.category}</p>
                        <p className="mt-1 line-clamp-2 text-xs font-extrabold leading-4">{product.title}</p>
                        <p className="mt-1 text-sm font-black text-[#FFD77A]">£{product.price.toFixed(2)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] bg-[#0A234F] px-6 py-10 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F5A300]">For serious sellers</p>
                <p className="mt-2 text-2xl font-black leading-tight">Bring your products to a marketplace built for serious sellers.</p>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-3 rounded-[22px] bg-[#0A234F] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#F5A300]">For serious sellers</p>
                <p className="mt-1 text-lg font-extrabold">Ready to bring your catalogue?</p>
                <p className="mt-1.5 text-xs leading-5 text-white/70">Join early, build your storefront and start growing with Loadify.</p>
              </div>
              <Link to="/register?type=seller" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-4 py-2.5 text-xs font-extrabold text-[#0A234F] transition-colors hover:bg-[#E69500]">
                Create seller account <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
