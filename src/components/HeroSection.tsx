import { Link } from 'react-router-dom';
import PaymentCard from '@/components/ui/PaymentCard';

const HeroSection = () => (
  <section
    aria-label="Loadify Market UK Online Marketplace"
    className="relative w-full min-h-[75vh] bg-[#0A234F]"
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
      style={{ background: 'linear-gradient(90deg, rgba(10,35,79,0.92) 0%, rgba(10,35,79,0.72) 42%, rgba(29,87,216,0.16) 100%)' }}
      aria-hidden="true"
    />

    <div className="absolute inset-0 flex items-center">
      <div className="w-full px-4 sm:px-6 lg:pl-8 xl:pl-10 pt-[122px] pb-8 lg:pt-36 lg:pb-12">
        <div className="flex flex-col text-center sm:text-left items-center sm:items-start max-w-[540px]">
          <div className="inline-flex items-center bg-[#F5A300] text-[#0A234F] text-sm font-bold rounded-full px-4 py-1.5 tracking-wide uppercase mb-5">
            0% Seller Commission Until 31 December 2026
          </div>

          <h1 className="text-[2.7rem] sm:text-5xl font-extrabold leading-[1.2] text-white mb-5">
            Sell in the UK with<br />
            <span className="text-[#F5A300]">0% Commission</span>
          </h1>

          <p className="text-lg text-white/78 mb-7">
            List products for free, sell at fixed prices, and get paid securely through Stripe. Buyers can shop trusted UK sellers with confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2.5">
            <Link
              to="/register?type=seller"
              data-magnetic
              className="w-full sm:w-auto bg-[#F5A300] hover:bg-[#E69500] text-[#0A234F] font-semibold px-7 py-3.5 rounded-lg text-center transition-colors text-sm"
            >
              Create Free Seller Account
            </Link>
            <Link
              to="/catalog"
              data-magnetic
              className="w-full sm:w-auto border border-white/40 text-white hover:bg-white/10 font-semibold px-7 py-3.5 rounded-lg text-center transition-colors text-sm"
            >
              Browse Products
            </Link>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-white/82">
            <span className="rounded-full border border-white/15 bg-[#1D57D8]/15 px-3 py-1">Free listings</span>
            <span className="rounded-full border border-white/15 bg-[#1D57D8]/15 px-3 py-1">Fixed prices</span>
            <span className="rounded-full border border-white/15 bg-[#1D57D8]/15 px-3 py-1">Stripe payouts</span>
          </div>

          <div className="flex flex-col items-center sm:items-start gap-2.5 mt-4">
            <span className="text-[11px] font-bold tracking-[0.10em] uppercase text-white/65">
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
