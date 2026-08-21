/**
 * MobileHeroBanner — commerce-first mobile homepage hero.
 */

import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { hasSellerAccess } from '@/lib/roleUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthPromptStore } from '@/store/authPromptStore';
import type { Product } from '@/components/catalog/ProductCard';

interface MobileHeroBannerProps {
  products: Product[];
  loading: boolean;
}

export default function MobileHeroBanner({ products, loading }: MobileHeroBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const promptAuth = useAuthPromptStore((s) => s.open);
  const liveProducts = products.slice(0, 3);

  const handleSell = () => {
    if (!user) {
      promptAuth('sell');
      return;
    }
    if (hasSellerAccess(user)) {
      navigate(isMobile ? '/sell' : '/seller/products/new');
    } else {
      navigate('/register?type=seller');
    }
  };

  return (
    <section aria-label="Loadify Market mobile introduction" className="relative overflow-hidden bg-[#F7F9FC] px-[var(--mob-side,16px)] pb-5 pt-5 text-[#0A234F]">
      <div className="absolute inset-0 pointer-events-none opacity-55" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(10,35,79,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(10,35,79,0.04) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-[#0E3FA9] shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A300]" aria-hidden="true" />
          UK marketplace for buyers & sellers
        </div>

        <h1 className="mt-4 text-[clamp(31px,9vw,43px)] font-black leading-[0.98] tracking-[-0.045em] text-[#0A234F]">
          Find something worth buying.
          <span className="block text-[#0E3FA9]">Bring something worth selling.</span>
        </h1>

        <p className="mt-4 text-[14px] font-medium leading-[1.55] text-[#475569]">
          Shop real marketplace listings or bring your catalogue to Loadify and manage selling from one connected environment.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
          <button onClick={handleSell} className="min-h-12 rounded-xl bg-[#F5A300] px-4 text-[14px] font-extrabold text-[#0A234F] shadow-[0_10px_24px_rgba(245,163,0,0.22)]">
            Start selling
          </button>
          <button onClick={() => navigate('/catalog')} className="min-h-12 rounded-xl border border-[#0A234F]/15 bg-white px-4 text-[14px] font-extrabold text-[#0A234F] shadow-sm">
            Shop live products
          </button>
        </div>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#FFF5DF] px-3 py-1.5 text-[10px] font-extrabold text-[#8A5A00]">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          0% seller commission until 31 Dec 2026
        </div>

        <div className="mt-5 overflow-hidden rounded-[20px] border border-[#0A234F]/10 bg-white p-2.5 shadow-[0_16px_38px_rgba(10,35,79,0.12)]">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#0E3FA9]">Live on Loadify</p>
              <p className="mt-0.5 text-[12px] font-extrabold text-[#0A234F]">Current marketplace listings</p>
            </div>
            <button onClick={() => navigate('/catalog')} className="text-[10px] font-extrabold text-[#0E3FA9]">Browse all</button>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, index) => <div key={index} className="aspect-[0.82] animate-pulse rounded-[14px] bg-slate-200" />)}
            </div>
          ) : liveProducts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {liveProducts.map((product) => (
                <button key={product.id} type="button" onClick={() => navigate(`/product/${product.id}`)} className="min-w-0 overflow-hidden rounded-[14px] bg-[#F1F4F8] text-left">
                  <img src={product.image} alt={product.title} className="aspect-square w-full object-cover" loading="eager" decoding="async" />
                  <span className="block px-2 pb-2 pt-1.5">
                    <span className="block truncate text-[9px] font-extrabold text-[#0A234F]">{product.title}</span>
                    <span className="mt-0.5 block text-[10px] font-black text-[#0E3FA9]">£{product.price.toFixed(2)}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <button type="button" onClick={handleSell} className="flex w-full items-center justify-between rounded-[16px] bg-[#0A234F] px-4 py-4 text-left text-white">
              <span>
                <span className="block text-[9px] font-black uppercase tracking-[0.13em] text-[#F5A300]">For serious sellers</span>
                <span className="mt-1 block text-[13px] font-extrabold">Bring your products to Loadify.</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#F5A300]" aria-hidden="true" />
            </button>
          )}
        </div>

        <button type="button" onClick={handleSell} className="mt-3 flex w-full items-center justify-between rounded-[18px] bg-[#0A234F] px-4 py-4 text-left text-white">
          <span>
            <span className="block text-[9px] font-black uppercase tracking-[0.13em] text-[#F5A300]">For serious sellers</span>
            <span className="mt-1 block text-[13px] font-extrabold">Your products deserve more than a listing.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#F5A300]" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
