/**
 * MobileHeroBanner — commerce-first mobile homepage hero.
 */

import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { hasSellerAccess } from '@/lib/roleUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthPromptStore } from '@/store/authPromptStore';

export default function MobileHeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const promptAuth = useAuthPromptStore((s) => s.open);

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
    <section
      aria-label="Loadify Market mobile introduction"
      className="relative overflow-hidden bg-[#F7F9FC] px-[var(--mob-side,16px)] pb-5 pt-5 text-[#0A234F]"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-55"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(10,35,79,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(10,35,79,0.04) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-[#0E3FA9] shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A300]" aria-hidden="true" />
          UK marketplace for buyers & sellers
        </div>

        <h1 className="mt-4 text-[clamp(31px,9vw,43px)] font-black leading-[0.98] tracking-[-0.045em] text-[#0A234F]">
          Shop the marketplace.
          <span className="block text-[#0E3FA9]">Build your place in it.</span>
        </h1>

        <p className="mt-4 text-[14px] font-medium leading-[1.55] text-[#475569]">
          Discover products across categories — or bring your catalogue to Loadify and manage marketplace selling from one place.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
          <button
            onClick={handleSell}
            className="min-h-12 rounded-xl bg-[#F5A300] px-4 text-[14px] font-extrabold text-[#0A234F] shadow-[0_10px_24px_rgba(245,163,0,0.22)]"
          >
            Start selling
          </button>
          <button
            onClick={() => navigate('/catalog')}
            className="min-h-12 rounded-xl border border-[#0A234F]/15 bg-white px-4 text-[14px] font-extrabold text-[#0A234F] shadow-sm"
          >
            Shop Loadify
          </button>
        </div>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#FFF5DF] px-3 py-1.5 text-[10px] font-extrabold text-[#8A5A00]">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          0% seller commission until 31 Dec 2026
        </div>

        <div className="mt-5 grid grid-cols-[1.18fr_0.82fr] gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/catalog?category=Electronics')}
            className="group relative h-[188px] overflow-hidden rounded-[20px] text-left shadow-[0_16px_38px_rgba(10,35,79,0.14)]"
          >
            <img
              src="/images/categories/electronics.jpeg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-[#071B3A]/85 via-transparent to-transparent" aria-hidden="true" />
            <span className="absolute inset-x-0 bottom-0 p-4">
              <span className="block text-[9px] font-black uppercase tracking-[0.13em] text-white/75">Explore</span>
              <span className="mt-1 block text-[17px] font-extrabold text-white">Electronics</span>
            </span>
          </button>

          <div className="grid gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/catalog?category=Clothing%20%26%20Fashion')}
              className="relative h-[89px] overflow-hidden rounded-[18px] text-left"
            >
              <img
                src="/images/categories/fashion.jpeg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                fetchPriority="low"
                decoding="async"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-[#071B3A]/80 via-transparent to-transparent" aria-hidden="true" />
              <span className="absolute bottom-2.5 left-3 text-[12px] font-extrabold text-white">Fashion</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/catalog?category=Home%20%26%20Garden')}
              className="relative h-[89px] overflow-hidden rounded-[18px] text-left"
            >
              <img
                src="/images/categories/home-kitchen.jpeg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                fetchPriority="low"
                decoding="async"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-[#071B3A]/80 via-transparent to-transparent" aria-hidden="true" />
              <span className="absolute bottom-2.5 left-3 text-[12px] font-extrabold text-white">Home & Garden</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSell}
          className="mt-3 flex w-full items-center justify-between rounded-[18px] bg-[#0A234F] px-4 py-4 text-left text-white"
        >
          <span>
            <span className="block text-[9px] font-black uppercase tracking-[0.13em] text-[#F5A300]">For merchants</span>
            <span className="mt-1 block text-[13px] font-extrabold">Put your catalogue where customers can shop it.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#F5A300]" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
