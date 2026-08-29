/**
 * MobileHeroBanner — premium editorial mobile homepage hero shared by mobile web
 * and the Capacitor app.
 */

import { ArrowRight } from 'lucide-react';
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
  const hasLiveProducts = !loading && products.length > 0;

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
      className="bg-[#F8F7F4] px-[var(--mob-side,16px)] pb-5 pt-7 text-[#0A234F]"
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.20em] text-[#8A7351]">
        Built for UK sellers, brands &amp; wholesalers
      </p>

      <h1 className="mt-4 max-w-[390px] font-serif text-[clamp(35px,10.5vw,48px)] font-normal leading-[1.01] tracking-[-0.035em] text-[#0A234F]">
        The UK marketplace for independent sellers
      </h1>

      <p className="mt-5 max-w-[430px] text-[14px] font-normal leading-[1.65] text-[#5A6578]">
        A modern UK sales channel for independent sellers, brands and wholesalers. List products, manage marketplace orders and follow eligible payouts from one connected environment.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="button"
          onClick={handleSell}
          className="min-h-12 rounded-md bg-[#0A234F] px-6 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(10,35,79,0.10)]"
        >
          Start selling
        </button>
        <button
          type="button"
          onClick={() => navigate('/catalog')}
          className="group inline-flex min-h-12 items-center gap-2 border-0 bg-transparent px-0 text-[13px] font-medium text-[#334155]"
        >
          {hasLiveProducts ? 'Shop marketplace' : 'Explore marketplace'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-7 overflow-hidden rounded-[14px] border border-black/[0.05] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.045)]">
        <img
          src="/hero-marketplace.jpg"
          alt="A curated selection of products representing the Loadify Market marketplace"
          className="h-[clamp(250px,72vw,360px)] w-full object-cover object-center"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2 border-t border-[#0A234F]/[0.08] pt-4 text-[10.5px] font-medium leading-5 text-[#667085]">
        <span>0% commission for founding sellers</span>
        <span aria-hidden="true" className="text-[#A8A29E]">•</span>
        <span>Verified seller status</span>
        <span aria-hidden="true" className="text-[#A8A29E]">•</span>
        <span>Stripe-powered checkout</span>
      </div>
    </section>
  );
}
