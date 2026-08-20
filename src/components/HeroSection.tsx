import { Link } from 'react-router-dom';
import PaymentCard from '@/components/ui/PaymentCard';

const HeroSection = () => (
  <section
    aria-label="Loadify Market UK online marketplace"
    className="relative w-full min-h-[75vh] bg-background"
  >
    <picture>
      <source srcSet="/hero-gold.webp" type="image/webp" />
      <img
        src="/hero-gold.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="eager"
        fetchPriority="high"
      />
    </picture>

    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'linear-gradient(90deg, rgba(10,14,26,0.90) 0%, rgba(10,14,26,0.66) 46%, rgba(10,14,26,0.16) 100%)' }}
      aria-hidden="true"
    />

    <div className="absolute inset-0 flex items-center">
      <div className="w-full px-4 sm:px-6 lg:pl-8 xl:pl-10 pt-[122px] pb-8 lg:pt-36 lg:pb-12">
        <div className="flex flex-col text-center sm:text-left items-center sm:items-start max-w-[620px]">
          <div className="inline-flex items-center border border-white/15 bg-black/25 text-white text-xs sm:text-sm font-bold rounded-full px-4 py-1.5 tracking-wide uppercase mb-5 backdrop-blur-sm">
            UK marketplace for buying and selling
          </div>

          <h1 className="text-[2.7rem] sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.08] text-foreground mb-5 tracking-tight">
            Shop. Sell. Grow.<br />
            <span className="text-primary">All in one marketplace.</span>
          </h1>

          <p className="text-base sm:text-lg text-white/75 mb-7 max-w-[565px] leading-relaxed">
            Discover products across categories, checkout securely through Stripe and follow your orders from purchase to delivery — all through Loadify Market.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-1">
            <Link
              to="/catalog"
              data-magnetic
              className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-black font-semibold px-7 py-3.5 rounded-lg text-center transition-colors text-sm"
            >
              Shop the Marketplace
            </Link>
            <Link
              to="/register?type=seller"
              data-magnetic
              className="w-full sm:w-auto border border-white/40 text-white hover:bg-white/10 font-semibold px-7 py-3.5 rounded-lg text-center transition-colors text-sm"
            >
              Start Selling
            </Link>
          </div>

          <p className="mt-3 text-xs text-white/55">
            Selling on Loadify? 0% seller commission until 31 December 2026.
          </p>

          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-white/80">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Secure checkout</span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Order tracking</span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">UK operated</span>
          </div>

          <div className="flex flex-col items-center sm:items-start gap-2.5 mt-5">
            <span className="text-[11px] font-bold tracking-[0.10em] uppercase text-white/55">
              Secure Payments Powered By
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <PaymentCard variant="visa" size="hero" />
              <PaymentCard variant="mastercard" size="hero" />
              <PaymentCard variant="stripe" size="hero" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
