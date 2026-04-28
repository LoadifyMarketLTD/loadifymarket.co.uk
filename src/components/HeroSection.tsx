import { Link } from 'react-router-dom';
import PaymentCard from '@/components/ui/PaymentCard';

const HeroSection = () => (
  <section
    aria-label="Loadify Market — UK Online Marketplace"
    className="relative w-full min-h-[38vh] md:min-h-[75vh] bg-[#0B1016]"
  >
    {/* ── Background image — full cover, no distortion ─────────────────── */}
    <img
      src="/hero-gold.jpeg"
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover object-center"
      loading="eager"
    />

    {/* ── Premium dark overlay for text legibility ─────────────────────── */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'linear-gradient(90deg, rgba(11,16,22,0.85) 0%, rgba(11,16,22,0.55) 42%, rgba(11,16,22,0.10) 100%)' }}
      aria-hidden="true"
    />

    {/* ── Mobile content (< md) ────────────────────────────────────────── */}
    <div className="md:hidden absolute inset-0 flex items-center">
      <div className="w-full px-4 pt-[68px] pb-6">
        <div className="flex flex-col items-start max-w-[320px]">

          {/* Badge */}
          <div className="inline-flex items-center bg-[#C99A3E] text-[#0B1016] text-[10px] font-bold rounded-full px-3 py-1 tracking-wide uppercase mb-3">
            0% Commission Until Dec 2026
          </div>

          {/* H1 */}
          <h1 className="text-[1.65rem] font-extrabold leading-[1.2] text-[#F5F1E8] mb-2">
            Buy &amp; sell<br />
            <span className="text-[#C99A3E]">across the UK</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[13px] text-[#C9D0D6] mb-4 leading-snug">
            Fast. Secure. Simple.
          </p>

          {/* Single CTA */}
          <Link
            to="/catalog"
            className="bg-[#C99A3E] hover:bg-[#D8AE57] text-[#0B1016] font-bold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Browse Products
          </Link>

        </div>
      </div>
    </div>

    {/* ── Desktop content (>= md) — unchanged ─────────────────────────── */}
    <div className="hidden md:flex absolute inset-0 items-center">
    <div className="w-full px-4 sm:px-6 lg:pl-8 xl:pl-10 pt-[122px] pb-8 lg:pt-36 lg:pb-12">
      <div className="flex flex-col text-center sm:text-left items-center sm:items-start max-w-[500px]">

        {/* 1. Promo badge */}
        <div className="inline-flex items-center bg-[#C99A3E] text-[#0B1016] text-sm font-bold rounded-full px-4 py-1.5 tracking-wide uppercase mb-5">
          0% Commission Until 31 December 2026
        </div>

        {/* 2. H1 */}
        <h1 className="text-[2.7rem] sm:text-5xl font-extrabold leading-[1.2] text-[#F5F1E8] mb-5">
          The UK Marketplace<br />
          <span className="text-[#C99A3E]">for Buyers &amp; Sellers</span>
        </h1>

        {/* 3. Description */}
        <p className="text-lg text-[#C9D0D6] mb-7">
          Sell with 0% commission until 2026 or discover products from trusted UK sellers — all in one secure platform.
        </p>

        {/* 4. CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2.5">
          <Link
            to="/register?type=seller"
            data-magnetic
            className="w-full sm:w-auto bg-[#C99A3E] hover:bg-[#D8AE57] text-[#0B1016] font-semibold px-7 py-3.5 rounded-lg text-center transition-colors text-sm"
          >
            Start Selling Today
          </Link>
          <Link
            to="/catalog"
            data-magnetic
            className="w-full sm:w-auto border border-white/40 text-white hover:bg-white/10 font-semibold px-7 py-3.5 rounded-lg text-center transition-colors text-sm"
          >
            Browse the Marketplace
          </Link>
        </div>

        {/* 5. Payment badges */}
        <div className="flex flex-col items-center sm:items-start gap-2.5 mt-4">
          <span className="text-[11px] font-bold tracking-[0.10em] uppercase text-[#94A3B8]">
            Secure Payments Powered By
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            <PaymentCard variant="visa"       size="hero" />
            <PaymentCard variant="mastercard" size="hero" />
            <PaymentCard variant="stripe"     size="hero" />
          </div>
        </div>

      </div>
    </div>
    </div>
  </section>
);

export default HeroSection;
