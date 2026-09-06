/**
 * MobileHeroBanner — compact native-app discovery module.
 *
 * The installed app should open as a marketplace, not as a marketing landing
 * page. This component keeps Loadify's brand and seller entry point while
 * prioritising live inventory and quick discovery.
 */

import { ArrowRight, Sparkles, Store, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { hasSellerAccess } from '@/lib/roleUtils';
import { useAuthPromptStore } from '@/store/authPromptStore';
import type { Product } from '@/components/catalog/ProductCard';

interface MobileHeroBannerProps {
  products: Product[];
  loading: boolean;
}

export default function MobileHeroBanner({ products, loading }: MobileHeroBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);
  const liveProducts = products.slice(0, 4);

  const handleSell = () => {
    if (!user) {
      promptAuth('sell');
      return;
    }
    if (hasSellerAccess(user)) {
      navigate('/sell');
      return;
    }
    navigate('/register?type=seller');
  };

  return (
    <section aria-label="Marketplace discovery" className="bg-[#F7F9FC] px-[var(--mob-side,16px)] pb-4 pt-4 text-[#0A234F]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-[#C98200]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Discover on Loadify
          </div>
          <h1 className="mt-1.5 text-[24px] font-black leading-[1.06] tracking-[-0.035em] text-[#0A234F]">Fresh marketplace finds</h1>
          <p className="mt-1.5 text-[12.5px] font-medium leading-[1.45] text-[#667085]">Browse live listings from sellers on Loadify Market.</p>
        </div>
        <button
          type="button"
          onClick={handleSell}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#0A234F] px-3 py-2 text-[11px] font-extrabold text-white shadow-[0_7px_18px_rgba(10,35,79,0.18)]"
        >
          <Store className="h-3.5 w-3.5 text-[#F5A300]" aria-hidden="true" />
          Sell
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Quick marketplace actions">
        <button type="button" onClick={() => navigate('/catalog')} className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#0A234F]/10 bg-white px-3 text-[11px] font-bold text-[#0A234F] shadow-sm">
          <Tag className="h-3.5 w-3.5 text-[#1D57D8]" aria-hidden="true" />
          Shop all
        </button>
        <button type="button" onClick={() => navigate('/categories')} className="min-h-9 shrink-0 rounded-full border border-[#0A234F]/10 bg-white px-3 text-[11px] font-bold text-[#0A234F] shadow-sm">Categories</button>
        <button type="button" onClick={() => navigate('/profile/favourites')} className="min-h-9 shrink-0 rounded-full border border-[#0A234F]/10 bg-white px-3 text-[11px] font-bold text-[#0A234F] shadow-sm">Favourites</button>
        <button type="button" onClick={() => navigate('/orders')} className="min-h-9 shrink-0 rounded-full border border-[#0A234F]/10 bg-white px-3 text-[11px] font-bold text-[#0A234F] shadow-sm">My orders</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-[18px] border border-[#0A234F]/10 bg-white p-3 shadow-[0_10px_28px_rgba(10,35,79,0.08)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#1D57D8]">Live now</p>
            <p className="mt-0.5 text-[13px] font-extrabold text-[#0A234F]">Recently available</p>
          </div>
          <button type="button" onClick={() => navigate('/catalog')} className="flex items-center gap-1 text-[10px] font-extrabold text-[#1D57D8]">
            See all <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[0.82] animate-pulse rounded-[12px] bg-slate-200" />)}
          </div>
        ) : liveProducts.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {liveProducts.map((product) => (
              <button key={product.id} type="button" onClick={() => navigate(`/product/${product.id}`)} className="min-w-0 overflow-hidden rounded-[12px] bg-[#F4F6F8] text-left">
                <img src={product.image} alt={product.title} className="aspect-square w-full object-cover" loading="eager" decoding="async" />
                <span className="block px-1.5 pb-1.5 pt-1">
                  <span className="block truncate text-[8.5px] font-bold text-[#0A234F]">{product.title}</span>
                  <span className="mt-0.5 block text-[9.5px] font-black text-[#0A234F]">£{product.price.toFixed(2)}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={handleSell} className="flex w-full items-center justify-between rounded-[14px] bg-[#F4F6F8] px-3.5 py-3 text-left">
            <span>
              <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-[#C98200]">Marketplace opening</span>
              <span className="mt-1 block text-[12px] font-extrabold text-[#0A234F]">Be among the first sellers to list.</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#1D57D8]" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
