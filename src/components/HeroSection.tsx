import { Link } from 'react-router-dom';
import PaymentCard from '@/components/ui/PaymentCard';

const HeroSection = () => (
  <>
    {/* ── Mobile card hero (< md) ──────────────────────────────────────── */}
    <div
      className="md:hidden bg-[#0B0B0F] pt-[72px] pb-0"
      aria-label="Loadify Market — UK Online Marketplace"
    >
      <div
        style={{
          margin: '0 16px',
          background: 'linear-gradient(145deg, #0D0D12, #12121A)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '20px',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(245,185,66,0.12)',
            border: '1px solid rgba(245,185,66,0.3)',
            borderRadius: '20px',
            padding: '4px 12px',
            marginBottom: '16px',
          }}
        >
          <span style={{ color: '#F5B942', fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em' }}>
            0% commission until Dec 2026
          </span>
        </div>

        {/* H1 */}
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#FFFFFF',
            marginBottom: '10px',
          }}
        >
          The UK Marketplace<br />
          <span style={{ color: '#F5B942' }}>for Buyers &amp; Sellers</span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '14px',
            color: '#A0A0A0',
            lineHeight: 1.55,
            marginBottom: '22px',
          }}
        >
          Buy and sell securely across the UK.<br />
          0% commission for sellers — free to list.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link
            to="/register?type=seller"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '48px',
              background: '#F5B942',
              color: '#0B0B0F',
              fontWeight: 700,
              fontSize: '15px',
              borderRadius: '14px',
              textDecoration: 'none',
            }}
          >
            Start Selling Today
          </Link>
          <Link
            to="/catalog"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '48px',
              background: 'transparent',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '15px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.14)',
              textDecoration: 'none',
            }}
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    </div>

    {/* ── Desktop full-screen hero (>= md) — unchanged ─────────────────── */}
    <section
      aria-label="Loadify Market — UK Online Marketplace"
      className="hidden md:block relative w-full min-h-[75vh] bg-[#0B1016]"
    >
      {/* Background image */}
      <img
        src="/hero-gold.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="eager"
      />

      {/* Dark overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(11,16,22,0.85) 0%, rgba(11,16,22,0.55) 42%, rgba(11,16,22,0.10) 100%)' }}
        aria-hidden="true"
      />

      {/* Desktop content */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full px-4 sm:px-6 lg:pl-8 xl:pl-10 pt-[122px] pb-8 lg:pt-36 lg:pb-12">
          <div className="flex flex-col text-center sm:text-left items-center sm:items-start max-w-[500px]">

            {/* Promo badge */}
            <div className="inline-flex items-center bg-[#C99A3E] text-[#0B1016] text-sm font-bold rounded-full px-4 py-1.5 tracking-wide uppercase mb-5">
              0% Commission Until 31 December 2026
            </div>

            {/* H1 */}
            <h1 className="text-[2.7rem] sm:text-5xl font-extrabold leading-[1.2] text-[#F5F1E8] mb-5">
              The UK Marketplace<br />
              <span className="text-[#C99A3E]">for Buyers &amp; Sellers</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-[#C9D0D6] mb-7">
              Sell with 0% commission until 2026 or discover products from trusted UK sellers — all in one secure platform.
            </p>

            {/* CTAs */}
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

            {/* Payment badges */}
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
  </>
);

export default HeroSection;
