/**
 * MobileHeroBanner — mobile-first expression of the Loadify commerce-platform story.
 */

import { CreditCard, PackageSearch, ShieldCheck, Store, Truck } from 'lucide-react';
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
        className="absolute inset-0 pointer-events-none opacity-60"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(10,35,79,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(10,35,79,0.045) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0A234F]/10 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-[#0E3FA9] shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A300]" aria-hidden="true" />
          UK marketplace · serious commerce
        </div>

        <h1 className="mt-4 text-[clamp(30px,9vw,42px)] font-black leading-[0.98] tracking-[-0.045em] text-[#0A234F]">
          A marketplace with an
          <span className="block text-[#0E3FA9]">operating system behind it.</span>
        </h1>

        <p className="mt-4 text-[14px] font-medium leading-[1.55] text-[#475569]">
          Shop across categories or build your catalogue with secure checkout, seller tools and order visibility inside Loadify.
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

        <p className="mt-3 text-[11px] font-bold leading-5 text-[#64748B]">
          0% seller commission until 31 December 2026.
        </p>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#0A234F]/10 bg-white shadow-[0_18px_40px_rgba(10,35,79,0.12)]">
          <div className="flex items-center justify-between border-b border-[#0A234F]/10 px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#0E3FA9]">Loadify commerce flow</p>
              <p className="mt-0.5 text-[13px] font-extrabold text-[#0A234F]">One marketplace journey</p>
            </div>
            <span className="rounded-full bg-[#0A234F] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white">
              Live platform
            </span>
          </div>

          <div className="bg-[#0A234F] px-4 py-4 text-white">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Discover', icon: PackageSearch },
                { label: 'Checkout', icon: CreditCard },
                { label: 'Track', icon: Truck },
              ].map(({ label, icon: Icon }) => (
                <div key={label}>
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]">
                    <Icon className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold text-white/90">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-[#0A234F]/10">
            <div className="px-3 py-3.5">
              <Store className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.11em] text-[#9A6500]">Sell</p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-[#0A234F]">Catalogue · orders · payouts</p>
            </div>
            <div className="px-3 py-3.5">
              <ShieldCheck className="h-4 w-4 text-[#1D57D8]" aria-hidden="true" />
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.11em] text-[#0E3FA9]">Operate</p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-[#0A234F]">Checkout · visibility · trust</p>
            </div>
          </div>

          <div className="border-t border-dashed border-[#0E3FA9]/20 bg-[#F7F9FC] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#0E3FA9]">Loadify Intelligence</p>
              <span className="rounded-full border border-[#0E3FA9]/20 bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-[#0E3FA9]">
                In development
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-[#64748B]">
              Governed intelligence for opportunity, trust and protection. Not yet connected live to Loadify Market.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
